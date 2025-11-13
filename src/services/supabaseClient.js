import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_KEY } from '@env';

export async function getTable(table, filters = '') {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${SUPABASE_URL}/rest/v1/${table}?${filters}`;
    
    console.log(`🔍 getTable: Buscando dados de "${table}" com filtros: "${filters}"`);
    console.log(`📡 URL da requisição: ${url}`);

    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Status da resposta: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Erro na requisição para ${table}:`, errorBody);
      throw new Error(`Erro ao buscar dados da tabela "${table}": ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    console.log(`✅ Dados recebidos de "${table}":`, data);

    // Garantir que sempre retornamos um array
    if (!data) {
      console.log(`⚠️ Dados nulos recebidos de "${table}", retornando array vazio`);
      return [];
    }

    if (!Array.isArray(data)) {
      console.log(`⚠️ Dados não são array para "${table}":`, typeof data, data);
      return [];
    }

    return data;
  } catch (error) {
    console.error(`❌ Erro em getTable para "${table}":`, error);
    throw error;
  }
}

export async function insertIntoTable(table, data, useAuthroization = true) {
  try {
    const token = await AsyncStorage.getItem('token');
    const headers = {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    if (useAuthroization) {
      headers.Authorization = `Bearer ${token || SUPABASE_KEY}`;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Erro ao inserir na tabela "${table}": ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro em insertIntoTable:', error);
    throw error;
  }
}

export async function updateTableById(table, id, data) {
  try {
    const token = await AsyncStorage.getItem('token');
    
    console.log(`🔄 Atualizando ${table} com ID ${id}:`, data);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(data),
    });
    
    console.log(`📡 Status da resposta updateTableById: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Erro na atualização:`, errorBody);
      throw new Error(`Erro ao atualizar ${table}: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    
    // Verificar se há conteúdo na resposta
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      console.log(`✅ Atualização bem-sucedida (resposta vazia)`);
      return { success: true };
    }
    
    try {
      const responseData = JSON.parse(responseText);
      console.log(`✅ Dados atualizados:`, responseData);
      return responseData;
    } catch (parseError) {
      console.log(`✅ Atualização bem-sucedida (resposta não-JSON):`, responseText);
      return { success: true, message: responseText };
    }
  } catch (error) {
    console.error(`❌ Erro em updateTableById para "${table}":`, error);
    throw error;
  }
}

export async function deleteFromTableById(table, id) {
  const token = await AsyncStorage.getItem('token');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
    },
  });
  return response.ok;
}
