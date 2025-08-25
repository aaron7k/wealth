import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Target, DollarSign, Calendar as CalendarIconSmall, Trash2, Coins, TrendingUp, CheckCircle, Edit3, History, BarChart3 } from 'lucide-react';
import { format, differenceInDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';

interface Goal {
  id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  currency: string;
  target_date: string | null;
  image_url: string | null;
  is_completed: boolean;
  created_at: string;
}

interface GoalContribution {
  id: string;
  goal_id: string;
  amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
}

const Goals = () => {
  const { user } = useAuth();
  const { profile, defaultCurrency } = useUserProfile();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isContributionDialogOpen, setIsContributionDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form states
  const [newGoal, setNewGoal] = useState({
    name: '',
    description: '',
    target_amount: '',
    target_date: undefined as Date | undefined,
    image_url: ''
  });

  const [newContribution, setNewContribution] = useState({
    amount: '',
    notes: ''
  });

  const { convertToUserCurrency, formatCurrencyWithConversion } = useCurrencyConverter();

  useEffect(() => {
    if (user && profile) {
      loadGoals();
      loadContributions();
    }
  }, [user, profile]);


  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('Error al cargar las metas');
    } finally {
      setLoading(false);
    }
  };

  const loadContributions = async () => {
    try {
      const { data, error } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributions(data || []);
    } catch (error) {
      console.error('Error loading contributions:', error);
    }
  };

  const createGoal = async () => {
    if (!newGoal.name || !newGoal.target_amount || !profile) return;

    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user?.id,
          name: newGoal.name,
          description: newGoal.description || null,
          target_amount: parseFloat(newGoal.target_amount),
          currency: defaultCurrency,
          target_date: newGoal.target_date ? format(newGoal.target_date, 'yyyy-MM-dd') : null,
          image_url: newGoal.image_url || null
        });

      if (error) throw error;

      toast.success('Meta creada exitosamente');
      setIsCreateDialogOpen(false);
      setNewGoal({ name: '', description: '', target_amount: '', target_date: undefined, image_url: '' });
      loadGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Error al crear la meta');
    }
  };

  const updateGoal = async () => {
    if (!editingGoal || !profile) return;

    try {
      const { error } = await supabase
        .from('goals')
        .update({
          name: editingGoal.name,
          description: editingGoal.description,
          target_amount: editingGoal.target_amount,
          target_date: editingGoal.target_date,
          image_url: editingGoal.image_url
        })
        .eq('id', editingGoal.id);

      if (error) throw error;

      toast.success('Meta actualizada exitosamente');
      setIsEditDialogOpen(false);
      setEditingGoal(null);
      loadGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Error al actualizar la meta');
    }
  };

  const addContribution = async () => {
    if (!newContribution.amount || !selectedGoal || !profile) return;

    try {
      const contributionAmount = parseFloat(newContribution.amount);
      
      // Add contribution
      const { error: contributionError } = await supabase
        .from('goal_contributions')
        .insert({
          goal_id: selectedGoal.id,
          user_id: user?.id,
          amount: contributionAmount,
          currency: defaultCurrency,
          notes: newContribution.notes || null
        });

      if (contributionError) throw contributionError;

      // Update goal current amount
      const newCurrentAmount = selectedGoal.current_amount + contributionAmount;
      const isCompleted = newCurrentAmount >= selectedGoal.target_amount;

      const { error: goalError } = await supabase
        .from('goals')
        .update({
          current_amount: newCurrentAmount,
          is_completed: isCompleted
        })
        .eq('id', selectedGoal.id);

      if (goalError) throw goalError;

      toast.success('Abono agregado exitosamente');
      setIsContributionDialogOpen(false);
      setNewContribution({ amount: '', notes: '' });
      setSelectedGoal(null);
      loadGoals();
      loadContributions();
    } catch (error) {
      console.error('Error adding contribution:', error);
      toast.error('Error al agregar el abono');
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast.success('Meta eliminada exitosamente');
      loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Error al eliminar la meta');
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Métricas calculadas
  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => goal.is_completed).length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
  const totalSaved = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const activeGoals = goals.filter(goal => !goal.is_completed);
  const averageProgress = activeGoals.length > 0 
    ? activeGoals.reduce((sum, goal) => sum + getProgressPercentage(goal.current_amount, goal.target_amount), 0) / activeGoals.length 
    : 0;

  // Contribuciones recientes (último mes)
  const lastMonthContributions = contributions.filter(contribution => 
    new Date(contribution.created_at) >= subMonths(new Date(), 1)
  );
  const monthlyContributionAmount = lastMonthContributions.reduce((sum, contribution) => sum + contribution.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Metas de Ahorro</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Crea y gestiona tus objetivos financieros
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nueva Meta</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Meta</DialogTitle>
              <DialogDescription>
                Define tu objetivo de ahorro y empieza a trabajar hacia él
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la meta</Label>
                <Input
                  id="name"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="Ej: Vacaciones en Europa"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Describe tu meta..."
                />
              </div>
              <div>
                <Label htmlFor="target_amount">Monto objetivo</Label>
                <Input
                  id="target_amount"
                  type="number"
                  step="0.01"
                  value={newGoal.target_amount}
                  onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="image_url">URL de imagen (opcional)</Label>
                <Input
                  id="image_url"
                  value={newGoal.image_url}
                  onChange={(e) => setNewGoal({ ...newGoal, image_url: e.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                {newGoal.image_url && (
                  <div className="mt-2">
                    <img
                      src={newGoal.image_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Fecha objetivo (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newGoal.target_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newGoal.target_date ? format(newGoal.target_date, "PPP") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newGoal.target_date}
                      onSelect={(date) => setNewGoal({ ...newGoal, target_date: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={createGoal} className="w-full">
                Crear Meta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="goals" className="text-xs sm:text-sm">
            <Target className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Mis Metas</span>
            <span className="sm:hidden">Metas</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="text-xs sm:text-sm">
            <BarChart3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Métricas</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <History className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Historial</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6">
          {goals.length === 0 ? (
            <Card className="p-12 text-center">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tienes metas aún</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera meta de ahorro para empezar a trabajar hacia tus sueños
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primera Meta
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => {
                const progressPercentage = getProgressPercentage(goal.current_amount, goal.target_amount);
                const isCompleted = goal.is_completed;
                const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;
                
                return (
                  <Card key={goal.id} className={cn(
                    "relative overflow-hidden transition-all duration-200 hover:shadow-lg",
                    isCompleted && "border-success bg-success/5"
                  )}>
                    {goal.image_url && (
                      <div className="relative h-32 sm:h-40 w-full overflow-hidden">
                        <img
                          src={goal.image_url}
                          alt={goal.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    )}
                    <CardHeader className="pb-2 p-4 sm:p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-base sm:text-lg mb-1 leading-tight">{goal.name}</CardTitle>
                          {goal.description && (
                            <CardDescription className="text-xs sm:text-sm line-clamp-2">
                              {goal.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingGoal(goal);
                              setIsEditDialogOpen(true);
                            }}
                            className="text-muted-foreground hover:text-primary p-1 h-8 w-8"
                          >
                            <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteGoal(goal.id)}
                            className="text-destructive hover:text-destructive p-1 h-8 w-8"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span>Progreso</span>
                          <span className="font-medium">
                            {progressPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={progressPercentage} className="h-1.5 sm:h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <p className="text-muted-foreground">Actual</p>
                          <p className="font-semibold text-primary text-sm sm:text-base">
                            {formatCurrency(goal.current_amount, goal.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Objetivo</p>
                          <p className="font-semibold text-sm sm:text-base">
                            {formatCurrency(goal.target_amount, goal.currency)}
                          </p>
                        </div>
                      </div>

                      {goal.target_date && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <CalendarIconSmall className="mr-1 h-3 w-3" />
                            {format(new Date(goal.target_date), 'PP')}
                          </div>
                          {daysLeft !== null && (
                            <Badge variant={daysLeft < 30 ? "destructive" : daysLeft < 90 ? "default" : "secondary"}>
                              {daysLeft > 0 ? `${daysLeft} días` : 'Vencida'}
                            </Badge>
                          )}
                        </div>
                      )}

                      {!isCompleted && (
                        <Button
                          onClick={() => {
                            setSelectedGoal(goal);
                            setIsContributionDialogOpen(true);
                          }}
                          className="w-full"
                          size="sm"
                        >
                          <Coins className="mr-2 h-4 w-4" />
                          Agregar Abono
                        </Button>
                      )}

                      {isCompleted && (
                        <div className="text-center py-2">
                          <span className="text-success font-semibold flex items-center justify-center">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            ¡Meta Completada!
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Metas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalGoals}</div>
                <p className="text-xs text-muted-foreground">
                  {completedGoals} completadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  de metas completadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ahorrado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalSaved, defaultCurrency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  de {formatCurrency(totalTarget, defaultCurrency)} objetivo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageProgress.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  en metas activas
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Metas por Estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Metas Completadas</span>
                    <span className="font-medium">{completedGoals}</span>
                  </div>
                  <Progress value={(completedGoals / totalGoals) * 100} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Metas Activas</span>
                    <span className="font-medium">{activeGoals.length}</span>
                  </div>
                  <Progress value={(activeGoals.length / totalGoals) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actividad del Último Mes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {lastMonthContributions.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Abonos realizados</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-semibold">
                    {formatCurrency(monthlyContributionAmount, defaultCurrency)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total ahorrado este mes</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Contribuciones</CardTitle>
              <CardDescription>
                Últimas contribuciones realizadas a tus metas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contributions.length === 0 ? (
                <div className="text-center py-8">
                  <Coins className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay contribuciones aún</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contributions.slice(0, 10).map((contribution) => {
                    const goal = goals.find(g => g.id === contribution.goal_id);
                    return (
                      <div key={contribution.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{goal?.name || 'Meta eliminada'}</p>
                          {contribution.notes && (
                            <p className="text-sm text-muted-foreground">{contribution.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(contribution.created_at), 'PPP')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            +{formatCurrency(contribution.amount, contribution.currency)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contribution Dialog */}
      <Dialog open={isContributionDialogOpen} onOpenChange={setIsContributionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Abono</DialogTitle>
            <DialogDescription>
              Agrega dinero a tu meta: {selectedGoal?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Monto del abono</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newContribution.amount}
                onChange={(e) => setNewContribution({ ...newContribution, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={newContribution.notes}
                onChange={(e) => setNewContribution({ ...newContribution, notes: e.target.value })}
                placeholder="Describe este abono..."
              />
            </div>
            <Button onClick={addContribution} className="w-full">
              Agregar Abono
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Meta</DialogTitle>
            <DialogDescription>
              Modifica los detalles de tu meta
            </DialogDescription>
          </DialogHeader>
          {editingGoal && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nombre de la meta</Label>
                <Input
                  id="edit-name"
                  value={editingGoal.name}
                  onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                  placeholder="Ej: Vacaciones en Europa"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Descripción (opcional)</Label>
                <Textarea
                  id="edit-description"
                  value={editingGoal.description || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                  placeholder="Describe tu meta..."
                />
              </div>
              <div>
                <Label htmlFor="edit-target-amount">Monto objetivo</Label>
                <Input
                  id="edit-target-amount"
                  type="number"
                  step="0.01"
                  value={editingGoal.target_amount}
                  onChange={(e) => setEditingGoal({ ...editingGoal, target_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="edit-image-url">URL de imagen (opcional)</Label>
                <Input
                  id="edit-image-url"
                  value={editingGoal.image_url || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, image_url: e.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                {editingGoal.image_url && (
                  <div className="mt-2">
                    <img
                      src={editingGoal.image_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Fecha objetivo (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editingGoal.target_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingGoal.target_date ? format(new Date(editingGoal.target_date), "PPP") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editingGoal.target_date ? new Date(editingGoal.target_date) : undefined}
                      onSelect={(date) => setEditingGoal({ 
                        ...editingGoal, 
                        target_date: date ? format(date, 'yyyy-MM-dd') : null 
                      })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={updateGoal} className="w-full">
                Actualizar Meta
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Goals;