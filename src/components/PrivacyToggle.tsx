import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { cn } from '@/lib/utils';

interface PrivacyToggleProps {
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
}

export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({ 
  variant = 'ghost', 
  size = 'sm',
  className,
  showText = false
}) => {
  const { numbersHidden, togglePrivacy } = usePrivacy();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={togglePrivacy}
      className={cn(
        "transition-all duration-200 hover:scale-105 active:scale-95",
        numbersHidden 
          ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
          : "text-gray-600 hover:text-gray-700 hover:bg-gray-50",
        className
      )}
      title={numbersHidden ? "Mostrar números" : "Ocultar números"}
    >
      {numbersHidden ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
      {showText && (
        <span className="ml-2">
          {numbersHidden ? "Mostrar" : "Ocultar"}
        </span>
      )}
    </Button>
  );
};

export default PrivacyToggle;