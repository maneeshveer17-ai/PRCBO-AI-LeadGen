import { createClient } from '@supabase/supabase-js';

// Read configuration from Vite environment variables
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Validates whether the provided Supabase credentials are valid non-placeholder values.
 */
export const validateSupabaseConfig = (url, anonKey) => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      isValid: false,
      reason: 'VITE_SUPABASE_URL is not set in frontend/.env'
    };
  }

  const trimmedUrl = url.trim();
  const lowerUrl = trimmedUrl.toLowerCase();

  if (
    lowerUrl.includes('your-project-id') ||
    lowerUrl.includes('your_project_id') ||
    lowerUrl.includes('example.com') ||
    lowerUrl.includes('placeholder')
  ) {
    return {
      isValid: false,
      reason: 'VITE_SUPABASE_URL contains placeholder value'
    };
  }

  try {
    const parsed = new URL(trimmedUrl);
    if (!parsed.protocol.startsWith('http')) {
      return {
        isValid: false,
        reason: 'VITE_SUPABASE_URL must be a valid HTTP/HTTPS URL'
      };
    }
  } catch {
    return {
      isValid: false,
      reason: 'VITE_SUPABASE_URL is not a syntactically valid URL'
    };
  }

  if (!anonKey || typeof anonKey !== 'string' || !anonKey.trim()) {
    return {
      isValid: false,
      reason: 'VITE_SUPABASE_ANON_KEY is not set in frontend/.env'
    };
  }

  const trimmedKey = anonKey.trim();
  const lowerKey = trimmedKey.toLowerCase();

  if (
    lowerKey.includes('your-supabase-anon-key') ||
    lowerKey.includes('your_anon_key') ||
    lowerKey.includes('placeholder')
  ) {
    return {
      isValid: false,
      reason: 'VITE_SUPABASE_ANON_KEY contains placeholder value'
    };
  }

  return {
    isValid: true,
    url: trimmedUrl,
    anonKey: trimmedKey
  };
};

const validation = validateSupabaseConfig(rawSupabaseUrl, rawSupabaseAnonKey);

export const isSupabaseConfigured = validation.isValid;
export const supabaseConfigReason = validation.reason || null;

/**
 * Official Supabase JS client instance.
 * Returns null gracefully if credentials are missing or placeholders to prevent runtime crashes.
 */
export const supabase = isSupabaseConfigured
  ? createClient(validation.url, validation.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Performs a lightweight health ping against the 'leads' table to verify network and table connectivity.
 * @returns {Promise<{ ok: boolean, error?: string, code?: string, recordCount?: number }>}
 */
export const checkSupabaseConnection = async () => {
  if (!supabase) {
    return {
      ok: false,
      error: supabaseConfigReason || 'Supabase credentials not configured'
    };
  }

  try {
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        ok: false,
        error: error.message,
        code: error.code
      };
    }

    return {
      ok: true,
      recordCount: count || 0
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message || 'Network error connecting to Supabase'
    };
  }
};
