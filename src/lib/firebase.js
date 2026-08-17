import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
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

// Crea una nota nueva en la colección "notas"
export async function crearNotaEnDB({ contenido, autor }) {
  const docRef = await addDoc(collection(db, "notas"), {
    contenido,
    autor,
    fecha: new Date().toISOString(),
    comentarios: [],
  });
  return docRef.id;
}

// Trae todas las notas de la colección "notas"
export async function obtenerNotasDeDB() {
  const snapshot = await getDocs(collection(db, "notas"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Agrega un comentario dentro del array "comentarios" de una nota puntual
export async function agregarComentarioEnDB(notaId, { contenido, autor }) {
  const notaRef = doc(db, "notas", notaId);
  await updateDoc(notaRef, {
    comentarios: arrayUnion({
      contenido,
      autor,
      fecha: new Date().toISOString(),
    }),
  });
}