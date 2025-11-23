import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LOGO_URL } from '../utils/brand';

const LogoTestScreen = () => {
  return (
    <View style={styles.container}>
      <ExpoImage source={{ uri: LOGO_URL }} style={styles.logo} contentFit="contain" />
    </View>
  );
};

export default LogoTestScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
  },
  logo: {
    width: 200,
    height: 200,
  },
});


