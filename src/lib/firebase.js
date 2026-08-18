import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
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

// Crea una reserva de parrillero nueva en la colección "parrilleros"
export async function crearReservaParrilleroEnDB(reserva) {
  const docRef = await addDoc(collection(db, "parrilleros"), reserva);
  return docRef.id;
}

// Trae todas las reservas de la colección "parrilleros"
export async function obtenerReservasParrilleroDeDB() {
  const snapshot = await getDocs(collection(db, "parrilleros"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Actualiza campos puntuales de una reserva existente (togglear pagado,
// marcarla como cancelada, etc.)
export async function actualizarReservaParrilleroEnDB(reservaId, cambios) {
  const reservaRef = doc(db, "parrilleros", reservaId);
  await updateDoc(reservaRef, cambios);
}

// Crea un vehículo nuevo en la colección "vehiculos"
export async function crearVehiculoEnDB(vehiculo) {
  const docRef = await addDoc(collection(db, "vehiculos"), vehiculo);
  return docRef.id;
}

// Trae todos los vehículos de la colección "vehiculos"
export async function obtenerVehiculosDeDB() {
  const snapshot = await getDocs(collection(db, "vehiculos"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Actualiza campos puntuales de un vehículo existente (ej: editar datos)
export async function actualizarVehiculoEnDB(vehiculoId, cambios) {
  const vehiculoRef = doc(db, "vehiculos", vehiculoId);
  await updateDoc(vehiculoRef, cambios);
}

// Elimina un vehículo (lo usa Ingresos al finalizar/cancelar una estadía)
export async function eliminarVehiculoEnDB(vehiculoId) {
  await deleteDoc(doc(db, "vehiculos", vehiculoId));
}

// Crea un ingreso nuevo en la colección "ingresos"
export async function crearIngresoEnDB(ingreso) {
  const docRef = await addDoc(collection(db, "ingresos"), ingreso);
  return docRef.id;
}

// Trae todos los ingresos de la colección "ingresos"
export async function obtenerIngresosDeDB() {
  const snapshot = await getDocs(collection(db, "ingresos"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Actualiza campos puntuales de un ingreso existente (completar lectura UTE,
// finalizar la estadía, cancelarla, etc.)
export async function actualizarIngresoEnDB(ingresoId, cambios) {
  const ingresoRef = doc(db, "ingresos", ingresoId);
  await updateDoc(ingresoRef, cambios);
}

// Crea un contacto nuevo en la colección "contactos"
export async function crearContactoEnDB(contacto) {
  const docRef = await addDoc(collection(db, "contactos"), contacto);
  return docRef.id;
}

// Trae todos los contactos de la colección "contactos"
export async function obtenerContactosDeDB() {
  const snapshot = await getDocs(collection(db, "contactos"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Actualiza campos puntuales de un contacto existente
export async function actualizarContactoEnDB(contactoId, cambios) {
  const contactoRef = doc(db, "contactos", contactoId);
  await updateDoc(contactoRef, cambios);
}

// Elimina un contacto (manual, o automático al finalizar/cancelar un ingreso)
export async function eliminarContactoEnDB(contactoId) {
  await deleteDoc(doc(db, "contactos", contactoId));
}

// Crea un servicio de terceros nuevo en la colección "servicios"
export async function crearServicioEnDB(servicio) {
  const docRef = await addDoc(collection(db, "servicios"), servicio);
  return docRef.id;
}

// Trae todos los servicios de terceros de la colección "servicios"
export async function obtenerServiciosDeDB() {
  const snapshot = await getDocs(collection(db, "servicios"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Actualiza campos puntuales de un servicio existente
export async function actualizarServicioEnDB(servicioId, cambios) {
  const servicioRef = doc(db, "servicios", servicioId);
  await updateDoc(servicioRef, cambios);
}

// Elimina un servicio de terceros
export async function eliminarServicioEnDB(servicioId) {
  await deleteDoc(doc(db, "servicios", servicioId));
}