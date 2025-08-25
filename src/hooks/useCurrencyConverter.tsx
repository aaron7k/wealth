import { useState, useEffect } from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';

interface ExchangeRates {
  USD: number;
  MXN: number;
  COP: number;
  EUR: number;
}

export const useCurrencyConverter = (overrideUserCurrency?: string) => {
  const { defaultCurrency } = useUserProfile();
  const userDefaultCurrency = overrideUserCurrency || defaultCurrency;
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ 
    USD: 1, 
    MXN: 17.5, 
    COP: 4200, 
    EUR: 0.85 
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchExchangeRates = async () => {
    try {
      setLoading(true);
      // Using exchangerate-api free tier (1500 requests per month)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      if (data.rates) {
        setExchangeRates({
          USD: 1,
          MXN: data.rates.MXN || 17.5,
          COP: data.rates.COP || 4200,
          EUR: data.rates.EUR || 0.85
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Keep default rates if API fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
    // Update rates every hour
    const interval = setInterval(fetchExchangeRates, 3600000);
    return () => clearInterval(interval);
  }, []);

  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    // Convert to USD first
    let usdAmount = amount;
    if (fromCurrency !== 'USD') {
      usdAmount = amount / (exchangeRates[fromCurrency as keyof ExchangeRates] || 1);
    }
    
    // Convert from USD to target currency
    if (toCurrency === 'USD') {
      return usdAmount;
    }
    
    return usdAmount * (exchangeRates[toCurrency as keyof ExchangeRates] || 1);
  };

  const formatCurrencyWithConversion = (amount: number, currency: string, targetCurrency?: string) => {
    const finalTargetCurrency = targetCurrency || userDefaultCurrency;
    
    const original = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);

    if (currency === finalTargetCurrency) {
      return original;
    }

    const converted = convertCurrency(amount, currency, finalTargetCurrency);
    const convertedFormatted = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: finalTargetCurrency
    }).format(converted);

    return { original, converted: convertedFormatted, convertedAmount: converted };
  };

  const convertToUserCurrency = (amount: number, fromCurrency: string): number => {
    return convertCurrency(amount, fromCurrency, userDefaultCurrency);
  };

  return {
    exchangeRates,
    loading,
    lastUpdated,
    convertCurrency,
    formatCurrencyWithConversion,
    convertToUserCurrency,
    refreshRates: fetchExchangeRates,
    userDefaultCurrency
  };
};
