import { SUPABASE_CONFIG } from '../config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertIntoTable, updateTableById, getTable } from './supabaseClient';

/**
 * Faz upload da mídia do aluguel para o bucket rent-media e registra seus metadados na tabela rent_media.
 */
export async function uploadRentMedia({
  rentId,
  productId,
  actor,
  phase,
  kind,
  fileUri,
  originalFileUri,
  mimeType,
  seq = 1,
  lat,
  lng,
  capturedAt,
  width,
  height,
  durationMs,
  rawMetadata,
}) {
  const token = await AsyncStorage.getItem('token');
  const uploaderUserId = await AsyncStorage.getItem('userId');

  const timestamp = capturedAt ? new Date(capturedAt).getTime() : Date.now();
  const extension = mimeType?.includes('video') ? 'mp4' : 'jpg';
  const objectPath = `${rentId}/${phase}/${actor}/${timestamp}_${seq}.${extension}`;
  const uploadUrl = `${SUPABASE_CONFIG.URL}/storage/v1/object/rent-media/${objectPath}`;

  // Se solicitado, subir também a versão original em subpasta /original/
  let originalStoragePath = null;
  if (originalFileUri) {
    originalStoragePath = `${rentId}/${phase}/${actor}/original/${timestamp}_${seq}.${extension}`;
    const originalUploadUrl = `${SUPABASE_CONFIG.URL}/storage/v1/object/rent-media/${originalStoragePath}`;
    const originalForm = new FormData();
    originalForm.append('file', {
      uri: originalFileUri,
      type: mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      name: `${timestamp}.${extension}`,
    });

    const originalRes = await fetch(originalUploadUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_CONFIG.KEY,
        Authorization: `${SUPABASE_CONFIG.KEY}`,
        'Content-Type': 'multipart/form-data',
      },
      body: originalForm,
    });

    if (!originalRes.ok) {
      const errorText = await originalRes.text();
      throw new Error(`Falha ao enviar mídia original: ${errorText}`);
    }
  }

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    name: `${timestamp}.${extension}`,
  });

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_CONFIG.KEY,
      Authorization: `Bearer ${SUPABASE_CONFIG.KEY}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Falha ao enviar mídia: ${errorText}`);
  }

  // Registrar metadados no banco (fonte de verdade)
  await insertIntoTable('rent_media', {
    rent_id: rentId,
    product_id: productId,
    uploader_user_id: uploaderUserId,
    actor,
    phase,
    kind,
    storage_bucket: 'rent-media',
    storage_path: objectPath,
    mime_type: mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    byte_size: undefined,
    width,
    height,
    duration_ms: durationMs ?? null,
    lat,
    lng,
    captured_at: new Date(capturedAt || Date.now()).toISOString(),
    raw_metadata: {
      ...(rawMetadata || {}),
      original_storage_path: originalStoragePath,
    },
  });

  return { objectPath };
}

/**
 * Atualiza o status do aluguel após completar a fase.
 */
export async function completePhaseAndUpdateStatus({ rentId, phase, actor }) {
  // Regra: 3 fotos OU 1 vídeo por ator e por fase
  const hasRequiredMedia = async (targetActor) => {
    const rows = await getTable(
      'rent_media',
      `rent_id=eq.${rentId}&phase=eq.${phase}&actor=eq.${targetActor}&select=id,kind`
    );
    if (!rows || rows.length === 0) return false;
    const photos = rows.filter(r => r.kind === 'foto').length;
    const hasVideo = rows.some(r => r.kind === 'video');
    return hasVideo || photos >= 3;
  };

  const locadorDone = await hasRequiredMedia('locador');
  const locatarioDone = await hasRequiredMedia('locatario');

  // Próximo status baseado na fase e em quem já concluiu
  if (phase === 'inicio') {
    if (locadorDone && locatarioDone) {
      // Ambos registraram o início → inicia de fato
      const userId = await AsyncStorage.getItem('userId');
      await updateTableById('rents', rentId, {
        status: 'em andamento',
        started_at: new Date().toISOString(),
        started_by: userId,
      });
    } else {
      // Aguardando o outro lado com granularidade
      if (locadorDone && !locatarioDone) {
        await updateTableById('rents', rentId, { status: 'aguardando_checkin_locatario' });
      } else if (!locadorDone && locatarioDone) {
        await updateTableById('rents', rentId, { status: 'aguardando_checkin_locador' });
      } else {
        await updateTableById('rents', rentId, { status: 'confirmado' });
      }
    }
  } else {
    // fase devolução
    if (locadorDone && locatarioDone) {
      const userId = await AsyncStorage.getItem('userId');
      await updateTableById('rents', rentId, {
        status: 'concluído',
        ended_at: new Date().toISOString(),
        ended_by: userId,
      });
    } else {
      // Aguardando o outro lado com granularidade
      if (locatarioDone && !locadorDone) {
        await updateTableById('rents', rentId, { status: 'aguardando_checkout_locador' });
      } else if (locadorDone && !locatarioDone) {
        await updateTableById('rents', rentId, { status: 'aguardando_checkout_locatario' });
      } else {
        await updateTableById('rents', rentId, { status: 'em andamento' });
      }
    }
  }
}


