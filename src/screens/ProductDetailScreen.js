import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, SafeAreaView } from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchProductById } from '../services/productService';
import { getProductReviewTotals } from '../services/reviewService';
import { fetchUserById } from '../services/api';
import { fetchCategories } from '../services/categoryService';
import { registerCallback } from '../services/callbackRegistry';
import { v4 as uuidv4 } from 'uuid';
import ProfileImage from '../components/ProfileImage';
import { formatPrice } from '../utils/priceUtils';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Platform, TextInput, ScrollView as RNScroll } from 'react-native';

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [renter, setRenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const windowWidth = Dimensions.get('window').width;
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [tempQ, setTempQ] = useState('');
  const [tempCenter, setTempCenter] = useState(null);
  const [tempRadius, setTempRadius] = useState(25);
  const [productTotals, setProductTotals] = useState(null);

  useEffect(() => {
    const loadProductDetails = async () => {
      try {
        const productDetails = await fetchProductById(productId);
        setProduct(productDetails);

        if (productDetails.user_id) {
          const renterDetails = await fetchUserById(productDetails.user_id);
          setRenter(renterDetails);
        }

        // Totais de avaliações do produto
        try {
          const totals = await getProductReviewTotals(productId);
          setProductTotals(totals);
        } catch {}
      } catch (error) {
        console.error('Erro ao carregar detalhes do produto ou usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProductDetails();
  }, [productId]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const hasCoords = typeof product?.lat === 'number' && typeof product?.lng === 'number';
  const RADIUS_METERS = 500; // 1km diameter

  // Compute a random point inside the circle around product coords
  const [randPoint, setRandPoint] = useState(null);
  useEffect(() => {
    if (!hasCoords) return;
    const generateRandomPoint = () => {
      // Polar method
      const t = 2 * Math.PI * Math.random();
      const u = Math.random() + Math.random();
      const r = (u > 1 ? 2 - u : u); // in [0,1], more uniform-ish
      const dist = r * RADIUS_METERS; // meters

      const lat = product.lat;
      const lng = product.lng;
      const metersPerDegLat = 111320;
      const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180) || 1;
      const dLat = (Math.sin(t) * dist) / metersPerDegLat;
      const dLng = (Math.cos(t) * dist) / metersPerDegLng;
      return { latitude: lat + dLat, longitude: lng + dLng };
    };
    setRandPoint(generateRandomPoint());
  }, [hasCoords, product?.lat, product?.lng]);

  const miniRegion = useMemo(() => {
    if (!randPoint) return null;
    const lat = randPoint.latitude;
    const metersPerDegLat = 111320;
    const latDelta = (RADIUS_METERS / metersPerDegLat) * 6; // zoom to show circle nicely
    const lngDelta =
      (RADIUS_METERS / (111320 * Math.cos((lat * Math.PI) / 180) || 1)) * 6;
    return {
      latitude: lat,
      longitude: randPoint.longitude,
      latitudeDelta: Math.max(0.002, latDelta),
      longitudeDelta: Math.max(0.002, lngDelta),
    };
  }, [randPoint]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F8CFF" />
        <Text style={styles.loadingText}>Carregando produto...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Produto não encontrado.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const productImages = product.product_images || [];
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#222" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="heart-outline" size={24} color="#222" />
          </TouchableOpacity>
        </View>

        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {productImages.length > 0 ? (
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.floor(event.nativeEvent.contentOffset.x / windowWidth);
                setCurrentImageIndex(index);
              }}
            >
              {productImages.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: img.image_url }}
                  style={[styles.productImage, { width: windowWidth }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <Image
              source={{ uri: 'https://via.placeholder.com/300x200/cccccc/666666?text=Sem+Imagem' }}
              style={[styles.productImage, { width: windowWidth }]}
              resizeMode="cover"
            />
          )}
          
          {/* Image indicators */}
          {productImages.length > 1 && (
            <View style={styles.imageIndicators}>
              {productImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    { backgroundColor: index === currentImageIndex ? '#4F8CFF' : '#E0E0E0' }
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{product.name}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            <Text style={styles.priceLabel}>/ dia</Text>
          </View>

          {/* <Text style={styles.location}>
            {renter?.addresses?.[0] 
              ? `${renter.addresses[0].neighborhood}, ${renter.addresses[0].city} - ${renter.addresses[0].state}` 
              : 'Localização não disponível'}
          </Text> */}

          {hasCoords && miniRegion && randPoint && (
            <View style={styles.mapBlock}>
              <MapView
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={styles.miniMap}
                initialRegion={miniRegion}
                pointerEvents="none"
              >
                <Circle
                  center={randPoint}
                  radius={RADIUS_METERS}
                  strokeColor="rgba(79,140,255,0.8)"
                  fillColor="rgba(79,140,255,0.2)"
                />
              </MapView>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ProductMap', {
                    center: { lat: product.lat, lng: product.lng },
                    radiusMeters: RADIUS_METERS,
                    productName: product.name,
                  })
                }
                style={styles.viewMapBtn}
              >
                <MaterialCommunityIcons name="map-search-outline" size={18} color="#4F8CFF" />
                <Text style={styles.viewMapText}>Ver no mapa</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.ratingContainer}>
            <FontAwesome name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>
              {productTotals ? Number(productTotals.average_rating || 0).toFixed(1) : '0.0'}
            </Text>
            <Text style={styles.reviewCount}>
              ({productTotals?.total_reviews || 0} avaliações)
            </Text>
          </View>

          {/* Buscar similares */}
          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>Buscar similares</Text>

            <TouchableOpacity
              style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
              onPress={() => {
                const cbKey = uuidv4();
                registerCallback(cbKey, ({ lat, lng }) => setTempCenter({ lat, lng }));
                navigation.navigate('MapPickerFull', {
                  initial: product?.lat && product?.lng ? { latitude: product.lat, longitude: product.lng } : null,
                  callbackKey: cbKey,
                });
              }}
            >
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#334155" style={{ marginRight: 8 }} />
              <Text style={{ color: '#334155' }}>{tempCenter ? 'Endereço selecionado' : 'Escolher endereço'}</Text>
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={{ backgroundColor: activeCat === c.id ? '#4F8CFF' : '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, marginRight: 8 }}
                  onPress={() => setActiveCat(prev => (prev === c.id ? null : c.id))}
                >
                  <Text style={{ color: activeCat === c.id ? '#fff' : '#1F2937', fontWeight: '600' }}>{c.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <MaterialCommunityIcons name="magnify" size={20} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, color: '#0F172A' }}
                placeholder="Nome do produto"
                placeholderTextColor="#94A3B8"
                onChangeText={setTempQ}
              />
            </View>

            <View style={{ flexDirection: 'row' }}>
              {[5, 10, 25, 50].map(v => (
                <TouchableOpacity key={v} onPress={() => setTempRadius(v)} style={{ backgroundColor: tempRadius === v ? '#4F8CFF' : '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, marginRight: 8 }}>
                  <Text style={{ color: tempRadius === v ? '#fff' : '#1F2937', fontWeight: '600' }}>{v} km</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ marginTop: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#4F8CFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', textColor: '#4F8CFF' }}
              onPress={() =>
                navigation.navigate('SearchResults', {
                  q: tempQ || '',
                  categoryId: activeCat || null,
                  center: tempCenter || (product?.lat && product?.lng ? { lat: product.lat, lng: product.lng } : null),
                  radiusKm: tempRadius || 25
                })
              }
            >
              <Text style={{ color: '#4F8CFF', fontWeight: '500' }}>Buscar</Text>
            </TouchableOpacity>
          </View>

          {/* Seller Info */}
          {renter && (
            <View style={styles.sellerContainer}>
              <ProfileImage
                imageUrl={renter.image_url}
                size={50}
                borderWidth={0}
              />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{renter.first_name} {renter.last_name}</Text>
                <Text style={styles.verifiedText}>Conta verificada</Text>
              </View>
            </View>
          )}

          {/* Availability */}
          {product.availabilities && product.availabilities.length > 0 && (
            <View style={styles.availabilityContainer}>
              <Text style={styles.sectionTitle}>Disponibilidade</Text>
              <View style={styles.availabilityTags}>
                {product.availabilities.map((day, index) => (
                  <View key={index} style={styles.availabilityTag}>
                    <Text style={styles.availabilityText}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.productDescription}>
            {product.description || 'Sem descrição disponível.'}
          </Text>

          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => navigation.navigate('SelectDate', { product, renter })}
          >
            <Text style={styles.bookButtonText}>Alugar Agora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7F8FA' 
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4F8CFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: { 
    height: 300,
    backgroundColor: '#eee',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  detailsContainer: { 
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
    minHeight: 400,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F8CFF',
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  location: { 
    fontSize: 16, 
    color: '#666', 
    marginBottom: 10,
  },
  ratingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  ratingText: { 
    marginLeft: 5, 
    fontSize: 16, 
    fontWeight: 'bold',
    color: '#222',
  },
  reviewCount: { 
    fontSize: 14, 
    color: '#666', 
    marginLeft: 5,
  },
  sellerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  sellerImage: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    marginRight: 15,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#222',
  },
  verifiedText: { 
    fontSize: 14, 
    color: '#4F8CFF',
    marginTop: 2,
  },
  mapBlock: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EAF1FF',
  },
  miniMap: {
    width: '100%',
    height: 160,
  },
  viewMapBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewMapText: {
    color: '#4F8CFF',
    fontWeight: '700',
  },
  availabilityContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
  },
  availabilityTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availabilityTag: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  availabilityText: {
    color: '#4F8CFF',
    fontSize: 14,
    fontWeight: '500',
  },
  productDescription: { 
    fontSize: 16, 
    lineHeight: 24,
    color: '#444',
    marginBottom: 30,
  },
  bookButton: { 
    backgroundColor: '#4F8CFF', 
    borderRadius: 12, 
    paddingVertical: 16, 
    alignItems: 'center',
    shadowColor: '#4F8CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bookButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;
