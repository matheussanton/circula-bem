import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

let realtimeClient = null;

export const getRealtimeClient = async () => {
  if (!realtimeClient) {
    realtimeClient = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {},
      },
    });
  }
  // Atualiza o token do Realtime a cada uso (usa o access_token salvo no login)
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      // v2: atualiza o token usado pelo Realtime (canal websocket)
      realtimeClient.realtime.setAuth(token);
    }
  } catch {}
  return realtimeClient;
};

export default getRealtimeClient;

