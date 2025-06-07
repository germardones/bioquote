// src/firebase/firebaseConfig.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyB7xcQJWgTOnd0FwAW8Mm0Z1hHhbo-bQtA",
    authDomain: "bioquote-e4e42.firebaseapp.com",
    projectId: "bioquote-e4e42",
    storageBucket: "bioquote-e4e42.appspot.com",
    messagingSenderId: "612989548653",
    appId: "1:612989548653:web:06b263c8b301db55466764"
  };

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
