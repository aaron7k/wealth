import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Folder,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  Palette,
  FolderOpen,
  Hash,
  ShoppingCart,
  Home,
  Car,
  Utensils,
  Coffee,
  Plane,
  Gamepad2,
  Book,
  Heart,
  Shirt,
  Gift,
  Briefcase,
  PiggyBank,
  CreditCard
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  type: 'income' | 'expense';
  transactionCount?: number;
  totalAmount?: number;
}

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['income', 'expense']),
  color: z.string().min(4, 'Selecciona un color'),
  icon: z.string().min(1, 'El icono es requerido'),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, defaultCurrency } = useUserProfile();
  const { convertToUserCurrency } = useCurrencyConverter();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'expense',
      color: '#6366F1',
      icon: 'folder',
    },
  });

  const predefinedColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#06B6D4', '#0EA5E9', '#3B82F6',
    '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
    '#F43F5E', '#6B7280', '#374151', '#1F2937', '#111827'
  ];

  const iconOptions = [
    { value: 'folder', label: 'Carpeta' },
    { value: 'shopping-cart', label: 'Carrito' },
    { value: 'home', label: 'Casa' },
    { value: 'car', label: 'Coche' },
    { value: 'utensils', label: 'Comida' },
    { value: 'coffee', label: 'Café' },
    { value: 'plane', label: 'Viaje' },
    { value: 'gamepad-2', label: 'Entretenimiento' },
    { value: 'book', label: 'Educación' },
    { value: 'heart', label: 'Salud' },
    { value: 'shirt', label: 'Ropa' },
    { value: 'gift', label: 'Regalos' },
    { value: 'briefcase', label: 'Trabajo' },
    { value: 'piggy-bank', label: 'Ahorros' },
    { value: 'credit-card', label: 'Finanzas' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Calculate usage stats for each category
      const categoriesWithStats = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { data: transactions, count } = await supabase
            .from('transactions')
            .select('amount', { count: 'exact' })
            .eq('category_id', category.id);

          const totalAmount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

          return {
            ...category,
            transactionCount: count || 0,
            totalAmount,
          };
        })
      );

      setCategories(categoriesWithStats);

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

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(data)
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast({
          title: "¡Éxito!",
          description: "Categoría actualizada correctamente."
        });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{
            name: data.name,
            type: data.type,
            color: data.color,
            icon: data.icon,
            user_id: user?.id || ''
          }] as any);

        if (error) throw error;

        toast({
          title: "¡Éxito!",
          description: "Categoría creada correctamente."
        });
      }

      form.reset();
      setIsAddDialogOpen(false);
      setEditingCategory(null);
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la categoría."
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      type: category.type,
      color: category.color || '#6366F1',
      icon: category.icon || 'folder',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if category is being used
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', id)
        .limit(1);

      if (transactions && transactions.length > 0) {
        toast({
          variant: "destructive",
          title: "No se puede eliminar",
          description: "Esta categoría está siendo utilizada en transacciones."
        });
        return;
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Categoría eliminada correctamente."
      });

      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la categoría."
      });
    }
  };

  const getIcon = (iconName: string) => {
    const iconMap = {
      'folder': Folder,
      'shopping-cart': ShoppingCart,
      'home': Home,
      'car': Car,
      'utensils': Utensils,
      'coffee': Coffee,
      'plane': Plane,
      'gamepad-2': Gamepad2,
      'book': Book,
      'heart': Heart,
      'shirt': Shirt,
      'gift': Gift,
      'briefcase': Briefcase,
      'piggy-bank': PiggyBank,
      'credit-card': CreditCard,
    };
    
    return iconMap[iconName as keyof typeof iconMap] || Folder;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: defaultCurrency
    }).format(amount);
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const totalIncomeAmount = incomeCategories.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const totalExpenseAmount = expenseCategories.reduce((sum, c) => sum + (c.totalAmount || 0), 0);

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
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-4 sm:p-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Organiza tus transacciones con categorías personalizadas
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingCategory(null);
                form.reset();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="sm:inline">Nueva Categoría</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Modifica los detalles de la categoría' : 'Crea una nueva categoría para organizar tus transacciones'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Alimentación, Transporte" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icono</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un icono" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input type="color" {...field} className="h-12 w-full" />
                          <div className="grid grid-cols-10 gap-2">
                            {predefinedColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`w-8 h-8 rounded-md border-2 ${
                                  field.value === color ? 'border-gray-900' : 'border-gray-300'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => field.onChange(color)}
                              />
                            ))}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingCategory ? 'Actualizar' : 'Crear'} Categoría
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Categorías</CardTitle>
            <Folder className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-primary">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              {incomeCategories.length} ingresos, {expenseCategories.length} gastos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Ingresos por Categoría</CardTitle>
            <TrendingUp className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-income">{formatCurrency(totalIncomeAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {incomeCategories.reduce((sum, c) => sum + (c.transactionCount || 0), 0)} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Gastos por Categoría</CardTitle>
            <TrendingDown className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-expense">{formatCurrency(totalExpenseAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {expenseCategories.reduce((sum, c) => sum + (c.transactionCount || 0), 0)} transacciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Sections */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Income Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-income" />
              <CardTitle>Categorías de Ingresos</CardTitle>
            </div>
            <CardDescription>
              {incomeCategories.length} categorías configuradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No hay categorías de ingresos</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    form.reset({ type: 'income' });
                    setIsAddDialogOpen(true);
                  }}
                >
                  Crear Primera Categoría
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {incomeCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {React.createElement(getIcon(category.icon || 'folder'), {
                          className: "h-5 w-5",
                          style: { color: category.color }
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base mb-1">{category.name}</p>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            <span>{category.transactionCount || 0} transacciones</span>
                          </div>
                          <span className="text-income font-medium">
                            {formatCurrency(category.totalAmount || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-expense" />
              <CardTitle>Categorías de Gastos</CardTitle>
            </div>
            <CardDescription>
              {expenseCategories.length} categorías configuradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No hay categorías de gastos</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    form.reset({ type: 'expense' });
                    setIsAddDialogOpen(true);
                  }}
                >
                  Crear Primera Categoría
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {React.createElement(getIcon(category.icon || 'folder'), {
                          className: "h-5 w-5",
                          style: { color: category.color }
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base mb-1">{category.name}</p>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            <span>{category.transactionCount || 0} transacciones</span>
                          </div>
                          <span className="text-expense font-medium">
                            {formatCurrency(category.totalAmount || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Categories;