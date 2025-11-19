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
import { createProduct, uploadProductImage, uploadMultipleProductImages } from '../services/productService';
import { fetchCategories } from '../services/categoryService';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapPicker from '../components/MapPicker';
import CategorySelect from '../components/CategorySelect';

const CreateProduct = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUris, setImageUris] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    }
  };

  const pickImage = async () => {
    if (imageUris.length >= 3) {
      Alert.alert('Limite atingido', 'Você pode selecionar no máximo 3 imagens.');
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

  const removeImage = (index) => {
    setImageUris(imageUris.filter((_, i) => i !== index));
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!name || !description || price === '' || !categoryId || imageUris.length === 0 || selectedDays.length === 0) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }
    try {
      setIsLoading(true);
      
      // Obter userId do AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
        return;
      }
      
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
      
      console.log('Dias selecionados (índices):', selectedDays);
      console.log('Dias formatados:', formattedDays);
      
      // Validar price - agora permite 0.00 (produtos gratuitos)
      const normalizedPrice = price.replace(',', '.');
      const parsedPrice = parseFloat(normalizedPrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        Alert.alert('Erro', 'Preço deve ser um valor válido (pode ser 0,00 para produtos gratuitos)');
        return;
      }
      
      // Validar latitude/longitude (opcionais)
      let latNum = null;
      let lngNum = null;
      if (lat) {
        const v = parseFloat(lat.replace(',', '.'));
        if (isNaN(v) || v < -90 || v > 90) {
          Alert.alert('Erro', 'Latitude inválida (-90 a 90).');
          return;
        }
        latNum = v;
      }
      if (lng) {
        const v = parseFloat(lng.replace(',', '.'));
        if (isNaN(v) || v < -180 || v > 180) {
          Alert.alert('Erro', 'Longitude inválida (-180 a 180).');
          return;
        }
        lngNum = v;
      }

      const productData = {
        id: uuidv4(),
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,
        category_id: categoryId,
        availabilities: formattedDays,
        user_id: userId,
        ...(latNum !== null ? { lat: latNum } : {}),
        ...(lngNum !== null ? { lng: lngNum } : {})
      };
      
      console.log('Dados do produto a ser criado:', productData);
      
      const product = await createProduct(productData);
      await uploadMultipleProductImages(product, imageUris);
      Alert.alert('Sucesso', 'Produto criado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Erro detalhado:', error);
      Alert.alert('Erro', `Falha ao criar produto: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#222" />
            </TouchableOpacity>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Criar Produto</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Fotos do Produto</Text>
          <Text style={styles.sectionSubtitle}>Adicione até 3 fotos (primeira será a capa)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            <View style={styles.imageContainer}>
              {imageUris.map((uri, idx) => (
                <View key={idx} style={styles.imageThumbWrap}>
                  <Image source={{ uri }} style={styles.imageThumb} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(idx)}>
                    <MaterialCommunityIcons name="close-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                  {idx === 0 && <Text style={styles.mainImageLabel}>Principal</Text>}
                </View>
              ))}
              {imageUris.length < 3 && (
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

            <View style={{ marginTop: 8 }}>
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
          </View>

          {/* Categoria */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Categoria</Text>
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              categories={categories}
              placeholder="Selecione a categoria"
            />
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

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Criar Produto</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  priceHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});

export default CreateProduct; 
