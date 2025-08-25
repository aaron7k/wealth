import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Calendar,
  ArrowUp,
  ArrowDown,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Heart,
  Calculator,
  Zap,
  Download
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  category_id?: string;
  category?: { name: string; color?: string };
}

interface ChartData {
  name: string;
  income: number;
  expense: number;
  net: number;
  month?: string;
  year?: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface FinancialHealthScore {
  overall: number;
  incomeStability: number;
  expenseControl: number;
  savingsRate: number;
  budgetAdherence: number;
  emergencyFund: number;
}

interface MonthComparison {
  current: {
    month: string;
    income: number;
    expense: number;
    net: number;
    savingsRate: number;
  };
  previous: {
    month: string;
    income: number;
    expense: number;
    net: number;
    savingsRate: number;
  };
  changes: {
    incomeChange: number;
    expenseChange: number;
    netChange: number;
    savingsRateChange: number;
  };
}

interface BudgetAnalysis {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'on-track' | 'at-risk' | 'over-budget';
}

const Metrics = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [expenseCategoryData, setExpenseCategoryData] = useState<CategoryData[]>([]);
  const [healthScore, setHealthScore] = useState<FinancialHealthScore>({
    overall: 0,
    incomeStability: 0,
    expenseControl: 0,
    savingsRate: 0,
    budgetAdherence: 0,
    emergencyFund: 0
  });
  const [monthComparison, setMonthComparison] = useState<MonthComparison | null>(null);
  const [budgetAnalysis, setBudgetAnalysis] = useState<BudgetAnalysis[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '30days':
          startDate = subDays(endDate, 30);
          break;
        case '3months':
          startDate = subMonths(endDate, 3);
          break;
        case '6months':
          startDate = subMonths(endDate, 6);
          break;
        case '1year':
          startDate = subMonths(endDate, 12);
          break;
        default:
          startDate = subMonths(endDate, 6);
      }

      // Load transactions with categories
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, color)
        `)
        .gte('transaction_date', format(startDate, 'yyyy-MM-dd'))
        .lte('transaction_date', format(endDate, 'yyyy-MM-dd'))
        .order('transaction_date');

      if (error) throw error;

      setTransactions(transactionsData || []);
      const processedData = processChartData(transactionsData || [], startDate, endDate);
      processCategoryData(transactionsData || []);
      await calculateFinancialHealth(transactionsData || [], processedData);
      await calculateMonthComparison(transactionsData || []);
      await loadBudgetAnalysis();

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar las métricas."
      });
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (transactions: Transaction[], startDate: Date, endDate: Date): ChartData[] => {
    const data: ChartData[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);
      const monthName = format(current, 'MMM yyyy', { locale: es });

      const monthTransactions = transactions.filter(t => {
        const date = parseISO(t.transaction_date);
        return date >= monthStart && date <= monthEnd;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      data.push({
        name: monthName,
        income,
        expense,
        net: income - expense,
        month: format(current, 'MMMM', { locale: es }),
        year: current.getFullYear()
      });

      current.setMonth(current.getMonth() + 1);
    }

    setChartData(data);
    return data;
  };

  const calculateFinancialHealth = async (transactions: Transaction[], chartDataArray: ChartData[]) => {
    // Calcular estabilidad de ingresos (variación mes a mes)
    const monthlyIncomes = chartDataArray.map(month => month.income);
    const avgIncome = monthlyIncomes.length > 0 ? monthlyIncomes.reduce((a, b) => a + b, 0) / monthlyIncomes.length : 0;
    const incomeVariation = monthlyIncomes.length > 1 && avgIncome > 0 ? 
      Math.sqrt(monthlyIncomes.reduce((sum, income) => sum + Math.pow(income - avgIncome, 2), 0) / monthlyIncomes.length) / avgIncome : 0;
    const incomeStability = Math.max(0, 100 - (incomeVariation * 100));

    // Calcular control de gastos (tendencia)
    const monthlyExpenses = chartDataArray.map(month => month.expense);
    const expenseGrowthRate = monthlyExpenses.length > 1 && monthlyExpenses[0] > 0 ? 
      ((monthlyExpenses[monthlyExpenses.length - 1] - monthlyExpenses[0]) / monthlyExpenses[0]) * 100 : 0;
    const expenseControl = Math.max(0, 100 - Math.abs(expenseGrowthRate));

    // Calcular tasa de ahorro
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    const savingsScore = Math.min(100, Math.max(0, savingsRate * 5)); // 20% = 100 points

    // Calcular adherencia al presupuesto
    const budgetAdherence = budgetAnalysis.length > 0 ? 
      budgetAnalysis.reduce((sum, budget) => sum + (budget.status === 'on-track' ? 100 : budget.status === 'at-risk' ? 50 : 0), 0) / budgetAnalysis.length : 75;

    // Simular fondo de emergencia (basado en gastos promedio)
    const emergencyFund = 85; // Simulado - en una app real calcularías basado en cuentas de ahorro

    const overall = (incomeStability + expenseControl + savingsScore + budgetAdherence + emergencyFund) / 5;

    setHealthScore({
      overall,
      incomeStability,
      expenseControl,
      savingsRate: savingsScore,
      budgetAdherence,
      emergencyFund
    });
  };

  const calculateMonthComparison = async (transactions: Transaction[]) => {
    const currentDate = new Date();
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);
    
    const previousDate = subMonths(currentDate, 1);
    const previousMonthStart = startOfMonth(previousDate);
    const previousMonthEnd = endOfMonth(previousDate);

    // Transacciones del mes actual
    const currentTransactions = transactions.filter(t => {
      const date = parseISO(t.transaction_date);
      return date >= currentMonthStart && date <= currentMonthEnd;
    });

    // Transacciones del mes anterior
    const previousTransactions = transactions.filter(t => {
      const date = parseISO(t.transaction_date);
      return date >= previousMonthStart && date <= previousMonthEnd;
    });

    const currentIncome = currentTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const currentExpense = currentTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const currentNet = currentIncome - currentExpense;
    const currentSavingsRate = currentIncome > 0 ? (currentNet / currentIncome) * 100 : 0;

    const previousIncome = previousTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const previousExpense = previousTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const previousNet = previousIncome - previousExpense;
    const previousSavingsRate = previousIncome > 0 ? (previousNet / previousIncome) * 100 : 0;

    const incomeChange = previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : 0;
    const expenseChange = previousExpense > 0 ? ((currentExpense - previousExpense) / previousExpense) * 100 : 0;
    const netChange = previousNet !== 0 ? ((currentNet - previousNet) / Math.abs(previousNet)) * 100 : 0;
    const savingsRateChange = currentSavingsRate - previousSavingsRate;

    setMonthComparison({
      current: {
        month: format(currentDate, 'MMMM yyyy', { locale: es }),
        income: currentIncome,
        expense: currentExpense,
        net: currentNet,
        savingsRate: currentSavingsRate
      },
      previous: {
        month: format(previousDate, 'MMMM yyyy', { locale: es }),
        income: previousIncome,
        expense: previousExpense,
        net: previousNet,
        savingsRate: previousSavingsRate
      },
      changes: {
        incomeChange,
        expenseChange,
        netChange,
        savingsRateChange
      }
    });
  };

  const loadBudgetAnalysis = async () => {
    try {
      const { data: budgets, error } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(name, color)
        `)
        .eq('is_active', true);

      if (error) throw error;

      const currentDate = new Date();
      const currentMonthStart = startOfMonth(currentDate);
      const currentMonthEnd = endOfMonth(currentDate);

      const analysis: BudgetAnalysis[] = [];

      for (const budget of budgets || []) {
        const { data: spent, error: spentError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', budget.category_id)
          .eq('type', 'expense')
          .gte('transaction_date', format(currentMonthStart, 'yyyy-MM-dd'))
          .lte('transaction_date', format(currentMonthEnd, 'yyyy-MM-dd'));

        if (spentError) continue;

        const totalSpent = spent?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const budgetAmount = Number(budget.amount);
        const remaining = budgetAmount - totalSpent;
        const percentage = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;

        let status: 'on-track' | 'at-risk' | 'over-budget' = 'on-track';
        if (percentage > 100) status = 'over-budget';
        else if (percentage > 80) status = 'at-risk';

        analysis.push({
          category: budget.category?.name || 'Sin categoría',
          budgeted: budgetAmount,
          spent: totalSpent,
          remaining,
          percentage,
          status
        });
      }

      setBudgetAnalysis(analysis);
    } catch (error) {
      console.error('Error loading budget analysis:', error);
    }
  };

  const processCategoryData = (transactions: Transaction[]) => {
    // Process income categories
    const incomeCategories = new Map<string, { amount: number; color: string }>();
    
    transactions
      .filter(t => t.type === 'income' && t.category)
      .forEach(t => {
        const categoryName = t.category!.name;
        const existing = incomeCategories.get(categoryName) || { amount: 0, color: t.category!.color || '#6B7280' };
        incomeCategories.set(categoryName, {
          amount: existing.amount + Number(t.amount),
          color: existing.color
        });
      });

    const totalIncome = Array.from(incomeCategories.values()).reduce((sum, cat) => sum + cat.amount, 0);
    
    const incomeCategoryData: CategoryData[] = Array.from(incomeCategories.entries()).map(([name, data]) => ({
      name,
      value: data.amount,
      color: data.color,
      percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    // Process expense categories
    const expenseCategories = new Map<string, { amount: number; color: string }>();
    
    transactions
      .filter(t => t.type === 'expense' && t.category)
      .forEach(t => {
        const categoryName = t.category!.name;
        const existing = expenseCategories.get(categoryName) || { amount: 0, color: t.category!.color || '#6B7280' };
        expenseCategories.set(categoryName, {
          amount: existing.amount + Number(t.amount),
          color: existing.color
        });
      });

    const totalExpenses = Array.from(expenseCategories.values()).reduce((sum, cat) => sum + cat.amount, 0);
    
    const expenseCategoryData: CategoryData[] = Array.from(expenseCategories.entries()).map(([name, data]) => ({
      name,
      value: data.amount,
      color: data.color,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    setCategoryData(incomeCategoryData);
    setExpenseCategoryData(expenseCategoryData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const netIncome = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

  // Calculate trends (compare with previous period)
  const currentPeriodDays = chartData.length * 30; // approximate
  const previousPeriodStart = subDays(new Date(), currentPeriodDays * 2);
  const previousPeriodEnd = subDays(new Date(), currentPeriodDays);

  const previousTransactions = transactions.filter(t => {
    const date = parseISO(t.transaction_date);
    return date >= previousPeriodStart && date <= previousPeriodEnd;
  });

  const previousIncome = previousTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const previousExpenses = previousTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const incomeGrowth = previousIncome > 0 ? ((totalIncome - previousIncome) / previousIncome) * 100 : 0;
  const expenseGrowth = previousExpenses > 0 ? ((totalExpenses - previousExpenses) / previousExpenses) * 100 : 0;

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return AlertTriangle;
    return XCircle;
  };

  const exportReport = () => {
    const reportData = {
      healthScore,
      monthComparison,
      budgetAnalysis,
      totalIncome,
      totalExpenses,
      netIncome,
      savingsRate,
      generatedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-financiero-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    
    toast({
      title: "Reporte exportado",
      description: "Tu reporte financiero ha sido descargado."
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-8 bg-muted rounded w-32"></div>
              </CardHeader>
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Análisis de Salud Financiera</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Análisis profundo de tus patrones financieros y comparación mensual
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportReport} className="gap-2 w-full sm:w-auto">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Reporte</span>
            <span className="sm:hidden">Exportar</span>
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Selecciona período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Últimos 30 días</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="1year">Último año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Activity className="h-4 w-4" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Salud Financiera</span>
            <span className="sm:hidden">Salud</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Comparación Mensual</span>
            <span className="sm:hidden">Comparar</span>
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex-col sm:flex-row gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Análisis de Presupuesto</span>
            <span className="sm:hidden">Presupuesto</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-income" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-income">{formatCurrency(totalIncome)}</div>
                <div className="flex items-center gap-1 text-xs">
                  {incomeGrowth >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-income" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-expense" />
                  )}
                  <span className={incomeGrowth >= 0 ? 'text-income' : 'text-expense'}>
                    {Math.abs(incomeGrowth).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs período anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-expense" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-expense">{formatCurrency(totalExpenses)}</div>
                <div className="flex items-center gap-1 text-xs">
                  {expenseGrowth >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-expense" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-income" />
                  )}
                  <span className={expenseGrowth >= 0 ? 'text-expense' : 'text-income'}>
                    {Math.abs(expenseGrowth).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs período anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netIncome >= 0 ? 'text-income' : 'text-expense'}`}>
                  {formatCurrency(netIncome)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(1) : 0}% de los ingresos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Ahorro</CardTitle>
                <Target className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${savingsRate >= 0 ? 'text-income' : 'text-expense'}`}>
                  {savingsRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Objetivo recomendado: 20%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <CardTitle>Tendencias Mensuales</CardTitle>
              </div>
              <CardDescription>
                Comparativa de ingresos y gastos por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Ingresos' : name === 'expense' ? 'Gastos' : 'Balance Neto']}
                    labelStyle={{ color: '#000' }}
                  />
                  <Area type="monotone" dataKey="income" stackId="1" stroke="#22C55E" fill="#22C55E" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="expense" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Analysis */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Income Categories */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-income" />
                  <CardTitle>Ingresos por Categoría</CardTitle>
                </div>
                <CardDescription>
                  Distribución de tus fuentes de ingresos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No hay datos de categorías de ingresos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={180} className="sm:h-[200px]">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {categoryData.slice(0, 5).map((category) => (
                        <div key={category.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">{formatCurrency(category.value)}</span>
                            <Badge variant="outline" className="ml-2">
                              {category.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Categories */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-expense" />
                  <CardTitle>Gastos por Categoría</CardTitle>
                </div>
                <CardDescription>
                  Distribución de tus principales gastos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {expenseCategoryData.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No hay datos de categorías de gastos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={180} className="sm:h-[200px]">
                      <PieChart>
                        <Pie
                          data={expenseCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expenseCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {expenseCategoryData.slice(0, 5).map((category) => (
                        <div key={category.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">{formatCurrency(category.value)}</span>
                            <Badge variant="outline" className="ml-2">
                              {category.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Overall Health Score */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Puntuación de Salud Financiera</CardTitle>
                </div>
                <CardDescription>
                  Evaluación integral de tu situación financiera
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getHealthScoreColor(healthScore.overall)}`}>
                    {healthScore.overall.toFixed(0)}
                  </div>
                  <div className="text-lg text-muted-foreground">de 100 puntos</div>
                  <div className="mt-2">
                    {React.createElement(getHealthScoreIcon(healthScore.overall), {
                      className: `h-8 w-8 mx-auto ${getHealthScoreColor(healthScore.overall)}`
                    })}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Estabilidad de Ingresos</span>
                      <span>{healthScore.incomeStability.toFixed(0)}%</span>
                    </div>
                    <Progress value={healthScore.incomeStability} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Control de Gastos</span>
                      <span>{healthScore.expenseControl.toFixed(0)}%</span>
                    </div>
                    <Progress value={healthScore.expenseControl} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tasa de Ahorro</span>
                      <span>{healthScore.savingsRate.toFixed(0)}%</span>
                    </div>
                    <Progress value={healthScore.savingsRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Adherencia al Presupuesto</span>
                      <span>{healthScore.budgetAdherence.toFixed(0)}%</span>
                    </div>
                    <Progress value={healthScore.budgetAdherence} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Fondo de Emergencia</span>
                      <span>{healthScore.emergencyFund.toFixed(0)}%</span>
                    </div>
                    <Progress value={healthScore.emergencyFund} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Recommendations */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Recomendaciones Personalizadas</CardTitle>
                </div>
                <CardDescription>
                  Consejos para mejorar tu salud financiera
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {healthScore.savingsRate < 60 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Aumenta tu tasa de ahorro</AlertTitle>
                    <AlertDescription>
                      Tu tasa de ahorro actual es baja. Considera reducir gastos no esenciales o buscar fuentes adicionales de ingresos.
                    </AlertDescription>
                  </Alert>
                )}
                
                {healthScore.incomeStability < 70 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Estabiliza tus ingresos</AlertTitle>
                    <AlertDescription>
                      Tus ingresos varían considerablemente. Busca fuentes de ingresos más estables o diversifica tus fuentes.
                    </AlertDescription>
                  </Alert>
                )}
                
                {healthScore.expenseControl < 70 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Controla mejor tus gastos</AlertTitle>
                    <AlertDescription>
                      Tus gastos están creciendo. Revisa tus categorías de gasto y elimina los innecesarios.
                    </AlertDescription>
                  </Alert>
                )}
                
                {healthScore.overall >= 80 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>¡Excelente salud financiera!</AlertTitle>
                    <AlertDescription>
                      Mantienes un buen equilibrio financiero. Considera explorar opciones de inversión para hacer crecer tu patrimonio.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Month Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          {monthComparison && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Current vs Previous Month */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle>Comparación Mensual</CardTitle>
                  </div>
                  <CardDescription>
                    {monthComparison.current.month} vs {monthComparison.previous.month}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-medium text-primary">{monthComparison.current.month}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Ingresos</span>
                          <span className="font-medium text-income">{formatCurrency(monthComparison.current.income)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Gastos</span>
                          <span className="font-medium text-expense">{formatCurrency(monthComparison.current.expense)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Balance</span>
                          <span className={`font-medium ${monthComparison.current.net >= 0 ? 'text-income' : 'text-expense'}`}>
                            {formatCurrency(monthComparison.current.net)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Tasa de Ahorro</span>
                          <span className="font-medium">{monthComparison.current.savingsRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium text-muted-foreground">{monthComparison.previous.month}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Ingresos</span>
                          <span className="font-medium">{formatCurrency(monthComparison.previous.income)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Gastos</span>
                          <span className="font-medium">{formatCurrency(monthComparison.previous.expense)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Balance</span>
                          <span className={`font-medium ${monthComparison.previous.net >= 0 ? 'text-income' : 'text-expense'}`}>
                            {formatCurrency(monthComparison.previous.net)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Tasa de Ahorro</span>
                          <span className="font-medium">{monthComparison.previous.savingsRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Changes Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle>Cambios Porcentuales</CardTitle>
                  </div>
                  <CardDescription>
                    Variación mes a mes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="font-medium">Ingresos</span>
                      <div className="flex items-center gap-2">
                        {monthComparison.changes.incomeChange >= 0 ? (
                          <ArrowUp className="h-4 w-4 text-income" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-expense" />
                        )}
                        <span className={`font-bold ${monthComparison.changes.incomeChange >= 0 ? 'text-income' : 'text-expense'}`}>
                          {Math.abs(monthComparison.changes.incomeChange).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="font-medium">Gastos</span>
                      <div className="flex items-center gap-2">
                        {monthComparison.changes.expenseChange >= 0 ? (
                          <ArrowUp className="h-4 w-4 text-expense" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-income" />
                        )}
                        <span className={`font-bold ${monthComparison.changes.expenseChange >= 0 ? 'text-expense' : 'text-income'}`}>
                          {Math.abs(monthComparison.changes.expenseChange).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="font-medium">Balance Neto</span>
                      <div className="flex items-center gap-2">
                        {monthComparison.changes.netChange >= 0 ? (
                          <ArrowUp className="h-4 w-4 text-income" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-expense" />
                        )}
                        <span className={`font-bold ${monthComparison.changes.netChange >= 0 ? 'text-income' : 'text-expense'}`}>
                          {Math.abs(monthComparison.changes.netChange).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="font-medium">Tasa de Ahorro</span>
                      <div className="flex items-center gap-2">
                        {monthComparison.changes.savingsRateChange >= 0 ? (
                          <ArrowUp className="h-4 w-4 text-income" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-expense" />
                        )}
                        <span className={`font-bold ${monthComparison.changes.savingsRateChange >= 0 ? 'text-income' : 'text-expense'}`}>
                          {Math.abs(monthComparison.changes.savingsRateChange).toFixed(1)} puntos
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Budget Analysis Tab */}
        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <CardTitle>Análisis de Presupuesto Mensual</CardTitle>
              </div>
              <CardDescription>
                Estado actual de tus presupuestos por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              {budgetAnalysis.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No hay presupuestos configurados</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Crea presupuestos para obtener análisis detallados
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {budgetAnalysis.map((budget, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{budget.category}</h4>
                        <Badge variant={
                          budget.status === 'on-track' ? 'default' : 
                          budget.status === 'at-risk' ? 'secondary' : 'destructive'
                        }>
                          {budget.status === 'on-track' ? 'En regla' : 
                           budget.status === 'at-risk' ? 'En riesgo' : 'Sobrepasado'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Gastado: {formatCurrency(budget.spent)}</span>
                          <span>Presupuesto: {formatCurrency(budget.budgeted)}</span>
                        </div>
                        
                        <Progress 
                          value={Math.min(budget.percentage, 100)} 
                          className={`h-2 ${budget.status === 'over-budget' ? '[&>.bg-primary]:bg-red-500' : 
                                            budget.status === 'at-risk' ? '[&>.bg-primary]:bg-yellow-500' : ''}`}
                        />
                        
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{budget.percentage.toFixed(1)}% utilizado</span>
                          <span className={budget.remaining >= 0 ? 'text-income' : 'text-expense'}>
                            {budget.remaining >= 0 ? 'Quedan ' : 'Exceso '}
                            {formatCurrency(Math.abs(budget.remaining))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-6 p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Resumen del Mes</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-income">
                          {budgetAnalysis.filter(b => b.status === 'on-track').length}
                        </div>
                        <div className="text-sm text-muted-foreground">En regla</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {budgetAnalysis.filter(b => b.status === 'at-risk').length}
                        </div>
                        <div className="text-sm text-muted-foreground">En riesgo</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-expense">
                          {budgetAnalysis.filter(b => b.status === 'over-budget').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Sobrepasados</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Metrics;