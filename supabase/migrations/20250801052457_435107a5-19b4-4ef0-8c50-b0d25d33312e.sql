-- Add default_currency field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN default_currency text NOT NULL DEFAULT 'USD';

-- Add a check constraint to ensure valid currencies
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_default_currency_check 
CHECK (default_currency IN ('USD', 'MXN', 'COP', 'EUR'));