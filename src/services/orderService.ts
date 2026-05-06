import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
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
  
  return imageData; 
}

export async function createDraftOrder(
  userId: string,
  designData: any,
  product: any,
  onProgress?: (progress: number) => void,
  existingOrderId?: string,
  productType?: string,
  status: 'draft' | 'saved_draft' = 'draft',
  userInfo?: { name?: string; email?: string }
) {
  const orderRef = existingOrderId
    ? doc(db, 'orders', existingOrderId)
    : doc(collection(db, 'orders'));
  const orderId = existingOrderId || orderRef.id;
  const folderPath = `orders/${userId}/${orderId}`;
  
  const productString = String(product.type || product.id || product.name || '').toLowerCase();
  const isMugType = productString.includes('mug') || productString.includes('taza');

  // ==========================================
  // 1. SISTEMA DE CONTEO Y PROGRESO A PRUEBA DE BALAS
  // ==========================================
  let totalUploads = 0;
  let completedUploads = 0;

  const updateProgress = () => {
    completedUploads++;
    if (onProgress && totalUploads > 0) {
      onProgress(Math.min(95, Math.round((completedUploads / totalUploads) * 100)));
    }
  };

  let coverData = { ...designData.coverData };
  if (coverData.image && (isBase64(coverData.image) || isBlobUrl(coverData.image))) totalUploads++;

  // Contamos de forma segura las fotos sin importar si son 1D (Calendarios) o 2D (Álbumes)
  const photosList = designData.photos || [];
  photosList.forEach((item: any) => {
    if (Array.isArray(item)) {
      item.forEach((url: string) => {
        if (isBase64(url) || isBlobUrl(url)) totalUploads++;
      });
    } else if (typeof item === 'string') {
      if (isBase64(item) || isBlobUrl(item)) totalUploads++;
    }
  });

  // Tazas
  const itemsToProcess = designData.items || designData.mugItems || [];
  itemsToProcess.forEach((item: any) => {
    (item.photos || []).forEach((photoUrl: string) => {
      if (isBase64(photoUrl) || isBlobUrl(photoUrl)) totalUploads++;
    });
  });

  if (totalUploads === 0 && onProgress) onProgress(50);

  // ==========================================
  // 2. SUBIDA DE IMÁGENES AL STORAGE
  // ==========================================
  if (coverData.image && (isBase64(coverData.image) || isBlobUrl(coverData.image))) {
    coverData.image = await uploadImage(`${folderPath}/cover_image`, coverData.image);
    updateProgress(); 
  }

  let finalPages: any[] = [];
  let finalItems: any[] = [];
  let finalPhotos: string[] = [];

  // ALBUM
  if (productString.includes('album') || productString.includes('photobook')) {
    const { photos = [], pageLayouts = {}, pageLayoutVariants = {}, textBoxSlots = {}, photoCrops = {} } = designData;

    for (let i = 0; i < photos.length; i++) {
      // Aseguramos que sea un array para evitar el error de .forEach is not a function
      const pagePhotos = Array.isArray(photos[i]) ? photos[i] : [photos[i]];
      const uploadedPhotos: string[] = [];
      const pageCrops: any = {};

      for (let j = 0; j < pagePhotos.length; j++) {
        let photoUrl = pagePhotos[j];
        if (isBase64(photoUrl) || isBlobUrl(photoUrl)) {
          photoUrl = await uploadImage(`${folderPath}/pages/page${i}_photo${j}`, photoUrl);
          updateProgress();
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
  // TAZAS
  else if (isMugType) {
    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      const uploadedItemPhotos: string[] = [];
      
      for (let j = 0; j < (item.photos?.length || 0); j++) {
        let photoUrl = item.photos[j];
        if (photoUrl && (isBase64(photoUrl) || isBlobUrl(photoUrl))) {
          photoUrl = await uploadImage(`${folderPath}/mugs/mug${i}_photo${j}`, photoUrl);
          updateProgress();
        }
        if (photoUrl) uploadedItemPhotos.push(photoUrl);
      }
      
      finalItems.push({
        ...item,
        photos: uploadedItemPhotos, 
      });
    }
  } 
  // CALENDARIOS Y PACKS
  else if (productString.includes('calendar') || productString.includes('calendario') || productString.includes('pack')) {
    const photos = designData.photos || [];
    for (let i = 0; i < photos.length; i++) {
      let photoUrl = Array.isArray(photos[i]) ? photos[i][0] : photos[i];
      if (photoUrl && (isBase64(photoUrl) || isBlobUrl(photoUrl))) {
        photoUrl = await uploadImage(`${folderPath}/loose_photos/photo${i}`, photoUrl);
        updateProgress();
      }
      if (photoUrl) finalPhotos.push(photoUrl);
    }
  }

  // ==========================================
  // 3. ESTRUCTURA DEL PAYLOAD PARA FIRESTORE
  // ==========================================
  let cleanCustomization = { ...designData.customization };
  if (cleanCustomization.coverContent && cleanCustomization.coverContent.coverImage) {
    cleanCustomization = {
      ...cleanCustomization,
      coverContent: {
        ...cleanCustomization.coverContent,
        coverImage: 'uploaded',
      },
    };
  }

  // ESCUDO FIREBASE: Aplanamos a la fuerza para que Firebase no se queje por arreglos de 2D.
  let safePhotosToSave: any[] = [];
  if (finalPhotos.length > 0) {
     safePhotosToSave = finalPhotos;
  } else if (designData.photos) {
     // .flat(Infinity) destruye los sub-arreglos y los vuelve uno solo 1D
     safePhotosToSave = (designData.photos || []).flat(Infinity).filter(Boolean); 
  }

  const orderPayload = {
    id: orderId,
    userId,
    customerName: userInfo?.name || null,
    customerEmail: userInfo?.email || null,
    status,
    product,
    productType: productType || productString,
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
    items: finalItems.length > 0 ? finalItems : (designData.items || []), 
    mugItems: finalItems.length > 0 ? finalItems : (designData.mugItems || []), 
    photos: safePhotosToSave, 
  };

  const finalPayload = sanitizeForFirestore(JSON.parse(JSON.stringify(orderPayload)));
  
  await setDoc(orderRef, finalPayload);
  
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

export async function getUserSavedDrafts(userId: string) {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('userId', '==', userId),
    where('status', '==', 'saved_draft'),
    orderBy('updatedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  const drafts: any[] = [];
  querySnapshot.forEach((doc) => {
    drafts.push({ id: doc.id, ...doc.data() });
  });
  return drafts;
}

export async function deleteSavedDraft(draftId: string): Promise<void> {
  const docRef = doc(db, 'orders', draftId);
  await deleteDoc(docRef);
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
}

export async function updateOrderDesign(
  orderId: string,
  userId: string,
  designData: any,
  onProgress?: (progress: number) => void
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  const folderPath = `orders/${userId}/${orderId}`;

  const productSnap = await getDoc(orderRef);
  if (!productSnap.exists()) throw new Error('Order not found');
  const existingData = productSnap.data();
  const productString = String(existingData.productType || existingData.product?.type || '').toLowerCase();
  const isMugType = productString.includes('mug') || productString.includes('taza');

  let totalUploads = 0;
  let completedUploads = 0;
  const updateProgress = () => {
    completedUploads++;
    if (onProgress && totalUploads > 0) onProgress(Math.min(95, Math.round((completedUploads / totalUploads) * 100)));
  };

  let coverData = { ...designData.coverData };
  if (coverData.image && (isBase64(coverData.image) || isBlobUrl(coverData.image))) totalUploads++;
  const photosList = designData.photos || [];
  photosList.forEach((item: any) => {
    if (Array.isArray(item)) item.forEach((url: string) => { if (isBase64(url) || isBlobUrl(url)) totalUploads++; });
    else if (typeof item === 'string' && (isBase64(item) || isBlobUrl(item))) totalUploads++;
  });
  const itemsToProcess = designData.items || designData.mugItems || [];
  itemsToProcess.forEach((item: any) => {
    (item.photos || []).forEach((photoUrl: string) => { if (isBase64(photoUrl) || isBlobUrl(photoUrl)) totalUploads++; });
  });
  if (totalUploads === 0 && onProgress) onProgress(50);

  if (coverData.image && (isBase64(coverData.image) || isBlobUrl(coverData.image))) {
    coverData.image = await uploadImage(`${folderPath}/cover_image`, coverData.image);
    updateProgress();
  }

  let finalPages: any[] = [];
  let finalItems: any[] = [];
  let finalPhotos: string[] = [];

  if (productString.includes('album') || productString.includes('photobook')) {
    const { photos = [], pageLayouts = {}, pageLayoutVariants = {}, textBoxSlots = {}, photoCrops = {} } = designData;
    for (let i = 0; i < photos.length; i++) {
      const pagePhotos = Array.isArray(photos[i]) ? photos[i] : [photos[i]];
      const uploadedPhotos: string[] = [];
      const pageCrops: any = {};
      for (let j = 0; j < pagePhotos.length; j++) {
        let photoUrl = pagePhotos[j];
        if (isBase64(photoUrl) || isBlobUrl(photoUrl)) {
          photoUrl = await uploadImage(`${folderPath}/pages/page${i}_photo${j}`, photoUrl);
          updateProgress();
        }
        uploadedPhotos.push(photoUrl);
        pageCrops[j] = photoCrops[`${i}-${j}`] || { x: 50, y: 50, zoom: 1 };
      }
      finalPages.push({ pageIndex: i, images: uploadedPhotos, layout: pageLayouts[i] || 1, variant: pageLayoutVariants[i] || null, texts: textBoxSlots[i] || {}, crops: pageCrops });
    }
  } else if (isMugType) {
    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      const uploadedItemPhotos: string[] = [];
      for (let j = 0; j < (item.photos?.length || 0); j++) {
        let photoUrl = item.photos[j];
        if (photoUrl && (isBase64(photoUrl) || isBlobUrl(photoUrl))) {
          photoUrl = await uploadImage(`${folderPath}/mugs/mug${i}_photo${j}`, photoUrl);
          updateProgress();
        }
        if (photoUrl) uploadedItemPhotos.push(photoUrl);
      }
      finalItems.push({ ...item, photos: uploadedItemPhotos });
    }
  } else if (productString.includes('calendar') || productString.includes('calendario') || productString.includes('pack')) {
    const photos = designData.photos || [];
    for (let i = 0; i < photos.length; i++) {
      let photoUrl = Array.isArray(photos[i]) ? photos[i][0] : photos[i];
      if (photoUrl && (isBase64(photoUrl) || isBlobUrl(photoUrl))) {
        photoUrl = await uploadImage(`${folderPath}/loose_photos/photo${i}`, photoUrl);
        updateProgress();
      }
      if (photoUrl) finalPhotos.push(photoUrl);
    }
  }

  let safePhotosToSave: any[] = [];
  if (finalPhotos.length > 0) safePhotosToSave = finalPhotos;
  else if (designData.photos) safePhotosToSave = (designData.photos || []).flat(Infinity).filter(Boolean);

  let cleanCustomization = { ...designData.customization };
  if (cleanCustomization.coverContent && cleanCustomization.coverContent.coverImage) {
    cleanCustomization = {
      ...cleanCustomization,
      coverContent: {
        ...cleanCustomization.coverContent,
        coverImage: 'uploaded',
      },
    };
  }

  const updatePayload = sanitizeForFirestore(JSON.parse(JSON.stringify({
    coverData,
    customization: cleanCustomization,
    photoCrops: designData.photoCrops || {},
    textBoxSlots: designData.textBoxSlots || {},
    pageLayouts: designData.pageLayouts || {},
    pageLayoutVariants: designData.pageLayoutVariants || {},
    pages: finalPages,
    items: finalItems.length > 0 ? finalItems : (designData.items || []),
    mugItems: finalItems.length > 0 ? finalItems : (designData.mugItems || []),
    photos: safePhotosToSave,
    updatedAt: new Date().toISOString(),
  })));

  await updateDoc(orderRef, updatePayload);
  if (onProgress) onProgress(100);
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