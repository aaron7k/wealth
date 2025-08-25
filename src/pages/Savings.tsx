import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  PiggyBank, 
  TrendingUp, 
  Calendar,
  DollarSign,
  ArrowUpRight,
  Check,
  Edit,
  Plus
} from 'lucide-react';

interface SavingsRecord {
  id: string;
  amount: number;
  period_start: string;
  period_end: string;
  period_type: string;
  is_transferred: boolean;
  transfer_date: string | null;
  notes: string | null;
  created_at: string;
}

interface SavingsStats {
  totalSavings: number;
  pendingSavings: number;
  transferredSavings: number;
  monthlyAverage: number;
}

const Savings = () => {
  const [savings, setSavings] = useState<SavingsRecord[]>([]);
  const [stats, setStats] = useState<SavingsStats>({
    totalSavings: 0,
    pendingSavings: 0,
    transferredSavings: 0,
    monthlyAverage: 0
  });
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<SavingsRecord | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, defaultCurrency } = useUserProfile();
  const { convertToUserCurrency, formatCurrencyWithConversion } = useCurrencyConverter();

  useEffect(() => {
    if (profile && defaultCurrency) {
      loadSavingsData();
    }
  }, [profile, defaultCurrency]);


  const loadSavingsData = async () => {
    try {
      setLoading(true);

      const { data: savingsData, error } = await supabase
        .from('savings')
        .select('*')
        .order('period_end', { ascending: false });

      if (error) throw error;

      setSavings(savingsData || []);

      // Calculate stats
      const total = savingsData?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
      const pending = savingsData?.filter(s => !s.is_transferred).reduce((sum, s) => sum + Number(s.amount), 0) || 0;
      const transferred = savingsData?.filter(s => s.is_transferred).reduce((sum, s) => sum + Number(s.amount), 0) || 0;
      
      // Calculate monthly average (last 12 records or available records)
      const recentSavings = savingsData?.slice(0, 12) || [];
      const monthlyAvg = recentSavings.length > 0 ? 
        recentSavings.reduce((sum, s) => sum + Number(s.amount), 0) / recentSavings.length : 0;

      setStats({
        totalSavings: total,
        pendingSavings: pending,
        transferredSavings: transferred,
        monthlyAverage: monthlyAvg
      });

    } catch (error) {
      console.error('Error loading savings data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información de ahorros."
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsTransferred = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('savings')
        .update({ 
          is_transferred: true, 
          transfer_date: new Date().toISOString().split('T')[0],
          notes: notes 
        })
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Ahorro marcado como transferido."
      });

      loadSavingsData();
      setEditingRecord(null);
      setNotes('');
    } catch (error) {
      console.error('Error updating savings record:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el registro de ahorros."
      });
    }
  };

  const updateNotes = async (recordId: string, newNotes: string) => {
    try {
      const { error } = await supabase
        .from('savings')
        .update({ notes: newNotes })
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Notas actualizadas correctamente."
      });

      loadSavingsData();
      setEditingRecord(null);
      setNotes('');
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar las notas."
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: defaultCurrency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ahorros</h1>
          <p className="text-muted-foreground">
            Gestiona y visualiza tus ahorros automáticos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ahorrado</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.totalSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              Suma de todos los ahorros
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente de Transferir</CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(stats.pendingSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por transferir a cuenta de ahorros
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ya Transferido</CardTitle>
            <Check className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(stats.transferredSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              Transferido exitosamente
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Mensual</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.monthlyAverage)}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos períodos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Savings Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Historial de Ahorros
          </CardTitle>
          <CardDescription>
            Todos tus registros de ahorros automáticos por período
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes registros de ahorros aún</p>
              <p className="text-sm">Los ahorros se generan automáticamente con los ingresos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savings.map((record) => (
                <Card key={record.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {formatCurrency(Number(record.amount))}
                          </h3>
                          <Badge variant={record.is_transferred ? "default" : "secondary"}>
                            {record.is_transferred ? "Transferido" : "Pendiente"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Período: {formatDate(record.period_start)} - {formatDate(record.period_end)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          Tipo: {record.period_type}
                        </p>
                        {record.transfer_date && (
                          <p className="text-xs text-success">
                            Transferido el: {formatDate(record.transfer_date)}
                          </p>
                        )}
                        {record.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            "{record.notes}"
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingRecord(record);
                                setNotes(record.notes || '');
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Ahorro</DialogTitle>
                              <DialogDescription>
                                Actualiza las notas o marca como transferido
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="notes">Notas</Label>
                                <Textarea
                                  id="notes"
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="Agregar notas sobre este ahorro..."
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch 
                                  id="transferred" 
                                  checked={record.is_transferred}
                                  disabled={record.is_transferred}
                                />
                                <Label htmlFor="transferred">
                                  {record.is_transferred ? "Ya transferido" : "Marcar como transferido"}
                                </Label>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateNotes(record.id, notes)}
                                  className="flex-1"
                                >
                                  Actualizar Notas
                                </Button>
                                {!record.is_transferred && (
                                  <Button
                                    onClick={() => markAsTransferred(record.id)}
                                    variant="outline"
                                    className="flex-1"
                                  >
                                    <ArrowUpRight className="h-4 w-4 mr-2" />
                                    Transferir
                                  </Button>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {!record.is_transferred && (
                          <Button 
                            size="sm" 
                            onClick={() => markAsTransferred(record.id)}
                            className="bg-success hover:bg-success/90"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Savings;