/*
  # Fix get_decrypted_config function with correct schema references

  1. Changes
    - Recreate function with SET search_path = ''
    - Use fully qualified names: extensions.pgp_sym_decrypt, public.app_config
    - This prevents search_path injection attacks

  2. Security
    - search_path is empty to prevent injection
    - All objects referenced with schema-qualified names
*/

-- Drop and recreate with secure search_path
DROP FUNCTION IF EXISTS get_decrypted_config(text);

CREATE OR REPLACE FUNCTION public.get_decrypted_config(config_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  encrypted_value text;
  decrypted_value text;
BEGIN
  -- Get encrypted value from app_config (fully qualified)
  SELECT value INTO encrypted_value
  FROM public.app_config
  WHERE key = config_key;

  -- If not found, return NULL
  IF encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrypt using pgp_sym_decrypt from extensions schema
  decrypted_value := extensions.pgp_sym_decrypt(
    decode(encrypted_value, 'base64'),
    'audioscribe-secret-2024'
  );

  RETURN decrypted_value;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return NULL
    RAISE WARNING 'Error decrypting config %: %', config_key, SQLERRM;
    RETURN NULL;
END;
$$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.get_decrypted_config(text) TO service_role;
