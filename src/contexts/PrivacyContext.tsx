import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
  numbersHidden: boolean;
  togglePrivacy: () => void;
  formatPrivateNumber: (amount: number, currency: string) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};

interface PrivacyProviderProps {
  children: React.ReactNode;
}

export const PrivacyProvider: React.FC<PrivacyProviderProps> = ({ children }) => {
  const [numbersHidden, setNumbersHidden] = useState(() => {
    // Recuperar el estado desde localStorage
    const saved = localStorage.getItem('numbersHidden');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    // Guardar el estado en localStorage cuando cambie
    localStorage.setItem('numbersHidden', JSON.stringify(numbersHidden));
  }, [numbersHidden]);

  const togglePrivacy = () => {
    setNumbersHidden(prev => !prev);
  };

  const formatPrivateNumber = (amount: number, currency: string): string => {
    if (numbersHidden) {
      // Mostrar puntos en lugar de números, manteniendo el símbolo de moneda
      const formatter = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency
      });
      const formatted = formatter.format(0);
      // Reemplazar el número 0 con asteriscos
      return formatted.replace('0', '••••').replace('0.00', '••••');
    }
    
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const value = {
    numbersHidden,
    togglePrivacy,
    formatPrivateNumber
  };

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
};

export default PrivacyProvider;