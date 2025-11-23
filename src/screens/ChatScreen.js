import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderBar from '../components/HeaderBar';
import { fetchMessages, sendMessage, subscribeConversationMessages } from '../services/chatService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MessageBubble = ({ message, isOwn }) => {
  return (
    <View style={[styles.bubbleContainer, isOwn ? styles.bubbleRight : styles.bubbleLeft]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={styles.bubbleText}>{message.content}</Text>
        <Text style={styles.bubbleTime}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </View>
  );
};

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId } = route.params || {};
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef(null);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await AsyncStorage.getItem('userId');
      setUserId(uid);
      const rows = await fetchMessages(conversationId, { limit: 50 });
      setMessages(rows);
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 0);
    } catch (e) {
      console.error('[Chat] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        const unsub = await subscribeConversationMessages(conversationId, {
          onInsert: (row) => {
            setMessages((prev) => {
              // evita duplicata
              if (prev.find((m) => m.id === row.id)) return prev;
              const next = [...prev, row];
              return next.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }, 50);
          },
        });
        unsubscribeRef.current = unsub;
      } catch (e) {
        console.error('[Chat] subscribe error:', e);
      }
    })();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [conversationId]);

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    try {
      const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const tempMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: userId,
        content: text,
        created_at: new Date().toISOString(),
      };
      // Limpa input e adiciona mensagem otimista
      setInput('');
      setMessages((prev) => {
        const next = [...prev, tempMessage];
        return next.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 0);

      const saved = await sendMessage(conversationId, text);
      // Substitui a mensagem temporária pela salva (evita duplicata se Realtime já tiver inserido)
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (!withoutTemp.find((m) => m.id === saved.id)) {
          withoutTemp.push(saved);
        }
        return withoutTemp.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
    } catch (e) {
      console.error('[Chat] send error:', e);
      // Em caso de erro, não mantemos a mensagem temporária (já removida acima) e restauramos o texto no input
      setInput(text);
    }
  };

  const renderItem = ({ item }) => {
    const isOwn = item.sender_id === userId;
    return <MessageBubble message={item} isOwn={isOwn} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar userImageUrl={null} />
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        />
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 6) }]}>
          <TextInput
            style={styles.input}
            placeholder="Escreva uma mensagem..."
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
            <MaterialCommunityIcons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleContainer: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  bubbleLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOwn: {
    backgroundColor: '#D6E4FF',
    alignSelf: 'flex-end',
  },
  bubbleOther: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: 15,
    color: '#222',
  },
  bubbleTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fafafa',
  },
  sendBtn: {
    backgroundColor: '#4F8CFF',
    padding: 12,
    borderRadius: 16,
  },
});

export default ChatScreen;


