import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Heart, 
  PiggyBank,
  Save,
  Settings as SettingsIcon
} from 'lucide-react';
import DangerZone from '@/components/DangerZone';

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  tithe_enabled: boolean;
  tithe_period: string;
  auto_deduct_tithe: boolean;
  savings_percentage: number;
  default_currency?: string;
}

const Settings = () => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    tithe_enabled: false,
    tithe_period: 'monthly',
    auto_deduct_tithe: false,
    savings_percentage: 10,
    default_currency: 'USD'
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading, updateProfile, refreshProfile } = useUserProfile();

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        tithe_enabled: profile.tithe_enabled || false,
        tithe_period: profile.tithe_period || 'monthly',
        auto_deduct_tithe: profile.auto_deduct_tithe || false,
        savings_percentage: Number(profile.savings_percentage) || 10,
        default_currency: profile.default_currency || 'USD'
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const profileData = {
        full_name: formData.full_name || null,
        tithe_enabled: formData.tithe_enabled,
        tithe_period: formData.tithe_period,
        auto_deduct_tithe: formData.auto_deduct_tithe,
        savings_percentage: formData.savings_percentage,
        default_currency: formData.default_currency,
      };

      const success = await updateProfile(profileData);

      if (success) {
        toast({
          title: "¡Éxito!",
          description: "Configuración guardada correctamente."
        });
        await refreshProfile();
      } else {
        throw new Error('Failed to update profile');
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la configuración."
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-48"></div>
              <div className="h-4 bg-muted rounded w-64"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-10 bg-muted rounded"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuraciones</h1>
          <p className="text-muted-foreground">
            Gestiona tu perfil y preferencias
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Perfil Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Actualiza tu información personal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Tu nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Diezmos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Configuración de Diezmos
            </CardTitle>
            <CardDescription>
              Gestiona el cálculo automático de diezmos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Diezmo Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Calcular automáticamente el 10% de los ingresos
                </p>
              </div>
              <Switch
                checked={formData.tithe_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, tithe_enabled: checked })}
              />
            </div>

            {formData.tithe_enabled && (
              <>
                <div className="space-y-2">
                  <Label>Período de Acumulación</Label>
                  <Select
                    value={formData.tithe_period}
                    onValueChange={(value) => setFormData({ ...formData, tithe_period: value })}
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
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Descontar Automáticamente del Balance</Label>
                    <p className="text-sm text-muted-foreground">
                      Si está activado, el diezmo se descuenta automáticamente del balance de la cuenta al registrar un ingreso
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_deduct_tithe}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_deduct_tithe: checked })}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Configuración General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Configuración General
            </CardTitle>
            <CardDescription>
              Información de tu moneda predeterminada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_currency">Moneda Predeterminada</Label>
              <Select value={formData.default_currency} onValueChange={(value) => setFormData({ ...formData, default_currency: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                  <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                  <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Esta moneda se usa para todos los cálculos y reportes. Los valores de otras monedas se convertirán automáticamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Ahorros */}
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Configuración de Ahorros
            </CardTitle>
            <CardDescription>
              Configura el porcentaje de ahorros automático sobre ingresos (después del diezmo)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="savings_percentage">
                Porcentaje de Ahorros ({formData.savings_percentage}%)
              </Label>
              <Input
                id="savings_percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.savings_percentage}
                onChange={(e) => setFormData({ ...formData, savings_percentage: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-sm text-muted-foreground">
                Este porcentaje se aplicará sobre el monto restante después de descontar el diezmo.
                Por ejemplo: Ingreso $1000 → Diezmo $100 → Base para ahorros $900 → Ahorros ({formData.savings_percentage}%): ${((900 * formData.savings_percentage) / 100).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-24">
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
              Guardando...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Guardar Cambios
            </div>
          )}
        </Button>
      </div>

      {/* Danger Zone - Sutil */}
      <div className="mt-8 pt-6 border-t">
        <DangerZone />
      </div>
    </div>
  );
};

export default Settings;