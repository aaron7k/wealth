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
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, addMonths, addWeeks, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, 
  Calendar as CalendarIcon,
  CreditCard,
  AlertTriangle,
  Globe,
  TrendingUp,
  PlayCircle,
  PauseCircle,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
  amount: number;
  billing_cycle: string; // Changed from union type to string
  next_billing_date: string;
  status: 'active' | 'paused' | 'cancelled';
  category: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  account_id: string;
  account?: { name: string; bank_name?: string; currency: string; type: string };
}

interface Account {
  id: string;
  name: string;
  bank_name?: string;
  currency: string;
  type: string;
  balance: number;
}

const subscriptionSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  billing_cycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  next_billing_date: z.date(),
  category: z.string().min(1, 'La categoría es requerida'),
  description: z.string().optional(),
  website_url: z.string().optional(),
  account_id: z.string().min(1, 'Selecciona una cuenta'),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, defaultCurrency } = useUserProfile();
  const { convertToUserCurrency, formatCurrencyWithConversion } = useCurrencyConverter();

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: '',
      amount: 0,
      billing_cycle: 'monthly',
      next_billing_date: new Date(),
      category: '',
      description: '',
      website_url: '',
      account_id: '',
    },
  });

  const categories = [
    'Entertainment',
    'Software',
    'Fitness',
    'Education',
    'Music',
    'News',
    'Storage',
    'Gaming',
    'Productivity',
    'Security',
    'Other'
  ];

  useEffect(() => {
    if (profile && defaultCurrency) {
      loadData();
    }
  }, [profile, defaultCurrency]);


  const loadData = async () => {
    try {
      setLoading(true);

      // Load subscriptions with account details
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          accounts(name, bank_name, currency, type)
        `)
        .order('next_billing_date', { ascending: true });

      if (subscriptionsError) throw subscriptionsError;

      // Load accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (accountsError) throw accountsError;

      // Transform subscription data to match interface
      const transformedSubscriptions = subscriptionsData?.map(s => ({
        ...s,
        account: s.accounts ? {
          name: s.accounts.name,
          bank_name: s.accounts.bank_name,
          currency: s.accounts.currency,
          type: s.accounts.type
        } : undefined
      })) || [];

      setSubscriptions(transformedSubscriptions);
      setAccounts(accountsData || []);

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

  const onSubmit = async (data: SubscriptionFormValues) => {
    try {
      const subscriptionData = {
        name: data.name,
        amount: data.amount,
        billing_cycle: data.billing_cycle,
        next_billing_date: format(data.next_billing_date, 'yyyy-MM-dd'),
        category: data.category,
        description: data.description || '',
        website_url: data.website_url || '',
        account_id: data.account_id,
        user_id: user?.id || '',
        status: 'active' as const,
      };

      if (editingSubscription) {
        const { error } = await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('id', editingSubscription.id);

        if (error) throw error;

        toast({
          title: "¡Éxito!",
          description: "Suscripción actualizada correctamente."
        });
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert(subscriptionData);

        if (error) throw error;

        toast({
          title: "¡Éxito!",
          description: "Suscripción creada correctamente."
        });
      }

      form.reset();
      setIsAddDialogOpen(false);
      setEditingSubscription(null);
      loadData();
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la suscripción."
      });
    }
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    form.reset({
      name: subscription.name,
      amount: Number(subscription.amount),
      billing_cycle: subscription.billing_cycle as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
      next_billing_date: new Date(subscription.next_billing_date),
      category: subscription.category,
      description: subscription.description || '',
      website_url: subscription.website_url || '',
      account_id: subscription.account_id,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Suscripción eliminada correctamente."
      });

      loadData();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la suscripción."
      });
    }
  };

  const toggleSubscriptionStatus = async (subscription: Subscription) => {
    try {
      const newStatus = subscription.status === 'active' ? 'paused' : 'active';
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: `Suscripción ${newStatus === 'active' ? 'activada' : 'pausada'} correctamente.`
      });

      loadData();
    } catch (error) {
      console.error('Error updating subscription status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado de la suscripción."
      });
    }
  };

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || defaultCurrency
    }).format(amount);
  };

  const getBillingCycleLabel = (cycle: string) => {
    const labels = {
      weekly: 'Semanal',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    };
    return labels[cycle as keyof typeof labels] || cycle;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'paused': return 'Pausada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getDaysUntilBilling = (date: string) => {
    return differenceInDays(new Date(date), new Date());
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalMonthlyAmount = activeSubscriptions.reduce((sum, s) => {
    const multiplier = {
      weekly: 4.33,
      monthly: 1,
      quarterly: 1/3,
      yearly: 1/12
    }[s.billing_cycle] || 1;
    return sum + (Number(s.amount) * multiplier);
  }, 0);

  const upcomingBillings = activeSubscriptions.filter(s => getDaysUntilBilling(s.next_billing_date) <= 7);

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
          <h1 className="text-3xl font-bold tracking-tight">Suscripciones</h1>
          <p className="text-muted-foreground">
            Gestiona todas tus suscripciones y servicios recurrentes
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingSubscription(null);
              form.reset();
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Suscripción
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingSubscription ? 'Editar Suscripción' : 'Nueva Suscripción'}
              </DialogTitle>
              <DialogDescription>
                {editingSubscription ? 'Modifica los detalles de la suscripción' : 'Registra una nueva suscripción o servicio recurrente'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Servicio</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Netflix, Spotify" {...field} />
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
                      <FormLabel>Precio</FormLabel>
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
                  name="billing_cycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciclo de Facturación</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el ciclo" />
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
                  name="category"
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
                            <SelectItem key={category} value={category}>
                              {category}
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
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta de Pago</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una cuenta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} - {formatCurrency(account.balance)}
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
                  name="next_billing_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Próxima Fecha de Facturación</FormLabel>
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
                              date < new Date()
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
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sitio Web (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detalles adicionales..." {...field} />
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
                    {editingSubscription ? 'Actualizar' : 'Crear'} Suscripción
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
            <CardTitle className="text-sm font-medium">Gasto Mensual</CardTitle>
            <CreditCard className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">{formatCurrency(totalMonthlyAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {activeSubscriptions.length} suscripciones activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Cobros</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{upcomingBillings.length}</div>
            <p className="text-xs text-muted-foreground">
              en los próximos 7 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suscripciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{subscriptions.length}</div>
            <p className="text-xs text-muted-foreground">
              {subscriptions.filter(s => s.status === 'paused').length} pausadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Billings Alert */}
      {upcomingBillings.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle className="text-warning">Próximos Cobros</CardTitle>
            </div>
            <CardDescription>
              Tienes {upcomingBillings.length} suscripciones que se cobrarán pronto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingBillings.slice(0, 3).map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between">
                  <span className="font-medium">{subscription.name}</span>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(Number(subscription.amount))}</span>
                    <p className="text-xs text-muted-foreground">
                      en {getDaysUntilBilling(subscription.next_billing_date)} días
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Suscripciones</CardTitle>
          <CardDescription>
            {subscriptions.length} suscripciones registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No tienes suscripciones registradas</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                Registrar Primera Suscripción
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => {
                const daysUntilBilling = getDaysUntilBilling(subscription.next_billing_date);
                const isUpcoming = daysUntilBilling <= 7 && daysUntilBilling >= 0;

                return (
                  <div
                    key={subscription.id}
                    className={`p-4 border rounded-lg space-y-3 ${
                      isUpcoming ? 'border-warning/30 bg-warning/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{subscription.name}</h3>
                            <Badge variant={getStatusColor(subscription.status)}>
                              {getStatusLabel(subscription.status)}
                            </Badge>
                            <Badge variant="outline">
                              {subscription.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {subscription.account?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {formatCurrency(Number(subscription.amount))}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getBillingCycleLabel(subscription.billing_cycle)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {subscription.website_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(subscription.website_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSubscriptionStatus(subscription)}
                          >
                            {subscription.status === 'active' ? 
                              <PauseCircle className="h-4 w-4" /> :
                              <PlayCircle className="h-4 w-4" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(subscription)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(subscription.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span>Próximo cobro: {format(new Date(subscription.next_billing_date), 'dd MMM yyyy', { locale: es })}</span>
                        {isUpcoming && daysUntilBilling > 0 && (
                          <Badge variant="outline" className="text-warning border-warning">
                            En {daysUntilBilling} días
                          </Badge>
                        )}
                        {daysUntilBilling === 0 && (
                          <Badge variant="destructive">
                            Hoy
                          </Badge>
                        )}
                      </div>
                      {subscription.description && (
                        <p className="text-muted-foreground text-xs max-w-xs truncate">
                          {subscription.description}
                        </p>
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

export default Subscriptions;