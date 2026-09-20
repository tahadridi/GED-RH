import { supabaseConfig } from './supabase.config';

export const environment = {
  production: false,
  supabaseUrl: supabaseConfig.supabaseUrl,
  supabaseKey: supabaseConfig.supabaseKey,
  apiUrl: 'http://localhost:8080/api',
  wsUrl: 'ws://localhost:8080/ws-native'
};