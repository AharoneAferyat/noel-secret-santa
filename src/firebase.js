import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA0c5m-gOL3vuTir6ac241hSY2GLw_DTcw',
  authDomain: 'noel-secret-santa-a4b55.firebaseapp.com',
  projectId: 'noel-secret-santa-a4b55',
  storageBucket: 'noel-secret-santa-a4b55.firebasestorage.app',
  messagingSenderId: '63999655564',
  appId: '1:63999655564:web:2ded578ceb2ac1878645a9',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
