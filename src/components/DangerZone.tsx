import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  Trash2, 
  ShieldX, 
  Database,
  CheckCircle,
  X
} from 'lucide-react';

interface ConfirmationStep {
  id: number;
  title: string;
  requiredText: string;
  description: string;
  completed: boolean;
  userInput: string;
}

const DangerZone: React.FC = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [showConfirmations, setShowConfirmations] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [finalConfirmation, setFinalConfirmation] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();

  const [confirmationSteps, setConfirmationSteps] = useState<ConfirmationStep[]>([
    {
      id: 1,
      title: 'Confirmación 1: Intención de eliminación',
      requiredText: 'ELIMINAR TODOS MIS DATOS',
      description: 'Confirma que deseas eliminar todos tus datos financieros permanentemente.',
      completed: false,
      userInput: ''
    },
    {
      id: 2,
      title: 'Confirmación 2: Entendimiento de consecuencias',
      requiredText: 'ENTIENDO QUE ESTA ACCIÓN ES IRREVERSIBLE',
      description: 'Confirma que entiendes que esta acción no se puede deshacer.',
      completed: false,
      userInput: ''
    },
    {
      id: 3,
      title: 'Confirmación 3: Datos específicos a eliminar',
      requiredText: 'CONFIRMO ELIMINAR TRANSACCIONES PAGOS TRANSFERENCIAS CUENTAS',
      description: 'Confirma que entiendes qué tipos de datos se eliminarán.',
      completed: false,
      userInput: ''
    },
    {
      id: 4,
      title: 'Confirmación 4: Confirmación final definitiva',
      requiredText: 'CONFIRMO ELIMINACIÓN DEFINITIVA DE TODOS MIS DATOS FINANCIEROS',
      description: 'Confirmación final antes de proceder con la eliminación.',
      completed: false,
      userInput: ''
    }
  ]);

  const updateStepInput = (stepId: number, value: string) => {
    setConfirmationSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            userInput: value,
            completed: value === step.requiredText
          } 
        : step
    ));
  };

  const allStepsCompleted = confirmationSteps.every(step => step.completed);

  const deleteAllUserData = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    
    try {
      const tablesToClear = [
        'transactions',
        'accounts', 
        'categories',
        'budgets',
        'automation_rules',
        'reports',
        'user_preferences'
      ];

      let totalDeleted = 0;
      const errors: string[] = [];

      for (const table of tablesToClear) {
        try {
          const { error, count } = await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id);

          if (error) {
            console.error(`Error deleting from ${table}:`, error);
            errors.push(`Error en ${table}: ${error.message}`);
          } else {
            totalDeleted += count || 0;
          }
        } catch (err) {
          console.error(`Exception deleting from ${table}:`, err);
          errors.push(`Excepción en ${table}`);
        }
      }

      // Limpiar profile pero mantener campos esenciales
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: null,
            tithe_enabled: false,
            tithe_period: 'monthly',
            auto_deduct_tithe: false,
            savings_percentage: 10,
            default_currency: 'USD',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          errors.push('Error limpiando perfil');
        }
      } catch (err) {
        console.error('Exception updating profile:', err);
        errors.push('Excepción limpiando perfil');
      }

      if (errors.length === 0) {
        toast({
          title: "✅ Datos eliminados exitosamente",
          description: `Se eliminaron todos tus datos financieros. Tu cuenta de usuario se mantiene activa.`,
        });
        
        // Reset confirmations
        setShowConfirmations(false);
        setCurrentStep(0);
        setConfirmationSteps(prev => prev.map(step => ({ 
          ...step, 
          completed: false, 
          userInput: '' 
        })));
        
        // Opcional: redirigir a página de inicio o recargar
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } else {
        toast({
          variant: "destructive",
          title: "❌ Eliminación parcial",
          description: `Se completó la eliminación con algunos errores: ${errors.join(', ')}`,
        });
      }

    } catch (error) {
      console.error('Error during deletion:', error);
      toast({
        variant: "destructive",
        title: "❌ Error durante la eliminación",
        description: "Ocurrió un error inesperado. Contacta al soporte si el problema persiste.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFinalDelete = async () => {
    if (finalConfirmation !== 'ELIMINAR DEFINITIVAMENTE') {
      toast({
        variant: "destructive",
        title: "Confirmación incorrecta",
        description: "Debes escribir exactamente: ELIMINAR DEFINITIVAMENTE",
      });
      return;
    }

    await deleteAllUserData();
  };

  if (!showDangerZone) {
    return (
      <div className="flex justify-end">
        <Button
          onClick={() => setShowDangerZone(true)}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar todos los datos
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-red-200 bg-red-50/50 animate-in slide-in-from-bottom duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ShieldX className="h-6 w-6" />
              Zona de Peligro
            </CardTitle>
            <CardDescription className="text-red-600">
              ⚠️ Acciones irreversibles que eliminarán permanentemente todos tus datos
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setShowDangerZone(false);
              setShowConfirmations(false);
              setCurrentStep(0);
              setFinalConfirmation('');
              setConfirmationSteps(prev => prev.map(step => ({ 
                ...step, 
                completed: false, 
                userInput: '' 
              })));
            }}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Información de lo que se eliminará */}
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div className="font-medium">Esta acción eliminará permanentemente:</div>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Todas tus transacciones registradas</li>
              <li>Todas tus cuentas bancarias y balances</li>
              <li>Todas tus categorías personalizadas</li>
              <li>Todos tus presupuestos y metas de ahorro</li>
              <li>Todas tus reglas de automatización</li>
              <li>Todos tus reportes generados</li>
              <li>Todas tus configuraciones personales</li>
            </ul>
            <div className="font-medium text-green-600 mt-2">
              ✅ Tu cuenta de usuario se mantendrá activa para uso futuro
            </div>
          </AlertDescription>
        </Alert>

        {!showConfirmations ? (
          <div className="space-y-4">
            <Button
              onClick={() => setShowConfirmations(true)}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <Database className="h-4 w-4 mr-2" />
              Iniciar Proceso de Eliminación de Datos
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Proceso de confirmación iniciado.</strong> Debes completar las 4 confirmaciones exactamente como se solicita.
              </AlertDescription>
            </Alert>

            {/* Steps de confirmación */}
            {confirmationSteps.map((step, index) => (
              <Card key={step.id} className={`
                border-2 transition-all duration-200
                ${step.completed ? 'border-green-200 bg-green-50' : 'border-gray-200'}
                ${currentStep === index ? 'ring-2 ring-blue-200' : ''}
              `}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {step.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    {step.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {step.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      Escribe exactamente: <code className="bg-gray-100 px-1 rounded text-red-600">
                        {step.requiredText}
                      </code>
                    </Label>
                    <Input
                      value={step.userInput}
                      onChange={(e) => updateStepInput(step.id, e.target.value)}
                      placeholder={`Escribe: ${step.requiredText}`}
                      className={
                        step.completed 
                          ? 'border-green-300 bg-green-50' 
                          : step.userInput && step.userInput !== step.requiredText
                            ? 'border-red-300 bg-red-50'
                            : ''
                      }
                      disabled={step.completed}
                    />
                    {step.userInput && step.userInput !== step.requiredText && !step.completed && (
                      <p className="text-xs text-red-600">
                        ❌ El texto no coincide exactamente
                      </p>
                    )}
                    {step.completed && (
                      <p className="text-xs text-green-600">
                        ✅ Confirmación completada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Confirmación final */}
            {allStepsCompleted && (
              <Card className="border-red-300 bg-red-100">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Confirmación Final
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    Último paso antes de eliminar todos tus datos permanentemente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-medium">
                      Para confirmar la eliminación definitiva, escribe exactamente: 
                      <code className="bg-red-200 px-1 rounded ml-1">ELIMINAR DEFINITIVAMENTE</code>
                    </Label>
                    <Input
                      value={finalConfirmation}
                      onChange={(e) => setFinalConfirmation(e.target.value)}
                      placeholder="ELIMINAR DEFINITIVAMENTE"
                      className="border-red-300"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleFinalDelete}
                      disabled={isDeleting || finalConfirmation !== 'ELIMINAR DEFINITIVAMENTE'}
                      variant="destructive"
                      className="flex-1"
                    >
                      {isDeleting ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                          Eliminando datos...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4" />
                          ELIMINAR TODOS LOS DATOS
                        </div>
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setShowConfirmations(false);
                        setCurrentStep(0);
                        setFinalConfirmation('');
                        setConfirmationSteps(prev => prev.map(step => ({ 
                          ...step, 
                          completed: false, 
                          userInput: '' 
                        })));
                      }}
                      variant="outline"
                      disabled={isDeleting}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DangerZone;