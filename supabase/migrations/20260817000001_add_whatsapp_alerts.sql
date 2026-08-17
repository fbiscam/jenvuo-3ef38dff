-- Add WhatsApp columns to alert_preferences and profiles
ALTER TABLE public.alert_preferences ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- Grant access
GRANT SELECT, UPDATE ON public.alert_preferences TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Ensure service_role can do everything
GRANT ALL ON public.alert_preferences TO service_role;
GRANT ALL ON public.profiles TO service_role;
