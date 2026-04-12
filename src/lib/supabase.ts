import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Config:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length,
    keyStart: supabaseAnonKey?.slice(0, 5) // Safely log start to verify format
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
