import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTable, insertIntoTable } from './supabaseClient';
import { SUPABASE_CONFIG } from '../config/env';

// Produto: totais
export const getProductReviewTotals = async (productId) => {
  const rows = await getTable('product_review_totals', `product_id=eq.${productId}`);
  return rows?.[0] || {
    product_id: productId,
    total_reviews: 0,
    average_rating: 0,
    star_1_count: 0,
    star_2_count: 0,
    star_3_count: 0,
    star_4_count: 0,
    star_5_count: 0,
  };
};

// Usuário: totais por papel (locador/locatario)
export const getUserReviewTotalsByRole = async (userId, role) => {
  const rows = await getTable('user_review_totals', `user_id=eq.${userId}&role=eq.${role}`);
  return rows?.[0] || {
    user_id: userId,
    role,
    total_reviews: 0,
    average_rating: 0,
    star_1_count: 0,
    star_2_count: 0,
    star_3_count: 0,
    star_4_count: 0,
    star_5_count: 0,
  };
};

// Criar avaliação de produto (feita pelo locatário)
export const createProductReview = async ({ rentId, productId, rating, comment }) => {
  const reviewerUserId = await AsyncStorage.getItem('userId');
  if (!reviewerUserId) throw new Error('Usuário não autenticado');

  // Validações de integridade no cliente para evitar erros 400 do banco
  const rent = await fetchRentByIdRaw(rentId);
  if (!rent) throw new Error('Aluguel não encontrado.');
  if (rent.product_id !== productId) {
    throw new Error('O aluguel não corresponde ao produto informado.');
  }
  // Somente o locatário pode avaliar o produto
  if (rent.user_id !== reviewerUserId) {
    throw new Error('Somente o locatário pode avaliar o produto deste aluguel.');
  }

  const payload = {
    rent_id: rentId,
    product_id: productId,
    reviewer_user_id: reviewerUserId,
    rating,
    comment: comment || null,
  };
  const inserted = await insertIntoTable('product_reviews', payload);
  return Array.isArray(inserted) ? inserted[0] : inserted;
};

// Criar avaliação de usuário (avaliado em um papel específico)
// role: 'locador' | 'locatario'
export const createUserReview = async ({ rentId, revieweeUserId, role, rating, comment }) => {
  const reviewerUserId = await AsyncStorage.getItem('userId');
  if (!reviewerUserId) throw new Error('Usuário não autenticado');
  if (!['locador', 'locatario'].includes(role)) {
    throw new Error('Papel inválido para avaliação');
  }

  // Validações de integridade no cliente para evitar erros 400 do banco
  const rent = await fetchRentByIdRaw(rentId);
  if (!rent) throw new Error('Aluguel não encontrado.');
  const ownerId = await fetchProductOwnerId(rent.product_id);
  if (!ownerId) throw new Error('Locador do produto não encontrado.');

  // Papel representa quem está sendo avaliado
  // role = 'locador'  => avaliado é o dono (ownerId), revisor deve ser o locatário (rent.user_id)
  // role = 'locatario'=> avaliado é o locatário (rent.user_id), revisor deve ser o locador (ownerId)
  if (role === 'locador') {
    if (revieweeUserId !== ownerId) throw new Error('O avaliado não é o locador deste aluguel.');
    if (reviewerUserId !== rent.user_id) throw new Error('Somente o locatário pode avaliar o locador neste aluguel.');
  } else if (role === 'locatario') {
    if (revieweeUserId !== rent.user_id) throw new Error('O avaliado não é o locatário deste aluguel.');
    if (reviewerUserId !== ownerId) throw new Error('Somente o locador pode avaliar o locatário neste aluguel.');
  }

  const payload = {
    rent_id: rentId,
    reviewer_user_id: reviewerUserId,
    reviewee_user_id: revieweeUserId,
    role,
    rating,
    comment: comment || null,
  };
  const inserted = await insertIntoTable('user_reviews', payload);
  return Array.isArray(inserted) ? inserted[0] : inserted;
};

// Utilidades de apoio ao fluxo
export const fetchRentByIdRaw = async (rentId) => {
  const rows = await getTable('rents', `id=eq.${rentId}&select=*`);
  return rows?.[0] || null;
};

export const fetchProductOwnerId = async (productId) => {
  const rows = await getTable('products', `id=eq.${productId}&select=user_id`);
  return rows?.[0]?.user_id || null;
};

export const fetchProductBasic = async (productId) => {
  const rows = await getTable('products', `id=eq.${productId}&select=id,name,user_id`);
  return rows?.[0] || null;
};


