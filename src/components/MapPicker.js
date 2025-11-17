import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { registerCallback } from '../services/callbackRegistry';
import { v4 as uuidv4 } from 'uuid';

/**
 * Props:
 * - value?: { lat: number|null, lng: number|null }
 * - onChange?: (coords: { lat: number|null, lng: number|null }) => void
 * - initialRegion?: { latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number }
 * - height?: number
 */
const MapPicker = ({ value, onChange, initialRegion, height = 220 }) => {
  const navigation = useNavigation();
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState(
    initialRegion || {
      latitude: value?.lat ?? -23.55052, // São Paulo fallback
      longitude: value?.lng ?? -46.633308,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }
  );
  const [marker, setMarker] = useState(
    value?.lat && value?.lng ? { latitude: value.lat, longitude: value.lng } : null
  );

  useEffect(() => {
    // Keep internal marker in sync when parent value changes
    if (value?.lat && value?.lng) {
      setMarker({ latitude: value.lat, longitude: value.lng });
      setRegion(prev => ({
        ...prev,
        latitude: value.lat,
        longitude: value.lng,
      }));
    }
  }, [value?.lat, value?.lng]);

  const requestPermission = useCallback(async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setRegion(prev => ({
        ...prev,
        latitude,
        longitude,
      }));
      setMarker({ latitude, longitude });
      onChange?.({ lat: latitude, lng: longitude });
    } catch (e) {
      // silent fail, user can still pick on map
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
    onChange?.({ lat: latitude, lng: longitude });
  };

  const handleExpand = () => {
    const cbKey = uuidv4();
    registerCallback(cbKey, (coords) => {
      if (coords?.lat != null && coords?.lng != null) {
        setMarker({ latitude: coords.lat, longitude: coords.lng });
        setRegion(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
        onChange?.(coords);
      }
    });

    navigation.navigate('MapPickerFull', {
      initial: marker || {
        latitude: region.latitude,
        longitude: region.longitude
      },
      callbackKey: cbKey,
    });
  };

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Selecione a localização</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={requestPermission} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#4F8CFF" />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#4F8CFF" />
          )}
          <Text style={styles.iconBtnText}>Usar minha localização</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={handleExpand}>
          <MaterialCommunityIcons name="arrow-expand" size={20} color="#4F8CFF" />
          <Text style={styles.iconBtnText}>Ampliar mapa</Text>
        </TouchableOpacity>
      </View>

      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
      >
        {marker && (
          <Marker
            coordinate={marker}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setMarker({ latitude, longitude });
              onChange?.({ lat: latitude, lng: longitude });
            }}
          />
        )}
      </MapView>

      <Text style={styles.hint}>
        Toque no mapa para posicionar o marcador. Arraste para ajustar.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  iconBtn: {
    margin: 5,
    flexDirection: 'row',
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  iconBtnText: {
    color: '#4F8CFF',
    marginLeft: 6,
    fontWeight: '600',
  },
  map: {
    flex: 1,
    borderRadius: 12,
  },
  hint: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
});

export default MapPicker;

