import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export const createDocument = async <T>(collectionName: string, id: string, data: T) => {
  const docRef = doc(db, collectionName, id);
  await setDoc(docRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef;
};

export const getDocument = async <T>(collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
  }
  return null;
};

export const updateDocument = async <T>(collectionName: string, id: string, data: Partial<T>) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
};

export const deleteDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};

export const getCollection = async <T>(
  collectionName: string,
  constraints: any[] = []
) => {
  const colRef = collection(db, collectionName);
  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string }));
};

export const subscribeToCollection = <T>(
  collectionName: string,
  callback: (data: (T & { id: string })[]) => void,
  constraints: any[] = []
) => {
  const colRef = collection(db, collectionName);
  const q = query(colRef, ...constraints);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T & { id: string }));
    callback(data);
  });
};

export const subscribeToDocument = <T>(
  collectionName: string,
  id: string,
  callback: (data: (T & { id: string }) | null) => void
) => {
  const docRef = doc(db, collectionName, id);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as T & { id: string });
    } else {
      callback(null);
    }
  });
};

export const batchWrite = async (operations: Array<{ type: 'set' | 'update' | 'delete'; collection: string; id: string; data?: any }>) => {
  const batch = writeBatch(db);
  operations.forEach(op => {
    const docRef = doc(db, op.collection, op.id);
    if (op.type === 'set') {
      batch.set(docRef, { ...op.data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } else if (op.type === 'update') {
      batch.update(docRef, { ...op.data, updatedAt: serverTimestamp() });
    } else if (op.type === 'delete') {
      batch.delete(docRef);
    }
  });
  await batch.commit();
};

export { Timestamp };