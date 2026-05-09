import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface SavedAddress {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  city: string;
  address: string;
  addressExtra: string;
  zipCode: string;
  savedAt: string;
}

export interface SavedBilling {
  name: string;
  address: string;
  city: string;
  zipCode: string;
  savedAt: string;
}

const MAX_ADDRESSES = 3;

export async function getSavedAddresses(userId: string): Promise<SavedAddress[]> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return [];
  return docSnap.data()?.savedAddresses || [];
}

export async function saveAddress(userId: string, address: Omit<SavedAddress, 'id' | 'savedAt'>): Promise<void> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  const existing: SavedAddress[] = docSnap.exists() ? (docSnap.data()?.savedAddresses || []) : [];

  const newAddress: SavedAddress = {
    ...address,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  // Keep newest first, max MAX_ADDRESSES (oldest is dropped)
  const updated = [newAddress, ...existing].slice(0, MAX_ADDRESSES);
  await setDoc(docRef, { savedAddresses: updated }, { merge: true });
}

export async function getSavedBilling(userId: string): Promise<SavedBilling | null> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docSnap.data()?.savedBilling || null;
}

export async function saveBilling(userId: string, billing: Omit<SavedBilling, 'savedAt'>): Promise<void> {
  const docRef = doc(db, 'users', userId);
  const savedBilling: SavedBilling = {
    ...billing,
    savedAt: new Date().toISOString(),
  };
  await setDoc(docRef, { savedBilling }, { merge: true });
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await setDoc(docRef, { name }, { merge: true });
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const existing: SavedAddress[] = docSnap.data()?.savedAddresses || [];
  const updated = existing.filter(a => a.id !== addressId);
  await setDoc(docRef, { savedAddresses: updated }, { merge: true });
}

export async function updateAddress(
  userId: string,
  addressId: string,
  updates: Partial<Omit<SavedAddress, 'id' | 'savedAt'>>
): Promise<void> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;
  const existing: SavedAddress[] = docSnap.data()?.savedAddresses || [];
  const updated = existing.map(a => a.id === addressId ? { ...a, ...updates } : a);
  await setDoc(docRef, { savedAddresses: updated }, { merge: true });
}

export async function deleteSavedBilling(userId: string): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await setDoc(docRef, { savedBilling: null }, { merge: true });
}
