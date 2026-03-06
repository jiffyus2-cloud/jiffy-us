import { db, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';

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
  orderDetails: OrderDetails
) {
  const timestamp = Date.now();
  const folderPath = `orders/${userId}/${timestamp}`;

  // 1. Subir imagen de portada
  let coverImageUrl = designData.coverData.image;
  if (isBase64(coverImageUrl) || isBlobUrl(coverImageUrl)) {
    coverImageUrl = await uploadImage(`${folderPath}/cover`, coverImageUrl);
  }

  // 2. Subir fotos de las páginas
  const uploadedPhotos: string[][] = [];
  for (let pageIndex = 0; pageIndex < designData.photos.length; pageIndex++) {
    const pagePhotos = designData.photos[pageIndex];
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
    uploadedPhotos.push(uploadedPagePhotos);
  }

  // 3. Construir el orderPayload final
  const orderPayload = {
    userId,
    designData: {
      ...designData,
      coverData: {
        ...designData.coverData,
        image: coverImageUrl
      },
      photos: uploadedPhotos
    },
    orderDetails,
    status: 'mock_paid',
    createdAt: serverTimestamp()
  };

  // 4. Guardar en Firestore
  const docRef = await addDoc(collection(db, 'orders'), orderPayload);
  return docRef.id;
}
