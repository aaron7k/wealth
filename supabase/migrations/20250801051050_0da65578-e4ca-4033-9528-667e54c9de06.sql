-- Add savings_percentage column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN savings_percentage numeric DEFAULT 10.0 CHECK (savings_percentage >= 0 AND savings_percentage <= 100);