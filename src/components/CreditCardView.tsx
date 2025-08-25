import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, CreditCard, Building2, DollarSign, Wallet } from 'lucide-react';
import { usePrivacy } from '@/contexts/PrivacyContext';

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

interface CreditCardViewProps {
  account: Account;
  onCardClick: (account: Account) => void;
  formatCurrency: (amount: number, currency: string) => string;
  formatCurrencyWithConversion: (amount: number, currency: string, targetCurrency?: string) => any;
  userPreferredCurrency: string;
}

const getAccountTypeIcon = (type: string) => {
  const icons = {
    checking: CreditCard,
    savings: DollarSign,
    credit: CreditCard,
    investment: Building2,
    cash: Wallet
  };
  const Icon = icons[type as keyof typeof icons] || CreditCard;
  return Icon;
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

export const CreditCardView: React.FC<CreditCardViewProps> = ({
  account,
  onCardClick,
  formatCurrency,
  formatCurrencyWithConversion,
  userPreferredCurrency
}) => {
  const Icon = getAccountTypeIcon(account.type);
  const cardColor = account.card_color || '#6366F1';
  const { formatPrivateNumber } = usePrivacy();

  return (
    <div className="w-full">
       <Card 
         className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] min-h-[200px] max-h-[280px] bg-gradient-to-br border-none cursor-pointer group"
         style={{
           background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}dd 100%)`,
           boxShadow: `0 8px 32px -8px ${cardColor}40`
         }}
         onClick={() => onCardClick(account)}
       >
         <div className="p-4 sm:p-5 md:p-6 h-full flex flex-col justify-between text-white relative z-10">
          {/* Top Section - Bank and Type */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0 mr-3">
               {account.bank_name && (
                 <p className="text-xs sm:text-sm font-medium opacity-90 uppercase tracking-wider truncate max-w-full">
                   {account.bank_name}
                 </p>
               )}
               <Badge 
                 variant="outline" 
                 className="text-xs border-white/30 text-white/90 bg-white/20 backdrop-blur-sm mt-1 px-2 py-0.5"
               >
                 {getAccountTypeLabel(account.type)}
               </Badge>
            </div>
            <div className="flex-shrink-0">
              <Icon className="h-6 w-6 sm:h-7 sm:w-7 opacity-80" />
            </div>
          </div>

           {/* Middle Section - Card Number */}
           <div className="flex-1 flex flex-col justify-center space-y-3">
             {/* Chip Simulation */}
             <div className="w-11 h-8 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded-lg shadow-md relative">
              <div className="absolute inset-1 bg-gradient-to-br from-yellow-100 to-yellow-300 rounded">
                <div className="grid grid-cols-2 gap-0.5 p-1 h-full">
                  <div className="bg-yellow-400 rounded-sm opacity-50"></div>
                  <div className="bg-yellow-400 rounded-sm opacity-30"></div>
                  <div className="bg-yellow-400 rounded-sm opacity-40"></div>
                  <div className="bg-yellow-400 rounded-sm opacity-60"></div>
                </div>
              </div>
            </div>

            {/* Card Number */}
            {account.account_number ? (
              <div>
                 <p className="font-mono text-base sm:text-lg tracking-wider text-white/95">
                   •••• •••• •••• {account.account_number.slice(-4)}
                 </p>
              </div>
            ) : (
              <div className="h-5"></div>
            )}
          </div>

          {/* Bottom Section - Account Details */}
          <div className="space-y-3">
            {/* Account Name */}
            <div>
               <p className="text-xs opacity-75 uppercase tracking-wide mb-1">Titular</p>
               <p className="text-sm sm:text-base font-semibold text-white truncate uppercase tracking-wide">
                 {account.name}
               </p>
            </div>

            {/* Balance and Status */}
            <div className="flex justify-between items-end gap-3">
              <div className="flex-1 min-w-0">
                 <p className="text-xs opacity-75 uppercase tracking-wide mb-1">Balance</p>
                 <p className={`text-base sm:text-lg font-bold truncate ${account.balance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                   {formatPrivateNumber(account.balance, account.currency)}
                 </p>
                
                {/* Conversion - Only show if different from user's preferred currency */}
                {account.currency !== userPreferredCurrency && (
                  <p className="text-xs opacity-70 mt-1 truncate">
                    ≈ {(() => {
                      const result = formatCurrencyWithConversion(account.balance, account.currency, userPreferredCurrency);
                      return typeof result === 'object' 
                        ? formatPrivateNumber(result.convertedAmount, userPreferredCurrency)
                        : formatPrivateNumber(account.balance, userPreferredCurrency);
                    })()}
                  </p>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <Badge 
                  variant={account.is_active ? "default" : "secondary"} 
                  className="bg-white/20 text-white border-white/30 text-xs mb-1 backdrop-blur-sm"
                >
                  {account.is_active ? 'Activa' : 'Inactiva'}
                </Badge>
                <p className="text-xs opacity-75 uppercase tracking-wider">
                  {account.currency}
                </p>
              </div>
            </div>
          </div>

          {/* Card decorative pattern - More subtle */}
          <div className="absolute inset-0 pointer-events-none opacity-5 group-hover:opacity-8 transition-opacity">
            <div className="absolute top-1/3 right-0 w-28 h-28 rounded-full bg-white transform translate-x-14"></div>
            <div className="absolute bottom-1/3 left-0 w-20 h-20 rounded-full bg-white transform -translate-x-10"></div>
            <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full bg-white/30 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        </div>
      </Card>
    </div>
  );
};