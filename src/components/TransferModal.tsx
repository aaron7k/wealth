import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRightLeft, AlertTriangle, Calculator, DollarSign } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  balance: number;
  currency: string;
  bank_name?: string;
  is_active: boolean;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onTransferComplete: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onTransferComplete
}) => {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { defaultCurrency } = useUserProfile();
  const { convertCurrency, formatCurrencyWithConversion } = useCurrencyConverter();

  const fromAccount = accounts.find(acc => acc.id === fromAccountId);
  const toAccount = accounts.find(acc => acc.id === toAccountId);
  const transferAmount = parseFloat(amount) || 0;

  // Filtrar cuentas activas
  const activeAccounts = accounts.filter(acc => acc.is_active);

  // Calcular conversión de moneda
  useEffect(() => {
    if (fromAccount && toAccount && transferAmount > 0) {
      if (fromAccount.currency === toAccount.currency) {
        setExchangeRate(1);
        setConvertedAmount(transferAmount);
      } else {
        const converted = convertCurrency(transferAmount, fromAccount.currency, toAccount.currency);
        const rate = converted / transferAmount;
        setExchangeRate(rate);
        setConvertedAmount(converted);
      }
    } else {
      setExchangeRate(null);
      setConvertedAmount(null);
    }
  }, [fromAccount, toAccount, transferAmount, convertCurrency]);

  const resetForm = () => {
    setFromAccountId('');
    setToAccountId('');
    setAmount('');
    setDescription('');
    setExchangeRate(null);
    setConvertedAmount(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateTransfer = (): string | null => {
    if (!fromAccount) return "Selecciona una cuenta de origen";
    if (!toAccount) return "Selecciona una cuenta de destino";
    if (fromAccountId === toAccountId) return "Las cuentas de origen y destino deben ser diferentes";
    if (transferAmount <= 0) return "El monto debe ser mayor a 0";
    if (transferAmount > fromAccount.balance) return "Saldo insuficiente en la cuenta de origen";
    return null;
  };

  const handleTransfer = async () => {
    const validationError = validateTransfer();
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: validationError
      });
      return;
    }

    if (!fromAccount || !toAccount || !convertedAmount) return;

    setIsTransferring(true);
    
    try {
      // Calcular nuevos balances
      const newFromBalance = fromAccount.balance - transferAmount;
      const newToBalance = toAccount.balance + convertedAmount;

      // Actualizar balance de cuenta origen
      const { error: fromError } = await supabase
        .from('accounts')
        .update({ 
          balance: newFromBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', fromAccountId);

      if (fromError) throw fromError;

      // Actualizar balance de cuenta destino
      const { error: toError } = await supabase
        .from('accounts')
        .update({ 
          balance: newToBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', toAccountId);

      if (toError) throw toError;

      // Registrar transacción de débito (cuenta origen)
      const { error: debitError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          account_id: fromAccountId,
          amount: -transferAmount, // Negativo para débito
          currency: fromAccount.currency,
          description: description || `Transferencia a ${toAccount.name}`,
          category: 'Transferencias',
          type: 'expense',
          date: new Date().toISOString(),
          is_transfer: true,
          transfer_account_id: toAccountId
        });

      if (debitError) throw debitError;

      // Registrar transacción de crédito (cuenta destino)
      const { error: creditError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          account_id: toAccountId,
          amount: convertedAmount, // Positivo para crédito
          currency: toAccount.currency,
          description: description || `Transferencia desde ${fromAccount.name}`,
          category: 'Transferencias',
          type: 'income',
          date: new Date().toISOString(),
          is_transfer: true,
          transfer_account_id: fromAccountId
        });

      if (creditError) throw creditError;

      toast({
        title: "✅ Transferencia exitosa",
        description: `Se transfirió ${new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: fromAccount.currency
        }).format(transferAmount)} a ${toAccount.name}${
          fromAccount.currency !== toAccount.currency 
            ? ` (${new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: toAccount.currency
              }).format(convertedAmount)})`
            : ''
        }`
      });

      onTransferComplete();
      handleClose();
      
    } catch (error: any) {
      console.error('Error during transfer:', error);
      toast({
        variant: "destructive",
        title: "Error en la transferencia",
        description: error.message || "No se pudo completar la transferencia. Inténtalo nuevamente."
      });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Transferir Capital Entre Cuentas
          </DialogTitle>
          <DialogDescription>
            Transfiere dinero entre tus cuentas con conversión automática de moneda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selección de cuentas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cuenta de Origen</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta origen" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map(account => (
                    <SelectItem 
                      key={account.id} 
                      value={account.id}
                      disabled={account.id === toAccountId}
                    >
                      <div className="flex flex-col">
                        <span>{account.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: account.currency
                          }).format(account.balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromAccount && (
                <p className="text-xs text-muted-foreground">
                  Saldo disponible: {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: fromAccount.currency
                  }).format(fromAccount.balance)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Cuenta de Destino</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta destino" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map(account => (
                    <SelectItem 
                      key={account.id} 
                      value={account.id}
                      disabled={account.id === fromAccountId}
                    >
                      <div className="flex flex-col">
                        <span>{account.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: account.currency
                          }).format(account.balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {toAccount && (
                <p className="text-xs text-muted-foreground">
                  Saldo actual: {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: toAccount.currency
                  }).format(toAccount.balance)}
                </p>
              )}
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label>Monto a Transferir</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-10"
              />
            </div>
            {fromAccount && (
              <p className="text-xs text-muted-foreground">
                Moneda origen: {fromAccount.currency}
              </p>
            )}
          </div>

          {/* Conversión de moneda */}
          {fromAccount && toAccount && fromAccount.currency !== toAccount.currency && exchangeRate && convertedAmount && transferAmount > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm text-blue-700">
                  <Calculator className="h-4 w-4" />
                  Conversión de Moneda
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Monto en {fromAccount.currency}:</span>
                    <span className="font-medium">{new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: fromAccount.currency
                    }).format(transferAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tipo de cambio:</span>
                    <span className="font-medium">1 {fromAccount.currency} = {exchangeRate.toFixed(4)} {toAccount.currency}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Monto en {toAccount.currency}:</span>
                    <span className="font-bold text-blue-700">{new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: toAccount.currency
                    }).format(convertedAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Transferencia para gastos mensuales"
            />
          </div>

          {/* Validaciones */}
          {fromAccount && toAccount && fromAccountId === toAccountId && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-amber-700">
                Las cuentas de origen y destino deben ser diferentes
              </AlertDescription>
            </Alert>
          )}

          {fromAccount && transferAmount > fromAccount.balance && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-700">
                Saldo insuficiente. Disponible: {new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: fromAccount.currency
                }).format(fromAccount.balance)}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isTransferring}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer}
            disabled={isTransferring || !validateTransfer() === null || !fromAccount || !toAccount || transferAmount <= 0}
            className="min-w-[120px]"
          >
            {isTransferring ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                Transfiriendo...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transferir
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferModal;