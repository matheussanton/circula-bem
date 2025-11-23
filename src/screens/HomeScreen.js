import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, FlatList, Dimensions, SafeAreaView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { fetchCategories } from '../services/categoryService';
import { fetchProducts } from '../services/productService';
import { fetchUserById } from '../services/api';
import { formatPrice } from '../utils/priceUtils';
import ProductCard from '../components/ProductCard';
import * as Location from 'expo-location';
import HeaderBar from '../components/HeaderBar';

const INFO_CARDS = [
  { icon: 'clock-outline', label: 'Ativos', value: 5 },
  { icon: 'timer-sand', label: 'Pendentes', value: 2 },
  { icon: 'clipboard-list-outline', label: 'Total', value: 12 },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [userData, setUserData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCenter, setActiveCenter] = useState(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Buscar dados do usuário
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const user = await fetchUserById(userId);
        setUserData(user);
        setUserName(user ? `${user.first_name} ${user.last_name}` : '');
      }
      
      const cats = await fetchCategories();
      setCategories(cats);
      const prods = await fetchProducts();
      setProducts(prods);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Obter localização atual (opcional) para exibir distância
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setActiveCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {}
    })();
  }, []);

  const deg2rad = (deg) => (deg * Math.PI) / 180;
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) return null;
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Anexar distância aos produtos quando possível
  const productsWithDistance = useMemo(() => {
    if (!activeCenter) return products;
    return products.map(p => {
      const d = haversineKm(activeCenter.lat, activeCenter.lng, p.lat, p.lng);
      return d != null ? { ...p, distanceKm: d } : p;
    });
  }, [products, activeCenter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Função para aplicar o filtro
  const applySearch = useCallback(() => {
    setAppliedSearchQuery(searchQuery);
  }, [searchQuery]);

  // Função para limpar o filtro
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setAppliedSearchQuery('');
  }, []);

  const goToSearchResults = useCallback(() => {
    navigation.navigate('SearchResults', {
      q: searchQuery || '',
      // categoryId could be wired from a selected chip; keeping null for now
      categoryId: null,
      // Let the results screen fallback to current location; or pass a center here if you have it
      center: null,
      radiusKm: 25
    });
  }, [navigation, searchQuery]);

  // Memorizar os produtos filtrados
  const filteredProducts = useMemo(() => {
    return productsWithDistance.filter(product =>
      product.name?.toLowerCase().includes(appliedSearchQuery.toLowerCase())
    );
  }, [productsWithDistance, appliedSearchQuery]);

  // Memorizar o renderItem para evitar re-criações
  const renderProductItem = useCallback(({ item }) => {
    return (
      <ProductCard
        product={item}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        showDistance={true}
      />
    );
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header fixo fora da FlatList */}
        <HeaderBar userImageUrl={userData?.image_url} />

        {/* Search Bar fixo */}
        <TouchableOpacity style={styles.searchContainer} activeOpacity={0.9} onPress={goToSearchResults}>
          <MaterialCommunityIcons name="magnify" size={22} color="#B0B0B0" style={styles.searchIcon} />
          <View style={styles.searchBar}>
            <Text style={{ color: '#B0B0B0', fontSize: 16 }}>Inicie sua busca</Text>
          </View>
        </TouchableOpacity>

        {/* Conteúdo scrollável */}
        <FlatList
          data={[]} // Array vazio para usar apenas o ListHeaderComponent
          ListHeaderComponent={
            <>
              {/* Info Cards */}
              <View style={styles.infoCardsRow}>
                {INFO_CARDS.map((card, idx) => (
                  <View key={idx} style={styles.infoCard}>
                    <View style={styles.infoCardIconWrap}>
                      <MaterialCommunityIcons name={card.icon} size={28} color="#4F8CFF" />
                    </View>
                    <Text style={styles.infoCardValue}>{card.value}</Text>
                    <Text style={styles.infoCardLabel}>{card.label}</Text>
                  </View>
                ))}
              </View>

              {/* Categories */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categorias</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAll}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text>Carregando categorias...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Erro ao carregar categorias: {error}</Text>
                </View>
              ) : (
                <FlatList
                  data={categories}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.categoryItem}>
                      <View style={styles.categoryImageContainer}>
                        <Image source={{ uri: item.image_url }} style={styles.categoryImage} />
                      </View>
                      <Text style={styles.categoryText}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.categoriesScroll}
                />
              )}

              {/* Products Header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Produtos perto de você</Text>
              </View>

              {/* Products Grid */}
              <FlatList
                data={filteredProducts}
                keyExtractor={item => item.id?.toString()}
                numColumns={2}
                renderItem={renderProductItem}
                scrollEnabled={false}
                contentContainerStyle={styles.productsGrid}
              />
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: '#F7F8FA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 80,
    height: 32,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    marginTop: 8,
    height: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  infoCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 18,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  infoCardIconWrap: {
    backgroundColor: '#E8F0FE',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  infoCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  infoCardLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
  },
  viewAll: {
    fontSize: 14,
    color: '#4F8CFF',
    fontWeight: 'bold',
  },
  categoriesScroll: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryImageContainer: {
    backgroundColor: '#f2f2f2',
    borderRadius: 25,
    padding: 10,
    marginBottom: 6,
  },
  categoryImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  productsGrid: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default HomeScreen;
