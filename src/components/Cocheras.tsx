import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Search,
  CarFront,
  TriangleAlert,
  Plus,
  X,
  Check,
  Phone,
  Mail,
  Pencil,
  Bike,
} from "lucide-react";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface CocherasProps {
  usuario: Usuario;
  onVolver: () => void;
  onListo?: () => void;
}

export type UbicacionCochera = "afuera" | "adentro";

export interface Cochera {
  apartamento: string;
  numeroCochera: string;
  ubicacion: UbicacionCochera;
}

export const UBICACION_LABEL: Record<UbicacionCochera, string> = {
  afuera: "Afuera del edificio",
  adentro: "Dentro del edificio",
};

export const MENSAJE_SIN_COCHERA =
  "Este apartamento no tiene cochera asignada. Debe estacionar frente al edificio o en el estacionamiento de la barrera frente al Cantegril (por orden de llegada).";

/**
 * Datos fijos, cargados a mano desde la planilla física.
 * Para agregar, corregir o eliminar una cochera: editar este array directamente.
 *
 * PENDIENTES DE REVISAR (no se cargaron por no poder leerse con certeza en la planilla):
 * — Bicicletero (items "Bicis" de Garage Adentro): no son cocheras de auto, se dejaron afuera.
 * — Varias cocheras de "Garage Adentro" tienen la anotación "Godin" con números entre
 *   paréntesis (ej. items 27, 29, 30, 31, 32, 33, 44): parecen alquiladas de forma
 *   independiente y no ligadas a un depto puntual. No se cargaron. Confirmar con el
 *   encargado qué depto (si corresponde) va en cada una.
 * — Items 13, 15, 18, 20 de Garage Adentro tienen texto tachado/superpuesto
 *   ("UP Postal", "Local 112"): no se pudieron leer con confianza. Revisar planilla física.
 * — Item 16 y 19 de Garage Adentro ambos parecen decir "916": posible duplicado o error
 *   de transcripción en la planilla original. Confirmar cuál es el correcto.
 * — Item 22 y 23 de Garage Adentro ambos dicen "417": ídem, revisar planilla física.
 * — Item 44 de Cocheras Afuera: dice "405" con una nota al lado tipo "Alquilada 5/4"
 *   que no se entendió bien. Se cargó el depto 405, pero confirmar esa nota.
 * — Item 45 de Cocheras Afuera: número de cochera ilegible en la foto, no se cargó.
 * — Item 33 de Garage Adentro ("Godin (1008)") coincide con el número 1008 que ya está
 *   usado por la cochera 41 de "Cocheras Afuera" (depto 1008). Puede ser una casualidad
 *   de numeración entre las dos listas, pero conviene confirmarlo.
 */
export const COCHERAS: Cochera[] = [
  // Cocheras Afuera
  { apartamento: "410", numeroCochera: "1", ubicacion: "afuera" },
  { apartamento: "1102", numeroCochera: "2", ubicacion: "afuera" },
  { apartamento: "206", numeroCochera: "3", ubicacion: "afuera" },
  { apartamento: "606", numeroCochera: "4", ubicacion: "afuera" },
  { apartamento: "205", numeroCochera: "5", ubicacion: "afuera" },
  { apartamento: "810", numeroCochera: "6", ubicacion: "afuera" },
  { apartamento: "809", numeroCochera: "7", ubicacion: "afuera" },
  { apartamento: "909", numeroCochera: "8", ubicacion: "afuera" },
  { apartamento: "910", numeroCochera: "9", ubicacion: "afuera" },
  { apartamento: "1107", numeroCochera: "10", ubicacion: "afuera" },
  { apartamento: "702", numeroCochera: "11", ubicacion: "afuera" },
  { apartamento: "1002", numeroCochera: "12", ubicacion: "afuera" },
  { apartamento: "906", numeroCochera: "13", ubicacion: "afuera" },
  { apartamento: "808", numeroCochera: "14", ubicacion: "afuera" },
  { apartamento: "506", numeroCochera: "15", ubicacion: "afuera" },
  { apartamento: "1007", numeroCochera: "16", ubicacion: "afuera" },
  { apartamento: "1003", numeroCochera: "17", ubicacion: "afuera" },
  { apartamento: "805", numeroCochera: "18", ubicacion: "afuera" },
  { apartamento: "411", numeroCochera: "19", ubicacion: "afuera" },
  { apartamento: "1104", numeroCochera: "20", ubicacion: "afuera" },
  { apartamento: "1103", numeroCochera: "21", ubicacion: "afuera" },
  { apartamento: "703", numeroCochera: "22", ubicacion: "afuera" },
  { apartamento: "204", numeroCochera: "23", ubicacion: "afuera" },
  { apartamento: "603", numeroCochera: "24", ubicacion: "afuera" },
  { apartamento: "1006", numeroCochera: "25", ubicacion: "afuera" },
  { apartamento: "602", numeroCochera: "26", ubicacion: "afuera" },
  { apartamento: "507", numeroCochera: "27", ubicacion: "afuera" },
  { apartamento: "803", numeroCochera: "28", ubicacion: "afuera" },
  { apartamento: "802", numeroCochera: "29", ubicacion: "afuera" },
  { apartamento: "706", numeroCochera: "30", ubicacion: "afuera" },
  { apartamento: "811", numeroCochera: "31", ubicacion: "afuera" },
  { apartamento: "305", numeroCochera: "32", ubicacion: "afuera" },
  { apartamento: "508", numeroCochera: "33", ubicacion: "afuera" },
  { apartamento: "511", numeroCochera: "34", ubicacion: "afuera" },
  { apartamento: "711", numeroCochera: "35", ubicacion: "afuera" },
  { apartamento: "708", numeroCochera: "36", ubicacion: "afuera" },
  { apartamento: "306", numeroCochera: "37", ubicacion: "afuera" },
  { apartamento: "406", numeroCochera: "38", ubicacion: "afuera" },
  { apartamento: "1005", numeroCochera: "39", ubicacion: "afuera" },
  { apartamento: "907", numeroCochera: "40", ubicacion: "afuera" },
  { apartamento: "1008", numeroCochera: "41", ubicacion: "afuera" },
  { apartamento: "309", numeroCochera: "42", ubicacion: "afuera" },
  { apartamento: "1109", numeroCochera: "43", ubicacion: "afuera" },
  { apartamento: "405", numeroCochera: "44", ubicacion: "afuera" }, // "Alquilada 5/4" sin confirmar, ver nota arriba
  { apartamento: "316", numeroCochera: "46", ubicacion: "afuera" },

  // Garage Adentro
  { apartamento: "717", numeroCochera: "1", ubicacion: "adentro" },
  { apartamento: "601", numeroCochera: "2", ubicacion: "adentro" },
  { apartamento: "617", numeroCochera: "3", ubicacion: "adentro" },
  { apartamento: "613", numeroCochera: "6", ubicacion: "adentro" },
  { apartamento: "217", numeroCochera: "7", ubicacion: "adentro" },
  { apartamento: "408", numeroCochera: "8", ubicacion: "adentro" },
  { apartamento: "418", numeroCochera: "9", ubicacion: "adentro" },
  { apartamento: "905", numeroCochera: "10", ubicacion: "adentro" },
  { apartamento: "803", numeroCochera: "11", ubicacion: "adentro" },
  { apartamento: "1101", numeroCochera: "12", ubicacion: "adentro" },
  { apartamento: "122", numeroCochera: "14", ubicacion: "adentro" },
  { apartamento: "913", numeroCochera: "17", ubicacion: "adentro" },
  { apartamento: "1108", numeroCochera: "21", ubicacion: "adentro" },
  { apartamento: "417", numeroCochera: "22", ubicacion: "adentro" }, // items 22 y 23 decían ambos "417", ver nota arriba
  { apartamento: "203", numeroCochera: "24", ubicacion: "adentro" },
  { apartamento: "908", numeroCochera: "25", ubicacion: "adentro" },
  { apartamento: "502", numeroCochera: "26", ubicacion: "adentro" },
  { apartamento: "313", numeroCochera: "34", ubicacion: "adentro" },
  { apartamento: "1016", numeroCochera: "35", ubicacion: "adentro" },
  { apartamento: "413", numeroCochera: "36", ubicacion: "adentro" },
  { apartamento: "318", numeroCochera: "37", ubicacion: "adentro" },
  { apartamento: "914", numeroCochera: "38", ubicacion: "adentro" },
  { apartamento: "716", numeroCochera: "39", ubicacion: "adentro" },
  { apartamento: "516", numeroCochera: "40", ubicacion: "adentro" },
  { apartamento: "813", numeroCochera: "41", ubicacion: "adentro" },
  { apartamento: "1110", numeroCochera: "42", ubicacion: "adentro" },
  { apartamento: "1111", numeroCochera: "43", ubicacion: "adentro" },
  { apartamento: "801", numeroCochera: "45", ubicacion: "adentro" },
];

export function buscarCochera(apartamento: string): Cochera | undefined {
  const query = apartamento.trim();
  return COCHERAS.find((c) => c.apartamento === query);
}

/* ---------------------------------------------------------- */
/* Vehículos registrados (persistidos en localStorage)          */
/* ---------------------------------------------------------- */

interface Vehiculo {
  id: string;
  tipo: "auto" | "moto";
  matricula: string; // normalizada: mayúsculas, sin espacios/guiones — para buscar
  matriculaOriginal: string; // como se cargó, para mostrar
  marca: string;
  nombre: string;
  apellido: string;
  apartamento: string;
  telefono: string;
  correo: string;
  autor: string;
  fechaCreacion: string; // ISO
}

const STORAGE_KEY_VEHICULOS = "torreantares_vehiculos";

// Marcas más comunes en Uruguay, para el autocompletado del campo "Marca".
// Es una lista sugerida: el campo sigue aceptando cualquier texto libre.
const MARCAS_AUTO = [
  "Volkswagen",
  "Chevrolet",
  "Toyota",
  "Renault",
  "Fiat",
  "Peugeot",
  "Citroën",
  "Ford",
  "Nissan",
  "Honda",
  "Hyundai",
  "Kia",
  "Suzuki",
  "Mitsubishi",
  "Chery",
  "JAC",
  "Great Wall",
  "BAIC",
  "DFSK",
  "Geely",
  "Jeep",
  "Subaru",
  "Mazda",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Volvo",
  "Land Rover",
];

const MARCAS_MOTO = [
  "Yamaha",
  "Honda",
  "Suzuki",
  "Zanella",
  "Corven",
  "Gilera",
  "Beta",
  "KTM",
  "Bajaj",
  "TVS",
  "Guerrero",
  "Motomel",
  "Keeway",
  "Benelli",
  "Kawasaki",
  "Royal Enfield",
  "Vespa / Piaggio",
  "Yumbo",
  "Jianshe",
];

function generarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizarMatricula(matricula: string) {
  return matricula.trim().toUpperCase().replace(/[\s-]/g, "");
}

function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // saca acentos
}

export default function Cocheras({ usuario, onVolver, onListo }: CocherasProps) {
  const [busqueda, setBusqueda] = useState("");
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState<Vehiculo | null>(null);
  const [seleccionado, setSeleccionado] = useState<Vehiculo | null>(null);

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const guardado = localStorage.getItem(STORAGE_KEY_VEHICULOS);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VEHICULOS, JSON.stringify(vehiculos));
  }, [vehiculos]);

  useEffect(() => {
    // COCHERAS es un array estático y los vehículos salen de localStorage
    // (sincrónico), así que avisamos que ya está listo apenas se monta.
    onListo?.();
  }, []);

  const handleCrearVehiculo = (
    datos: Omit<Vehiculo, "id" | "matricula" | "autor" | "fechaCreacion">
  ) => {
    const nuevo: Vehiculo = {
      ...datos,
      id: generarId(),
      matricula: normalizarMatricula(datos.matriculaOriginal),
      autor: usuario.nombre,
      fechaCreacion: new Date().toISOString(),
    };
    setVehiculos((prev) => [...prev, nuevo]);
    setModalNuevoAbierto(false);
  };

  const handleEditarVehiculo = (
    id: string,
    datos: Omit<Vehiculo, "id" | "matricula" | "autor" | "fechaCreacion">
  ) => {
    setVehiculos((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, ...datos, matricula: normalizarMatricula(datos.matriculaOriginal) }
          : v
      )
    );
    setVehiculoEditando(null);
  };

  const query = busqueda.trim();
  const buscoAlgo = query.length > 0;
  const queryMatricula = normalizarMatricula(query);
  const queryTexto = normalizarTexto(query);

  const cochera = buscoAlgo ? buscarCochera(query) : undefined;

  // Búsqueda PARCIAL (no exacta) por matrícula, nombre/apellido o depto —
  // así encontrás el vehículo aunque escribas solo una parte del dato.
  //
  // Uso "?? ''" en cada campo porque puede haber vehículos guardados con
  // versiones anteriores del formulario, sin el campo "marca" (u otros).
  // Sin esto, .toLowerCase() sobre un campo undefined rompe toda la pantalla
  // apenas se escribe algo en el buscador.
  const vehiculosFiltrados = [...vehiculos]
    .filter((v) => {
      if (!buscoAlgo) return true;
      const matriculaMatch = (v.matricula ?? "").includes(queryMatricula);
      const nombreMatch = normalizarTexto(`${v.nombre ?? ""} ${v.apellido ?? ""}`).includes(queryTexto);
      const deptoMatch = (v.apartamento ?? "").includes(query);
      const marcaMatch = normalizarTexto(v.marca ?? "").includes(queryTexto);
      return matriculaMatch || nombreMatch || deptoMatch || marcaMatch;
    })
    .sort(
      (a, b) =>
        normalizarTexto(a.apellido ?? "").localeCompare(normalizarTexto(b.apellido ?? "")) ||
        normalizarTexto(a.nombre ?? "").localeCompare(normalizarTexto(b.nombre ?? ""))
    );

  const sinCocheraNiVehiculos =
    buscoAlgo && !cochera && /^\d+$/.test(query) && vehiculosFiltrados.length === 0;

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d1117] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mb-8 flex w-full max-w-xl items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <h1 className="text-2xl font-bold sm:text-3xl">Cocheras</h1>

        <button
          onClick={() => setModalNuevoAbierto(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Plus size={18} />
          Vehículo
        </button>
      </div>

      <div className="w-full max-w-xl">
        <p className="mb-2 ml-1 text-sm font-medium text-gray-300">
          Buscar cochera por depto, o vehículo por matrícula/nombre
        </p>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            autoFocus
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej: 601, ABC1234 o un nombre"
            className="w-full rounded-2xl border border-white/10 bg-white/5 pb-4 pt-5 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />
        </div>

        {buscoAlgo && (
          <div className="mt-6 flex flex-col gap-4">
            {cochera && (
              <div className="flex items-start gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <CarFront size={22} />
                </div>
                <div>
                  <p className="text-base text-white">
                    El depto <span className="font-bold">{cochera.apartamento}</span> tiene la cochera{" "}
                    <span className="font-bold">{cochera.numeroCochera}</span>
                  </p>
                  <p className="mt-1 text-sm text-emerald-400">{UBICACION_LABEL[cochera.ubicacion]}</p>
                </div>
              </div>
            )}

            {query.length > 0 && /^\d+$/.test(query) && !cochera && (
              <div className="flex items-start gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <TriangleAlert size={22} />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Sin cochera asignada</p>
                  <p className="mt-1 text-sm text-gray-300">{MENSAJE_SIN_COCHERA}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lista de vehículos: siempre visible, tipo agenda. Si hay
            búsqueda, se filtra sola (matrícula, nombre o depto, parcial). */}
        <div className="mt-8">
          <p className="mb-3 ml-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Vehículos registrados{buscoAlgo ? ` (${vehiculosFiltrados.length})` : ""}
          </p>

          {vehiculosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-10 text-center text-gray-500">
              <CarFront size={24} />
              <p className="text-sm">
                {vehiculos.length === 0
                  ? "Todavía no hay vehículos registrados."
                  : "No se encontró ningún vehículo con esa búsqueda."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {vehiculosFiltrados.map((v) => (
                <div key={v.id} className="relative">
                  <button
                    onClick={() => setSeleccionado(v)}
                    className="flex w-full items-start gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-4 pr-12 text-left transition hover:bg-blue-500/[0.1] active:scale-[0.99]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                      {v.tipo === "moto" ? <Bike size={20} /> : <CarFront size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-white">
                        {v.nombre ?? ""} {v.apellido ?? ""}
                      </p>
                      <p className="mt-0.5 text-sm text-blue-300">
                        <span className="font-bold">{v.matriculaOriginal ?? v.matricula}</span>
                        {v.marca && ` · ${v.marca}`}
                        {v.apartamento && ` · Depto ${v.apartamento}`}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                        {v.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} /> {v.telefono}
                          </span>
                        )}
                        {v.correo && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail size={12} /> {v.correo}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVehiculoEditando(v);
                    }}
                    className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                    title="Editar vehículo"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalNuevoAbierto && (
        <VehiculoModal onClose={() => setModalNuevoAbierto(false)} onGuardar={handleCrearVehiculo} />
      )}

      {vehiculoEditando && (
        <VehiculoModal
          vehiculoInicial={vehiculoEditando}
          onClose={() => setVehiculoEditando(null)}
          onGuardar={(datos) => handleEditarVehiculo(vehiculoEditando.id, datos)}
        />
      )}

      {seleccionado && (
        <VehiculoDetalleModal vehiculo={seleccionado} onClose={() => setSeleccionado(null)} />
      )}
    </main>
  );
}

/* ---------------------------------------------------------- */
/* Modal: registrar vehículo                                    */
/* ---------------------------------------------------------- */

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-400";

function normalizarTextoSimple(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Autocompletado propio para el campo "Marca": reemplaza al <datalist> nativo
// porque ese lo dibuja el navegador como un panel aparte que no respeta el
// tamaño del modal. Este desplegable queda contenido dentro del modal.
function MarcaInput({
  value,
  onChange,
  marcas,
}: {
  value: string;
  onChange: (v: string) => void;
  marcas: string[];
}) {
  const [abierto, setAbierto] = useState(false);

  const sugerencias = marcas.filter((m) => normalizarTextoSimple(m).includes(normalizarTextoSimple(value)));

  return (
    <div className="relative">
      <input
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        placeholder="Ej: Volkswagen"
        className={inputClass}
      />
      {abierto && sugerencias.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#1c2028] shadow-xl">
          {sugerencias.map((m) => (
            <li key={m}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(m);
                  setAbierto(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VehiculoModal({
  vehiculoInicial,
  onClose,
  onGuardar,
}: {
  vehiculoInicial?: Vehiculo | null;
  onClose: () => void;
  onGuardar: (datos: {
    tipo: "auto" | "moto";
    matriculaOriginal: string;
    marca: string;
    nombre: string;
    apellido: string;
    apartamento: string;
    telefono: string;
    correo: string;
  }) => void;
}) {
  const esEdicion = !!vehiculoInicial;

  const [tipo, setTipo] = useState<"auto" | "moto">(vehiculoInicial?.tipo ?? "auto");
  const [matricula, setMatricula] = useState(vehiculoInicial?.matriculaOriginal ?? "");
  const [marca, setMarca] = useState(vehiculoInicial?.marca ?? "");
  const [nombre, setNombre] = useState(vehiculoInicial?.nombre ?? "");
  const [apellido, setApellido] = useState(vehiculoInicial?.apellido ?? "");
  const [apartamento, setApartamento] = useState(vehiculoInicial?.apartamento ?? "");
  const [telefono, setTelefono] = useState(vehiculoInicial?.telefono ?? "");
  const [correo, setCorreo] = useState(vehiculoInicial?.correo ?? "");

  const marcasDisponibles = tipo === "auto" ? MARCAS_AUTO : MARCAS_MOTO;

  const handleConfirmar = () => {
    const faltantes: string[] = [];
    if (!matricula.trim()) faltantes.push("Matrícula");
    if (!nombre.trim()) faltantes.push("Nombre");
    if (!apellido.trim()) faltantes.push("Apellido");
    if (!apartamento.trim()) faltantes.push("Apartamento");

    if (faltantes.length > 0) {
      window.alert(`Faltan completar: ${faltantes.join(", ")}`);
      return;
    }

    onGuardar({
      tipo,
      matriculaOriginal: matricula.trim().toUpperCase(),
      marca: marca.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      apartamento: apartamento.trim(),
      telefono: telefono.trim(),
      correo: correo.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-xl font-bold text-white">{esEdicion ? "Editar vehículo" : "Registrar vehículo"}</h2>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setTipo("auto")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tipo === "auto" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <CarFront size={16} />
              Auto
            </button>
            <button
              type="button"
              onClick={() => setTipo("moto")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tipo === "moto" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Bike size={16} />
              Moto
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Matrícula</label>
              <input
                autoFocus
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ej: ABC 1234"
                className={`${inputClass} uppercase`}
              />
            </div>
            <div>
              <label className={labelClass}>
                Marca <span className="text-gray-500">· opcional</span>
              </label>
              <MarcaInput value={marca} onChange={setMarca} marcas={marcasDisponibles} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Apartamento</label>
            <input
              type="text"
              value={apartamento}
              onChange={(e) => setApartamento(e.target.value)}
              placeholder="Ej: 914"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Teléfono (opcional)</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Correo (opcional)</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Check size={16} />
              {esEdicion ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Modal: detalle de un vehículo (al tocar una tarjeta)          */
/* ---------------------------------------------------------- */

function VehiculoDetalleModal({ vehiculo, onClose }: { vehiculo: Vehiculo; onClose: () => void }) {
  const nombreCompleto = `${vehiculo.nombre ?? ""} ${vehiculo.apellido ?? ""}`.trim() || "Sin nombre";
  const [aviso, setAviso] = useState<string | null>(null);
  const avisoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copiarAlPortapapeles = async (texto: string, etiqueta: string) => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Fallback para navegadores/contextos sin permiso de portapapeles moderno
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    setAviso(`${etiqueta} copiado al portapapeles`);
    avisoTimeoutRef.current = setTimeout(() => setAviso(null), 1900);
  };

  const tipoLabel = vehiculo.tipo === "moto" ? "Moto" : "Auto";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#171b22]/95 p-8 text-center shadow-2xl backdrop-blur-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-white/10"
        >
          <X className="text-white" size={20} />
        </button>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
          {vehiculo.tipo === "moto" ? <Bike size={34} /> : <CarFront size={34} />}
        </div>

        <h2 className="mt-4 text-2xl font-bold leading-tight text-white">{nombreCompleto}</h2>
        {vehiculo.apartamento && (
          <p className="mt-0.5 text-base text-gray-300">{vehiculo.apartamento}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">{tipoLabel}</p>
        {vehiculo.marca && (
          <p className="mt-0.5 text-sm text-gray-500">
            Marca: <span className="text-gray-300">{vehiculo.marca}</span>
          </p>
        )}
        <p className="mt-0.5 text-sm text-gray-500">
          Matrícula: <span className="text-gray-300">{vehiculo.matriculaOriginal ?? vehiculo.matricula}</span>
        </p>

        <div className="mt-7 flex flex-col gap-3">
          {vehiculo.telefono && (
            <a
              href={`tel:${vehiculo.telefono.replace(/\s+/g, "")}`}
              onClick={() => copiarAlPortapapeles(vehiculo.telefono, "Teléfono")}
              className="flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-4 py-4 text-xl font-bold tracking-wide text-white transition hover:bg-blue-500 active:scale-[0.98]"
            >
              <Phone size={22} />
              {vehiculo.telefono}
            </a>
          )}

          {vehiculo.correo && (
            <a
              href={`mailto:${vehiculo.correo}`}
              onClick={() => copiarAlPortapapeles(vehiculo.correo, "Correo")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-gray-200 transition hover:bg-white/10"
            >
              <Mail size={18} />
              <span className="truncate">{vehiculo.correo}</span>
            </a>
          )}

          {!vehiculo.telefono && !vehiculo.correo && (
            <p className="text-sm text-gray-500">No hay teléfono ni correo cargados para este vehículo.</p>
          )}
        </div>

        <div
          className={`pointer-events-none absolute inset-x-0 -bottom-3 flex justify-center transition-all duration-300 ${
            aviso ? "translate-y-full opacity-100" : "translate-y-[calc(100%+8px)] opacity-0"
          }`}
        >
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-emerald-900/30">
            <Check size={16} />
            {aviso}
          </div>
        </div>
      </div>
    </div>
  );
}