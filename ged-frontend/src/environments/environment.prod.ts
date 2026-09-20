import { supabaseConfig } from './supabase.config';

export const environment = {
  production: true,
  supabaseUrl: supabaseConfig.supabaseUrl,
  supabaseKey: supabaseConfig.supabaseKey,
  apiUrl: '/api',
  wsUrl: '/ws-native'
};