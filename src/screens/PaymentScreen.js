import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LoadingOverlay from '../components/LoadingOverlay';
import Toast from 'react-native-toast-message';

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { rentId, product, renter } = route.params || {};
  const [method, setMethod] = useState('card'); // 'card' | 'pix'
  const [holder, setHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);

  const canPay = useMemo(() => {
    if (method === 'pix') return true;
    return holder.trim().length > 3 && cardNumber.replace(/\D/g, '').length >= 12 && /\d{2}\/\d{2}/.test(expiry) && cvv.trim().length >= 3;
  }, [method, holder, cardNumber, expiry, cvv]);

  const onPay = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Toast.show({
        type: 'info',
        text1: 'Pagamento efetuado com sucesso',
        position: 'top',
        topOffset: 60,
      });
      navigation.navigate('RentDetail', { rentId });
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading} message="Aguardando pagamento..." />
      <View style={styles.pagePadding}>
        {/* Wrapper card */}
        <View style={styles.contentCard}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pagamento</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Steps pill */}
          <View style={styles.stepsPill}>
            <Text style={styles.stepsText}>Etapa 3 de 3</Text>
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons name="shopping-outline" size={20} color="#4F8CFF" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text numberOfLines={1} style={styles.summaryTitle}>{product?.name || 'Aluguel'}</Text>
              {renter?.first_name && (
                <Text numberOfLines={1} style={styles.summarySub}>de {renter.first_name} {renter.last_name}</Text>
              )}
            </View>
          </View>

          {/* Method selector */}
          <View style={styles.methodRow}>
            <TouchableOpacity
              onPress={() => setMethod('card')}
              style={[styles.methodChip, method === 'card' && styles.methodChipActive]}
            >
              <MaterialCommunityIcons name="credit-card-outline" size={18} color={method === 'card' ? '#fff' : '#1F2937'} />
              <Text style={[styles.methodText, method === 'card' && styles.methodTextActive]}>Cartão</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMethod('pix')}
              style={[styles.methodChip, method === 'pix' && styles.methodChipActive]}
            >
              <MaterialCommunityIcons name="qrcode" size={18} color={method === 'pix' ? '#fff' : '#1F2937'} />
              <Text style={[styles.methodText, method === 'pix' && styles.methodTextActive]}>PIX</Text>
            </TouchableOpacity>
          </View>

          {method === 'card' ? (
            <View style={styles.cardForm}>
              <Text style={styles.label}>Nome no cartão</Text>
              <TextInput value={holder} onChangeText={setHolder} placeholder="Como está no cartão" style={styles.input} />
              <Text style={styles.label}>Número do cartão</Text>
              <TextInput value={cardNumber} onChangeText={setCardNumber} placeholder="0000 0000 0000 0000" keyboardType="numeric" style={styles.input} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Validade</Text>
                  <TextInput value={expiry} onChangeText={setExpiry} placeholder="MM/AA" keyboardType="numeric" style={styles.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput value={cvv} onChangeText={setCvv} placeholder="***" keyboardType="numeric" style={styles.input} secureTextEntry />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.pixBox}>
              <View style={styles.qrMock}>
                <MaterialCommunityIcons name="qrcode" size={120} color="#4F8CFF" />
              </View>
              <Text style={styles.pixHint}>Escaneie o QR Code ou toque em “Pagar” para simular o PIX.</Text>
            </View>
          )}

          <TouchableOpacity disabled={!canPay} onPress={onPay} style={[styles.payBtn, !canPay && { opacity: 0.6 }]}>
            <MaterialCommunityIcons name="lock-check" size={20} color="#fff" />
            <Text style={styles.payText}>Pagar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  pagePadding: { flex: 1, padding: 16 },
  contentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: { padding: 6, backgroundColor: '#fff', borderRadius: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  stepsPill: { alignSelf: 'flex-start', backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginBottom: 12 },
  stepsText: { color: '#3730A3', fontWeight: '700', fontSize: 12 },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    padding: 12, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }
  },
  summaryTitle: { fontWeight: '700', color: '#0F172A' },
  summarySub: { color: '#475569', fontSize: 12 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  methodChip: { backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  methodChipActive: { backgroundColor: '#4F8CFF' },
  methodText: { color: '#1F2937', fontWeight: '700' },
  methodTextActive: { color: '#fff' },
  cardForm: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 8, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0F172A' },
  pixBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  qrMock: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', borderRadius: 12, marginBottom: 10 },
  pixHint: { color: '#475569', textAlign: 'center' },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22C55E', paddingVertical: 14, borderRadius: 12, gap: 8 },
  payText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

export default PaymentScreen;


