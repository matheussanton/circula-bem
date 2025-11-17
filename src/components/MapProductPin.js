import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const MapProductPin = ({ imageUrl, size = 56 }) => {
  return (
    <View style={styles.pinWrap}>
      <View style={styles.pinBubble}>
        <Image source={{ uri: imageUrl }} style={[styles.pinImage, { width: size, height: size }]} />
      </View>
      <View style={styles.pinStem} />
    </View>
  );
};

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center' },
  pinBubble: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center'
  },
  pinImage: { borderRadius: 10, backgroundColor: '#E2E8F0' },
  pinStem: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginTop: 6
  },
});

export default MapProductPin;

