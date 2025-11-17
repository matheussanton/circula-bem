import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { updateProduct, deleteProduct, uploadMultipleProductImages, fetchProductForEdit } from '../services/productService';
import { fetchCategories } from '../services/categoryService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapPicker from '../components/MapPicker';

const EditProduct = ({ route, navigation }) => {
  const { product } = route.params;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUris, setImageUris] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState([]);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const weekDays = [
    'domingo',
    'segunda',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado'
  ];

  useEffect(() => {
    loadCategories();
    loadProductData();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    }
  };

  const loadProductData = async () => {
    try {
      setIsInitialLoading(true);
      
      // Buscar dados completos do produto
      const productData = await fetchProductForEdit(product.id);
      
      // Atualizar estados com dados do produto
      setName(productData.name || '');
      setDescription(productData.description || '');
      setPrice(productData.price ? productData.price.toString().replace('.', ',') : '');
      setCategoryId(productData.category_id || '');
      setExistingImages(productData.images || []);
      setLat(
        typeof productData.lat === 'number'
          ? String(productData.lat).replace('.', ',')
          : ''
      );
      setLng(
        typeof productData.lng === 'number'
          ? String(productData.lng).replace('.', ',')
          : ''
      );
      
      // Carregar disponibilidades
      if (productData.availabilities) {
        const dayIndices = productData.availabilities.map(day => weekDays.indexOf(day)).filter(index => index !== -1);
        setSelectedDays(dayIndices);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do produto:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do produto');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const pickImage = async () => {
    const totalImages = imageUris.length + existingImages.length;
    if (totalImages >= 3) {
      Alert.alert('Limite atingido', 'Você pode ter no máximo 3 imagens.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Precisamos de permissão para acessar suas fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImageUris([...imageUris, manipulated.uri]);
    }
  };

  const removeNewImage = (index) => {
    setImageUris(imageUris.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleUpdate = async () => {
    if (!name || !description || price === '' || !categoryId || (imageUris.length === 0 && existingImages.length === 0) || selectedDays.length === 0) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    try {
      setIsLoading(true);
      
      // Validar e formatar dias da semana
      const validDays = [
        'domingo', 'segunda', 'terça-feira', 'quarta-feira', 
        'quinta-feira', 'sexta-feira', 'sábado'
      ];
      
      const formattedDays = selectedDays.map(index => weekDays[index]).filter(day => validDays.includes(day));
      
      if (formattedDays.length === 0) {
        Alert.alert('Erro', 'Selecione pelo menos um dia válido');
        return;
      }
      
      // Validar price - permite 0.00 (produtos gratuitos)
      const normalizedPrice = price.replace(',', '.');
      const parsedPrice = parseFloat(normalizedPrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        Alert.alert('Erro', 'Preço deve ser um valor válido (pode ser 0,00 para produtos gratuitos)');
        return;
      }
      
      const updateData = {
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,
        category_id: categoryId,
        availabilities: formattedDays,
      };

      // Validar latitude/longitude (opcionais)
      if (lat) {
        const v = parseFloat(lat.replace(',', '.'));
        if (isNaN(v) || v < -90 || v > 90) {
          Alert.alert('Erro', 'Latitude inválida (-90 a 90).');
          return;
        }
        updateData.lat = v;
      } else {
        updateData.lat = null;
      }
      if (lng) {
        const v = parseFloat(lng.replace(',', '.'));
        if (isNaN(v) || v < -180 || v > 180) {
          Alert.alert('Erro', 'Longitude inválida (-180 a 180).');
          return;
        }
        updateData.lng = v;
      } else {
        updateData.lng = null;
      }
      
      console.log('Dados do produto a ser atualizado:', updateData);
      
      // Atualizar produto
      await updateProduct(product.id, updateData);
      
      // Se há novas imagens, fazer upload
      if (imageUris.length > 0) {
        await uploadMultipleProductImages({ id: product.id }, imageUris);
      }
      
      Alert.alert('Sucesso', 'Produto atualizado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Erro detalhado:', error);
      Alert.alert('Erro', `Falha ao atualizar produto: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      await deleteProduct(product.id);
      Alert.alert('Sucesso', 'Produto excluído com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      Alert.alert('Erro', `Falha ao excluir produto: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isInitialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F8CFF" />
          <Text style={styles.loadingText}>Carregando dados do produto...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#222" />
              </TouchableOpacity>
              <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
            </View>
            <Text style={styles.title}>Editar Produto</Text>
            <View style={styles.headerRight} />
          </View>

          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Fotos do Produto</Text>
            <Text style={styles.sectionSubtitle}>Máximo 3 fotos (primeira será a capa)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              <View style={styles.imageContainer}>
                {/* Imagens existentes */}
                {existingImages.map((uri, idx) => (
                  <View key={`existing-${idx}`} style={styles.imageThumbWrap}>
                    <Image source={{ uri }} style={styles.imageThumb} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeExistingImage(idx)}>
                      <MaterialCommunityIcons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                    {idx === 0 && existingImages.length > 0 && imageUris.length === 0 && <Text style={styles.mainImageLabel}>Principal</Text>}
                  </View>
                ))}
                
                {/* Novas imagens */}
                {imageUris.map((uri, idx) => (
                  <View key={`new-${idx}`} style={styles.imageThumbWrap}>
                    <Image source={{ uri }} style={styles.imageThumb} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeNewImage(idx)}>
                      <MaterialCommunityIcons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                    {idx === 0 && existingImages.length === 0 && <Text style={styles.mainImageLabel}>Principal</Text>}
                  </View>
                ))}
                
                {(imageUris.length + existingImages.length) < 3 && (
                  <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                    <MaterialCommunityIcons name="camera-plus" size={32} color="#4F8CFF" />
                    <Text style={styles.imagePlaceholderText}>Adicionar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>

          <View style={styles.form}>
            {/* Informações básicas */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Informações Básicas</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome do Produto</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Digite o nome do produto"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Descreva o produto"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Preço por dia</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencySymbol}>R$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={price}
                    onChangeText={(text) => {
                      // Remove caracteres não numéricos exceto vírgula e ponto
                      let numericValue = text.replace(/[^0-9.,]/g, '');
                      
                      // Substitui vírgula por ponto para processamento
                      numericValue = numericValue.replace(/,/g, '.');
                      
                      // Evita múltiplos pontos decimais
                      const parts = numericValue.split('.');
                      if (parts.length > 2) {
                        numericValue = parts[0] + '.' + parts.slice(1).join('');
                      }
                      
                      // Limita a 2 casas decimais
                      if (parts.length === 2 && parts[1].length > 2) {
                        numericValue = parts[0] + '.' + parts[1].substring(0, 2);
                      }
                      
                      // Substitui ponto por vírgula para exibição (padrão brasileiro)
                      const displayValue = numericValue.replace('.', ',');
                      setPrice(displayValue);
                    }}
                    placeholder="0,00"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                  />
                </View>
                <Text style={styles.priceHint}>Deixe 0,00 para produtos gratuitos</Text>
              </View>
            </View>

            {/* Categoria */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Categoria</Text>
              <View style={styles.categoryContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      categoryId === category.id && styles.categoryButtonSelected
                    ]}
                    onPress={() => setCategoryId(category.id)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      categoryId === category.id && styles.categoryButtonTextSelected
                    ]}>
                      {category.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Disponibilidade */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Dias Disponíveis</Text>
              <Text style={styles.sectionSubtitle}>Selecione os dias da semana em que o produto estará disponível</Text>
              <View style={styles.daysContainer}>
                {weekDays.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      selectedDays.includes(index) && styles.dayButtonSelected
                    ]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      selectedDays.includes(index) && styles.dayButtonTextSelected
                    ]}>
                      {day.charAt(0).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Localização (opcional) */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Localização (opcional)</Text>
              <MapPicker
                value={{
                  lat: lat ? parseFloat(lat.replace(',', '.')) : null,
                  lng: lng ? parseFloat(lng.replace(',', '.')) : null,
                }}
                onChange={({ lat: nlat, lng: nlng }) => {
                  setLat(nlat != null ? String(nlat) : '');
                  setLng(nlng != null ? String(nlng) : '');
                }}
                height={240}
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Salvar Alterações</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Área de Perigo - Deletar Produto */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Zona de Perigo</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={isLoading}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.deleteButtonText}>Excluir Produto Permanentemente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 15,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    flex: 2,
  },
  headerRight: {
    flex: 1,
  },
  imageSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  imageScroll: {
    marginTop: 10,
  },
  imageContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  imageThumbWrap: {
    position: 'relative',
    marginRight: 12,
  },
  imageThumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F7F8FA',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F7F8FA',
    borderWidth: 2,
    borderColor: '#4F8CFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainImageLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#4F8CFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  imagePlaceholderText: {
    color: '#4F8CFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  form: {
    padding: 20,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4F8CFF',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  priceHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryButtonSelected: {
    backgroundColor: '#4F8CFF',
    borderColor: '#4F8CFF',
  },
  categoryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dayButtonSelected: {
    backgroundColor: '#4F8CFF',
    borderColor: '#4F8CFF',
  },
  dayButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#4F8CFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#4F8CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerZone: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#4F8CFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
  },
});

export default EditProduct; 
