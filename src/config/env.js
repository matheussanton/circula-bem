import { SUPABASE_URL, SUPABASE_KEY } from '@env';

// Debug das variáveis de ambiente
console.log('🔧 Carregando configuração do Supabase (via @env)...');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'Definido' : 'Undefined');
console.log('SUPABASE_KEY:', SUPABASE_KEY ? 'Definido' : 'Undefined');

// Supabase Configuration (usando variáveis do .env)
export const SUPABASE_CONFIG = {
  URL: SUPABASE_URL,
  KEY: SUPABASE_KEY
};

console.log('✅ Configuração final do Supabase:', {
  URL: SUPABASE_CONFIG.URL ? 'Configurado' : 'UNDEFINED',
  KEY: SUPABASE_CONFIG.KEY ? 'Configurado' : 'UNDEFINED'
}); 
