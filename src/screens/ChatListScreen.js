import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import HeaderBar from '../components/HeaderBar';
import { listConversations, subscribeConversations } from '../services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString();
};

const ConversationItem = ({ item, onPress }) => {
  const isGroup = item.is_group;
  const title = isGroup ? (item.title || 'Grupo') : (item.other_user_name || 'Usuário');
  const imageUrl = isGroup ? item.image_url : item.other_user_image_url;
  const lastMessage = item.last_message_text || 'Sem mensagens';
  const lastTime = formatTime(item.last_message_at);

  return (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
      <View style={styles.itemLeft}>
        {imageUrl ? (
          <ExpoImage source={{ uri: imageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <MaterialCommunityIcons name={isGroup ? 'account-group' : 'account'} size={22} color="#666" />
          </View>
        )}
      </View>
      <View style={styles.itemCenter}>
        <Text numberOfLines={1} style={styles.itemTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.itemSubtitle}>{lastMessage}</Text>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemTime}>{lastTime}</Text>
      </View>
    </TouchableOpacity>
  );
};

const ChatListScreen = () => {
  const navigation = useNavigation();
  const [userImageUrl, setUserImageUrl] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const userJson = await AsyncStorage.getItem('userId');
      // userImageUrl será renderizado no HeaderBar pela Home normalmente; aqui mantemos caso o layout use o mesmo
      setUserImageUrl(null);
      const rows = await listConversations();
      setConversations(rows);
    } catch (e) {
      console.error('[ChatList] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    let unsubscribe = null;
    (async () => {
      try {
        unsubscribe = await subscribeConversations({
          onUpdate: () => {
            // Qualquer update em conversas do usuário deve refletir na lista
            load();
          },
        });
      } catch (e) {
        console.error('[ChatList] subscribe error:', e);
      }
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [load]);

  const openConversation = (conversation) => {
    navigation.navigate('Chat', { conversationId: conversation.conversation_id || conversation.id, title: conversation.title, otherUserName: conversation.other_user_name });
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar userImageUrl={userImageUrl} />
      <View style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Carregando conversas...</Text>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => (item.conversation_id || item.id)}
            renderItem={({ item }) => (
              <ConversationItem item={item} onPress={() => openConversation(item)} />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
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
  loadingText: {
    padding: 20,
    textAlign: 'center',
    color: '#444',
  },
  listContent: {
    paddingVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  itemLeft: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eee',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCenter: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#666',
  },
  itemRight: {
    marginLeft: 8,
  },
  itemTime: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 76,
  },
});

export default ChatListScreen;


