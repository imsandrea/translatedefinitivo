/*
  # Fix Security Issues

  1. Changes
    - Fix search_path vulnerability in get_decrypted_config function
    - Enable RLS on transcription_jobs table
    - Add appropriate RLS policies for transcription_jobs

  2. Security
    - Set search_path to empty string to prevent search_path injection attacks
    - Enable RLS on transcription_jobs to protect data
    - Only service_role can access transcription_jobs (used by Edge Functions)
*/

-- Fix 1: Recreate get_decrypted_config with secure search_path
DROP FUNCTION IF EXISTS get_decrypted_config(text);

CREATE OR REPLACE FUNCTION get_decrypted_config(config_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  encrypted_value text;
  decrypted_value text;
BEGIN
  -- Get encrypted value from app_config (use fully qualified table name)
  SELECT value INTO encrypted_value
  FROM public.app_config
  WHERE key = config_key;

  -- If not found, return NULL
  IF encrypted_value IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrypt using pgp_sym_decrypt (use fully qualified function)
  decrypted_value := pgcrypto.pgp_sym_decrypt(
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
GRANT EXECUTE ON FUNCTION get_decrypted_config(text) TO service_role;

-- Fix 2: Enable RLS on transcription_jobs table
ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;

-- Add policy: Only service_role can access transcription_jobs
-- This is secure because only Edge Functions use service_role
CREATE POLICY "Service role can manage transcription jobs"
  ON transcription_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Note: No policies for anon or authenticated users
-- Only Edge Functions (using service_role) can access this table
