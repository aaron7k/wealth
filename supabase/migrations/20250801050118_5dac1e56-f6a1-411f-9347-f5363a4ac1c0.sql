-- Add generate_tithe column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN generate_tithe boolean NOT NULL DEFAULT true;