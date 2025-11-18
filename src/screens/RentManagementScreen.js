import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getTable, updateTableById } from '../services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatPrice, formatPriceFromCents } from '../utils/priceUtils';

const RentManagementScreen = () => {
  const navigation = useNavigation();
  const [rents, setRents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('pendente');

  useEffect(() => {
    loadRents();
  }, [activeFilter]);

  const loadRents = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId');
      
      console.log('🔍 Carregando aluguéis dos produtos do usuário:', userId);

      // Primeiro, buscar todos os produtos do usuário
      const productsQuery = `user_id=eq.${userId}&select=id,name,price`;
      const products = await getTable('products', productsQuery);
      
      if (!products || products.length === 0) {
        console.log('⚠️ Usuário não tem produtos cadastrados');
        setRents([]);
        return;
      }

      console.log(`✅ Encontrados ${products.length} produtos do usuário`);

      // Buscar todos os aluguéis desses produtos
      const productIds = products.map(p => p.id);
      const rentsQuery = `product_id=in.(${productIds.join(',')})&select=id,product_id,user_id,status,total_amount,dates`;
      const allRents = await getTable('rents', rentsQuery);

      if (!allRents || allRents.length === 0) {
        console.log('⚠️ Nenhum aluguel encontrado para os produtos');
        setRents([]);
        return;
      }

      console.log(`✅ Encontrados ${allRents.length} aluguéis dos produtos`);

      // Filtrar por status se não for 'todos'
      let filteredRents = allRents;
      if (activeFilter !== 'todos') {
        filteredRents = allRents.filter(rent => rent.status === activeFilter);
      }

      console.log(`📋 Após filtro '${activeFilter}': ${filteredRents.length} aluguéis`);

      // Para cada aluguel, buscar informações do produto e do locador
      const processedRents = await Promise.all(
        filteredRents.map(async (rent) => {
          try {
            // Encontrar o produto
            const product = products.find(p => p.id === rent.product_id);
            
            // Buscar informações do usuário que alugou
            const userQuery = `user_id=eq.${rent.user_id}&select=first_name,last_name`;
            const users = await getTable('user_extra_information', userQuery);
            const user = users && users.length > 0 ? users[0] : null;

            // Processar as datas
            const dates = rent.dates || [];
            let startDate = '';
            let endDate = '';
            
            if (Array.isArray(dates) && dates.length > 0) {
              const sortedDates = [...dates].sort();
              startDate = formatDate(sortedDates[0]);
              endDate = formatDate(sortedDates[sortedDates.length - 1]);
            }

            return {
              id: rent.id,
              productId: rent.product_id,
              productName: product?.name || 'Produto não encontrado',
              price: product?.price || 0,
              priceFormatted: formatPrice(product?.price || 0, true),
              totalAmount: rent.total_amount ? formatPriceFromCents(rent.total_amount) : 'Grátis',
              dates: dates,
              startDate: startDate || 'Data não definida',
              endDate: endDate || 'Data não definida',
              totalDays: dates.length,
              status: rent.status,
              renterName: user ? `${user.first_name} ${user.last_name}` : 'Usuário não identificado',
              renterId: rent.user_id,
            };
          } catch (error) {
            console.error(`❌ Erro ao processar aluguel ${rent.id}:`, error);
            return null;
          }
        })
      );

      // Filtrar resultados nulos
      const validRents = processedRents.filter(rent => rent !== null);
      console.log(`✅ Total de aluguéis processados: ${validRents.length}`);
      
      setRents(validRents);
    } catch (error) {
      console.error('❌ Erro ao carregar aluguéis:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar os aluguéis. Verifique sua conexão e tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRents();
    setRefreshing(false);
  };

  const handleStatusChange = async (rentId, newStatus) => {
    try {
      console.log(`🔄 Alterando status do aluguel ${rentId} para ${newStatus}`);
      
      // Verificar se o aluguel existe
      const existingRent = rents.find(rent => rent.id === rentId);
      if (!existingRent) {
        throw new Error('Aluguel não encontrado na lista atual');
      }
      
      console.log(`📋 Aluguel encontrado:`, existingRent);
      
      const result = await updateTableById('rents', rentId, { status: newStatus });
      console.log(`✅ Resultado da atualização:`, result);
      
      // Recarregar a lista
      await loadRents();
      
      const statusMessages = {
        'confirmado': 'Aluguel confirmado com sucesso!',
        'cancelado': 'Aluguel cancelado.',
        'em andamento': 'Aluguel marcado como em andamento.',
        'concluído': 'Aluguel finalizado com sucesso!'
      };
      
      Alert.alert('Sucesso', statusMessages[newStatus] || 'Status atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        stack: error.stack,
        rentId: rentId,
        newStatus: newStatus
      });
      
      let errorMessage = 'Não foi possível atualizar o status do aluguel.';
      
      if (error.message.includes('não encontrado')) {
        errorMessage = 'Aluguel não encontrado. Recarregue a lista e tente novamente.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Aluguel não encontrado no banco de dados.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Você não tem permissão para alterar este aluguel.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Dados inválidos. Verifique se o status é válido.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }
      
      Alert.alert('Erro', `${errorMessage}\n\nDetalhes técnicos: ${error.message}`);
    }
  };

  const confirmStatusChange = (rentId, newStatus, actionName, productName) => {
    Alert.alert(
      `${actionName} Aluguel`,
      `Deseja ${actionName.toLowerCase()} o aluguel do produto "${productName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: actionName, 
          onPress: () => handleStatusChange(rentId, newStatus),
          style: newStatus === 'cancelado' ? 'destructive' : 'default'
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente':
        return '#F59E0B';
      case 'confirmado':
        return '#10B981';
      case 'em andamento':
        return '#3B82F6';
      case 'concluído':
        return '#6B7280';
      case 'cancelado':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'confirmado':
        return 'Confirmado';
      case 'em andamento':
        return 'Em Andamento';
      case 'concluído':
        return 'Concluído';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const renderRentItem = ({ item }) => (
    <View style={styles.rentCard}>
      <View style={styles.rentHeader}>
        <Text style={styles.productName}>{item.productName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.rentInfo}>
        <Text style={styles.renterName}>Locador: {item.renterName}</Text>
        <Text style={styles.dateRange}>
          {item.startDate} até {item.endDate}
        </Text>
        <Text style={styles.daysCount}>
          {item.totalDays} {item.totalDays === 1 ? 'dia' : 'dias'}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.unitPrice}>{item.priceFormatted}/dia</Text>
          <Text style={styles.totalPrice}>Total: {item.totalAmount}</Text>
        </View>
      </View>

      {/* Botões de ação baseados no status */}
      {item.status === 'pendente' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => confirmStatusChange(item.id, 'confirmado', 'Confirmar', item.productName)}
          >
            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Confirmar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => confirmStatusChange(item.id, 'cancelado', 'Recusar', item.productName)}
          >
            <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Recusar</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'confirmado' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.startButton]}
            onPress={() => navigation.navigate('RentMediaCapture', {
              rentId: item.id,
              productId: item.productId,
              phase: 'inicio',
              actor: 'locador',
              productName: item.productName,
            })}
          >
            <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Iniciar Aluguel</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'em andamento' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => navigation.navigate('RentMediaCapture', {
              rentId: item.id,
              productId: item.productId,
              phase: 'devolucao',
              actor: 'locador',
              productName: item.productName,
            })}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Finalizar Aluguel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const filterButtons = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendente', label: 'Pendentes' },
    { key: 'confirmado', label: 'Confirmados' },
    { key: 'em andamento', label: 'Em Andamento' },
    { key: 'concluído', label: 'Concluídos' },
    { key: 'cancelado', label: 'Cancelados' },
  ];

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="clipboard-list-outline" size={80} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>
        {activeFilter === 'todos' 
          ? 'Nenhum aluguel encontrado'
          : `Nenhum aluguel ${getFilterLabel(activeFilter)}`
        }
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'todos' 
          ? 'Você ainda não recebeu solicitações de aluguel para seus produtos.'
          : `Não há aluguéis ${getFilterLabel(activeFilter)} no momento.`
        }
      </Text>
    </View>
  );

  const getFilterLabel = (filter) => {
    switch (filter) {
      case 'pendente': return 'pendentes';
      case 'confirmado': return 'confirmados';
      case 'em andamento': return 'em andamento';
      case 'concluído': return 'concluídos';
      case 'cancelado': return 'cancelados';
      default: return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Gerenciar Aluguéis</Text>
        <View style={styles.headerRight} />
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
            onPress={() => setActiveFilter(filter.key)}
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

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={40} color="#2563EB" />
          <Text style={styles.loadingText}>Carregando aluguéis...</Text>
        </View>
      ) : (
        <FlatList
          data={rents}
          renderItem={renderRentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const formatDate = (dateString) => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
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
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  rentInfo: {
    marginBottom: 16,
  },
  renterName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  startButton: {
    backgroundColor: '#3B82F6',
  },
  completeButton: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
});

export default RentManagementScreen; 
