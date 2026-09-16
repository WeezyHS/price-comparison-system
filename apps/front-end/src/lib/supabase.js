import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Variáveis obrigatórias faltando no front-end:\n' +
        '- VITE_SUPABASE_URL\n' +
        '- VITE_SUPABASE_ANON_KEY\n' +
        'Crie o arquivo apps/front-end/.env com os valores.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
});