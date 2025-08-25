import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  PiggyBank,
  Calendar,
  AlertTriangle,
  Plus
} from 'lucide-react';

interface FinancialStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  activeAccounts: number;
  activeBudgets: number;
  upcomingSubscriptions: number;
}

interface BudgetProgress {
  id: string;
  name: string;
  amount: number;
  spent: number;
  category: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<FinancialStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    activeAccounts: 0,
    activeBudgets: 0,
    upcomingSubscriptions: 0
  });
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, defaultCurrency } = useUserProfile();
  const { convertToUserCurrency, formatCurrencyWithConversion, convertCurrency } = useCurrencyConverter();
  const { formatPrivateNumber } = usePrivacy();

  useEffect(() => {
    if (profile && defaultCurrency) {
      loadDashboardData();
    }
  }, [profile, defaultCurrency]);


  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch accounts for total balance
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('balance, is_active, currency')
        .eq('is_active', true);

      if (accountsError) throw accountsError;

      // Fetch transactions for income/expenses this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('amount, type, account_id, accounts(currency)')
        .gte('transaction_date', startOfMonth.toISOString().split('T')[0]);

      if (transactionsError) throw transactionsError;

      // Fetch budgets
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('is_active', true);

      if (budgetsError) throw budgetsError;

      // Fetch subscriptions due in next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .lte('next_billing_date', nextWeek.toISOString().split('T')[0]);

      if (subscriptionsError) throw subscriptionsError;

      // Calculate stats - convert all currencies to user's default currency
      const totalBalance = accounts?.reduce((sum, account) => {
        if (!account.currency || !account.balance) return sum;
        const balanceInUserCurrency = convertCurrency(Number(account.balance), account.currency, defaultCurrency);
        return sum + balanceInUserCurrency;
      }, 0) || 0;
      
      const monthlyIncome = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => {
          if (!t.accounts?.currency || !t.amount) return sum;
          const amountInUserCurrency = convertCurrency(Number(t.amount), t.accounts.currency, defaultCurrency);
          return sum + amountInUserCurrency;
        }, 0) || 0;
      
      const monthlyExpenses = transactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => {
          if (!t.accounts?.currency || !t.amount) return sum;
          const amountInUserCurrency = convertCurrency(Number(t.amount), t.accounts.currency, defaultCurrency);
          return sum + amountInUserCurrency;
        }, 0) || 0;

      // Calculate budget progress
      const budgetProgressData: BudgetProgress[] = [];
      
      for (const budget of budgets || []) {
        const { data: budgetTransactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', budget.category_id)
          .eq('type', 'expense')
          .gte('transaction_date', budget.start_date)
          .lte('transaction_date', budget.end_date);

        const spent = budgetTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        
        budgetProgressData.push({
          id: budget.id,
          name: budget.name,
          amount: Number(budget.amount),
          spent,
          category: budget.category_id
        });
      }

      setStats({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        activeAccounts: accounts?.length || 0,
        activeBudgets: budgets?.length || 0,
        upcomingSubscriptions: subscriptions?.length || 0
      });

      setBudgetProgress(budgetProgressData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información del dashboard."
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return formatPrivateNumber(amount, defaultCurrency || 'USD');
  };

  const netIncome = stats.monthlyIncome - stats.monthlyExpenses;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-32 mb-2"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-48"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-2 bg-muted rounded w-3/4"></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard Financiero</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Resumen de tu salud financiera
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Nueva Transacción</span>
          <span className="sm:hidden">Nueva</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Balance Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-primary">
              {formatCurrency(stats.totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.activeAccounts} cuentas activas
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Ingresos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-income">
              {formatCurrency(stats.monthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-expense">
              {formatCurrency(stats.monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card className={`hover:shadow-lg transition-shadow ${netIncome >= 0 ? 'border-success' : 'border-expense'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Balance Mensual</CardTitle>
            {netIncome >= 0 ? 
              <TrendingUp className="h-4 w-4 text-success" /> : 
              <TrendingDown className="h-4 w-4 text-expense" />
            }
          </CardHeader>
          <CardContent>
            <div className={`text-lg sm:text-2xl font-bold ${netIncome >= 0 ? 'text-success' : 'text-expense'}`}>
              {formatCurrency(netIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresos - Gastos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Budget Progress */}
        <Card className="lg:col-span-2 order-2 lg:order-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Progreso de Presupuestos
            </CardTitle>
            <CardDescription>
              Seguimiento de tus presupuestos activos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetProgress.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tienes presupuestos activos</p>
                <Button variant="outline" className="mt-4">
                  Crear Presupuesto
                </Button>
              </div>
            ) : (
              budgetProgress.map((budget) => {
                const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                const isOverBudget = percentage > 100;
                
                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{budget.name}</span>
                        {isOverBudget && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className={`h-2 ${isOverBudget ? 'bg-expense/20' : ''}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(1)}% utilizado</span>
                      {isOverBudget && (
                        <span className="text-warning font-medium">
                          Excedido por {formatCurrency(budget.spent - budget.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="order-1 lg:order-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Suscripciones
            </CardTitle>
            <CardDescription>
              {stats.upcomingSubscriptions} renovaciones en los próximos 7 días
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Button variant="outline" className="justify-start text-sm">
                <CreditCard className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Ver Cuentas ({stats.activeAccounts})</span>
                <span className="sm:hidden">Cuentas ({stats.activeAccounts})</span>
              </Button>
              <Button variant="outline" className="justify-start text-sm">
                <PiggyBank className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Gestionar Presupuestos ({stats.activeBudgets})</span>
                <span className="sm:hidden">Presupuestos ({stats.activeBudgets})</span>
              </Button>
              <Button variant="outline" className="justify-start text-sm">
                <Calendar className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Ver Suscripciones</span>
                <span className="sm:hidden">Suscripciones</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;