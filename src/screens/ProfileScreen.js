import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserById } from '../services/api';
import ProfileImage from '../components/ProfileImage';
import { maskCPF } from '../utils/cpfUtils';
import { formatPhone } from '../utils/phoneUtils';
import { getUserReviewTotalsByRole } from '../services/reviewService';
import { LOGO_URL } from '../utils/brand';

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true); // adiciona controle de carregamento
  const [error, setError] = useState(null);
  const [totals, setTotals] = useState({ locador: null, locatario: null });

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          setError('Usuário não identificado');
          return;
        }
				
        const user = await fetchUserById(userId);

        if (user) {
          setUserData(user);
          // Carregar totais de avaliações por papel
          try {
            const [asLocador, asLocatario] = await Promise.all([
              getUserReviewTotalsByRole(userId, 'locador'),
              getUserReviewTotalsByRole(userId, 'locatario'),
            ]);
            setTotals({ locador: asLocador, locatario: asLocatario });
          } catch {}
        } else {
          setError('Dados do usuário não encontrados');
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#233ED9" />
        <Text style={{ marginTop: 10 }}>Carregando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Logo */}
      <View style={styles.header}>
        <ExpoImage source={{ uri: LOGO_URL }} style={styles.headerLogo} contentFit="contain" />
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileContainer}>
          <ProfileImage
            imageUrl={userData.image_url}
            size={100}
            borderWidth={3}
            borderColor="#4F8CFF"
          />
          <Text style={styles.name}>{userData.first_name} {userData.last_name}</Text>
          <Text style={styles.email}>{userData.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <View style={styles.infoItem}>
            <Icon name="id-card" size={18} color="#4F8CFF" />
            <Text style={styles.infoText}>{maskCPF(userData.registration_number)}</Text>
          </View>
          {userData.phone_number && (
            <View style={styles.infoItem}>
              <Icon name="phone" size={18} color="#4F8CFF" />
              <Text style={styles.infoText}>{formatPhone(userData.phone_number)}</Text>
            </View>
          )}
          {userData.addresses && userData.addresses.length > 0 && (
            <View style={styles.infoItem}>
              <Icon name="home" size={18} color="#4F8CFF" />
              <Text style={styles.infoText}>
                {userData.addresses[0].street}, {userData.addresses[0].number} - {userData.addresses[0].neighborhood}, {userData.addresses[0].city} / {userData.addresses[0].state}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Editar Perfil</Text>
        </TouchableOpacity>

        {/* Avaliações recebidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avaliações</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.ratingCard, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingCardValue}>
                  {totals.locador ? Number(totals.locador.average_rating || 0).toFixed(1) : '0.0'}
                </Text>
              </View>
              <Text style={styles.ratingCardLabel}>Como Locador</Text>
              <Text style={styles.ratingCardSub}>
                {totals.locador?.total_reviews || 0} avaliações
              </Text>
            </View>
            <View style={[styles.ratingCard, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingCardValue}>
                  {totals.locatario ? Number(totals.locatario.average_rating || 0).toFixed(1) : '0.0'}
                </Text>
              </View>
              <Text style={styles.ratingCardLabel}>Como Locatário</Text>
              <Text style={styles.ratingCardSub}>
                {totals.locatario?.total_reviews || 0} avaliações
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#4F8CFF',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#222',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#444',
    flex: 1,
    lineHeight: 20,
  },
  editButton: {
    backgroundColor: '#4F8CFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4F8CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingCardValue: {
    marginLeft: 6,
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
  },
  ratingCardLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  ratingCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});
