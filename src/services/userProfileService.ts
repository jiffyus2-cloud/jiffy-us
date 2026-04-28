import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface SavedAddress {
  id: string;
  name: string;
  email: string;
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
