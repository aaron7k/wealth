-- Add color field to accounts table for customizable credit card appearance
ALTER TABLE public.accounts 
ADD COLUMN card_color text DEFAULT '#6366F1';