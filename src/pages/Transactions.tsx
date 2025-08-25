import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  TrendingUp, 
  TrendingDown,
  Calendar as CalendarIcon,
  Receipt,
  Edit,
  Trash2
} from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  notes?: string;
  account_id: string;
  category_id?: string;
  generate_tithe: boolean;
  account?: { 
    name: string; 
    bank_name?: string; 
    currency: string; 
    type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  };
  category?: { name: string; color?: string };
}

interface Account {
  id: string;
  name: string;
  bank_name?: string;
  balance: number;
  currency: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
}

interface Category {
  id: string;
  name: string;
  color?: string;
  type: 'income' | 'expense';
}

const transactionSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  type: z.enum(['income', 'expense']),
  transaction_date: z.date(),
  notes: z.string().optional(),
  account_id: z.string().min(1, 'Selecciona una cuenta'),
  category_id: z.string().optional(),
  generate_tithe: z.boolean().default(true),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, defaultCurrency } = useUserProfile();
  const { formatCurrencyWithConversion, convertToUserCurrency, convertCurrency } = useCurrencyConverter();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: 0,
      type: 'expense',
      transaction_date: new Date(),
      notes: '',
      account_id: '',
      category_id: '',
      generate_tithe: true,
    },
  });

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);


  const loadData = async () => {
    try {
      setLoading(true);

      // Load transactions with account and category details
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(name, bank_name, currency, type),
          categories(name, color)
        `)
        .order('transaction_date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Load accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name, bank_name, currency, type, balance')
        .eq('is_active', true)
        .order('name');

      if (accountsError) throw accountsError;

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Transform the data to match our interfaces
      const transformedTransactions = transactionsData?.map(t => ({
        ...t,
        account: t.accounts ? {
          name: t.accounts.name,
          bank_name: t.accounts.bank_name,
          currency: t.accounts.currency,
          type: t.accounts.type
        } : undefined,
        category: t.categories ? {
          name: t.categories.name,
          color: t.categories.color
        } : undefined
      })) || [];

      setTransactions(transformedTransactions);
      setAccounts(accountsData || []);
      setCategories(categoriesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información."
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TransactionFormValues) => {
    try {
      const transactionData = {
        ...data,
        transaction_date: format(data.transaction_date, 'yyyy-MM-dd'),
        category_id: data.category_id || null,
        user_id: user?.id || '',
      } as any;

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) throw error;

        toast({
          title: "¡Éxito!",
          description: "Transacción actualizada correctamente."
        });
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);

        if (error) throw error;

        // Si es un ingreso y se debe generar diezmo
        if (data.type === 'income' && data.generate_tithe) {
          await handleTitheCalculation(data.amount, new Date(data.transaction_date), data.account_id);
        }

        toast({
          title: "¡Éxito!",
          description: "Transacción creada correctamente."
        });
      }

      form.reset();
      setIsAddDialogOpen(false);
      setEditingTransaction(null);
      loadData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la transacción."
      });
    }
  };

  const handleTitheCalculation = async (incomeAmount: number, transactionDate: Date, accountId: string) => {
    try {
      // Verificar si el usuario tiene diezmo habilitado y obtener configuraciones
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tithe_enabled, tithe_period, auto_deduct_tithe, savings_percentage, default_currency')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError || !profile?.tithe_enabled) return;

      // Obtener información de la cuenta para conocer su moneda
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('currency')
        .eq('id', accountId)
        .single();

      if (accountError) throw accountError;

      // Calcular diezmo y ahorros EN LA MONEDA PREFERIDA DEL USUARIO (convertir antes de calcular)
      const incomeInUserCurrency = convertToUserCurrency(incomeAmount, account.currency);
      const titheAmount = incomeInUserCurrency * 0.1; // 10% del ingreso convertido
      const afterTitheAmount = incomeInUserCurrency - titheAmount; // Monto después del diezmo
      const savingsAmount = afterTitheAmount * ((profile.savings_percentage || 0) / 100); // Porcentaje de ahorros sobre lo que queda

      // Si auto-deduct está habilitado, descontar del balance pero convertir el monto a la moneda de la cuenta
      if (profile.auto_deduct_tithe) {
        // Convertir el diezmo de la moneda preferida a la moneda de la cuenta para descontarlo
        const titheAmountInAccountCurrency = convertCurrency(titheAmount, profile.default_currency, account.currency);
        
        // Obtener balance actual
        const { data: currentAccount, error: getCurrentError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', accountId)
          .single();

        if (getCurrentError) throw getCurrentError;

        // Actualizar balance descontando el diezmo en la moneda de la cuenta
        const { error: balanceError } = await supabase
          .from('accounts')
          .update({ 
            balance: Number(currentAccount.balance) - titheAmountInAccountCurrency
          })
          .eq('id', accountId);

        if (balanceError) throw balanceError;
      }

      // Si hay porcentaje de ahorros configurado, también descontar del balance
      if (profile.savings_percentage && profile.savings_percentage > 0) {
        // Convertir los ahorros de la moneda preferida a la moneda de la cuenta para descontarlos
        const savingsAmountInAccountCurrency = convertCurrency(savingsAmount, profile.default_currency, account.currency);
        
        // Obtener balance actual después del diezmo
        const { data: currentAccount, error: getCurrentError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', accountId)
          .single();

        if (getCurrentError) throw getCurrentError;

        // Actualizar balance descontando los ahorros en la moneda de la cuenta
        const { error: savingsBalanceError } = await supabase
          .from('accounts')
          .update({ 
            balance: Number(currentAccount.balance) - savingsAmountInAccountCurrency
          })
          .eq('id', accountId);

        if (savingsBalanceError) throw savingsBalanceError;
      }

      // Calcular el período correspondiente
      let periodStart: Date;
      let periodEnd: Date;

      if (profile.tithe_period === 'weekly') {
        periodStart = new Date(transactionDate);
        periodStart.setDate(transactionDate.getDate() - transactionDate.getDay() + 1); // Lunes
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6); // Domingo
      } else {
        periodStart = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);
        periodEnd = new Date(transactionDate.getFullYear(), transactionDate.getMonth() + 1, 0);
      }

      // Registrar diezmo en tabla diezmos (para seguimiento)
      const { data: existingPeriod, error: periodError } = await supabase
        .from('diezmos')
        .select('*')
        .eq('user_id', user?.id)
        .eq('period_start', format(periodStart, 'yyyy-MM-dd'))
        .eq('period_end', format(periodEnd, 'yyyy-MM-dd'))
        .maybeSingle();

      if (periodError && periodError.code !== 'PGRST116') throw periodError;

      // Los diezmos se registran SIEMPRE en la moneda preferida del usuario
      const titheAmountForRecord = titheAmount; // Ya está en la moneda preferida
      const conversionNote = account.currency !== profile.default_currency 
        ? ` (convertido desde ${convertCurrency(titheAmount, profile.default_currency, account.currency).toFixed(2)} ${account.currency})`
        : '';

      if (existingPeriod) {
        // Actualizar el monto existente
        const { error: updateError } = await supabase
          .from('diezmos')
          .update({ 
            amount: Number(existingPeriod.amount) + titheAmountForRecord,
            notes: `Diezmo acumulado del período. Última adición: ${titheAmountForRecord.toFixed(2)} ${profile.default_currency} el ${format(transactionDate, 'dd/MM/yyyy')}${conversionNote}`
          })
          .eq('id', existingPeriod.id);

        if (updateError) throw updateError;
      } else {
        // Crear nuevo período de diezmo
        const { error: insertError } = await supabase
          .from('diezmos')
          .insert({
            user_id: user?.id,
            amount: titheAmountForRecord,
            period_type: profile.tithe_period,
            period_start: format(periodStart, 'yyyy-MM-dd'),
            period_end: format(periodEnd, 'yyyy-MM-dd'),
            notes: `Diezmo del ${profile.tithe_period === 'weekly' ? 'período semanal' : 'período mensual'}. Basado en ingreso de ${titheAmountForRecord.toFixed(2)} ${profile.default_currency}${conversionNote}`
          });

        if (insertError) throw insertError;
      }

      // Procesar ahorros (solo si hay un porcentaje configurado)
      if (profile.savings_percentage && profile.savings_percentage > 0) {
        // Los ahorros se registran SIEMPRE en la moneda preferida del usuario
        const savingsAmountForRecord = savingsAmount; // Ya está en la moneda preferida
        
        const { data: existingSavings, error: savingsError } = await supabase
          .from('savings')
          .select('*')
          .eq('user_id', user?.id)
          .eq('period_start', format(periodStart, 'yyyy-MM-dd'))
          .eq('period_end', format(periodEnd, 'yyyy-MM-dd'))
          .maybeSingle();

        if (savingsError && savingsError.code !== 'PGRST116') throw savingsError;

        const savingsConversionNote = account.currency !== profile.default_currency 
          ? ` (convertido desde ${convertCurrency(savingsAmount, profile.default_currency, account.currency).toFixed(2)} ${account.currency})`
          : '';

        if (existingSavings) {
          // Actualizar ahorros existentes
          const { error: updateSavingsError } = await supabase
            .from('savings')
            .update({ 
              amount: Number(existingSavings.amount) + savingsAmountForRecord,
              notes: `Ahorros acumulados del período (${profile.savings_percentage}% después del diezmo). Última adición: ${savingsAmountForRecord.toFixed(2)} ${profile.default_currency}${savingsConversionNote}`
            })
            .eq('id', existingSavings.id);

          if (updateSavingsError) throw updateSavingsError;
        } else {
          // Crear nuevo período de ahorros
          const { error: insertSavingsError } = await supabase
            .from('savings')
            .insert({
              user_id: user?.id,
              amount: savingsAmountForRecord,
              period_start: format(periodStart, 'yyyy-MM-dd'),
              period_end: format(periodEnd, 'yyyy-MM-dd'),
              period_type: profile.tithe_period,
              notes: `Ahorros del ${profile.tithe_period === 'weekly' ? 'período semanal' : 'período mensual'} (${profile.savings_percentage}% después del diezmo). Basado en ${savingsAmountForRecord.toFixed(2)} ${profile.default_currency}${savingsConversionNote}`
            });

          if (insertSavingsError) throw insertSavingsError;
        }
      }

    } catch (error) {
      console.error('Error calculating tithe and savings:', error);
      // No mostramos error al usuario para no interrumpir el flujo de transacciones
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    form.reset({
      description: transaction.description,
      amount: Number(transaction.amount),
      type: transaction.type,
      transaction_date: new Date(transaction.transaction_date),
      notes: transaction.notes || '',
      account_id: transaction.account_id,
      category_id: transaction.category_id || '',
      generate_tithe: (transaction as any).generate_tithe ?? true,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Transacción eliminada correctamente."
      });

      loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la transacción."
      });
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.account?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || transaction.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: defaultCurrency
    }).format(amount);
  };

  const formatCurrencyHelper = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Calcular totales considerando tipos de cuenta y conversión de moneda
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => {
      const accountCurrency = t.account?.currency || 'USD';
      const convertedAmount = formatCurrencyWithConversion(Number(t.amount), accountCurrency);
      const amount = typeof convertedAmount === 'string' ? Number(t.amount) : convertedAmount.convertedAmount;
      return sum + amount;
    }, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => {
      const accountCurrency = t.account?.currency || 'USD';
      const convertedAmount = formatCurrencyWithConversion(Number(t.amount), accountCurrency);
      const amount = typeof convertedAmount === 'string' ? Number(t.amount) : convertedAmount.convertedAmount;
      return sum + amount;
    }, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transacciones</h1>
          <p className="text-muted-foreground">
            Gestiona todos tus ingresos y gastos
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTransaction(null);
              form.reset();
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction ? 'Modifica los detalles de la transacción' : 'Registra una nueva transacción en tu cuenta'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">Ingreso</SelectItem>
                          <SelectItem value="expense">Gasto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Compra en supermercado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una cuenta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {accounts.map((account) => (
                             <SelectItem key={account.id} value={account.id}>
                               <div className="flex items-center justify-between w-full">
                                 <span>{account.name}</span>
                                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                   <Badge variant="outline" className="text-xs">
                                     {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                                   </Badge>
                                   <span>{account.currency}</span>
                                   <span>{formatCurrency(account.balance)}</span>
                                 </div>
                               </div>
                             </SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría (Opcional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories
                            .filter(cat => cat.type === form.watch('type'))
                            .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: category.color || '#6B7280' }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transaction_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notas adicionales..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('type') === 'income' && (
                  <FormField
                    control={form.control}
                    name="generate_tithe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Generar diezmo (10%)
                          </FormLabel>
                          <FormDescription>
                            Se calculará automáticamente el 10% de este ingreso para el diezmo
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingTransaction ? 'Actualizar' : 'Crear'} Transacción
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter(t => t.type === 'income').length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter(t => t.type === 'expense').length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-income' : 'text-expense'}`}>
              {formatCurrency(totalIncome - totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {transactions.length} transacciones totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transacciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="income">Solo Ingresos</SelectItem>
                <SelectItem value="expense">Solo Gastos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Transacciones</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transacciones encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No se encontraron transacciones</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                Crear Primera Transacción
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'income' ? 'bg-income/10' : 'bg-expense/10'
                    }`}>
                      {transaction.type === 'income' ? 
                        <TrendingUp className={`h-4 w-4 text-income`} /> :
                        <TrendingDown className={`h-4 w-4 text-expense`} />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{transaction.description}</p>
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{transaction.account?.name}</p>
                        {transaction.category && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: transaction.category.color || '#6B7280' }}
                            />
                            <span>{transaction.category.name}</span>
                          </div>
                        )}
                        <p>{format(new Date(transaction.transaction_date), 'dd MMM yyyy', { locale: es })}</p>
                      </div>
                    </div>
                  </div>
                   <div className="flex items-center gap-4">
                     <div className="text-right">
                       <div>
                         {(() => {
                           const accountCurrency = transaction.account?.currency || 'USD';
                           const formatted = formatCurrencyWithConversion(
                             Number(transaction.amount), 
                             accountCurrency
                           );
                           
                           if (typeof formatted === 'string') {
                             return (
                               <p className={`text-lg font-bold ${
                                 transaction.type === 'income' ? 'text-income' : 'text-expense'
                               }`}>
                                 {transaction.type === 'income' ? '+' : '-'}{formatted}
                               </p>
                             );
                           } else {
                             return (
                               <div>
                                 <p className={`text-lg font-bold ${
                                   transaction.type === 'income' ? 'text-income' : 'text-expense'
                                 }`}>
                                   {transaction.type === 'income' ? '+' : '-'}{formatted.original}
                                 </p>
                                 {accountCurrency !== defaultCurrency && (
                                   <p className="text-xs text-muted-foreground">
                                     ≈ {formatted.converted}
                                   </p>
                                 )}
                               </div>
                             );
                           }
                         })()}
                       </div>
                     </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(transaction.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;