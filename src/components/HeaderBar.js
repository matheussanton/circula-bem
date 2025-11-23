import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ProfileImage from './ProfileImage';
import { LOGO_URL } from '../utils/brand';

const HeaderBar = ({ userImageUrl }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <ExpoImage source={{ uri: LOGO_URL }} style={styles.headerLogo} contentFit="contain" />
        <ProfileImage
          imageUrl={userImageUrl}
          size={40}
          borderWidth={2}
          borderColor="#fff"
        />
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('ChatList')}>
          <MaterialCommunityIcons name="message-outline" size={26} color="#222" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Notifications')}>
          <MaterialCommunityIcons name="bell-outline" size={26} color="#222" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('ProfileScreen')}>
          <MaterialCommunityIcons name="cog-outline" size={26} color="#222" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default HeaderBar;

