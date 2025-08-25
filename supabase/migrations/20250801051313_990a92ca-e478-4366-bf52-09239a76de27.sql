-- Create savings table to track automatic savings
CREATE TABLE public.savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0.00,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  source_transaction_id UUID,
  is_transferred BOOLEAN NOT NULL DEFAULT false,
  transfer_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own savings" 
ON public.savings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings" 
ON public.savings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings" 
ON public.savings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings" 
ON public.savings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_savings_updated_at
BEFORE UPDATE ON public.savings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();