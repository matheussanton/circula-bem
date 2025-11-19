import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  createProductReview,
  createUserReview,
  fetchProductOwnerId,
  fetchRentByIdRaw,
  fetchProductBasic,
} from '../services/reviewService';

const Star = ({ filled, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ padding: 4 }}>
    <MaterialCommunityIcons name={filled ? 'star' : 'star-outline'} size={28} color="#FFD700" />
  </TouchableOpacity>
);

const RatingInput = ({ rating, setRating }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
    {[1, 2, 3, 4, 5].map((v) => (
      <Star key={v} filled={v <= rating} onPress={() => setRating(v)} />
    ))}
  </View>
);

const ReviewFlowScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { rentId, productId, actor, phase, productName } = route.params || {};

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewTargets, setReviewTargets] = useState({
    product: null, // { id, name }
    locadorId: null,
    locatarioId: null,
  });

  const flowType = useMemo(() => {
    // Somente no fim da locação (devolução) pedimos avaliações
    if (phase !== 'devolucao') return 'none';
    if (actor === 'locatario') return 'locatario_flow'; // produto -> locador
    if (actor === 'locador') return 'locador_flow'; // locatario
    return 'none';
  }, [actor, phase]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (flowType === 'none') {
          navigation.goBack();
          return;
        }
        const product = productId ? await fetchProductBasic(productId) : null;
        const locadorId = product ? product.user_id : productId ? await fetchProductOwnerId(productId) : null;
        const rent = rentId ? await fetchRentByIdRaw(rentId) : null;
        const locatarioId = rent ? rent.user_id : null;
        // Se o mesmo usuário é locador e locatário, pular avaliação
        if (locadorId && locatarioId && locadorId === locatarioId) {
          alert('Avaliação não aplicável: aluguel do próprio produto.');
          navigation.navigate('MyRents');
          return;
        }
        setReviewTargets({
          product: product ? { id: product.id, name: product.name } : (productId ? { id: productId, name: productName || 'Produto' } : null),
          locadorId,
          locatarioId,
        });
      } catch (e) {
        Alert.alert('Erro', e.message || 'Falha ao preparar avaliação.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [flowType, productId, rentId, navigation, productName]);

  const resetForm = () => {
    setRating(0);
    setComment('');
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert('Validação', 'Selecione uma nota de 1 a 5.');
      return;
    }
    try {
      setSubmitting(true);
      if (flowType === 'locatario_flow') {
        if (step === 1) {
          // Avalia o produto
          await createProductReview({
            rentId,
            productId: reviewTargets.product?.id,
            rating,
            comment,
          });
          resetForm();
          setStep(2);
          return;
        }
        if (step === 2) {
          // Avalia o locador
          if (!reviewTargets.locadorId) throw new Error('Locador não encontrado para este aluguel.');
          await createUserReview({
            rentId,
            revieweeUserId: reviewTargets.locadorId,
            role: 'locador',
            rating,
            comment,
          });
          Alert.alert('Obrigado!', 'Suas avaliações foram registradas.');
          navigation.navigate('MyRents');
          return;
        }
      }

      if (flowType === 'locador_flow') {
        // Avalia o locatário
        if (!reviewTargets.locatarioId) throw new Error('Locatário não encontrado para este aluguel.');
        await createUserReview({
          rentId,
          revieweeUserId: reviewTargets.locatarioId,
          role: 'locatario',
          rating,
          comment,
        });
        Alert.alert('Obrigado!', 'Sua avaliação foi registrada.');
        navigation.navigate('MyRents');
        return;
      }
    } catch (e) {
      // Em caso de duplicidade, apenas informamos e avançamos (ou finalizamos)
      const msg = String(e?.message || '').toLowerCase();
      const isDuplicate = msg.includes('duplicate') || msg.includes('unique') || msg.includes('duplic');
      if (isDuplicate) {
        if (flowType === 'locatario_flow' && step === 1) {
          resetForm();
          setStep(2);
          return;
        }
        Alert.alert('Aviso', 'Você já enviou esta avaliação.');
        navigation.navigate('MyRents');
        return;
      }
      Alert.alert('Erro', e.message || 'Falha ao enviar a avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4F8CFF" />
        <Text style={{ marginTop: 10, color: '#334155' }}>Preparando avaliação...</Text>
      </SafeAreaView>
    );
  }

  if (flowType === 'none') {
    return null;
  }

  const title =
    flowType === 'locatario_flow'
      ? step === 1
        ? 'Avaliar Produto'
        : 'Avaliar Locador'
      : 'Avaliar Locatário';

  const subtitle =
    flowType === 'locatario_flow'
      ? step === 1
        ? (reviewTargets.product?.name || 'Produto')
        : 'Sua experiência com o locador'
      : 'Sua experiência com o locatário';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Avaliação</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <RatingInput rating={rating} setRating={setRating} />

        <Text style={styles.label}>Comentário (opcional)</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Descreva sua experiência"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {flowType === 'locatario_flow' && step === 1 ? 'Enviar e continuar' : 'Enviar avaliação'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F8FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.04)' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#475569', marginTop: 4, marginBottom: 8 },
  label: { fontSize: 14, color: '#334155', marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 16,
    backgroundColor: '#4F8CFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default ReviewFlowScreen;


