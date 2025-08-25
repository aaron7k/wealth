import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, 
  PiggyBank,
  AlertTriangle,
  Calendar as CalendarIcon,
  TrendingUp,
  Target,
  Edit,
  Trash2,
  CheckCircle
} from 'lucide-react';

interface Budget {
  id: string;
  name: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string;
  is_active: boolean;
  category_id: string;
  category?: { name: string; color?: string };
  spent?: number;
}

interface Category {
  id: string;
  name: string;
  color?: string;
  type: 'income' | 'expense';
}

const budgetSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  start_date: z.date(),
  category_id: z.string().min(1, 'Selecciona una categoría'),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

const Budgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, defaultCurrency } = useUserProfile();
  const { convertToUserCurrency, formatCurrencyWithConversion } = useCurrencyConverter();

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      amount: 0,
      period: 'monthly',
      start_date: new Date(),
      category_id: '',
    },
  });

  useEffect(() => {
    if (profile && defaultCurrency) {
      loadData();
    }
  }, [profile, defaultCurrency]);


  const loadData = async () => {
    try {
      setLoading(true);

      // Load budgets
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(name, color)
        `)
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;

      // Load categories (only expense categories for budgets)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'expense')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Calculate spent amounts for each budget
      const budgetsWithSpent = await Promise.all(
        (budgetsData || []).map(async (budget) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('category_id', budget.category_id)
            .eq('type', 'expense')
            .gte('transaction_date', budget.start_date)
            .lte('transaction_date', budget.end_date);

          const spent = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          
          return { ...budget, spent };
        })
      );

      setBudgets(budgetsWithSpent);
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

  const calculateEndDate = (startDate: Date, period: string) => {
    switch (period) {
      case 'weekly':
        return new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return endOfMonth(startDate);
      case 'quarterly':
        return endOfMonth(addMonths(startDate, 2));
      case 'yearly':
        return new Date(startDate.getFullYear(), 11, 31);
      default:
        return endOfMonth(startDate);
    }
  };

  const onSubmit = async (data: BudgetFormValues) => {
    try {
      const endDate = calculateEndDate(data.start_date, data.period);
      
      const budgetData = {
        name: data.name,
        amount: data.amount,
        period: data.period as any,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        category_id: data.category_id,
        user_id: user?.id || '',
        is_active: true,
      };

      if (editingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', editingBudget.id);

        if (error) throw error;

        toast({
          title: "¡Éxito!",
          description: "Presupuesto actualizado correctamente."
        });
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert(budgetData);

        if (error) throw error;

        toast({
          title: "¡Éxito!",
          description: "Presupuesto creado correctamente."
        });
      }

      form.reset();
      setIsAddDialogOpen(false);
      setEditingBudget(null);
      loadData();
    } catch (error) {
      console.error('Error saving budget:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el presupuesto."
      });
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    form.reset({
      name: budget.name,
      amount: Number(budget.amount),
      period: budget.period,
      start_date: new Date(budget.start_date),
      category_id: budget.category_id,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Presupuesto eliminado correctamente."
      });

      loadData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el presupuesto."
      });
    }
  };

  const toggleBudgetStatus = async (budget: Budget) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ is_active: !budget.is_active })
        .eq('id', budget.id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: `Presupuesto ${!budget.is_active ? 'activado' : 'desactivado'} correctamente.`
      });

      loadData();
    } catch (error) {
      console.error('Error updating budget status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado del presupuesto."
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: defaultCurrency
    }).format(amount);
  };

  const getPeriodLabel = (period: string) => {
    const labels = {
      weekly: 'Semanal',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    };
    return labels[period as keyof typeof labels] || period;
  };

  const activeBudgets = budgets.filter(b => b.is_active);
  const totalBudgetAmount = activeBudgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const budgetsOverLimit = activeBudgets.filter(b => (b.spent || 0) > Number(b.amount)).length;

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
          <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
          <p className="text-muted-foreground">
            Controla tus gastos con presupuestos inteligentes
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingBudget(null);
              form.reset();
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Presupuesto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
              </DialogTitle>
              <DialogDescription>
                {editingBudget ? 'Modifica los detalles del presupuesto' : 'Crea un nuevo presupuesto para controlar tus gastos'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Presupuesto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Gastos de Alimentación" {...field} />
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
                      <FormLabel>Monto Límite</FormLabel>
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
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
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
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Período</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el período" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Inicio</FormLabel>
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
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingBudget ? 'Actualizar' : 'Crear'} Presupuesto
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
            <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalBudgetAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {activeBudgets.length} presupuestos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastado</CardTitle>
            <TrendingUp className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudgetAmount > 0 ? Math.round((totalSpent / totalBudgetAmount) * 100) : 0}% del presupuesto total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuestos Excedidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{budgetsOverLimit}</div>
            <p className="text-xs text-muted-foreground">
              de {activeBudgets.length} presupuestos activos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budgets List */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Presupuestos</CardTitle>
          <CardDescription>
            {budgets.length} presupuestos configurados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <div className="text-center py-8">
              <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No tienes presupuestos configurados</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                Crear Primer Presupuesto
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.map((budget) => {
                const percentage = Number(budget.amount) > 0 ? ((budget.spent || 0) / Number(budget.amount)) * 100 : 0;
                const isOverBudget = percentage > 100;
                const isCloseToLimit = percentage > 80 && percentage <= 100;

                return (
                  <div
                    key={budget.id}
                    className={`p-6 border rounded-lg space-y-4 ${
                      !budget.is_active ? 'opacity-60 bg-muted/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          isOverBudget ? 'bg-warning/10' : isCloseToLimit ? 'bg-warning/10' : 'bg-success/10'
                        }`}>
                          {isOverBudget ? 
                            <AlertTriangle className="h-5 w-5 text-warning" /> :
                            <Target className="h-5 w-5 text-success" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{budget.name}</h3>
                            <Badge variant={budget.is_active ? 'default' : 'secondary'}>
                              {budget.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <Badge variant="outline">
                              {getPeriodLabel(budget.period)}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {budget.category && (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: budget.category.color || '#6B7280' }}
                                />
                                <span>{budget.category.name}</span>
                              </div>
                            )}
                            <p>
                              {format(new Date(budget.start_date), 'dd MMM', { locale: es })} - 
                              {format(new Date(budget.end_date), 'dd MMM yyyy', { locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {formatCurrency(budget.spent || 0)} / {formatCurrency(Number(budget.amount))}
                          </p>
                          <p className={`text-sm ${
                            isOverBudget ? 'text-warning' : isCloseToLimit ? 'text-warning' : 'text-muted-foreground'
                          }`}>
                            {percentage.toFixed(1)}% utilizado
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleBudgetStatus(budget)}
                          >
                            <CheckCircle className={`h-4 w-4 ${budget.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(budget)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(budget.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso</span>
                        <span className={isOverBudget ? 'text-warning font-medium' : ''}>
                          {isOverBudget && `Excedido por ${formatCurrency((budget.spent || 0) - Number(budget.amount))}`}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(percentage, 100)} 
                        className={`h-2 ${isOverBudget ? 'bg-warning/20' : ''}`}
                      />
                      {isOverBudget && (
                        <div className="bg-warning/10 border border-warning/20 rounded-md p-3 mt-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <p className="text-sm text-warning font-medium">
                              Este presupuesto ha sido excedido
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Budgets;