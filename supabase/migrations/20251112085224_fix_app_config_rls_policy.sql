/*
  # Fix RLS Policy for app_config

  1. Changes
    - Add policy to allow service_role to read app_config
    - This is needed because SECURITY DEFINER functions still respect RLS
    - Only service_role can read, which is secure

  2. Security
    - Only service_role (used by Edge Functions) can read
    - No other roles can access the table
*/

-- Create policy to allow service_role to read app_config
CREATE POLICY "Service role can read app_config"
  ON app_config
  FOR SELECT
  TO service_role
  USING (true);

-- Verify: service_role should now be able to read
-- Test with: SELECT * FROM app_config WHERE key = 'openai_api_key';
