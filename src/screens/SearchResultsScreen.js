import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView, TextInput, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { searchProducts } from '../services/productService';
import { formatPrice } from '../utils/priceUtils';
import ProductCard from '../components/ProductCard';
import MapProductPin from '../components/MapProductPin';
import { fetchCategories } from '../services/categoryService';
import { saveSearch, getRecentSearches } from '../services/searchService.js';
import { registerCallback } from '../services/callbackRegistry';
import { v4 as uuidv4 } from 'uuid';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';

const PAGE_SIZE = 20;

const SearchResultsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { q = '', categoryId = null, center = null, radiusKm = 25 } = route.params || {};

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [from, setFrom] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeCenter, setActiveCenter] = useState(center || null);
  const [radius, setRadius] = useState(radiusKm);
  const [activeCategory, setActiveCategory] = useState(categoryId);
  const [categories, setCategories] = useState([]);
  const [recent, setRecent] = useState([]);
  const [query, setQuery] = useState(q);
  const [mapMode, setMapMode] = useState(false);
  const mapRef = useRef(null);

  // Try to fallback to current location when no center is provided
  useEffect(() => {
    const maybeGetLocation = async () => {
      if (activeCenter) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setActiveCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {}
    };
    maybeGetLocation();
  }, []);

  const load = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setFrom(0);
      } else {
        setLoadingMore(true);
      }
      const res = await searchProducts({
        q: query,
        categoryId: activeCategory,
        center: activeCenter,
        radiusKm: radius,
        from: reset ? 0 : from,
        to: (reset ? 0 : from) + PAGE_SIZE - 1
      });
      if (reset) {
        setItems(res);
        setHasMore(res.length === PAGE_SIZE);
      } else {
        setItems(prev => [...prev, ...res]);
        setHasMore(res.length === PAGE_SIZE);
      }
      setFrom(prev => (reset ? PAGE_SIZE : prev + PAGE_SIZE));

      // Persist search (only on reset)
      if (reset) {
        try {
          await saveSearch({ q: query, categoryId: activeCategory, center: activeCenter, radiusKm: radius });
          const recents = await getRecentSearches(5);
          setRecent(recents);
        } catch {}
      }
    } catch (e) {
      // Show empty/error state via zero results
      if (reset) setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [query, activeCategory, activeCenter, radius, from]);

  // Reload when filters change or when center becomes available
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory, radius, activeCenter?.lat, activeCenter?.lng]);

  // Load categories and recent searches on mount
  useEffect(() => {
    (async () => {
      try {
        const cats = await fetchCategories();
        setCategories(cats || []);
      } catch {}
      try {
        const recents = await getRecentSearches(5);
        setRecent(recents);
      } catch {}
    })();
  }, []);

  const renderItem = ({ item }) => (
    <ProductCard
      product={item}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      showDistance={true}
    />
  );

  const computeRegion = () => {
    // Prefer activeCenter + radius; fallback to first item with coords; else SP
    if (activeCenter) {
      const metersPerDegLat = 111320;
      const latDelta = (radius * 1000 / metersPerDegLat) * 6;
      const lngDelta = (radius * 1000 / (111320 * Math.cos((activeCenter.lat * Math.PI) / 180) || 1)) * 6;
      return {
        latitude: activeCenter.lat,
        longitude: activeCenter.lng,
        latitudeDelta: Math.max(0.01, latDelta),
        longitudeDelta: Math.max(0.01, lngDelta),
      };
    }
    const first = items.find(p => typeof p.lat === 'number' && typeof p.lng === 'number');
    if (first) {
      return {
        latitude: first.lat,
        longitude: first.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    return {
      latitude: -23.55052,
      longitude: -46.633308,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  };

  const renderMap = () => {
    const region = computeRegion();
    const markers = items.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
    return (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={{ flex: 1 }}
          initialRegion={region}
        >
          {activeCenter && (
            <Circle
              center={{ latitude: activeCenter.lat, longitude: activeCenter.lng }}
              radius={radius * 1000}
              strokeColor="rgba(79,140,255,0.8)"
              fillColor="rgba(79,140,255,0.2)"
            />
          )}
          {markers.map(p => {
            const preview =
              p.product_images?.find?.(img => img.image_url && img.image_url.endsWith('_0.jpg'))?.image_url ||
              p.product_images?.[0]?.image_url ||
              'https://via.placeholder.com/100';
            return (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                anchor={{ x: 0.5, y: 1 }}
                tracksViewChanges={false}
              >
                <MapProductPin imageUrl={preview} />

                <Callout tooltip onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}>
                  <View style={styles.calloutCard}>
                    <Image source={{ uri: preview }} style={styles.calloutImage} />
                    <View style={styles.calloutInfo}>
                      <Text numberOfLines={1} style={styles.calloutTitle}>{p.name}</Text>
                      <Text style={styles.calloutPrice}>{formatPrice(p.price)}</Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        {/* Floating controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.toggleBtn, styles.toggleBtnActive]}
            onPress={() => setMapMode(false)}
          >
            <MaterialCommunityIcons name="format-list-bulleted-square" size={18} color="#fff" />
            <Text style={[styles.toggleText, { color: '#fff' }]}>Lista</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={() => {
              const r = computeRegion();
              if (mapRef.current && r) {
                mapRef.current.animateToRegion(r, 400);
              }
            }}
          >
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#4F8CFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Sheet header estilo Airbnb */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', elevation: 1, marginBottom: 10 }}
          onPress={() => {
            const cbKey = uuidv4();
            registerCallback(cbKey, ({ lat, lng }) => setActiveCenter({ lat, lng }));
            navigation.navigate('MapPickerFull', {
              initial: activeCenter ? { latitude: activeCenter.lat, longitude: activeCenter.lng } : null,
              callbackKey: cbKey,
            });
          }}
        >
          <MaterialCommunityIcons name="map-marker-outline" size={20} color="#334155" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: '#0F172A' }}>Onde?</Text>
            <Text style={{ color: '#64748B', fontSize: 12 }}>
              {activeCenter ? `Raio ${radius} km` : 'Perto de você ou escolha no mapa'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
        </TouchableOpacity>

        <View style={{ backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 }}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, color: '#0F172A' }}
            placeholder="Buscar produtos"
            placeholderTextColor="#94A3B8"
            defaultValue={query}
            onSubmitEditing={(e) => setQuery(e.nativeEvent.text || '')}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Toggle Lista/Mapa */}
      <View style={styles.modeToggleRow}>
        <TouchableOpacity
          style={[styles.modeChip, !mapMode && styles.modeChipActive]}
          onPress={() => setMapMode(false)}
        >
          <MaterialCommunityIcons name="format-list-bulleted-square" size={16} color={!mapMode ? '#fff' : '#1F2937'} />
          <Text style={[styles.modeChipText, !mapMode && styles.modeChipTextActive]}>Lista</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeChip, mapMode && styles.modeChipActive]}
          onPress={() => setMapMode(true)}
        >
          <MaterialCommunityIcons name="map-outline" size={16} color={mapMode ? '#fff' : '#1F2937'} />
          <Text style={[styles.modeChipText, mapMode && styles.modeChipTextActive]}>Mapa</Text>
        </TouchableOpacity>
      </View>

      {/* Recentes */}
      {recent?.length > 0 && (
        <View style={styles.recentsRow}>
          <Text style={styles.recentsTitle}>Recentes:</Text>
          <FlatList
            data={recent}
            keyExtractor={(r, idx) => String(r.ts || idx)}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item: r }) => (
              <TouchableOpacity
                style={styles.chip}
                onPress={() =>
                  navigation.navigate('SearchResults', {
                    q: r.q || '',
                    categoryId: r.categoryId || null,
                    center: r.center || null,
                    radiusKm: r.radiusKm || 25,
                  })
                }
              >
                <Text style={styles.chipText}>
                  {(r.q ? `“${r.q}” · ` : '') + (r.radiusKm ? `${r.radiusKm}km` : '')}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      )}

      {/* Filtros */}
      <View style={styles.filtersWrap}>
        <View style={styles.filtersRow}>
          {[5, 10, 25, 50].map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.filterChip, radius === v && styles.filterChipActive]}
              onPress={() => setRadius(v)}
            >
              <Text style={[styles.filterChipText, radius === v && styles.filterChipTextActive]}>
                {v} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {categories?.length > 0 && (
          <FlatList
            data={categories}
            keyExtractor={(c) => String(c.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item: c }) => (
              <TouchableOpacity
                style={[styles.filterChip, activeCategory === c.id && styles.filterChipActive]}
                onPress={() => setActiveCategory(prev => (prev === c.id ? null : c.id))}
              >
                <Text style={[styles.filterChipText, activeCategory === c.id && styles.filterChipTextActive]}>
                  {c.description}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
          />
        )}
      </View>

      {mapMode ? (
        renderMap()
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nenhum resultado</Text>
          <Text style={styles.emptySub}>Tente ajustar o termo, a categoria ou a localização.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          onEndReached={() => hasMore && !loadingMore && load(false)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  recentsRow: { paddingTop: 10, paddingBottom: 4 },
  recentsTitle: { paddingHorizontal: 16, paddingBottom: 6, color: '#475569', fontWeight: '700' },
  chip: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  chipText: { color: '#0F172A' },
  filtersWrap: { paddingTop: 8, paddingBottom: 16 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  filterChip: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, marginRight: 8 },
  filterChipActive: { backgroundColor: '#4F8CFF' },
  filterChipText: { color: '#1F2937', fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  modeToggleRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  modeChip: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeChipActive: { backgroundColor: '#4F8CFF' },
  modeChipText: { color: '#1F2937', fontWeight: '700' },
  modeChipTextActive: { color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptySub: { marginTop: 8, color: '#64748B' },
  mapControls: { position: 'absolute', right: 16, bottom: 24, alignItems: 'flex-end', gap: 10 },
  toggleBtn: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtnActive: { backgroundColor: '#4F8CFF' },
  toggleText: { color: '#1F2937', fontWeight: '800' },
  recenterBtn: { backgroundColor: '#fff', padding: 10, borderRadius: 20, elevation: 2 },
  calloutCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutImage: { width: '100%', height: 110, backgroundColor: '#E2E8F0' },
  calloutInfo: { padding: 8 },
  calloutTitle: { fontWeight: '700', color: '#0F172A' },
  calloutPrice: { marginTop: 4, color: '#4F8CFF', fontWeight: '800' }
});

export default SearchResultsScreen;
