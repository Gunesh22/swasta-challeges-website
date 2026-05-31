// ===== Firebase Configuration =====
// Initializes Firebase app, Firestore, and Analytics.

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBUUu6i0tJbJkuZXeYWdUUKKOZY-ajxejE",
  authDomain: "tgf-challenges.firebaseapp.com",
  projectId: "tgf-challenges",
  storageBucket: "tgf-challenges.firebasestorage.app",
  messagingSenderId: "628255693136",
  appId: "1:628255693136:web:e319264781674f85403455",
  measurementId: "G-DY149PH181"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;
