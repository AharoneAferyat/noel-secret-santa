import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⚠️ À REMPLACER par la configuration de ton projet Firebase
// (Console Firebase > Paramètres du projet > Vos applications > Config)
const firebaseConfig = {
  apiKey: 'A_REMPLACER',
  authDomain: 'A_REMPLACER.firebaseapp.com',
  projectId: 'A_REMPLACER',
  storageBucket: 'A_REMPLACER.appspot.com',
  messagingSenderId: 'A_REMPLACER',
  appId: 'A_REMPLACER',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
