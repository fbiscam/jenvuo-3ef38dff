ALTER TABLE public.extension_api_keys ADD COLUMN IF NOT EXISTS rpm_limit integer, ADD COLUMN IF NOT EXISTS token_limit bigint, ADD COLUMN IF NOT EXISTS tokens_used bigint NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.add_api_key_tokens(p_key uuid, p_tokens bigint) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.extension_api_keys SET tokens_used = tokens_used + GREATEST(p_tokens,0) WHERE id = p_key;
$$;
REVOKE ALL ON FUNCTION public.add_api_key_tokens(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_api_key_tokens(uuid, bigint) TO service_role;