import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, 
  Heart,
  DollarSign,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Settings,
  TrendingUp,
  Gift,
  Edit,
  Trash2
} from 'lucide-react';

interface Diezmo {
  id: string;
  amount: number;
  period_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  is_paid: boolean;
  paid_date?: string;
  notes?: string;
  created_at: string;
}

interface Profile {
  tithe_enabled: boolean;
  tithe_period: 'weekly' | 'monthly';
}

const paymentSchema = z.object({
  paid_date: z.date(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const Diezmos = () => {
  const [diezmos, setDiezmos] = useState<Diezmo[]>([]);
  const [profile, setProfile] = useState<Profile>({ tithe_enabled: false, tithe_period: 'monthly' });
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDiezmo, setSelectedDiezmo] = useState<Diezmo | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile: userProfile, defaultCurrency } = useUserProfile();
  const { convertToUserCurrency } = useCurrencyConverter();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paid_date: new Date(),
      notes: '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load profile settings
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tithe_enabled, tithe_period, default_currency')
        .eq('user_id', user?.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Load diezmos
      const { data: diezmosData, error: diezmosError } = await supabase
        .from('diezmos')
        .select('*')
        .order('period_start', { ascending: false });

      if (diezmosError) throw diezmosError;

      setDiezmos(diezmosData as Diezmo[] || []);

      // Calcular automáticamente los diezmos pendientes basados en ingresos
      if (profileData?.tithe_enabled) {
        await calculateCurrentPeriodTithes(profileData.tithe_period);
      }

    } catch (error) {
      console.error('Error loading diezmos data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información de diezmos."
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, ...updates }));
      
      toast({
        title: "¡Configuración actualizada!",
        description: "Los cambios se han guardado correctamente."
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la configuración."
      });
    }
  };

  const markAsPaid = async (data: PaymentFormValues) => {
    if (!selectedDiezmo) return;

    try {
      const { error } = await supabase
        .from('diezmos')
        .update({
          is_paid: true,
          paid_date: format(data.paid_date, 'yyyy-MM-dd'),
          notes: data.notes || null,
        })
        .eq('id', selectedDiezmo.id);

      if (error) throw error;

      toast({
        title: "¡Diezmo registrado!",
        description: "El diezmo ha sido marcado como pagado."
      });

      loadData();
      setPaymentDialogOpen(false);
      setSelectedDiezmo(null);
      form.reset();

    } catch (error) {
      console.error('Error marking diezmo as paid:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo marcar el diezmo como pagado."
      });
    }
  };

  const calculateCurrentPeriodTithes = async (tithe_period: string) => {
    try {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      if (tithe_period === 'weekly') {
        // Semana actual (lunes a domingo)
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - now.getDay() + 1);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
      } else {
        // Mes actual
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      // Obtener todos los ingresos del período actual que generen diezmo
      const { data: incomes, error: incomesError } = await supabase
        .from('transactions')
        .select('amount, account_id, accounts(currency)')
        .eq('type', 'income')
        .eq('generate_tithe', true)
        .gte('transaction_date', format(periodStart, 'yyyy-MM-dd'))
        .lte('transaction_date', format(periodEnd, 'yyyy-MM-dd'));

      if (incomesError) throw incomesError;

      // Obtener todos los ingresos del período y convertirlos a la moneda preferida del usuario
      const totalIncome = incomes?.reduce((sum, income) => {
        if (!income.accounts?.currency || !income.amount) return sum;
        const convertedAmount = convertToUserCurrency(Number(income.amount), income.accounts.currency);
        return sum + convertedAmount;
      }, 0) || 0;
      const titheAmount = totalIncome * 0.1;

      if (titheAmount > 0) {
        // Verificar si ya existe un registro para este período
        const { data: existingPeriod, error: periodError } = await supabase
          .from('diezmos')
          .select('*')
          .eq('user_id', user?.id)
          .eq('period_start', format(periodStart, 'yyyy-MM-dd'))
          .eq('period_end', format(periodEnd, 'yyyy-MM-dd'))
          .maybeSingle();

        if (periodError && periodError.code !== 'PGRST116') throw periodError;

        if (existingPeriod) {
          // Actualizar el monto si cambió
          if (Number(existingPeriod.amount) !== titheAmount) {
            const { error: updateError } = await supabase
              .from('diezmos')
              .update({ amount: titheAmount })
              .eq('id', existingPeriod.id);

            if (updateError) throw updateError;
          }
        } else {
          // Crear nuevo período
          const { error: insertError } = await supabase
            .from('diezmos')
            .insert({
              user_id: user?.id,
              amount: titheAmount,
              period_type: tithe_period,
              period_start: format(periodStart, 'yyyy-MM-dd'),
              period_end: format(periodEnd, 'yyyy-MM-dd'),
            });

          if (insertError) throw insertError;
        }
      }
    } catch (error) {
      console.error('Error calculating current period tithes:', error);
    }
  };

  const generateMissingPeriods = async () => {
    if (!profile.tithe_enabled) {
      toast({
        variant: "destructive",
        title: "Diezmo desactivado",
        description: "Primero activa el diezmo automático en la configuración."
      });
      return;
    }

    await calculateCurrentPeriodTithes(profile.tithe_period);
    
    toast({
      title: "Período actualizado",
      description: "Se ha calculado el diezmo del período actual basado en tus ingresos."
    });

    loadData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: defaultCurrency
    }).format(amount);
  };

  const formatPeriod = (diezmo: Diezmo) => {
    const start = new Date(diezmo.period_start);
    const end = new Date(diezmo.period_end);
    
    if (diezmo.period_type === 'weekly') {
      return `Semana del ${format(start, 'd MMM', { locale: es })} al ${format(end, 'd MMM yyyy', { locale: es })}`;
    } else {
      return `${format(start, 'MMMM yyyy', { locale: es })}`.charAt(0).toUpperCase() + `${format(start, 'MMMM yyyy', { locale: es })}`.slice(1);
    }
  };

  const totalPending = diezmos.filter(d => !d.is_paid).reduce((sum, d) => sum + Number(d.amount), 0);
  const totalPaid = diezmos.filter(d => d.is_paid).reduce((sum, d) => sum + Number(d.amount), 0);
  const pendingCount = diezmos.filter(d => !d.is_paid).length;

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
            Diezmos
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gestiona tu diezmo para honrar a Dios con tus ingresos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={generateMissingPeriods}
            className="hover:scale-105 transition-all duration-200 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Actualizar Período</span>
            <span className="sm:hidden">Actualizar</span>
          </Button>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="hover:scale-105 transition-all duration-200 w-full sm:w-auto"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Configuración</span>
                <span className="sm:hidden">Config</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configuración de Diezmos</DialogTitle>
                <DialogDescription>
                  Configura cómo quieres gestionar tu diezmo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium">Activar diezmo automático</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Descuenta automáticamente el 10% de tus ingresos
                    </p>
                  </div>
                  <Switch
                    checked={profile.tithe_enabled}
                    onCheckedChange={(checked) => updateProfile({ tithe_enabled: checked })}
                    className="self-start sm:self-center"
                  />
                </div>
                
                {profile.tithe_enabled && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Período de acumulación</label>
                    <Select
                      value={profile.tithe_period}
                      onValueChange={(value: 'weekly' | 'monthly') => updateProfile({ tithe_period: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diezmo Pendiente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">
              {pendingCount} período{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diezmo Pagado</CardTitle>
            <CheckCircle className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              Total entregado este año
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile.tithe_enabled ? 
                <span className="text-income">Activo</span> : 
                <span className="text-muted-foreground">Inactivo</span>
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Diezmo automático {profile.tithe_enabled ? profile.tithe_period : 'desactivado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Diezmos List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Historial de Diezmos</CardTitle>
          <CardDescription>
            Registro de todos tus diezmos por período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {diezmos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay diezmos registrados</p>
              <p className="text-sm">Activa el diezmo automático o genera períodos manualmente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {diezmos.map((diezmo) => (
                <div
                  key={diezmo.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${diezmo.is_paid ? 'bg-income/20' : 'bg-amber-500/20'}`}>
                      {diezmo.is_paid ? (
                        <CheckCircle className="h-5 w-5 text-income" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{formatPeriod(diezmo)}</p>
                      <p className="text-sm text-muted-foreground">
                        {diezmo.is_paid ? 
                          `Pagado el ${format(new Date(diezmo.paid_date!), 'd MMM yyyy', { locale: es })}` :
                          'Pendiente de pago'
                        }
                      </p>
                      {diezmo.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{diezmo.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(Number(diezmo.amount))}</p>
                      <Badge variant={diezmo.is_paid ? "default" : "secondary"}>
                        {diezmo.is_paid ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </div>
                    {!diezmo.is_paid && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedDiezmo(diezmo);
                          setPaymentDialogOpen(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        Marcar como pagado
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago de Diezmo</DialogTitle>
            <DialogDescription>
              Marca este diezmo como pagado y agrega detalles del pago
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(markAsPaid)} className="space-y-4">
              <FormField
                control={form.control}
                name="paid_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de pago</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Agregar detalles del pago..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Registrar Pago
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Diezmos;