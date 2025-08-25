-- Actualizar la función handle_new_user para incluir la moneda predeterminada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, default_currency)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    COALESCE(new.raw_user_meta_data ->> 'default_currency', 'USD')
  );
  RETURN new;
END;
$$;