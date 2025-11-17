import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ProductMapScreen = ({ route, navigation }) => {
  const { center, radiusMeters = 500, productName = 'Produto' } = route.params || {};
  const hasCenter = center?.lat != null && center?.lng != null;

  const randomPoint = useMemo(() => {
    if (!hasCenter) return null;
    const t = 2 * Math.PI * Math.random();
    const u = Math.random() + Math.random();
    const r = (u > 1 ? 2 - u : u);
    const dist = r * radiusMeters;
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((center.lat * Math.PI) / 180) || 1;
    const dLat = (Math.sin(t) * dist) / metersPerDegLat;
    const dLng = (Math.cos(t) * dist) / metersPerDegLng;
    return { latitude: center.lat + dLat, longitude: center.lng + dLng };
  }, [hasCenter, center?.lat, center?.lng, radiusMeters]);

  const region = useMemo(() => {
    if (!randomPoint) return null;
    const metersPerDegLat = 111320;
    const latDelta = (radiusMeters / metersPerDegLat) * 6;
    const lngDelta =
      (radiusMeters / (111320 * Math.cos((randomPoint.latitude * Math.PI) / 180) || 1)) * 6;
    return {
      latitude: randomPoint.latitude,
      longitude: randomPoint.longitude,
      latitudeDelta: Math.max(0.002, latDelta),
      longitudeDelta: Math.max(0.002, lngDelta),
    };
  }, [randomPoint, radiusMeters]);

  if (!hasCenter || !region) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mapa</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Text style={{ color: '#64748B' }}>Localização não disponível</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{productName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={region}
      >
        <Circle
          center={randomPoint}
          radius={radiusMeters}
          strokeColor="rgba(79,140,255,0.8)"
          fillColor="rgba(79,140,255,0.2)"
        />
      </MapView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9'
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  map: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default ProductMapScreen;

