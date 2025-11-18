import { getTable, insertIntoTable, updateInTable } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatPrice, formatPriceFromCents } from '../utils/priceUtils';

export const fetchUserRents = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔍 Buscando aluguéis para userId:', userId);

    // Buscar aluguéis do usuário com a nova estrutura
    const rentsQuery = `user_id=eq.${userId}&select=id,product_id,dates,status,total_amount`;
    console.log('📋 Query dos aluguéis:', rentsQuery);
    
    const rents = await getTable('rents', rentsQuery);
    console.log('📦 Resultado da consulta rents:', rents);
    
    // Verificar se rents é um array válido
    if (!rents) {
      console.log('⚠️ getTable retornou null/undefined');
      return [];
    }
    
    if (!Array.isArray(rents)) {
      console.log('⚠️ getTable não retornou um array:', typeof rents, rents);
      return [];
    }
    
    if (rents.length === 0) {
      console.log('✅ Nenhum aluguel encontrado para o usuário');
      return [];
    }

    console.log(`✅ Encontrados ${rents.length} aluguéis`);

    // Para cada aluguel, buscar informações do produto e do proprietário
    const processedRents = await Promise.all(
      rents.map(async (rent, index) => {
        try {
          console.log(`🔄 Processando aluguel ${index + 1}/${rents.length}:`, rent);
          
          // Verificar se rent tem os campos necessários
          if (!rent.product_id) {
            console.log(`⚠️ Aluguel ${rent.id} não tem product_id`);
            return null;
          }

          // Buscar dados do produto
          const productQuery = `id=eq.${rent.product_id}&select=id,name,description,price,user_id`;
          console.log(`📋 Query do produto:`, productQuery);
          
          const products = await getTable('products', productQuery);
          console.log(`📦 Produto encontrado:`, products);
          
          if (!products || !Array.isArray(products) || products.length === 0) {
            console.log(`⚠️ Produto não encontrado para ID: ${rent.product_id}`);
            return null;
          }
          
          const product = products[0];

          // Buscar imagens do produto
          const imagesQuery = `product_id=eq.${product.id}&select=image_url`;
          const images = await getTable('product_images', imagesQuery);
          console.log(`🖼️ Imagens encontradas:`, images?.length || 0);

          // Buscar informações do proprietário
          const ownerQuery = `user_id=eq.${product.user_id}&select=first_name,last_name`;
          const owners = await getTable('user_extra_information', ownerQuery);
          console.log(`👤 Proprietário encontrado:`, owners?.length || 0);
          
          const owner = owners && Array.isArray(owners) && owners.length > 0 ? owners[0] : null;
          
          // Processar as datas (array)
          const dates = rent.dates || [];
          console.log(`📅 Datas do aluguel:`, dates);
          
          let startDate = '';
          let endDate = '';
          
          if (Array.isArray(dates) && dates.length > 0) {
            const sortedDates = [...dates].sort();
            startDate = formatDate(sortedDates[0]);
            endDate = formatDate(sortedDates[sortedDates.length - 1]);
          } else {
            console.log(`⚠️ Aluguel ${rent.id} não tem datas válidas:`, dates);
            startDate = 'Data não disponível';
            endDate = 'Data não disponível';
          }

          // Mapear status do banco para status da interface
          const mappedStatus = mapRentStatus(rent.status);
          console.log(`🔄 Status mapeado: ${rent.status} → ${mappedStatus}`);

          const processedRent = {
            id: rent.id,
            productId: product.id,
            productName: product.name,
            ownerName: owner ? `${owner.first_name} ${owner.last_name}` : 'Proprietário não identificado',
            startDate,
            endDate,
            dates: dates,
            totalDays: Array.isArray(dates) ? dates.length : 0,
            status: mappedStatus,
            dbStatus: rent.status, // Status original do banco
            price: formatPrice(product.price, true),
            totalAmount: rent.total_amount ? formatPriceFromCents(rent.total_amount) : 'Grátis',
            image: images && Array.isArray(images) && images.length > 0 ? images[0].image_url : 'https://via.placeholder.com/80x80',
            description: product.description,
          };

          console.log(`✅ Aluguel processado:`, processedRent);
          return processedRent;
        } catch (error) {
          console.error(`❌ Erro ao processar aluguel ${rent?.id}:`, error);
          return null;
        }
      })
    );

    // Filtrar resultados nulos
    const validRents = processedRents.filter(rent => rent !== null);
    console.log(`✅ Total de aluguéis válidos: ${validRents.length}`);
    
    return validRents;
  } catch (error) {
    console.error('❌ Erro geral ao buscar aluguéis:', error);
    throw error;
  }
};

// Mapear status do banco para status da interface
const mapRentStatus = (dbStatus) => {
  switch (dbStatus) {
    case 'pendente':
      return 'pendente';
    case 'confirmado':
    case 'aguardando_checkin_locador':
    case 'aguardando_checkin_locatario':
      return 'pendente'; // ainda não iniciou de fato
    case 'em andamento':
    case 'aguardando_checkout_locatario':
    case 'aguardando_checkout_locador':
      return 'ativo';
    case 'concluído':
      return 'finalizado';
    case 'cancelado':
      return 'cancelado';
    default:
      return 'pendente';
  }
};

export const getRentsByStatus = async (status = 'todos') => {
  try {
    const allRents = await fetchUserRents();
    
    if (status === 'todos') {
      return allRents;
    }
    
    return allRents.filter(rent => rent.status === status);
  } catch (error) {
    console.error('Erro ao filtrar aluguéis por status:', error);
    throw error;
  }
};

export const getRentById = async (rentId) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔍 Buscando aluguel por ID:', rentId);

    // Buscar o aluguel específico
    const rentQuery = `id=eq.${rentId}&user_id=eq.${userId}&select=id,product_id,dates,status,total_amount`;
    const rents = await getTable('rents', rentQuery);
    
    if (!rents || rents.length === 0) {
      console.log('❌ Aluguel não encontrado');
      return null;
    }

    const rent = rents[0];
    console.log('📋 Aluguel encontrado:', rent);

    // Buscar dados do produto
    const productQuery = `id=eq.${rent.product_id}&select=id,name,description,price,user_id`;
    const products = await getTable('products', productQuery);
    
    if (!products || products.length === 0) {
      console.log('❌ Produto não encontrado');
      return null;
    }
    
    const product = products[0];
    console.log('📦 Produto encontrado:', product);

    // Buscar imagens do produto
    const imagesQuery = `product_id=eq.${product.id}&select=image_url`;
    const images = await getTable('product_images', imagesQuery);
    console.log('🖼️ Imagens encontradas:', images?.length || 0);

    // Buscar informações do proprietário
    const ownerQuery = `user_id=eq.${product.user_id}&select=first_name,last_name,registration_number`;
    const owners = await getTable('user_extra_information', ownerQuery);
    console.log('👤 Proprietário encontrado:', owners?.length || 0);
    
    const owner = owners && owners.length > 0 ? owners[0] : null;

    // Processar as datas
    const dates = rent.dates || [];
    let startDate = '';
    let endDate = '';
    
    if (dates.length > 0) {
      const sortedDates = [...dates].sort();
      startDate = formatDate(sortedDates[0]);
      endDate = formatDate(sortedDates[sortedDates.length - 1]);
    }

    console.log('✅ Dados processados do aluguel');

    return {
      id: rent.id,
      productId: product.id,
      productName: product.name,
      description: product.description,
      ownerName: owner ? `${owner.first_name} ${owner.last_name}` : 'Proprietário não identificado',
      ownerRegistration: owner ? owner.registration_number : '',
      startDate,
      endDate,
      dates: dates,
      totalDays: dates.length,
      status: rent.status, // Status original do banco
      totalAmount: rent.total_amount ? formatPriceFromCents(rent.total_amount) : 'Grátis',
      price: formatPrice(product.price, true),
      images: images ? images.map(img => img.image_url) : [],
    };
  } catch (error) {
    console.error('❌ Erro ao buscar aluguel por ID:', error);
    throw error;
  }
};

// Função para buscar datas já alugadas para um produto (atualizada para nova estrutura)
export const fetchRentedDatesForProduct = async (productId, startDate, endDate) => {
  try {
    // Buscar todos os aluguéis do produto que não foram cancelados
    const rentsQuery = `product_id=eq.${productId}&status=neq.cancelado&select=dates`;
    const rents = await getTable('rents', rentsQuery);
    
    if (!rents || rents.length === 0) {
      return [];
    }

    // Coletar todas as datas alugadas
    const rentedDates = [];
    rents.forEach(rent => {
      if (rent.dates && Array.isArray(rent.dates)) {
        rent.dates.forEach(date => {
          // Filtrar apenas datas dentro do período solicitado
          if (date >= startDate && date <= endDate) {
            rentedDates.push({ date });
          }
        });
      }
    });

    return rentedDates;
  } catch (error) {
    console.error('Erro ao buscar datas alugadas:', error);
    throw error;
  }
};

// Função auxiliar para formatar data
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Função para obter estatísticas dos aluguéis do usuário (atualizada)
export const getRentStats = async () => {
  try {
    const allRents = await fetchUserRents();
    
    const stats = {
      total: allRents.length,
      ativos: allRents.filter(rent => rent.status === 'ativo').length,
      finalizados: allRents.filter(rent => rent.status === 'finalizado').length,
      pendentes: allRents.filter(rent => rent.status === 'pendente').length,
      cancelados: allRents.filter(rent => rent.status === 'cancelado').length,
    };

    return stats;
  } catch (error) {
    console.error('Erro ao obter estatísticas de aluguéis:', error);
    throw error;
  }
}; 
