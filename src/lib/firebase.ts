import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query,
  orderBy
} from "firebase/firestore";

// Read configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJWQ2IBmBbcHglhNRIbpsVQiR8yk2yZWM",
  authDomain: "persuasive-pursuit-99nlt.firebaseapp.com",
  projectId: "persuasive-pursuit-99nlt",
  storageBucket: "persuasive-pursuit-99nlt.firebasestorage.app",
  messagingSenderId: "72373131087",
  appId: "1:72373131087:web:34f54e9cd9adc9a167173a"
};

let app;
let db: any = null;
let isFirebaseAvailable = false;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, "ai-studio-aiproductivityco-b8b3be73-89ff-4efa-8f9f-b302fed12d83");
  isFirebaseAvailable = true;
  console.log("Firebase initialized successfully with custom database ID");
} catch (error) {
  console.error("Firebase failed to initialize, using offline/localStorage fallback:", error);
}

export { db, isFirebaseAvailable };

// Helper to handle offline-first collections
export async function getCollectionData(collectionName: string): Promise<any[]> {
  if (isFirebaseAvailable && db) {
    try {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(query(colRef));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn(`Firestore read failed for ${collectionName}, falling back to localStorage:`, e);
    }
  }
  
  // Local storage fallback
  const localData = localStorage.getItem(`prod_comp_${collectionName}`);
  return localData ? JSON.parse(localData) : [];
}

export async function saveDocument(collectionName: string, id: string, data: any): Promise<void> {
  if (isFirebaseAvailable && db) {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, data, { merge: true });
      return;
    } catch (e) {
      console.warn(`Firestore write failed for ${collectionName}/${id}, saving to localStorage:`, e);
    }
  }
  
  // Local storage fallback
  const localData = localStorage.getItem(`prod_comp_${collectionName}`);
  const items = localData ? JSON.parse(localData) : [];
  const idx = items.findIndex((item: any) => item.id === id);
  if (idx > -1) {
    items[idx] = { ...items[idx], ...data };
  } else {
    items.push({ id, ...data });
  }
  localStorage.setItem(`prod_comp_${collectionName}`, JSON.stringify(items));
}

export async function addDocument(collectionName: string, data: any): Promise<string> {
  const newId = Math.random().toString(36).substring(2, 11);
  const dataWithId = { ...data, id: newId };
  
  if (isFirebaseAvailable && db) {
    try {
      const docRef = doc(db, collectionName, newId);
      await setDoc(docRef, dataWithId);
      return newId;
    } catch (e) {
      console.warn(`Firestore add failed for ${collectionName}, adding to localStorage:`, e);
    }
  }
  
  // Local storage fallback
  const localData = localStorage.getItem(`prod_comp_${collectionName}`);
  const items = localData ? JSON.parse(localData) : [];
  items.push(dataWithId);
  localStorage.setItem(`prod_comp_${collectionName}`, JSON.stringify(items));
  return newId;
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  if (isFirebaseAvailable && db) {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      return;
    } catch (e) {
      console.warn(`Firestore delete failed for ${collectionName}/${id}, removing from localStorage:`, e);
    }
  }
  
  // Local storage fallback
  const localData = localStorage.getItem(`prod_comp_${collectionName}`);
  if (localData) {
    const items = JSON.parse(localData);
    const filtered = items.filter((item: any) => item.id !== id);
    localStorage.setItem(`prod_comp_${collectionName}`, JSON.stringify(filtered));
  }
}
