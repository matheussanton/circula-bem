import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProfileImage from './ProfileImage';
import { fetchUserById } from '../services/api';
import { getUserReviewTotalsByRole } from '../services/reviewService';
import { formatPhone } from '../utils/phoneUtils';
import { maskCPF } from '../utils/cpfUtils';

const UserProfileModal = ({
  visible,
  onClose,
  userId,
  onChatPress,
  onViewProductsPress,
}) => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [totals, setTotals] = useState({ locador: null, locatario: null });

  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [u, asLocador, asLocatario] = await Promise.all([
          fetchUserById(userId),
          getUserReviewTotalsByRole(userId, 'locador'),
          getUserReviewTotalsByRole(userId, 'locatario'),
        ]);
        if (!cancelled) {
          setUser(u);
          setTotals({ locador: asLocador, locatario: asLocatario });
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Erro ao carregar perfil');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  const primaryAddress = useMemo(() => {
    return user?.addresses?.[0] || null;
  }, [user]);

  const overallRating = useMemo(() => {
    const a = Number(totals.locador?.average_rating || 0);
    const b = Number(totals.locatario?.average_rating || 0);
    const countA = Number(totals.locador?.total_reviews || 0);
    const countB = Number(totals.locatario?.total_reviews || 0);
    const totalCount = countA + countB;
    if (totalCount === 0) return { avg: 0, total: 0 };
    const weighted = (a * countA + b * countB) / totalCount;
    return { avg: weighted, total: totalCount };
  }, [totals]);

  const handleChat = () => {
    if (onChatPress) return onChatPress(user);
    Alert.alert('Chat', 'Em breve você poderá conversar com o usuário.');
  };

  const handleViewProducts = () => {
    if (onViewProductsPress) return onViewProductsPress(user);
    Alert.alert('Ver produtos', 'Em breve você poderá ver os produtos deste usuário.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Perfil do Locatário</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Carregando perfil...</Text>
            </View>
          ) : error ? (
            <View style={styles.loading}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : user ? (
            <>
              <View style={styles.headerRow}>
                <ProfileImage imageUrl={user.image_url} size={64} borderWidth={2} borderColor="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.name}>
                    {user.first_name} {user.last_name}
                  </Text>
                  <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6B7280" />
                    <Text style={styles.locationText}>
                      {primaryAddress
                        ? `${primaryAddress.city} / ${primaryAddress.state}`
                        : 'Localização não informada'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Informações da Conta</Text>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#4B5563" />
                  <Text style={styles.infoText}>
                    {user.registration_number ? maskCPF(user.registration_number) : 'CPF não informado'}
                  </Text>
                </View>
                {user.phone_number ? (
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="phone-outline" size={18} color="#4B5563" />
                    <Text style={styles.infoText}>{formatPhone(user.phone_number)}</Text>
                  </View>
                ) : null}
                {primaryAddress ? (
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="home-outline" size={18} color="#4B5563" />
                    <Text style={styles.infoText}>
                      {primaryAddress.street} - {primaryAddress.neighborhood}
                    </Text>
                  </View>
                ) : null}
                {user.subscription ? (
                  <View style={styles.infoItem}>
                    <MaterialCommunityIcons name="account-badge-outline" size={18} color="#4B5563" />
                    <Text style={styles.infoText}>
                      Plano: {String(user.subscription).toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.ratingRow}>
                <View style={styles.ratingPill}>
                  <MaterialCommunityIcons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {overallRating.avg.toFixed(1)} ({overallRating.total})
                  </Text>
                </View>
                <View style={[styles.ratingPill, { backgroundColor: '#EEF2FF' }]}>
                  <MaterialCommunityIcons name="account-tie-outline" size={16} color="#4F46E5" />
                  <Text style={[styles.ratingText, { color: '#3730A3' }]}>
                    Locador: {Number(totals.locador?.average_rating || 0).toFixed(1)}
                  </Text>
                </View>
                <View style={[styles.ratingPill, { backgroundColor: '#ECFDF5' }]}>
                  <MaterialCommunityIcons name="account-outline" size={16} color="#059669" />
                  <Text style={[styles.ratingText, { color: '#065F46' }]}>
                    Locatário: {Number(totals.locatario?.average_rating || 0).toFixed(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.chatBtn]} onPress={handleChat}>
                  <MaterialCommunityIcons name="chat-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.productsBtn]} onPress={handleViewProducts}>
                  <MaterialCommunityIcons name="view-grid-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionText}>Ver produtos</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.loading}>
              <Text style={styles.errorText}>Usuário não encontrado</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  loading: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#6B7280',
  },
  errorText: {
    color: '#EF4444',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  locationRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoSection: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C2D12',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  chatBtn: {
    backgroundColor: '#3B82F6',
  },
  productsBtn: {
    backgroundColor: '#10B981',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default UserProfileModal;





