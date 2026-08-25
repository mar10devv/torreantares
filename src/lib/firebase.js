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
  query,
  where,
  orderBy,
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

// Firestore rechaza (con error) cualquier campo con valor "undefined" dentro
// de un objeto. Como varios formularios tienen campos opcionales que quedan
// undefined si no se completan (auto, matrícula, apartamento, lecturas de
// UTE, etc.), esta función los saca antes de mandar el objeto a Firestore.
function limpiarUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// Crea un usuario nuevo en la colección "usuarios"
export async function crearUsuarioEnDB({ nombre, cargo, gmail, telefono, contrasena }) {
  const docRef = await addDoc(collection(db, "usuarios"), limpiarUndefined({
    nombre,
    cargo,
    gmail,
    telefono,
    contrasena,
    accesoAdministracion: false,
    fechaCreacion: serverTimestamp(),
  }));
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

/* ---------------------------------------------------------- */
/* Notas                                                        */
/* ---------------------------------------------------------- */
// Las notas se consultan de dos formas: por mes (navegador de fechas de
// Notas.tsx) y por palabra clave (buscador). Ninguna de las dos trae la
// colección entera — ambas dejan que Firestore filtre del lado del
// servidor, usando el campo "fecha" (rango) y "palabrasClave" (array-
// contains-any) respectivamente. Ver comentarios en cada función.

// Palabras que no sirven para buscar (artículos, preposiciones, etc.) — se
// excluyen del índice de palabrasClave para no inflarlo con ruido.
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "en", "un", "una", "unos", "unas",
  "y", "o", "u", "que", "por", "con", "se", "su", "sus", "lo", "le", "les",
  "a", "al", "es", "son", "fue", "ha", "han", "este", "esta", "estos",
  "estas", "para", "sin", "sobre", "como", "mas", "pero", "porque",
  "cuando", "donde", "muy", "ya", "no", "si", "tu", "mi", "nos", "les",
]);

// Normaliza una palabra: minúsculas y sin tildes/diacríticos, para que
// "recepción" y "recepcion" indexen y busquen igual.
function normalizarPalabra(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Calcula el array de palabras clave que se guarda junto a cada nota. Saca
// signos de puntuación, tildes, mayúsculas, stopwords y palabras muy cortas
// — excepto los números (así "710" queda indexado igual que "recepcion").
export function extraerPalabrasClave(contenido) {
  const palabras = normalizarPalabra(contenido).match(/[a-z0-9]+/g) || [];
  const claves = new Set();
  for (const palabra of palabras) {
    if (STOPWORDS.has(palabra)) continue;
    if (palabra.length < 3 && !/^\d+$/.test(palabra)) continue;
    claves.add(palabra);
  }
  return Array.from(claves);
}

// Normaliza el término tipeado en el buscador a una lista de palabras para
// usar con "array-contains-any" (máximo 10 valores permite Firestore).
export function palabrasParaBuscar(termino) {
  const palabras = normalizarPalabra(termino).match(/[a-z0-9]+/g) || [];
  return Array.from(new Set(palabras)).slice(0, 10);
}

// Crea una nota nueva en la colección "notas"
export async function crearNotaEnDB({ contenido, autor }) {
  const docRef = await addDoc(collection(db, "notas"), {
    contenido,
    autor,
    fecha: new Date().toISOString(),
    comentarios: [],
    palabrasClave: extraerPalabrasClave(contenido),
  });
  return docRef.id;
}

// Trae SOLO las notas de un mes puntual (rango [inicioISO, finISO)). Esto
// es lo que usa Notas.tsx al abrir la pantalla o al cambiar de mes con las
// flechas — nunca trae la colección completa.
export async function obtenerNotasPorMesDeDB(inicioISO, finISO) {
  const q = query(
    collection(db, "notas"),
    where("fecha", ">=", inicioISO),
    where("fecha", "<", finISO),
    orderBy("fecha", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Busca notas por palabra clave, en cualquier mes, sin traer nada de más.
// Usa "array-contains-any": trae las notas cuyo array palabrasClave
// contenga AL MENOS UNA de las palabras pasadas. La primera vez que corra
// esta consulta, Firestore probablemente tire un error en la consola con
// un link para crear el índice compuesto que necesita (fecha + palabrasClave)
// — hay que entrar a ese link, crear el índice y esperar ~1 minuto.
export async function buscarNotasPorPalabrasClaveDeDB(palabras) {
  if (!palabras || palabras.length === 0) return [];
  const q = query(
    collection(db, "notas"),
    where("palabrasClave", "array-contains-any", palabras),
    orderBy("fecha", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Trae TODAS las notas sin filtrar. Ya no la usa Notas.tsx (por eso existía
// el problema de performance) — se deja solo como utilidad para scripts
// puntuales, como la migración de abajo.
export async function obtenerNotasDeDB() {
  const snapshot = await getDocs(collection(db, "notas"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Utilidad de UNA SOLA VEZ: les agrega palabrasClave a las notas que ya
// existían antes de este cambio (esas no la tienen y por lo tanto no van a
// aparecer nunca en una búsqueda hasta correr esto). Se puede llamar una
// vez desde la consola del navegador, ej: importándola temporalmente y
// ejecutando `await migrarPalabrasClaveDeNotasExistentes()`. Devuelve
// cuántas notas actualizó.
export async function migrarPalabrasClaveDeNotasExistentes() {
  const snapshot = await getDocs(collection(db, "notas"));
  const pendientes = snapshot.docs.filter((d) => !Array.isArray(d.data().palabrasClave));

  for (const d of pendientes) {
    await updateDoc(doc(db, "notas", d.id), {
      palabrasClave: extraerPalabrasClave(d.data().contenido || ""),
    });
  }

  return pendientes.length;
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
  const docRef = await addDoc(collection(db, "parrilleros"), limpiarUndefined(reserva));
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
  await updateDoc(reservaRef, limpiarUndefined(cambios));
}

// Crea un vehículo nuevo en la colección "vehiculos"
export async function crearVehiculoEnDB(vehiculo) {
  const docRef = await addDoc(collection(db, "vehiculos"), limpiarUndefined(vehiculo));
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
  await updateDoc(vehiculoRef, limpiarUndefined(cambios));
}

// Elimina un vehículo (lo usa Ingresos al finalizar/cancelar una estadía)
export async function eliminarVehiculoEnDB(vehiculoId) {
  await deleteDoc(doc(db, "vehiculos", vehiculoId));
}

// Crea un ingreso nuevo en la colección "ingresos"
export async function crearIngresoEnDB(ingreso) {
  const docRef = await addDoc(collection(db, "ingresos"), limpiarUndefined(ingreso));
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
  await updateDoc(ingresoRef, limpiarUndefined(cambios));
}

// Crea un contacto nuevo en la colección "contactos"
export async function crearContactoEnDB(contacto) {
  const docRef = await addDoc(collection(db, "contactos"), limpiarUndefined(contacto));
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
  await updateDoc(contactoRef, limpiarUndefined(cambios));
}

// Elimina un contacto (manual, o automático al finalizar/cancelar un ingreso)
export async function eliminarContactoEnDB(contactoId) {
  await deleteDoc(doc(db, "contactos", contactoId));
}

// Crea un servicio de terceros nuevo en la colección "servicios"
export async function crearServicioEnDB(servicio) {
  const docRef = await addDoc(collection(db, "servicios"), limpiarUndefined(servicio));
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
  await updateDoc(servicioRef, limpiarUndefined(cambios));
}

// Elimina un servicio de terceros
export async function eliminarServicioEnDB(servicioId) {
  await deleteDoc(doc(db, "servicios", servicioId));
}

/* ---------------------------------------------------------- */
/* Residentes (propietarios / inquilinos anuales)               */
/* ---------------------------------------------------------- */
// Antes esto vivía en localStorage (PropietariosInquilinos.tsx), lo que
// significaba que cada PC tenía su propia lista, sin compartir nada entre
// instalaciones — el mismo problema que ya vimos con las notificaciones del
// Dashboard. Migrado a Firestore para que Ingresos pueda buscar/actualizar
// estos datos y que todas las PCs vean lo mismo.

// Crea un residente nuevo (propietario o inquilino anual) en la colección "residentes"
export async function crearResidenteEnDB(residente) {
  const docRef = await addDoc(collection(db, "residentes"), limpiarUndefined(residente));
  return docRef.id;
}

// Trae todos los residentes de la colección "residentes"
export async function obtenerResidentesDeDB() {
  const snapshot = await getDocs(collection(db, "residentes"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Actualiza campos puntuales de un residente existente
export async function actualizarResidenteEnDB(residenteId, cambios) {
  const residenteRef = doc(db, "residentes", residenteId);
  await updateDoc(residenteRef, limpiarUndefined(cambios));
}

// Elimina un residente
export async function eliminarResidenteEnDB(residenteId) {
  await deleteDoc(doc(db, "residentes", residenteId));
}