import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import ViewShot from 'react-native-view-shot';
import { Dimensions } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadRentMedia, completePhaseAndUpdateStatus } from '../services/rentMediaService';
import { useNavigation, useRoute } from '@react-navigation/native';

const RentMediaCaptureScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { rentId, productId, phase, actor, productName } = route.params || {};

  const cameraRef = useRef(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [items, setItems] = useState([]); // { id, uri, kind, width, height, durationMs, meta }
  const [isRecording, setIsRecording] = useState(false);
  const shotRefs = useRef({}); // id -> ref
  const [currentUserId, setCurrentUserId] = useState('');

  const registerShotRef = (id, ref) => {
    if (ref) {
      shotRefs.current[id] = ref;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const uid = await AsyncStorage.getItem('userId');
        if (uid) setCurrentUserId(uid);
      } catch {}
    })();
  }, []);

  const captureStamped = async (item) => {
    // Usa ViewShot offscreen com largura base para boa definição
    const targetWidth = 1080;
    const ratio = item.width && item.height ? (item.height / item.width) : (9 / 16);
    const targetHeight = Math.round(targetWidth * ratio);
    const ref = shotRefs.current[item.id];
    if (!ref) return null;
    try {
      const uri = await ref.capture({
        result: 'tmpfile',
        quality: 0.9,
        format: 'jpg',
      });
      return uri;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!micPermission?.granted) {
        await requestMicPermission();
      }
      const locPerm = await Location.requestForegroundPermissionsAsync();
      const granted = (cameraPermission?.granted || false) && (micPermission?.granted || false) && (locPerm.status === 'granted');
      setHasPermissions(granted);
    })();
  }, [cameraPermission, micPermission]);

  const getGeo = async () => {
    try {
      const p = await Location.getCurrentPositionAsync({});
      return { lat: p.coords.latitude, lng: p.coords.longitude };
    } catch (e) {
      return { lat: null, lng: null };
    }
  };

  const takePhoto = async () => {
    try {
      if (!cameraRef.current) return;
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, skipProcessing: false });
      const { lat, lng } = await getGeo();
      const id = uuidv4();
      setItems(prev => [...prev, {
        id,
        uri: photo.uri,
        kind: 'foto',
        width: photo.width,
        height: photo.height,
        durationMs: null,
        meta: { lat, lng, capturedAt: new Date().toISOString() },
      }]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  };

  const startStopVideo = async () => {
    try {
      if (!cameraRef.current) return;
      if (!isRecording) {
        setIsRecording(true);
        // recordAsync resolve com { uri } quando stopRecording é chamado
        const video = await cameraRef.current.recordAsync({ maxDuration: 30 });
        setIsRecording(false);
        const { lat, lng } = await getGeo();
        const id = uuidv4();
        setItems(prev => [...prev, {
          id,
          uri: video?.uri,
          kind: 'video',
          width: null,
          height: null,
          durationMs: null,
          meta: { lat, lng, capturedAt: new Date().toISOString() },
        }]);
      } else {
        cameraRef.current.stopRecording();
      }
    } catch (e) {
      setIsRecording(false);
      Alert.alert('Erro', 'Não foi possível gravar o vídeo.');
    }
  };

  const ruleSatisfied = () => {
    const videos = items.filter(i => i.kind === 'video').length;
    const photos = items.filter(i => i.kind === 'foto').length;
    return videos >= 1 || photos >= 3;
  };

  const uploadAll = async () => {
    try {
      if (!ruleSatisfied()) {
        Alert.alert('Regra', 'Capture 3 fotos ou 1 vídeo antes de continuar.');
        return;
      }
      let seq = 1;
      for (const it of items) {
        let fileToSend = it.uri;
        if (it.kind === 'foto') {
          const stamped = await captureStamped(it);
          if (stamped) {
            fileToSend = stamped;
          }
        }
        await uploadRentMedia({
          rentId,
          productId,
          actor,
          phase,
          kind: it.kind,
          fileUri: fileToSend,
          mimeType: it.kind === 'video' ? 'video/mp4' : 'image/jpeg',
          seq: seq++,
          lat: it.meta.lat,
          lng: it.meta.lng,
          capturedAt: it.meta.capturedAt,
          width: it.width,
          height: it.height,
          durationMs: it.durationMs || null,
          rawMetadata: { user_id: currentUserId || null },
        });
      }
      await completePhaseAndUpdateStatus({ rentId, phase, actor });
      const started = phase === 'inicio';
      Alert.alert('Sucesso', started ? 'Registro de início enviado!' : 'Registro de devolução enviado!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', e.message || 'Falha ao enviar as mídias.');
    }
  };

  if (!hasPermissions) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Permissões de câmera/microfone/localização são necessárias.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{phase === 'inicio' ? 'Registro de Início' : 'Registro de Devolução'}</Text>
        {productName ? <Text style={styles.subtitle}>{productName}</Text> : null}
      </View>

      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <View style={styles.overlayInfo}>
        <View style={styles.topLeft}>
          <Text style={styles.overlayTextSmall}>{rentId}</Text>
        </View>
        <View style={styles.bottomLeft}>
          <Text style={styles.overlayText}>{actor} • {phase}</Text>
          <Text style={styles.overlayText}>Capture 3 fotos ou 1 vídeo</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={takePhoto}>
          <Text style={styles.btnText}>Foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, isRecording ? styles.btnRec : styles.btnVideo]} onPress={startStopVideo}>
          <Text style={styles.btnText}>{isRecording ? 'Parar' : 'Vídeo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={uploadAll}>
          <Text style={styles.btnText}>Enviar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewStrip}>
        {items.map((it, idx) => (
          <View key={idx} style={styles.previewItem}>
            {it.kind === 'foto' ? (
              <Image source={{ uri: it.uri }} style={styles.previewImage} />
            ) : (
              <View style={[styles.previewImage, styles.videoPlaceholder]}>
                <Text style={styles.videoText}>Vídeo</Text>
              </View>
            )}
            <View style={styles.previewTopLeft}>
              <Text style={styles.previewTextSmall}>{rentId}</Text>
            </View>
            <View style={styles.previewBottomLeft}>
              <Text style={styles.previewText}>{actor} • {phase}</Text>
              <Text style={styles.previewText}>{new Date(it.meta.capturedAt).toLocaleString()}</Text>
              {it.meta.lat && it.meta.lng ? (
                <Text style={styles.previewText}>{it.meta.lat.toFixed(5)}, {it.meta.lng.toFixed(5)}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Renderização offscreen para gerar imagem carimbada via ViewShot */}
      <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
        {items.filter(i => i.kind === 'foto').map((it) => {
          const w = 1080;
          const ratio = it.width && it.height ? (it.height / it.width) : (9 / 16);
          const h = Math.round(w * ratio);
          return (
            <ViewShot
              key={`shot-${it.id}`}
              ref={(r) => registerShotRef(it.id, r)}
              style={{ width: w, height: h, backgroundColor: '#000' }}
              options={{ format: 'jpg', quality: 0.9 }}
            >
              <Image source={{ uri: it.uri }} style={{ width: w, height: h }} />
              <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800' }}>{rentId}</Text>
              </View>
              <View style={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6 }}>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>{actor} • {phase}</Text>
                {currentUserId ? <Text style={{ color: '#fff', fontSize: 26 }}>uid: {currentUserId}</Text> : null}
                <Text style={{ color: '#fff', fontSize: 24 }}>{new Date(it.meta.capturedAt).toLocaleString()}</Text>
                {it.meta.lat && it.meta.lng ? (
                  <Text style={{ color: '#fff', fontSize: 24 }}>{it.meta.lat.toFixed(5)}, {it.meta.lng.toFixed(5)}</Text>
                ) : null}
              </View>
            </ViewShot>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#111827' },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  camera: { flex: 1 },
  overlayInfo: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none' },
  topLeft: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  bottomLeft: { position: 'absolute', bottom: 100, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 },
  overlayTextSmall: { color: '#fff', fontSize: 10, fontWeight: '600' },
  overlayText: { color: '#fff', fontSize: 12 },
  actions: { position: 'absolute', bottom: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around' },
  btn: { backgroundColor: '#111827', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  btnVideo: { backgroundColor: '#1F2937' },
  btnRec: { backgroundColor: '#DC2626' },
  btnPrimary: { backgroundColor: '#2563EB' },
  btnText: { color: '#fff', fontWeight: '700' },
  previewStrip: { position: 'absolute', bottom: 72, left: 0, right: 0, paddingHorizontal: 8 },
  previewItem: { marginRight: 8 },
  previewImage: { width: 140, height: 100, borderRadius: 8 },
  videoPlaceholder: { backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  videoText: { color: '#fff' },
  previewTopLeft: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 3 },
  previewBottomLeft: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 4, paddingVertical: 4, borderRadius: 3 },
  previewTextSmall: { color: '#fff', fontSize: 9 },
  previewText: { color: '#fff', fontSize: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  info: { color: '#111827' },
});

export default RentMediaCaptureScreen;


