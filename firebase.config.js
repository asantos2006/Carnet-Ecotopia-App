// Importamos la función para encender Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// Importamos la herramienta de Autenticación (para el Login/Registro)
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Importamos la Base de Datos (Firestore)
import { getFirestore, doc, setDoc, getDoc, updateDoc, increment, collection, getDocs,deleteDoc, arrayUnion} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAjNKLoObyyl6Q0uQN4MOBdWz8MFhsCxks",
  authDomain: "carnet-ecotopia.firebaseapp.com",
  projectId: "carnet-ecotopia",
  storageBucket: "carnet-ecotopia.firebasestorage.app",
  messagingSenderId: "832532632498",
  appId: "1:832532632498:web:ea01bebd25ee40951fcaab",
  measurementId: "G-LHSCNYELGH"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// Creamos las variables constantes para usar la Autenticación y la Base de Datos
export const auth = getAuth(app);
export const db = getFirestore(app);
export const CORREO_ADMIN = "ecotopia.asociacion@gmail.com";
console.log("¡Firebase conectado correctamente!");