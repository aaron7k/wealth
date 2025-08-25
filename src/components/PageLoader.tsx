import React from 'react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ isLoading, children }) => {
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-fade-in">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-20 w-20 mx-auto">
              {/* Outer circle */}
              <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
              {/* Spinning inner circle */}
              <div className="absolute inset-0 rounded-full border-t-4 border-r-4 border-primary animate-spin"></div>
              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3 w-3 bg-primary rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-center space-x-1">
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Cargando...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("animate-fade-in", "animate-scale-in")}>
      {children}
    </div>
  );
};