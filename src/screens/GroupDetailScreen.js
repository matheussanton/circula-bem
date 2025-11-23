import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
  Share,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SUPABASE_CONFIG } from '../config/env';
import { 
  fetchGroupById, 
  fetchGroupProducts, 
  checkUserMembership,
  requestGroupMembership
} from '../services/groupService';
import useGroupStore from '../stores/groupStore';
import ProfileImage from '../components/ProfileImage';
import { maskCPF } from '../utils/cpfUtils';

const GroupDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;

  const [group, setGroup] = useState(null);
  const [products, setProducts] = useState([]);
  const [membership, setMembership] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('produtos'); // 'produtos' ou 'membros'
  const [requestingMembership, setRequestingMembership] = useState(false);

  // Zustand store for membership management
  const {
    pendingMemberships,
    loadPendingMemberships,
    approveMembership,
    rejectMembership,
    clearError
  } = useGroupStore();

  useEffect(() => {
    loadGroupDetails();
  }, [groupId]);

  // Auto-switch to pending requests tab when there are new requests for admins
  useEffect(() => {
    if (membership.isAdmin && pendingMemberships.length > 0 && activeTab !== 'solicitacoes') {
      // Only auto-switch if we're not already viewing products or members content
      if (activeTab === 'produtos' || activeTab === 'membros') {
        setActiveTab('solicitacoes');
      }
    }
  }, [pendingMemberships.length, membership.isAdmin]);

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      
      // Carregar dados em paralelo
      const [groupData, membershipData] = await Promise.all([
        fetchGroupById(groupId),
        checkUserMembership(groupId)
      ]);

      setGroup(groupData);
      setMembership(membershipData);

      // Só carregar produtos se o usuário for membro ativo
      if (membershipData.isMember && membershipData.isActive) {
        const productsData = await fetchGroupProducts(groupId, false);
        setProducts(productsData);
      }

      // Se for admin, carregar solicitações pendentes
      if (membershipData.isAdmin) {
        try {
          await loadPendingMemberships(groupId);
        } catch (error) {
          console.log('Nenhuma solicitação pendente ou erro ao carregar:', error.message);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar detalhes do grupo:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do grupo');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadGroupDetails();
      clearError();
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      if (group?.invite_link) {
        // Mostrar opções ao usuário
        Alert.alert(
          'Compartilhar Convite',
          `Escolha como deseja compartilhar o convite do grupo "${group.name}":`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ver Link',
              onPress: () => {
                Alert.alert(
                  'Link de Convite',
                  `Copie o link abaixo:\n\n${group.invite_link}`,
                  [{ text: 'OK', style: 'default' }]
                );
              }
            },
            {
              text: 'Compartilhar',
              onPress: async () => {
                try {
                  await Share.share({
                    message: `Olá! Você foi convidado(a) para participar do grupo "${group.name}" no CirculaBem.\n\nUse este link para solicitar participação:\n${group.invite_link}`,
                  });
                } catch (shareError) {
                  Alert.alert('Erro', 'Não foi possível compartilhar');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Erro', 'Link de convite não disponível');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível acessar o link de convite');
    }
  };

  const handleRequestMembership = async () => {
    Alert.alert(
      'Solicitar Participação',
      `Deseja solicitar participação no grupo "${group?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: async () => {
            try {
              setRequestingMembership(true);
              await requestGroupMembership(groupId);
              
              // Atualizar o estado de membership local
              setMembership(prev => ({
                ...prev,
                isMember: true,
                status: 'pendente'
              }));
              
              Alert.alert('Sucesso', 'Solicitação enviada! Aguarde a aprovação dos administradores.');
            } catch (error) {
              Alert.alert('Erro', error.message);
            } finally {
              setRequestingMembership(false);
            }
          }
        }
      ]
    );
  };

  const handleApproveMembership = async (membershipId, userName) => {
    Alert.alert(
      'Aprovar Solicitação',
      `Deseja aprovar a solicitação de "${userName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: async () => {
            try {
              await approveMembership(membershipId, groupId);
              Alert.alert('Sucesso', `${userName} foi aprovado(a) no grupo!`);
              // Recarregar dados do grupo para atualizar contadores
              await loadGroupDetails();
            } catch (error) {
              Alert.alert('Erro', error.message);
            }
          }
        }
      ]
    );
  };

  const handleRejectMembership = async (membershipId, userName) => {
    Alert.alert(
      'Negar Solicitação',
      `Deseja negar a solicitação de "${userName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Negar',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectMembership(membershipId, groupId);
              Alert.alert('Solicitação Negada', `A solicitação de ${userName} foi negada.`);
            } catch (error) {
              Alert.alert('Erro', error.message);
            }
          }
        }
      ]
    );
  };

  const getGroupImage = (imageUrl) => {
    if (imageUrl && imageUrl.trim() !== '') {
      if (imageUrl.startsWith('http')) {
        return { uri: imageUrl };
      }
      const fullUrl = `${SUPABASE_CONFIG.URL}/storage/v1/object/public/group-images/${imageUrl}`;
      return { uri: fullUrl };
    }
    return { uri: 'https://via.placeholder.com/120x120/E5E7EB/9CA3AF?text=Grupo' };
  };

  const getProductImage = (imageUrl) => {
    if (imageUrl && imageUrl.trim() !== '') {
      if (imageUrl.startsWith('http')) {
        return { uri: imageUrl };
      }
      return { uri: imageUrl };
    }
    return { uri: 'https://via.placeholder.com/80x80/F3F4F6/9CA3AF?text=Produto' };
  };

  const getMemberStatusBadge = (member) => {
    if (member.role === 'admin') {
      return (
        <View style={styles.adminBadge}>
          <MaterialCommunityIcons name="crown" size={12} color="#FFF" />
          <Text style={styles.badgeText}>Admin</Text>
        </View>
      );
    }
    
    if (member.status === 'pendente') {
      return (
        <View style={styles.pendingBadge}>
          <Text style={styles.badgeText}>Pendente</Text>
        </View>
      );
    }
    
    return null;
  };

  const getProductStatusBadge = (status) => {
    const statusConfig = {
      confirmado: { color: '#10B981', text: 'Confirmado' },
      pendente: { color: '#F59E0B', text: 'Pendente' },
      negado: { color: '#EF4444', text: 'Negado' }
    };
    
    const config = statusConfig[status] || statusConfig.pendente;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
        <Text style={styles.statusBadgeText}>{config.text}</Text>
      </View>
    );
  };

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => handleProductPress(item)}>
      <Image 
        source={getProductImage(item.mainImage)} 
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.productPrice}>{item.priceFormatted}</Text>
        <View style={styles.productMeta}>
          <Text style={styles.productOwner}>por {item.owner.name}</Text>
          {getProductStatusBadge(item.groupStatus)}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberCard}>
      <ProfileImage 
        imageUrl={item.user.image_url} 
        size={50}
        style={styles.memberImage}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.user.full_name}</Text>
        <Text style={styles.memberRegistration}>
          {maskCPF(item.user.registration_number)}
        </Text>
        <Text style={styles.memberDate}>
          Membro desde {new Date(item.joined_at).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      {getMemberStatusBadge(item)}
    </View>
  );

  const renderPendingMembershipItem = ({ item }) => (
    <View style={styles.pendingMembershipCard}>
      <ProfileImage 
        imageUrl={item.user.image_url} 
        size={50}
        style={styles.memberImage}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.user.full_name}</Text>
        <Text style={styles.memberRegistration}>
          {maskCPF(item.user.registration_number)}
        </Text>
        <Text style={styles.memberDate}>
          Solicitou em {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      <View style={styles.pendingActions}>
        <TouchableOpacity 
          style={styles.approveButton}
          onPress={() => handleApproveMembership(item.id, item.user.full_name)}
        >
          <MaterialCommunityIcons name="check" size={20} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => handleRejectMembership(item.id, item.user.full_name)}
        >
          <MaterialCommunityIcons name="close" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyProducts = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="package-variant" size={60} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>Nenhum produto no grupo</Text>
      <Text style={styles.emptySubtitle}>
        Os produtos compartilhados no grupo aparecerão aqui
      </Text>
    </View>
  );

  const renderEmptyMembers = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-group" size={60} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>Nenhum membro encontrado</Text>
      <Text style={styles.emptySubtitle}>
        Os membros do grupo aparecerão aqui
      </Text>
    </View>
  );

  const renderEmptyPendingMemberships = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-clock" size={60} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>Nenhuma solicitação pendente</Text>
      <Text style={styles.emptySubtitle}>
        As solicitações de participação aparecerão aqui
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Carregando grupo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={60} color="#EF4444" />
          <Text style={styles.errorTitle}>Grupo não encontrado</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Grupo</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color="#111827" />
            {/* Badge para solicitações pendentes */}
            {membership.isAdmin && pendingMemberships.length > 0 && (
              <View style={styles.pendingBadgeHeader}>
                <Text style={styles.pendingBadgeHeaderText}>
                  {pendingMemberships.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Group Info Card */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Image 
              source={getGroupImage(group.image_url)} 
              style={styles.groupImage}
            />
            <View style={styles.groupMainInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupDescription}>{group.description}</Text>
              <View style={styles.groupStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{group.memberCount}</Text>
                  <Text style={styles.statLabel}>Membros</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{products.length}</Text>
                  <Text style={styles.statLabel}>Produtos</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{group.adminCount}</Text>
                  <Text style={styles.statLabel}>Admins</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {membership.isMember && membership.isActive && (
              <TouchableOpacity 
                style={styles.inviteButton}
                onPress={handleCopyInviteLink}
              >
                <MaterialCommunityIcons name="share-variant" size={20} color="#2563EB" />
                <Text style={styles.inviteButtonText}>Compartilhar Convite</Text>
              </TouchableOpacity>
            )}
            
            {membership.isMember && membership.status === 'pendente' && (
              <View style={styles.pendingContainer}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#F59E0B" />
                <Text style={styles.pendingText}>Solicitação pendente</Text>
              </View>
            )}
            
            {!membership.isMember && (
              <TouchableOpacity 
                style={[styles.joinButton, requestingMembership && styles.joinButtonDisabled]}
                onPress={handleRequestMembership}
                disabled={requestingMembership}
              >
                {requestingMembership ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <MaterialCommunityIcons name="account-plus" size={20} color="#FFF" />
                )}
                <Text style={styles.joinButtonText}>
                  {requestingMembership ? 'Solicitando...' : 'Solicitar Participação'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs - Only show for active members */}
        {membership.isMember && membership.isActive && (
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'produtos' && styles.activeTab]}
              onPress={() => setActiveTab('produtos')}
            >
              <MaterialCommunityIcons 
                name="package-variant" 
                size={20} 
                color={activeTab === 'produtos' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[
                styles.tabText, 
                activeTab === 'produtos' && styles.activeTabText
              ]}>
                Produtos ({products.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'membros' && styles.activeTab]}
              onPress={() => setActiveTab('membros')}
            >
              <MaterialCommunityIcons 
                name="account-group" 
                size={20} 
                color={activeTab === 'membros' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[
                styles.tabText, 
                activeTab === 'membros' && styles.activeTabText
              ]}>
                Membros ({group.memberCount})
              </Text>
            </TouchableOpacity>

            {/* Aba de Solicitações - só para admins com solicitações pendentes */}
            {membership.isAdmin && pendingMemberships.length > 0 && (
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'solicitacoes' && styles.activeTab]}
                onPress={() => setActiveTab('solicitacoes')}
              >
                <MaterialCommunityIcons 
                  name="account-clock" 
                  size={20} 
                  color={activeTab === 'solicitacoes' ? '#2563EB' : '#6B7280'} 
                />
                <Text style={[
                  styles.tabText, 
                  activeTab === 'solicitacoes' && styles.activeTabText
                ]}>
                  Solicitações ({pendingMemberships.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Content */}
        {membership.isMember && membership.isActive ? (
          <View style={styles.contentContainer}>
            {activeTab === 'produtos' ? (
              <View>
                <FlatList
                  data={products.slice(0, 3)} // Mostrar apenas os primeiros 3 produtos
                  renderItem={renderProductItem}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={renderEmptyProducts}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
                {products.length > 3 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('GroupProducts', { 
                      groupId: group.id, 
                      groupName: group.name 
                    })}
                  >
                    <MaterialCommunityIcons name="package-variant" size={20} color="#2563EB" />
                    <Text style={styles.viewAllButtonText}>
                      Ver todos os {products.length} produtos
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#2563EB" />
                  </TouchableOpacity>
                )}
                {products.length > 0 && products.length <= 3 && (
                  <TouchableOpacity 
                    style={styles.viewAllButtonSecondary}
                    onPress={() => navigation.navigate('GroupProducts', { 
                      groupId: group.id, 
                      groupName: group.name 
                    })}
                  >
                    <MaterialCommunityIcons name="magnify" size={16} color="#6B7280" />
                    <Text style={styles.viewAllButtonSecondaryText}>
                      Pesquisar produtos
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Botão para adicionar produtos ao grupo */}
                <TouchableOpacity 
                  style={styles.addProductButton}
                  onPress={() => {
                    Alert.alert(
                      'Adicionar Produto ao Grupo',
                      'Você deseja compartilhar um produto seu neste grupo?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { 
                          text: 'Meus Produtos', 
                          onPress: () => navigation.navigate('SelectProductForGroup', {
                            groupId: group.id,
                            groupName: group.name
                          })
                        },
                        { 
                          text: 'Criar Novo', 
                          onPress: () => navigation.navigate('CreateProduct')
                        }
                      ]
                    );
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="#10B981" />
                  <Text style={styles.addProductButtonText}>
                    Compartilhar produto neste grupo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : activeTab === 'membros' ? (
              <FlatList
                data={group.members}
                renderItem={renderMemberItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyMembers}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : activeTab === 'solicitacoes' ? (
              <FlatList
                data={pendingMemberships}
                renderItem={renderPendingMembershipItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyPendingMemberships}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.nonMemberContent}>
            <MaterialCommunityIcons 
              name={membership.status === 'pendente' ? "clock-outline" : "lock-outline"} 
              size={60} 
              color="#9CA3AF" 
            />
            <Text style={styles.nonMemberTitle}>
              {membership.status === 'pendente' 
                ? 'Aguardando Aprovação' 
                : 'Acesso Restrito'
              }
            </Text>
            <Text style={styles.nonMemberSubtitle}>
              {membership.status === 'pendente'
                ? 'Sua solicitação está sendo analisada pelos administradores do grupo.'
                : 'Apenas membros do grupo podem ver produtos e outros membros.'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingBadgeHeader: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  pendingBadgeHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  groupImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    marginRight: 16,
  },
  groupMainInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  actionButtons: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  inviteButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productOwner: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberImage: {
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  memberRegistration: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  memberDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  joinButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nonMemberContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  nonMemberTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 24,
  },
  nonMemberSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  pendingMembershipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    padding: 8,
    borderRadius: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  viewAllButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  viewAllButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewAllButtonSecondaryText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addProductButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default GroupDetailScreen; 
