import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

interface ConfigStatus {
  hasApiKey: boolean;
  keyPreview?: string;
  error?: string;
}

export async function checkApiKeyStatus(): Promise<ConfigStatus> {
  try {
    const { data, error } = await supabase.rpc('get_decrypted_config', {
      config_key: 'openai_api_key'
    });

    if (error) {
      console.error('Error fetching API key status:', error);
      return {
        hasApiKey: false,
        error: 'Unable to check API key status'
      };
    }

    if (!data || data.length === 0) {
      return {
        hasApiKey: false
      };
    }

    const keyPreview = data.substring(0, 12) + '...';

    return {
      hasApiKey: true,
      keyPreview
    };
  } catch (err) {
    console.error('Exception checking API key:', err);
    return {
      hasApiKey: false,
      error: 'Failed to connect to configuration service'
    };
  }
}

export async function getApiKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_decrypted_config', {
      config_key: 'openai_api_key'
    });

    if (error) {
      console.error('Error fetching API key:', error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error('Exception fetching API key:', err);
    return null;
  }
}
