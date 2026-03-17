import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';

export const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object' || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeForFirestore(item));
  
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = sanitizeForFirestore(value);
    }
    return acc;
  }, {} as any);
};

const isBase64 = (str: string | undefined | null) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;
  if (str.startsWith('data:image')) return true;
  return false;
};

const isBlobUrl = (str: string | undefined | null) => {
  if (!str) return false;
  if (typeof str !== 'string') return false;
  return str.startsWith('blob:');
};

async function uploadImage(path: string, imageData: string): Promise<string> {
  const storageRef = ref(storage, path);
  
  if (isBase64(imageData)) {
    const result = await uploadString(storageRef, imageData, 'data_url');
    return await getDownloadURL(result.ref);
  } else if (isBlobUrl(imageData)) {
    const response = await fetch(imageData);
    const blob = await response.blob();
    const result = await uploadBytes(storageRef, blob);
    return await getDownloadURL(result.ref);
  }
  
  return imageData; // Asume que ya es una URL web válida
}

/**
 * FASE 1: Sube las imágenes y crea el borrador del pedido en Firebase
 */
/**
 * FASE 1: Sube las imágenes y crea el borrador del pedido en Firebase
 * (Ahora con soporte para barra de progreso)
 */
export async function createDraftOrder(
  userId: string,
  designData: any,
  product: any,
  onProgress?: (progress: number) => void // <-- NUEVO: Función callback para el progreso
) {
  const orderRef = doc(collection(db, 'orders'));
  const orderId = orderRef.id;
  const folderPath = `orders/${userId}/${orderId}`;
  
  const productString = String(product.type || product.id || product.name || '').toLowerCase();

  // ==========================================
  // NUEVO: SISTEMA DE CONTEO Y PROGRESO
  // ==========================================
  let totalUploads = 0;
  let completedUploads = 0;

  const updateProgress = () => {
    completedUploads++;
    if (onProgress && totalUploads > 0) {
      // Evitamos que llegue a 100% antes de guardar en Firestore
      onProgress(Math.min(95, Math.round((completedUploads / totalUploads) * 100)));
    }
  };

  // 1. Pre-escanear para saber cuántas imágenes hay que subir
  let coverData = { ...designData.coverData };
  if (coverData.image && (isBase64(coverData.image) || isBlobUrl(coverData.image))) totalUploads++;

  if (productString.includes('album') || productString.includes('photobook') || designData.pageLayouts) {
    (designData.photos || []).forEach((pagePhotos: any[]) => {
      (pagePhotos || []).forEach((photoUrl: string) => {
        if (isBase64(photoUrl) || isBlobUrl(photoUrl)) totalUploads++;
      });
    });
  } else if (productString.includes('mug') || productString.includes('taza') || designData.mugItems) {
    (designData.mugItems || []).forEach((item: any) => {
      (item.photos || []).forEach((photoUrl: string) => {
        if (isBase64(photoUrl) || isBlobUrl(photoUrl)) totalUploads++;
      });
    });
  } else if (productString.includes('calendar') || productString.includes('calendario') || productString.includes('pack')) {
    (designData.photos || []).forEach((photo: any) => {
      let photoUrl = Array.isArray(photo) ? photo[0] : photo;
      if (isBase64(photoUrl) || isBlobUrl(photoUrl)) totalUploads++;
    });
  }

  // Si no hay fotos nuevas por subir, adelantamos la barra para que el usuario vea movimiento
  if (totalUploads === 0 && onProgress) onProgress(50);
  // ==========================================

  // 2. Subir imagen de portada si existe
  if (coverData.image && (isBase64(coverData.image) || isBlobUrl(coverData.image))) {
    coverData.image = await uploadImage(`${folderPath}/cover_image`, coverData.image);
    updateProgress(); // <-- Reportamos progreso
  }

  let finalPages: any[] = [];
  let finalItems: any[] = [];
  let finalPhotos: string[] = [];

  // 3. Procesar las imágenes
  if (productString.includes('album') || productString.includes('photobook') || designData.pageLayouts) {
    const { photos = [], pageLayouts = {}, pageLayoutVariants = {}, textBoxSlots = {}, photoCrops = {} } = designData;

    for (let i = 0; i < photos.length; i++) {
      const pagePhotos = photos[i] || [];
      const uploadedPhotos: string[] = [];
      const pageCrops: any = {};

      for (let j = 0; j < pagePhotos.length; j++) {
        let photoUrl = pagePhotos[j];
        if (isBase64(photoUrl) || isBlobUrl(photoUrl)) {
          photoUrl = await uploadImage(`${folderPath}/pages/page${i}_photo${j}`, photoUrl);
          updateProgress(); // <-- Reportamos progreso
        }
        uploadedPhotos.push(photoUrl);
        pageCrops[j] = photoCrops[`${i}-${j}`] || { x: 50, y: 50, zoom: 1 };
      }

      finalPages.push({
        pageIndex: i,
        images: uploadedPhotos,
        layout: pageLayouts[i] || 1,
        variant: pageLayoutVariants[i] || null,
        texts: textBoxSlots[i] || {},
        crops: pageCrops
      });
    }
  } 
  else if (productString.includes('mug') || productString.includes('taza') || designData.mugItems) {
    const { mugItems = [] } = designData;
    for (let i = 0; i < mugItems.length; i++) {
      const item = mugItems[i];
      const uploadedItemPhotos: string[] = [];
      
      for (let j = 0; j < (item.photos?.length || 0); j++) {
        let photoUrl = item.photos[j];
        if (isBase64(photoUrl) || isBlobUrl(photoUrl)) {
          photoUrl = await uploadImage(`${folderPath}/mugs/mug${i}_photo${j}`, photoUrl);
          updateProgress(); // <-- Reportamos progreso
        }
        uploadedItemPhotos.push(photoUrl);
      }
      
      finalItems.push({
        ...item,
        photos: uploadedItemPhotos,
      });
    }
  } 
  else if (productString.includes('calendar') || productString.includes('calendario') || productString.includes('pack')) {
    const { photos = [] } = designData;
    for (let i = 0; i < photos.length; i++) {
      let photoUrl = Array.isArray(photos[i]) ? photos[i][0] : photos[i];
      if (isBase64(photoUrl) || isBlobUrl(photoUrl)) {
        photoUrl = await uploadImage(`${folderPath}/loose_photos/photo${i}`, photoUrl);
        updateProgress(); // <-- Reportamos progreso
      }
      finalPhotos.push(photoUrl);
    }
  }

  let cleanCustomization = { ...designData.customization };
  if (cleanCustomization.coverContent && cleanCustomization.coverContent.coverImage) {
    cleanCustomization.coverContent.coverImage = "uploaded"; 
  }

  // 4. Estructurar el payload final para Firestore
  const orderPayload = {
    id: orderId,
    userId,
    status: 'draft',
    product,
    total: 0, 
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customization: cleanCustomization,
    coverData,
    photoCrops: designData.photoCrops || {},
    textBoxSlots: designData.textBoxSlots || {},
    pageLayouts: designData.pageLayouts || {},
    pageLayoutVariants: designData.pageLayoutVariants || {},
    pages: finalPages,
    items: finalItems,
    photos: finalPhotos,
  };

  const finalPayload = sanitizeForFirestore(JSON.parse(JSON.stringify(orderPayload)));
  
  // 5. Guardar el documento
  await setDoc(orderRef, finalPayload);
  
  // ¡Completado al 100%!
  if (onProgress) onProgress(100);

  return orderId;
}

export async function getOrder(orderId: string) {
  const docRef = doc(db, 'orders', orderId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

/**
 * FASE 2: Actualiza el pedido con las direcciones y el Total real calculado
 */
export async function updateOrderAddresses(
  orderId: string,
  addresses: { shippingAddress: any, billingAddress: any },
  total: number,
  status: string = 'pending_payment'
) {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, {
    ...addresses,
    total,
    status,
    updatedAt: new Date().toISOString()
  });
}

export async function getUserOrders(userId: string) {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const orders: any[] = [];
  querySnapshot.forEach((doc) => {
    orders.push({ id: doc.id, ...doc.data() });
  });

  return orders;
}

export async function saveCompleteOrder(
  userId: string,
  designData: any,
  orderDetails: any,
  product: any,
  total: number,
  status: string = 'mock_paid'
) {
    const { shippingAddress, billingAddress } = orderDetails;
    const orderId = await createDraftOrder(userId, designData, product);
    await updateOrderAddresses(orderId, { shippingAddress, billingAddress }, total, status);
    return orderId;
}