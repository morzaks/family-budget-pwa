import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Ganti nilai di dalam const firebaseConfig ini dengan milikmu dari Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBeqb7VwNRBB_3p8GVsUS9vPMiqW97lhS4",
  authDomain: "family-budget-426aa.firebaseapp.com",
  projectId: "family-budget-426aa",
  storageBucket: "family-budget-426aa.firebasestorage.app",
  messagingSenderId: "507666539032",
  appId: "1:507666539032:web:e5dd6a70a0e535bdaa196d"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
// Ekspor instance database agar bisa dipakai di file lain
export const db = getFirestore(app);