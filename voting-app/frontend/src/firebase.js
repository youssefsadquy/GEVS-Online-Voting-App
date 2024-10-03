import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBYAYDE7X6lUbhYuCg_XldUHLHk7WGkg5w",
  authDomain: "gevs-votingwebapp.firebaseapp.com",
  projectId: "gevs-votingwebapp",
  storageBucket: "gevs-votingwebapp.appspot.com",
  messagingSenderId: "1056620747081",
  appId: "1:1056620747081:web:077ff3b8fee9a7907ba298"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase auth
export const auth = getAuth(app);

// Get Firestore
export const db = getFirestore(app);

// Get Functions
export const functions = getFunctions(app);