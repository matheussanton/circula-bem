import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SUPABASE_CONFIG } from '../config/env';
import { 
  fetchGroupProducts, 
  fetchGroupById, 
  checkUserMembership,
  approveGroupProduct,
  rejectGroupProduct 
} from '../services/groupService';
import ProfileImage from '../components/ProfileImage';

const GroupProductsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId, groupName } = route.params;

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('todos'); // 'todos', 'confirmado', 'pendente'
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [groupId]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedFilter]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Verificar se o usuário é admin
      const membership = await checkUserMembership(groupId);
      setIsAdmin(membership.isAdmin);
      
      // Carregar produtos (todos os produtos se for admin)
      const productsData = await fetchGroupProducts(groupId, true); // showAll = true para mostrar todos
      setProducts(productsData);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInitialData();
    } catch (error) {
      console.error('❌ Erro ao atualizar dados:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filtrar por texto de busca
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.owner.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por status
    if (selectedFilter !== 'todos') {
      filtered = filtered.filter(product => product.groupStatus === selectedFilter);
    }

    setFilteredProducts(filtered);
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

  const getProductStatusBadge = (status) => {
    const statusConfig = {
      confirmado: { color: '#10B981', text: 'Confirmado', icon: 'check-circle' },
      pendente: { color: '#F59E0B', text: 'Pendente', icon: 'clock-outline' },
      negado: { color: '#EF4444', text: 'Negado', icon: 'close-circle' }
    };
    
    const config = statusConfig[status] || statusConfig.pendente;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
        <MaterialCommunityIcons name={config.icon} size={12} color="#FFF" />
        <Text style={styles.statusBadgeText}>{config.text}</Text>
      </View>
    );
  };

  const handleProductPress = (product) => {
    // Navegar para detalhes do produto
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const handleApproveProduct = async (product) => {
    Alert.alert(
      'Aprovar Produto',
      `Deseja aprovar o produto "${product.name}" no grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: async () => {
            try {
              await approveGroupProduct(product.groupProductId, groupId);
              Alert.alert('Sucesso', 'Produto aprovado com sucesso!');
              await loadInitialData(); // Recarregar dados
            } catch (error) {
              Alert.alert('Erro', error.message);
            }
          }
        }
      ]
    );
  };

  const handleRejectProduct = async (product) => {
    Alert.alert(
      'Negar Produto',
      `Deseja negar o produto "${product.name}"? Ele será removido do grupo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Negar',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectGroupProduct(product.groupProductId, groupId);
              Alert.alert('Produto Negado', 'O produto foi removido do grupo.');
              await loadInitialData(); // Recarregar dados
            } catch (error) {
              Alert.alert('Erro', error.message);
            }
          }
        }
      ]
    );
  };

  const renderFilterButton = (filter, label, count) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
    >
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
        
        <View style={styles.productFooter}>
          <View style={styles.ownerInfo}>
            <ProfileImage 
              imageUrl={item.owner.image_url} 
              size={20}
              style={styles.ownerImage}
            />
            <Text style={styles.productOwner}>por {item.owner.name}</Text>
          </View>
          {getProductStatusBadge(item.groupStatus)}
        </View>

        {/* Controles de Admin para produtos pendentes */}
        {isAdmin && item.groupStatus === 'pendente' && (
          <View style={styles.adminControls}>
            <TouchableOpacity 
              style={styles.approveButton}
              onPress={() => handleApproveProduct(item)}
            >
              <MaterialCommunityIcons name="check" size={16} color="#FFF" />
              <Text style={styles.adminButtonText}>Aprovar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.rejectButton}
              onPress={() => handleRejectProduct(item)}
            >
              <MaterialCommunityIcons name="close" size={16} color="#FFF" />
              <Text style={styles.adminButtonText}>Negar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons 
        name={searchQuery ? "magnify" : "package-variant"} 
        size={60} 
        color="#9CA3AF" 
      />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto no grupo'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Tente buscar por outros termos'
          : 'Os produtos compartilhados no grupo aparecerão aqui'
        }
      </Text>
      {searchQuery && (
        <TouchableOpacity 
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery('')}
        >
          <Text style={styles.clearSearchText}>Limpar busca</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const getFilterCounts = () => {
    const counts = {
      todos: products.length,
      confirmado: products.filter(p => p.groupStatus === 'confirmado').length,
      pendente: products.filter(p => p.groupStatus === 'pendente').length,
      negado: products.filter(p => p.groupStatus === 'negado').length,
    };
    return counts;
  };

  const filterCounts = getFilterCounts();

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
        <View style={styles.headerTitle}>
          <Text style={styles.titleText}>Produtos</Text>
          <Text style={styles.subtitleText}>{groupName || 'Grupo'}</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produtos..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersRow}>
          {renderFilterButton('todos', 'Todos', filterCounts.todos)}
          {renderFilterButton('confirmado', 'Confirmados', filterCounts.confirmado)}
          {renderFilterButton('pendente', 'Pendentes', filterCounts.pendente)}
          {filterCounts.negado > 0 && renderFilterButton('negado', 'Negados', filterCounts.negado)}
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
        </Text>
      </View>

      {/* Products List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Carregando produtos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    width: 40,
  },
  headerTitle: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  subtitleText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
    paddingTop: 8,
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
    marginBottom: 12,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ownerImage: {
    marginRight: 6,
  },
  productOwner: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  clearSearchButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  adminControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  adminButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default GroupProductsScreen; 
