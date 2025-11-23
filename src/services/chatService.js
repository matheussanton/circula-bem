import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_CONFIG } from '../config/env';
import { getTable, insertIntoTable } from './supabaseClient';
import getRealtimeClient from './realtimeClient';

const baseUrl = `${SUPABASE_CONFIG.URL}/rest/v1`;
const headersBase = async () => {
  const token = await AsyncStorage.getItem('token');
  return {
    apikey: SUPABASE_CONFIG.KEY,
    Authorization: `Bearer ${token || SUPABASE_CONFIG.KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
};

// Lista conversas do usuário a partir da view v_conversation_list
export async function listConversations() {
  // order=last_message_at.desc.nullslast
  const qs = `select=*&order=last_message_at.desc.nullslast`;
  const rows = await getTable('v_conversation_list', qs);
  return rows || [];
}

// Busca mensagens de uma conversa (paginado por created_at)
export async function fetchMessages(conversationId, { limit = 50, before } = {}) {
  const parts = [`conversation_id=eq.${conversationId}`, 'select=*', `order=created_at.desc`];
  if (before) {
    parts.push(`created_at=lt.${encodeURIComponent(before)}`);
  }
  parts.push(`limit=${limit}`);
  const qs = parts.join('&');
  const rows = await getTable('conversation_messages', qs);
  // Retornar em ordem cronológica ascendente para a UI
  return (rows || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

// Envia mensagem (plain text)
export async function sendMessage(conversationId, content) {
  const senderId = await AsyncStorage.getItem('userId');
  if (!senderId) throw new Error('Usuário não autenticado');
  const [inserted] = await insertIntoTable('conversation_messages', {
    conversation_id: conversationId,
    sender_id: senderId,
    content,
  });
  return inserted;
}

// Obtém (ou cria) conversa direta via RPC
export async function getOrCreateDirectConversation(otherUserId) {
  const headers = await headersBase();
  const resp = await fetch(`${baseUrl}/rpc/create_direct_conversation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ other_user_id: otherUserId }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Erro RPC create_direct_conversation: ${resp.status} ${resp.statusText} - ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Cria conversa em grupo via RPC
export async function createGroupConversation({ title, image_url = null, member_ids = [] }) {
  const headers = await headersBase();
  const resp = await fetch(`${baseUrl}/rpc/create_group_conversation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_title: title, p_image_url: image_url, p_member_ids: member_ids }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Erro RPC create_group_conversation: ${resp.status} ${resp.statusText} - ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Assinatura realtime para mensagens de uma conversa
export async function subscribeConversationMessages(conversationId, { onInsert }) {
  const client = await getRealtimeClient();
  const channel = client.channel(`conversation_messages_${conversationId}`);
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${conversationId}` },
    (payload) => {
      if (onInsert) onInsert(payload.new);
    }
  );
  await channel.subscribe();
  return () => {
    try { channel.unsubscribe(); } catch {}
  };
}

// Assinatura realtime para mudanças nas conversas (última mensagem)
export async function subscribeConversations({ onUpdate }) {
  const client = await getRealtimeClient();
  const channel = client.channel(`conversations_updates`);
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'conversations' },
    (payload) => {
      if (onUpdate) onUpdate(payload.new);
    }
  );
  await channel.subscribe();
  return () => {
    try { channel.unsubscribe(); } catch {}
  };
}

export default {
  listConversations,
  fetchMessages,
  sendMessage,
  getOrCreateDirectConversation,
  createGroupConversation,
  subscribeConversationMessages,
  subscribeConversations,
};

