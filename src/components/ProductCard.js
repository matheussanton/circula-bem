import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatPrice } from '../utils/priceUtils';

const ProductCard = ({ product, onPress, showDistance = false }) => {
  const previewImage =
    product?.product_images?.find?.(img => img.image_url && img.image_url.endsWith('_0.jpg'))?.image_url ||
    product?.product_images?.[0]?.image_url ||
    'https://via.placeholder.com/150';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: previewImage }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{product?.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.price}>{formatPrice(product?.price)}</Text>
          {showDistance && typeof product?.distanceKm === 'number' && (
            <View style={styles.distance}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color="#64748B" />
              <Text style={styles.distanceText}>{product.distanceKm.toFixed(1)} km</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 8,
    flex: 1,
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 150,
    maxWidth: '48%',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#eee',
  },
  info: {
    width: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    color: '#4F8CFF',
    fontWeight: '800',
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceText: {
    color: '#64748B',
    fontWeight: '600',
  },
});

export default ProductCard;

