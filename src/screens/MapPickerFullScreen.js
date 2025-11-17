import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { invokeCallback, unregisterCallback } from '../services/callbackRegistry';

const MapPickerFullScreen = ({ route, navigation }) => {
  const { initial, callbackKey } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [marker, setMarker] = useState(
    initial ? { latitude: initial.latitude, longitude: initial.longitude } : null
  );
  const [region, setRegion] = useState(
    initial
      ? {
          latitude: initial.latitude,
          longitude: initial.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : null
  );

  useEffect(() => {
    if (region) return;
    (async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setMarker({ latitude, longitude });
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [region]);

  // Cleanup callback if user leaves without confirming
  useEffect(() => {
    return () => {
      if (callbackKey) unregisterCallback(callbackKey);
    };
  }, [callbackKey]);

  const pickMyLocation = useCallback(async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setRegion(prev => ({
        ...(prev || {}),
        latitude,
        longitude,
        latitudeDelta: prev?.latitudeDelta ?? 0.05,
        longitudeDelta: prev?.longitudeDelta ?? 0.05,
      }));
      setMarker({ latitude, longitude });
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const confirm = () => {
    if (marker && callbackKey) {
      invokeCallback(callbackKey, { lat: marker.latitude, lng: marker.longitude });
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escolher localização</Text>
        <TouchableOpacity onPress={pickMyLocation} style={styles.locBtn} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#4F8CFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#4F8CFF" />
              <Text style={styles.locBtnText}>Minha localização</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {region ? (
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setMarker({ latitude, longitude });
          }}
        >
          {marker && (
            <Marker
              coordinate={marker}
              draggable
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setMarker({ latitude, longitude });
              }}
            />
          )}
        </MapView>
      ) : (
        <View style={styles.centered}><ActivityIndicator /></View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={confirm} disabled={!marker}>
          <Text style={styles.confirmText}>Confirmar</Text>
        </TouchableOpacity>
      </View>
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
  locBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F0FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  locBtnText: { color: '#4F8CFF', marginLeft: 6, fontWeight: '700' },
  map: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFF' },
  confirmBtn: { backgroundColor: '#4F8CFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});

export default MapPickerFullScreen;

