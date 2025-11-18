import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useRentStore from '../stores/rentStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MyRentsScreen = () => {
  const navigation = useNavigation();
  const {
    filteredRents,
    loading,
    refreshing,
    activeFilter,
    error,
    loadRents,
    refreshRents,
    filterRents,
    clearError,
  } = useRentStore();

  useEffect(() => {
    loadRents();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Erro', error, [
        { text: 'OK', onPress: clearError }
      ]);
    }
  }, [error]);

  const handleFilterChange = (filterType) => {
    filterRents(filterType);
  };

  const handleRentPress = (rent) => {
    // Só permitir navegação para detalhes se o status permitir
    const allowedStatuses = ['confirmado', 'em andamento', 'concluído'];
    
    if (allowedStatuses.includes(rent.dbStatus)) {
      navigation.navigate('RentDetail', { rentId: rent.id });
    } else {
      Alert.alert(
        'Detalhes não disponíveis',
        'Os detalhes completos só estão disponíveis para aluguéis confirmados, em andamento ou concluídos.',
        [{ text: 'OK' }]
      );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ativo':
        return '#10B981';
      case 'finalizado':
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
      case 'ativo':
        return 'Ativo';
      case 'finalizado':
        return 'Finalizado';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const filterButtons = [
    { key: 'todos', label: 'Todos' },
    { key: 'ativo', label: 'Ativos' },
    { key: 'finalizado', label: 'Finalizados' },
    { key: 'pendente', label: 'Pendentes' },
    { key: 'cancelado', label: 'Cancelados' },
  ];

  const wantsCapturePhase = (dbStatus) => {
    if (dbStatus === 'confirmado' || dbStatus === 'aguardando_checkin_locatario') return 'inicio';
    if (dbStatus === 'em andamento' || dbStatus === 'aguardando_checkout_locatario') return 'devolucao';
    return null;
  };

  const renderRentItem = ({ item }) => {
    const phaseToCapture = wantsCapturePhase(item.dbStatus);

    return (
    <TouchableOpacity 
      style={styles.rentCard}
      onPress={() => handleRentPress(item)}
    >
      <View style={styles.rentRow}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.rentInfo}>
          <Text style={styles.productName}>{item.productName}</Text>
          <Text style={styles.ownerName}>Proprietário: {item.ownerName}</Text>
          <Text style={styles.dateRange}>
            {item.startDate}{item.endDate && item.endDate !== item.startDate ? ` até ${item.endDate}` : ''}
          </Text>
          <Text style={styles.daysCount}>
            {item.totalDays} {item.totalDays === 1 ? 'dia' : 'dias'}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.unitPrice}>{item.price}</Text>
            <Text style={styles.totalPrice}>Total: {item.totalAmount}</Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={24} 
            color="#9CA3AF" 
          />
        </View>
      </View>

      {phaseToCapture && (
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('RentMediaCapture', {
              rentId: item.id,
              productId: item.productId,
              phase: phaseToCapture,
              actor: 'locatario',
              productName: item.productName,
            })}
          >
            <Text style={styles.ctaText}>
              {phaseToCapture === 'inicio' ? 'Registrar Início' : 'Registrar Devolução'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  )};

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons 
        name="clipboard-list-outline" 
        size={80} 
        color="#9CA3AF" 
      />
      <Text style={styles.emptyTitle}>
        {activeFilter === 'todos' 
          ? 'Nenhum aluguel encontrado'
          : `Nenhum aluguel ${getFilterLabel(activeFilter)}`
        }
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'todos'
          ? 'Você ainda não possui aluguéis. Explore produtos disponíveis para começar!'
          : `Você não possui aluguéis ${getFilterLabel(activeFilter)} no momento.`
        }
      </Text>
      {activeFilter === 'todos' && (
        <TouchableOpacity style={styles.exploreButton}>
          <Text style={styles.exploreButtonText}>Explorar Produtos</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const getFilterLabel = (filter) => {
    switch (filter) {
      case 'ativo': return 'ativos';
      case 'finalizado': return 'finalizados';
      case 'pendente': return 'pendentes';
      case 'cancelado': return 'cancelados';
      default: return '';
    }
  };

  const handleDebugTest = async () => {
    try {
      Alert.alert(
        'Menu Debug', 
        'Escolha uma opção de teste:',
        [
          {
            text: 'Teste Conectividade',
            onPress: async () => {
              try {
                Alert.alert('Debug', 'Testando conectividade básica...', [{ text: 'OK' }]);
                
                // Testar acesso direto ao banco
                const { getTable } = require('../services/supabaseClient');
                const userId = await AsyncStorage.getItem('userId');
                
                console.log('🔍 Testando conectividade - userId:', userId);
                
                if (!userId) {
                  Alert.alert('Erro', 'Usuário não está logado', [{ text: 'OK' }]);
                  return;
                }
                
                // Teste simples: buscar informações do usuário
                const userInfo = await getTable('user_extra_information', `user_id=eq.${userId}`);
                console.log('👤 Informações do usuário:', userInfo);
                
                // Teste: verificar se a tabela rents existe
                const rentsTest = await getTable('rents', 'limit=1');
                console.log('📋 Teste da tabela rents:', rentsTest);
                
                Alert.alert('Sucesso', `Conectividade OK!\nUsuário: ${userInfo?.length || 0} registro(s)\nTabela rents: ${rentsTest?.length || 0} registro(s)`, [{ text: 'OK' }]);
              } catch (error) {
                console.error('❌ Erro no teste de conectividade:', error);
                Alert.alert('Erro de Conectividade', error.message, [{ text: 'OK' }]);
              }
            }
          },
          {
            text: 'Testar Conexão',
            onPress: async () => {
              try {
                Alert.alert('Debug', 'Testando conexão com o banco...', [{ text: 'OK' }]);
                await loadRents();
                Alert.alert('Sucesso', 'Conexão testada com sucesso!', [{ text: 'OK' }]);
              } catch (error) {
                Alert.alert('Erro de Conexão', error.message, [{ text: 'OK' }]);
              }
            }
          },
          {
            text: 'Inserir Dados de Teste',
            onPress: () => {
              Alert.alert(
                'Inserir Dados de Teste',
                'Esta ação criará produtos e aluguéis de exemplo. Continuar?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Sim, Inserir',
                    onPress: async () => {
                      try {
                        const { insertTestRentData } = require('../temp/insertTestData');
                        await insertTestRentData();
                        Alert.alert('Sucesso', 'Dados de teste inseridos! Atualize a tela.', [{ text: 'OK' }]);
                      } catch (error) {
                        Alert.alert('Erro', `Falha ao inserir dados: ${error.message}`, [{ text: 'OK' }]);
                      }
                    }
                  }
                ]
              );
            }
          },
          {
            text: 'Info da Nova Estrutura',
            onPress: () => {
              Alert.alert(
                'Nova Estrutura de Aluguéis',
                '• Array de datas por aluguel\n• Status enum (pendente, confirmado, etc.)\n• Valor total em centavos\n• Chave primária única\n\nVeja README_MyRents.md para detalhes.',
                [{ text: 'OK' }]
              );
            }
          },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Debug Error', error.message, [{ text: 'OK' }]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Meus Aluguéis</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.debugButton} onPress={handleDebugTest}>
            <MaterialCommunityIcons name="bug" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchButton}>
            <MaterialCommunityIcons name="magnify" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {filterButtons.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.filterButtonActive
            ]}
            onPress={() => handleFilterChange(filter.key)}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === filter.key && styles.filterButtonTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rent List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons 
            name="loading" 
            size={40} 
            color="#2563EB" 
          />
          <Text style={styles.loadingText}>Carregando aluguéis...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRents}
          renderItem={renderRentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshRents} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  debugButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  rentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  rentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  daysCount: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  ctaContainer: {
    marginTop: 12,
    width: '100%',
  },
  ctaButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  exploreButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default MyRentsScreen; 
