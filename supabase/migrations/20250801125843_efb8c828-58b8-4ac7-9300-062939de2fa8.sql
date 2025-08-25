-- Add auto_deduct_tithe field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN auto_deduct_tithe boolean DEFAULT false;