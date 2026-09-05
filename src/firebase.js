import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// আপনার আসল ফায়ারবেস কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyCRBZ0PgPRp-tfB1ik4Xm49eENm0BNJEeU",
  authDomain: "assault-report-db-136b0.firebaseapp.com",
  projectId: "assault-report-db-136b0",
  storageBucket: "assault-report-db-136b0.firebasestorage.app",
  messagingSenderId: "114677673493",
  appId: "1:114677673493:web:169dd2c8f7bbde6cb0a81c",
  measurementId: "G-ELXCCJP5P4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Database & Storage Export
export const db = getFirestore(app);
export const storage = getStorage(app);