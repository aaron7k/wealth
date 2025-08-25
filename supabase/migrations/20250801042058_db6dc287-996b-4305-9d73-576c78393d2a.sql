-- Create diezmos table for tithe tracking
CREATE TABLE public.diezmos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0.00,
    period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    paid_date DATE NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.diezmos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own diezmos" 
ON public.diezmos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own diezmos" 
ON public.diezmos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diezmos" 
ON public.diezmos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diezmos" 
ON public.diezmos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_diezmos_updated_at
BEFORE UPDATE ON public.diezmos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add tithe_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN tithe_enabled BOOLEAN DEFAULT false,
ADD COLUMN tithe_period TEXT DEFAULT 'monthly' CHECK (tithe_period IN ('weekly', 'monthly'));