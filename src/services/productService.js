import { SUPABASE_CONFIG } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { getTable } from './supabaseClient';
import { formatPrice, formatTotalAmount } from '../utils/priceUtils';

const deg2rad = (deg) => (deg * Math.PI) / 180;
const earthKmPerDeg = 111.32;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  if (
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number'
  ) return null;
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const createProduct = async (productData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    console.log('Criando produto com dados:', productData);
    console.log('Token usado:', token ? 'Token presente' : 'Usando apikey');
    
    const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.KEY,
        'Authorization': `Bearer ${token || SUPABASE_CONFIG.KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(productData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Erro detalhado do servidor:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.log('Erro JSON parseado:', errorData);
        throw new Error(`Erro HTTP ${response.status}: ${errorData.message || errorData.details || errorText}`);
      } catch (parseError) {
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();
    
    if (!data) {
      throw new Error('Nenhum dado recebido do Supabase');
    }

    console.log('Produto criado com sucesso:', data);
    return data[0]; // Retorna o primeiro item do array
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    throw new Error(error.message || 'Falha ao criar produto');
  }
};

export const uploadProductImage = async (product, imageUri, index = 0) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    // Gerar nome único para cada imagem usando o índice
    const uniqueName = `${product.id}/${product.id}_${index}.jpg`;
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: uniqueName
    });

    // URL de upload (sem /public/)
    const uploadUrl = `${SUPABASE_CONFIG.URL}/storage/v1/object/product-images/${uniqueName}`;
    console.log('Uploading to:', uploadUrl);
    console.log('Headers:', {
      'apikey': SUPABASE_CONFIG.KEY,
      'Authorization': `Bearer ${token || SUPABASE_CONFIG.KEY}`,
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.KEY,
        'Authorization': `Bearer ${token || SUPABASE_CONFIG.KEY}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData
    });

    console.log('Upload Response:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      headers: uploadResponse.headers,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload Error Response:', errorText);
      throw new Error(`Falha ao fazer upload da imagem: ${errorText}`);
    }

    // URL pública para salvar no banco
    const imageUrl = `${SUPABASE_CONFIG.URL}/storage/v1/object/public/product-images/${uniqueName}`;
    const imageResponse = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/product_images`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.KEY,
        'Authorization': `Bearer ${token || SUPABASE_CONFIG.KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: uuidv4(),
        product_id: product.id,
        image_url: imageUrl
      })
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Image Record Error Response:', errorText);
      throw new Error(`Falha ao registrar imagem do produto: ${errorText}`);
    }

    return await imageResponse.json();
  } catch (error) {
    console.error('Erro detalhado ao fazer upload da imagem:', error);
    throw new Error(error.message || 'Falha ao fazer upload da imagem');
  }
};

export const uploadMultipleProductImages = async (product, imageUris) => {
  for (let i = 0; i < imageUris.length; i++) {
    await uploadProductImage(product, imageUris[i], i);
  }
};

export const fetchProducts = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    console.log(token);
    const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/products?select=*,product_images:product_images(image_url,product_id)`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_CONFIG.KEY,
        'Authorization': `Bearer ${token || SUPABASE_CONFIG.KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    if (!response.ok) {
      throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    const data = await response.json();
    if (!data) {
      throw new Error('Nenhum dado recebido do Supabase');
    }
    // Ordena as imagens para garantir que a _0 seja a primeira
    return data.map(product => ({
      ...product,
      product_images: (product.product_images || []).sort((a, b) => {
        if (!a.image_url || !b.image_url) return 0;
        return a.image_url > b.image_url ? 1 : -1;
      })
    }));
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw new Error(error.message || 'Falha ao buscar produtos');
  }
};

/**
 * Search products with optional term/category and optional geospatial bounding box.
 * params: {
 *   q?: string,
 *   categoryId?: string|number,
 *   center?: { lat: number, lng: number },
 *   radiusKm?: number, // default 25
 *   from?: number, to?: number
 * }
 */
export const searchProducts = async ({
  q = '',
  categoryId = null,
  center = null,
  radiusKm = 25,
  from = 0,
  to = 19
} = {}) => {
  const token = await AsyncStorage.getItem('token');
  const headers = {
    'apikey': SUPABASE_CONFIG.KEY,
    'Authorization': `Bearer ${token || SUPABASE_CONFIG.KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // Build filters
  const filters = [];
  if (q) {
    const enc = encodeURIComponent(q);
    filters.push(`or=(name.ilike.*${enc}*,description.ilike.*${enc}*)`);
  }
  if (categoryId) {
    filters.push(`category_id=eq.${categoryId}`);
  }

  // Geo bounding box (approx) if center provided
  if (center?.lat != null && center?.lng != null && radiusKm > 0) {
    const dLat = radiusKm / earthKmPerDeg;
    const dLng = radiusKm / (earthKmPerDeg * Math.cos(deg2rad(center.lat) || 1));
    const minLat = center.lat - dLat;
    const maxLat = center.lat + dLat;
    const minLng = center.lng - dLng;
    const maxLng = center.lng + dLng;
    filters.push(`lat=gte.${minLat}`);
    filters.push(`lat=lte.${maxLat}`);
    filters.push(`lng=gte.${minLng}`);
    filters.push(`lng=lte.${maxLng}`);
  }

  const select = `select=*,product_images:product_images(image_url,product_id)`;
  const limit = `&limit=${Math.max(1, (to - from + 1))}`;
  const offset = `&offset=${Math.max(0, from)}`;
  const query = filters.length > 0 ? `?${filters.join('&')}` : '?';
  const url = `${SUPABASE_CONFIG.URL}/rest/v1/products${query}&${select}${limit}${offset}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao buscar: ${res.status} - ${text}`);
  }
  const data = await res.json();
  const products = (data || []).map(p => ({
    ...p,
    product_images: (p.product_images || []).sort((a, b) => {
      if (!a.image_url || !b.image_url) return 0;
      return a.image_url > b.image_url ? 1 : -1;
    })
  }));

  // If we have a center, compute distances and sort by proximity
  if (center?.lat != null && center?.lng != null) {
    products.forEach(p => {
      p.distanceKm = haversineKm(center.lat, center.lng, p.lat, p.lng);
    });
    products.sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
  }

  return products;
};

export const fetchProductById = async (productId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/products?id=eq.${productId}&select=*,product_images:product_images(image_url,product_id)`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_CONFIG.KEY,
        'Authorization': `Bearer ${token || SUPABASE_CONFIG.KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('Produto não encontrado');
    }

    // Ordena as imagens para garantir que a _0 seja a primeira
    const product = data[0];
    return {
      ...product,
      product_images: (product.product_images || []).sort((a, b) => {
        if (!a.image_url || !b.image_url) return 0;
        return a.image_url > b.image_url ? 1 : -1;
      })
    };
  } catch (error) {
    console.error('Erro ao buscar produto por ID:', error);
    throw new Error(error.message || 'Falha ao buscar produto');
  }
};

export const fetchUserProducts = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔍 Buscando produtos do usuário:', userId);

    // Buscar produtos do usuário
    const productsQuery = `user_id=eq.${userId}&select=id,name,description,price,category_id`;
    const products = await getTable('products', productsQuery);
    
    if (!products || !Array.isArray(products)) {
      console.log('⚠️ Nenhum produto encontrado');
      return [];
    }

    console.log(`✅ Encontrados ${products.length} produtos`);

    if (products.length === 0) {
      return [];
    }

    // Extrair IDs únicos para queries em batch
    const productIds = products.map(p => p.id);
    const categoryIds = [...new Set(products.map(p => p.category_id))];

    // BATCH QUERIES - muito mais eficiente
    const [categoriesData, imagesData, rentsData] = await Promise.all([
      // Buscar todas as categorias de uma vez
      getTable('categories', `id=in.(${categoryIds.join(',')})&select=id,description,image_url`),
      
      // Buscar todas as imagens de uma vez
      getTable('product_images', `product_id=in.(${productIds.join(',')})&select=product_id,image_url`),
      
      // Buscar todos os aluguéis de uma vez
      getTable('rents', `product_id=in.(${productIds.join(',')})&select=product_id,status,dates`)
    ]);

    console.log(`📦 Dados carregados - Categorias: ${categoriesData?.length || 0}, Imagens: ${imagesData?.length || 0}, Aluguéis: ${rentsData?.length || 0}`);

    // Processar produtos com dados já carregados
    const processedProducts = products.map((product) => {
      try {
        // Encontrar categoria
        const category = categoriesData?.find(cat => cat.id === product.category_id);

        // Encontrar imagens do produto
        const productImages = imagesData?.filter(img => img.product_id === product.id) || [];

        // Calcular estatísticas de aluguel
        const productRents = rentsData?.filter(rent => rent.product_id === product.id) || [];
        
        let totalRents = 0;
        let activeRents = 0;
        let totalEarnings = 0;

        if (productRents.length > 0) {
          totalRents = productRents.length;
          activeRents = productRents.filter(rent => 
            rent.status === 'confirmado' || rent.status === 'em andamento'
          ).length;
          
          // Calcular ganhos (aproximado baseado nas datas)
          productRents.forEach(rent => {
            if (rent.dates && Array.isArray(rent.dates)) {
              totalEarnings += rent.dates.length * parseFloat(product.price);
            }
          });
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: parseFloat(product.price),
          priceFormatted: formatPrice(product.price, true),
          category: category?.description || 'Categoria não definida',
          image: productImages.length > 0 ? productImages[0].image_url : 'https://via.placeholder.com/80x80',
          images: productImages.map(img => img.image_url),
          stats: {
            totalRents,
            activeRents,
            totalEarnings: totalEarnings.toFixed(2),
            totalEarningsFormatted: formatTotalAmount(totalEarnings)
          }
        };
      } catch (error) {
        console.error(`❌ Erro ao processar produto ${product.id}:`, error);
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: parseFloat(product.price),
          priceFormatted: formatPrice(product.price, true),
          category: 'Categoria não definida',
          image: 'https://via.placeholder.com/80x80',
          images: [],
          stats: {
            totalRents: 0,
            activeRents: 0,
            totalEarnings: '0.00',
            totalEarningsFormatted: formatTotalAmount(0)
          }
        };
      }
    });

    console.log(`✅ ${processedProducts.length} produtos processados com sucesso`);
    return processedProducts;
  } catch (error) {
    console.error('❌ Erro ao buscar produtos do usuário:', error);
    throw error;
  }
};

export const getUserProductStats = async () => {
  try {
    const products = await fetchUserProducts();
    
    const stats = {
      totalProducts: products.length,
      totalRents: products.reduce((sum, product) => sum + product.stats.totalRents, 0),
      activeRents: products.reduce((sum, product) => sum + product.stats.activeRents, 0),
      totalEarnings: products.reduce((sum, product) => sum + parseFloat(product.stats.totalEarnings), 0),
    };

    return {
      ...stats,
      totalEarningsFormatted: formatTotalAmount(stats.totalEarnings)
    };
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas dos produtos:', error);
    throw error;
  }
};

export const updateProduct = async (productId, updateData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const userId = await AsyncStorage.getItem('userId');
    
    console.log('🔄 Atualizando produto:', productId, updateData);
    
    // Verificar se o produto pertence ao usuário
    const product = await fetchProductById(productId);
    if (product.user_id !== userId) {
      throw new Error('Você não tem permissão para editar este produto');
    }
    
    const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/products?id=eq.${productId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_CONFIG.KEY,
        'Authorization': `Bearer ${token || SUPABASE_CONFIG.KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Erro detalhado do servidor:', errorText);
      throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Produto atualizado com sucesso:', data);
    return data[0];
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    throw new Error(error.message || 'Falha ao atualizar produto');
  }
};

export const deleteProduct = async (productId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const userId = await AsyncStorage.getItem('userId');
    
    console.log('🗑️ Excluindo produto:', productId);
    
    // Verificar se o produto pertence ao usuário
    const product = await fetchProductById(productId);
    if (product.user_id !== userId) {
      throw new Error('Você não tem permissão para excluir este produto');
    }
    
    // Verificar se há aluguéis ativos
    const rentsQuery = `product_id=eq.${productId}&status=in.(pendente,confirmado,em andamento)`;
    const activeRents = await getTable('rents', rentsQuery);
    
    if (activeRents && activeRents.length > 0) {
      throw new Error('Não é possível excluir um produto com aluguéis ativos ou pendentes');
    }
    
    const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/products?id=eq.${productId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_CONFIG.KEY,
        'Authorization': `Bearer ${token || SUPABASE_CONFIG.KEY}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Erro detalhado do servidor:', errorText);
      throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
    }

    console.log('✅ Produto excluído com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao excluir produto:', error);
    throw new Error(error.message || 'Falha ao excluir produto');
  }
};

export const fetchProductForEdit = async (productId) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔍 Buscando produto para edição:', productId);

    // Buscar produto completo com verificação de propriedade
    const productQuery = `id=eq.${productId}&user_id=eq.${userId}&select=*`;
    const products = await getTable('products', productQuery);
    
    if (!products || products.length === 0) {
      throw new Error('Produto não encontrado ou você não tem permissão para editá-lo');
    }

    const product = products[0];

    // Buscar imagens do produto
    const imagesQuery = `product_id=eq.${product.id}&select=image_url`;
    const images = await getTable('product_images', imagesQuery);

    console.log('✅ Produto carregado para edição');
    return {
      ...product,
      images: images ? images.map(img => img.image_url) : []
    };
  } catch (error) {
    console.error('❌ Erro ao buscar produto para edição:', error);
    throw new Error(error.message || 'Falha ao buscar produto para edição');
  }
}; 
