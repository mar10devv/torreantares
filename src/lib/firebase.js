import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOc4U1rdwCc-tYZBq0rmNFAp3kXEYvev0",
  authDomain: "torreantares-492e5.firebaseapp.com",
  projectId: "torreantares-492e5",
  storageBucket: "torreantares-492e5.firebasestorage.app",
  messagingSenderId: "1096355883758",
  appId: "1:1096355883758:web:e460ae7264c140210e21ff",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Crea un usuario nuevo en la colección "usuarios"
export async function crearUsuarioEnDB({ nombre, cargo, gmail, telefono, contrasena }) {
  const docRef = await addDoc(collection(db, "usuarios"), {
    nombre,
    cargo,
    gmail,
    telefono,
    contrasena,
    accesoAdministracion: false,
    fechaCreacion: serverTimestamp(),
  });
  return docRef.id;
}

// Trae todos los usuarios de la colección "usuarios"
export async function obtenerUsuariosDeDB() {
  const snapshot = await getDocs(collection(db, "usuarios"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}