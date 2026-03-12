import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
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

export interface DesignData {
  customization: any;
  coverData: {
    image: string;
    title: string;
    subtitle: string;
    year: string;
    layout: string;
    crop?: any;
  };
  photos: string[][];
  pageLayouts: any[];
  pageLayoutVariants?: any[];
  textBoxSlots: any;
  photoCrops: Record<string, any>;
}

export interface OrderDetails {
  shippingAddress: {
    name: string;
    email: string;
    address: string;
    city: string;
    zipCode: string;
  };
  billingAddress: {
    name: string;
    email: string;
    address: string;
    city: string;
    zipCode: string;
  };
}

const isBase64 = (str: string | undefined | null) => {
  if (!str) return false;
  if (str.startsWith('data:image')) return true;
  return false;
};

const isBlobUrl = (str: string | undefined | null) => {
  if (!str) return false;
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
  
  return imageData; // Assume it's already a URL if not base64 or blob
}

export async function saveCompleteOrder(
  userId: string,
  designData: DesignData,
  orderDetails: OrderDetails,
  product: any,
  total: number,
  status: string = 'mock_paid'
) {
  const { shippingAddress, billingAddress } = orderDetails;
  const timestamp = Date.now();
  const folderPath = `orders/${userId}/${timestamp}`;

  // 1. Subir imagen de portada
  let coverImageUrl = designData.coverData.image;
  if (isBase64(coverImageUrl) || isBlobUrl(coverImageUrl)) {
    coverImageUrl = await uploadImage(`${folderPath}/cover`, coverImageUrl);
  }

  // CALCULAR TOTAL DE PÁGINAS DE FORMA SEGURA
  const totalPages = Array.isArray(designData.photos) 
    ? designData.photos.length 
    : Object.keys(designData.photos || {}).length || 0;

  // 2. Subir fotos de las páginas (urlsSubidas)
  const urlsSubidas: string[][] = [];
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pagePhotos = (Array.isArray(designData.photos) ? designData.photos[pageIndex] : (designData.photos as any)?.[pageIndex]) || [];
    const uploadedPagePhotos: string[] = [];
    
    for (let photoIndex = 0; photoIndex < pagePhotos.length; photoIndex++) {
      const photoData = pagePhotos[photoIndex];
      if (photoData && (isBase64(photoData) || isBlobUrl(photoData))) {
        const url = await uploadImage(`${folderPath}/pages/page${pageIndex}_photo${photoIndex}`, photoData);
        uploadedPagePhotos.push(url);
      } else {
        uploadedPagePhotos.push(photoData);
      }
    }
    urlsSubidas.push(uploadedPagePhotos);
  }

  // 3. Crear formattedPages con validación estricta y sin usar .map() directo
  const formattedPages = Array.from({ length: totalPages }, (_, i) => {
    const layout = (Array.isArray(designData.pageLayouts) ? designData.pageLayouts[i] : (designData.pageLayouts as any)?.[i]) || 1;
    const variant = (Array.isArray(designData.pageLayoutVariants) ? designData.pageLayoutVariants[i] : (designData.pageLayoutVariants as any)?.[i]) || null;
    const texts = (Array.isArray(designData.textBoxSlots) ? designData.textBoxSlots[i] : (designData.textBoxSlots as any)?.[i]) || [];
    const images = urlsSubidas[i] || [];
    const crops = designData.photoCrops ? (designData.photoCrops['page' + i] || designData.photoCrops[i]) : null;

    return {
      pageIndex: i,
      layout,
      variant,
      texts,
      images,
      crops
    };
  });

  // 4. Limpiar el orderPayload final: Eliminar arrays bidimensionales originales
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { photos, textBoxSlots, pageLayouts, pageLayoutVariants, photoCrops, ...restDesignData } = designData;

  // 1. Construyes tu payload normal
  const orderPayload = {
    userId,
    status,
    product,
    total,
    createdAt: new Date().toISOString(), 
    customization: designData.customization,
    coverData: {
      ...designData.coverData,
      image: coverImageUrl
    },
    pages: formattedPages,
    shippingAddress,
    billingAddress
  };

  // 2. LO PASAS POR EL FILTRO PARA DESTRUIR LOS "UNDEFINED"
  const finalPayload = sanitizeForFirestore(orderPayload);

  // 3. Lo envías a Firebase
  const docRef = await addDoc(collection(db, 'orders'), finalPayload);
  
  return docRef.id;
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
