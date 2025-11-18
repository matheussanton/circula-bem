import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  ScrollView, 
  SafeAreaView,
  Alert,
  Linking 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getRentById } from '../services/rentService';
import { fetchUserById } from '../services/api';
import ProfileImage from '../components/ProfileImage';
import { maskCPF } from '../utils/cpfUtils';

const RentDetailScreen = ({ route, navigation }) => {
  const { rentId } = route.params;
  const [rent, setRent] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const windowWidth = Dimensions.get('window').width;

  useEffect(() => {
    loadRentDetails();
  }, [rentId]);

  const loadRentDetails = async () => {
    try {
      console.log('🔍 Carregando detalhes do aluguel:', rentId);
      
      // Buscar dados completos do aluguel
      const rentDetails = await getRentById(rentId);
      console.log('📋 Detalhes do aluguel:', rentDetails);
      
      if (!rentDetails) {
        Alert.alert('Erro', 'Aluguel não encontrado');
        navigation.goBack();
        return;
      }

      setRent(rentDetails);

      // Buscar dados do proprietário através do produto
      if (rentDetails.productId) {
        const { getTable } = require('../services/supabaseClient');
        
        // Buscar o produto para obter o user_id do proprietário
        const productQuery = `id=eq.${rentDetails.productId}&select=user_id`;
        const products = await getTable('products', productQuery);
        
        if (products && products.length > 0) {
          const ownerId = products[0].user_id;
          const ownerDetails = await fetchUserById(ownerId);
          setOwner(ownerDetails);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar detalhes do aluguel:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do aluguel');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmado':
        return '#10B981';
      case 'aguardando_checkin_locador':
      case 'aguardando_checkin_locatario':
        return '#F59E0B';
      case 'em andamento':
        return '#3B82F6';
      case 'aguardando_checkout_locatario':
      case 'aguardando_checkout_locador':
        return '#7C3AED';
      case 'concluído':
        return '#6B7280';
      case 'pendente':
        return '#F59E0B';
      case 'cancelado':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmado':
        return 'Confirmado';
      case 'aguardando_checkin_locador':
        return 'Aguard. Check-in (Locador)';
      case 'aguardando_checkin_locatario':
        return 'Aguard. Check-in (Locatário)';
      case 'em andamento':
        return 'Em Andamento';
      case 'aguardando_checkout_locatario':
        return 'Aguard. Devolução (Locatário)';
      case 'aguardando_checkout_locador':
        return 'Aguard. Devolução (Locador)';
      case 'concluído':
        return 'Concluído';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const formatDateRange = () => {
    if (!rent?.startDate || !rent?.endDate) return 'Datas não disponíveis';
    
    if (rent.startDate === rent.endDate) {
      return rent.startDate;
    }
    return `${rent.startDate} até ${rent.endDate}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F8CFF" />
        <Text style={styles.loadingText}>Carregando detalhes do aluguel...</Text>
      </SafeAreaView>
    );
  }

  if (!rent) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#EF4444" />
        <Text style={styles.errorText}>Aluguel não encontrado.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalhes do Aluguel</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(rent.status) }]}>
            <MaterialCommunityIcons 
              name={rent.status === 'concluído' ? 'check-circle' : 'clock-outline'} 
              size={16} 
              color="#FFF" 
            />
            <Text style={styles.statusText}>{getStatusLabel(rent.status)}</Text>
          </View>
        </View>

        {/* Product Image */}
        <View style={styles.imageContainer}>
          {rent.images && rent.images.length > 0 ? (
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.floor(event.nativeEvent.contentOffset.x / windowWidth);
                setCurrentImageIndex(index);
              }}
            >
              {rent.images.map((imageUrl, index) => (
                <Image
                  key={index}
                  source={{ uri: imageUrl }}
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
          {rent.images && rent.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {rent.images.map((_, index) => (
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
          {/* Product Info */}
          <Text style={styles.productTitle}>{rent.productName}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.dailyPrice}>{rent.price}</Text>
            <Text style={styles.totalAmount}>Total pago: {rent.totalAmount}</Text>
          </View>

          {/* Rental Info */}
          <View style={styles.rentalInfoContainer}>
            <Text style={styles.sectionTitle}>Informações do Aluguel</Text>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-range" size={20} color="#4F8CFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Período</Text>
                <Text style={styles.infoValue}>{formatDateRange()}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#4F8CFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Duração</Text>
                <Text style={styles.infoValue}>{rent.totalDays} {rent.totalDays === 1 ? 'dia' : 'dias'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="receipt" size={20} color="#4F8CFF" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ID do Aluguel</Text>
                <Text style={styles.infoValue}>{rent.id.substring(0, 8)}...</Text>
              </View>
            </View>
          </View>

          {/* Owner Info */}
          {owner && (
            <View style={styles.ownerContainer}>
              <Text style={styles.sectionTitle}>Proprietário</Text>
              <View style={styles.ownerInfo}>
                <ProfileImage
                  imageUrl={owner.image_url}
                  size={50}
                  borderWidth={0}
                />
                <View style={styles.ownerDetails}>
                  <Text style={styles.ownerName}>
                    {owner.first_name} {owner.last_name}
                  </Text>
                  <Text style={styles.ownerRegistration}>
                    {maskCPF(owner.registration_number) || 'Registro não disponível'}
                  </Text>
                  {owner.addresses?.[0] && (
                    <Text style={styles.ownerLocation}>
                      {owner.addresses[0].neighborhood}, {owner.addresses[0].city} - {owner.addresses[0].state}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Product Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Descrição do Produto</Text>
            <Text style={styles.productDescription}>
              {rent.description || 'Sem descrição disponível.'}
            </Text>
          </View>

          {/* Location */}
          {owner?.addresses?.[0] && (
            <View style={styles.locationContainer}>
              <Text style={styles.sectionTitle}>Localização</Text>
              <View style={styles.locationInfo}>
                <View style={styles.locationDetails}>
                  <MaterialCommunityIcons name="map-marker" size={24} color="#4F8CFF" />
                  <View style={styles.locationText}>
                    <Text style={styles.addressText}>
                      {owner.addresses[0].street}, {owner.addresses[0].number}
                    </Text>
                    <Text style={styles.neighborhoodText}>
                      {owner.addresses[0].neighborhood}, {owner.addresses[0].city} - {owner.addresses[0].state}
                    </Text>
                    {owner.addresses[0].cep && (
                      <Text style={styles.cepText}>
                        CEP: {owner.addresses[0].cep}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.mapButton} 
                  onPress={() => {
                    const query = `${owner.addresses[0].street}, ${owner.addresses[0].number}, ${owner.addresses[0].neighborhood}, ${owner.addresses[0].city}, ${owner.addresses[0].state}`;
                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
                    Linking.openURL(url);
                  }}
                >
                  <MaterialCommunityIcons name="google-maps" size={20} color="#FFF" />
                  <Text style={styles.mapButtonText}>Ver no Mapa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Contact/Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.contactButton}>
              <MaterialCommunityIcons name="message-text" size={20} color="#4F8CFF" />
              <Text style={styles.contactButtonText}>Entrar em Contato</Text>
            </TouchableOpacity>
            
            {rent.status === 'em andamento' && (
              <TouchableOpacity style={styles.primaryButton}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                <Text style={styles.primaryButtonText}>Marcar como Concluído</Text>
              </TouchableOpacity>
            )}
          </View>
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
    marginVertical: 20,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: { 
    height: 250,
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
  productTitle: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dailyPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4F8CFF',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  rentalInfoContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  ownerContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  ownerName: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  ownerRegistration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  ownerLocation: { 
    fontSize: 14, 
    color: '#666',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  productDescription: { 
    fontSize: 16, 
    lineHeight: 24,
    color: '#444',
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationText: {
    marginLeft: 12,
    flex: 1,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  neighborhoodText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cepText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  mapButton: {
    backgroundColor: '#4F8CFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#4F8CFF',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  contactButtonText: {
    color: '#4F8CFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F8CFF',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#4F8CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RentDetailScreen; 
