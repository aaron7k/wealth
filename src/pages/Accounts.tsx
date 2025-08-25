import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Plus, Edit, Trash2, CreditCard, Building2, DollarSign, Wallet, RefreshCw, ArrowUpDown, Grid3X3, List, MoreVertical, ArrowRightLeft } from 'lucide-react';
import { CreditCardView } from '@/components/CreditCardView';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import TransferModal from '@/components/TransferModal';

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  balance: number;
  currency: string;
  bank_name?: string;
  account_number?: string;
  is_active: boolean;
  card_color?: string;
  created_at: string;
  updated_at: string;
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as Account['type'],
    balance: '',
    currency: 'USD',
    bank_name: '',
    account_number: '',
    card_color: '#6366F1'
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { defaultCurrency } = useUserProfile();
  const { formatCurrencyWithConversion, convertCurrency, refreshRates, loading: ratesLoading, lastUpdated } = useCurrencyConverter();
  const { formatPrivateNumber } = usePrivacy();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las cuentas."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const accountData = {
        name: formData.name,
        type: formData.type,
        balance: parseFloat(formData.balance) || 0,
        currency: formData.currency,
        bank_name: formData.bank_name || null,
        account_number: formData.account_number || null,
        card_color: formData.card_color,
        is_active: true,
        user_id: user?.id
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;
        
        toast({
          title: "Cuenta actualizada",
          description: "La cuenta se ha actualizado correctamente."
        });
      } else {
        const { error } = await supabase
          .from('accounts')
          .insert([accountData]);

        if (error) throw error;
        
        toast({
          title: "Cuenta creada",
          description: "La nueva cuenta se ha creado correctamente."
        });
      }

      loadAccounts();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la cuenta."
      });
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      card_color: account.card_color || '#6366F1'
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setAccountToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountToDelete);

      if (error) throw error;
      
      toast({
        title: "¡Éxito!",
        description: "Cuenta eliminada correctamente."
      });
      
      loadAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la cuenta."
      });
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'checking',
      balance: '',
      currency: 'USD',
      bank_name: '',
      account_number: '',
      card_color: '#6366F1'
    });
    setEditingAccount(null);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getAccountTypeLabel = (type: string) => {
    const types = {
      checking: 'Corriente',
      savings: 'Ahorros',
      credit: 'Crédito',
      investment: 'Inversión',
      cash: 'Efectivo'
    };
    return types[type as keyof typeof types] || type;
  };

  const getAccountTypeIcon = (type: string) => {
    const icons = {
      checking: CreditCard,
      savings: DollarSign,
      credit: CreditCard,
      investment: Building2,
      cash: Wallet
    };
    const Icon = icons[type as keyof typeof icons] || CreditCard;
    return <Icon className="h-4 w-4" />;
  };

  const handleCardClick = (account: Account) => {
    setSelectedAccount(account);
    setOptionsMenuOpen(true);
  };

  const totalBalance = accounts.reduce((sum, account) => {
    // Convertir TODOS los balances a la moneda preferida del usuario para sumar correctamente
    const balanceInUserCurrency = convertCurrency(account.balance, account.currency, defaultCurrency);
    return sum + balanceInUserCurrency;
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cuentas</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gestiona tus cuentas bancarias y de inversión
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setTransferModalOpen(true)}
            variant="outline"
            className="border-2 border-blue-500/50 text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 hover:scale-105 active:scale-95 w-full sm:w-auto"
            disabled={accounts.filter(acc => acc.is_active).length < 2}
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Transferir Capital</span>
            <span className="sm:hidden">Transferir</span>
          </Button>
          
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 w-full sm:w-auto" 
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nueva Cuenta</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumen de Cuentas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-primary">
              {formatPrivateNumber(totalBalance, defaultCurrency)}
            </div>
            <p className="text-muted-foreground">Balance total en todas las cuentas</p>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Section */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Todas las Cuentas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Lista completa de tus cuentas bancarias y de inversión
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2">
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-full sm:w-auto">
                <Button
                  size="sm"
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('cards')}
                  className="h-8 px-3 flex-1 sm:flex-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span className="ml-1 sm:hidden">Tarjetas</span>
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3 flex-1 sm:flex-none"
                >
                  <List className="h-4 w-4" />
                  <span className="ml-1 sm:hidden">Lista</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay cuentas registradas</p>
              <p className="text-sm">Agrega tu primera cuenta para comenzar</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <CreditCardView
                  key={account.id}
                  account={account}
                  onCardClick={handleCardClick}
                  formatCurrency={formatCurrencyWithConversion}
                  formatCurrencyWithConversion={formatCurrencyWithConversion}
                  userPreferredCurrency={defaultCurrency}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          {account.bank_name && (
                            <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {account.type === 'checking' ? 'Corriente' :
                           account.type === 'savings' ? 'Ahorros' :
                           account.type === 'credit' ? 'Crédito' :
                           account.type === 'investment' ? 'Inversión' : 'Efectivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatPrivateNumber(account.balance, account.currency)}
                          </div>
                          {account.currency !== defaultCurrency && (
                            <div className="text-sm text-muted-foreground">
                              ≈ {(() => {
                                const result = formatCurrencyWithConversion(account.balance, account.currency, defaultCurrency);
                                const convertedAmount = typeof result === 'object' ? result.convertedAmount : convertCurrency(account.balance, account.currency, defaultCurrency);
                                return formatPrivateNumber(convertedAmount, defaultCurrency);
                              })()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? "default" : "secondary"}>
                          {account.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col sm:flex-row justify-end gap-1 sm:gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(account)}
                            className="border-2 border-primary/50 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95 w-full sm:w-auto text-xs"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="ml-1 sm:hidden">Editar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(account.id)}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 w-full sm:w-auto text-xs"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-1 sm:hidden">Eliminar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Account Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Modifica los datos de la cuenta.' : 'Agrega una nueva cuenta bancaria o de inversión.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Cuenta</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Cuenta Principal"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Cuenta</Label>
                <Select value={formData.type} onValueChange={(value: Account['type']) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Cuenta Corriente</SelectItem>
                    <SelectItem value="savings">Ahorros</SelectItem>
                    <SelectItem value="credit">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="investment">Inversión</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - Libra</SelectItem>
                    <SelectItem value="JPY">JPY - Yen</SelectItem>
                    <SelectItem value="CAD">CAD - Dólar Canadiense</SelectItem>
                    <SelectItem value="AUD">AUD - Dólar Australiano</SelectItem>
                    <SelectItem value="CHF">CHF - Franco Suizo</SelectItem>
                    <SelectItem value="CNY">CNY - Yuan</SelectItem>
                    <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                    <SelectItem value="BRL">BRL - Real Brasileño</SelectItem>
                    <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                    <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                    <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
                    <SelectItem value="PEN">PEN - Sol Peruano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Balance Inicial</Label>
              <Input
                id="balance"
                type="number"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Banco (Opcional)</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Ej: Banco Santander"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Número de Cuenta (Opcional)</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="card_color">Color de Tarjeta</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="card_color"
                  type="color"
                  value={formData.card_color}
                  onChange={(e) => setFormData({ ...formData, card_color: e.target.value })}
                  className="w-16 h-10 border rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.card_color}
                  onChange={(e) => setFormData({ ...formData, card_color: e.target.value })}
                  placeholder="#6366F1"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-2 border-muted-foreground/30 hover:border-muted-foreground hover:bg-muted text-foreground transition-all duration-200 w-full sm:w-auto order-2 sm:order-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 w-full sm:w-auto order-1 sm:order-2"
              >
                {editingAccount ? 'Actualizar' : 'Crear'} Cuenta
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              ¿Estás seguro de que quieres eliminar esta cuenta? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="border-2 border-muted-foreground/30 hover:border-muted-foreground hover:bg-muted transition-all duration-200 w-full sm:w-auto order-2 sm:order-1">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 w-full sm:w-auto order-1 sm:order-2"
            >
              Eliminar cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Modal */}
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        accounts={accounts}
        onTransferComplete={loadAccounts}
      />
    </div>
  );
};

export default Accounts;
