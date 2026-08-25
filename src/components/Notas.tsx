import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import CreateNoteModal from "./CreateNoteModal";
import NoteCard from "./NoteCard";
import Loader from "./Loader";
import {
  crearNotaEnDB,
  obtenerNotasPorMesDeDB,
  buscarNotasPorPalabrasClaveDeDB,
  palabrasParaBuscar,
  agregarComentarioEnDB,
} from "../lib/firebase";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface Comentario {
  contenido: string;
  autor: string;
  fecha: string; // ISO string
}

interface Nota {
  id: string;
  contenido: string;
  autor: string;
  fecha: string; // ISO string
  comentarios: Comentario[];
}

interface NotasProps {
  usuario: Usuario;
  onVolver: () => void;
  onListo?: () => void;
}

const LEIDAS_KEY = "torreantares_notas_leidas";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function cargarLeidasPorUsuario(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const guardado = localStorage.getItem(LEIDAS_KEY);
    return guardado ? JSON.parse(guardado) : {};
  } catch {
    return {};
  }
}

// Rango [inicioISO, finISO) de un mes calendario, en el mismo formato ISO
// que se usa para guardar "fecha" en cada nota (new Date().toISOString()),
// así la comparación en la consulta a Firestore es consistente.
function rangoDelMes(anio: number, mes: number) {
  const inicio = new Date(anio, mes, 1);
  const fin = new Date(anio, mes + 1, 1);
  return { inicioISO: inicio.toISOString(), finISO: fin.toISOString() };
}

function claveMes(anio: number, mes: number) {
  return `${anio}-${mes}`;
}

export default function Notas({ usuario, onVolver, onListo }: NotasProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const hoy = new Date();
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  });

  const [busqueda, setBusqueda] = useState("");
  const [terminoActivo, setTerminoActivo] = useState("");
  const [buscando, setBuscando] = useState(false);

  // Notas del mes actualmente seleccionado (lo único que se pide a
  // Firestore al navegar por meses) y resultados del buscador (que
  // consultan por palabra clave, sin importar el mes). Solo una de las
  // dos se muestra a la vez, según haya o no una búsqueda activa.
  const [notasDelMes, setNotasDelMes] = useState<Nota[]>([]);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Nota[]>([]);
  const [cargandoNotas, setCargandoNotas] = useState(true);
  const [errorNotas, setErrorNotas] = useState("");

  // Notas que este usuario todavía no había visto la última vez que entró.
  // Es un snapshot fijo: se calcula una sola vez, apenas terminan de cargar
  // las notas del mes actual por primera vez, y no vuelve a recalcularse en
  // esta visita. Al cargar por mes en vez de traer todo, este cálculo
  // queda acotado a las notas del mes que se esté viendo — en la práctica
  // casi siempre alcanza, porque lo nuevo suele ser del mes en curso.
  const [notasNuevasIds, setNotasNuevasIds] = useState<Set<string>>(new Set());
  const esPrimeraCargaRef = useRef(true);

  // Caché en memoria de meses ya consultados en esta sesión: volver a un
  // mes ya visitado no vuelve a pedirle nada a Firestore.
  const cacheMesesRef = useRef<Map<string, Nota[]>>(new Map());

  // Trae las notas de un mes puntual, usando la caché si ya se consultó
  // antes en esta sesión. `forzar` ignora la caché (se usa después de
  // crear una nota o un comentario, para reflejar el cambio).
  const cargarMes = async (anio: number, mes: number, forzar = false): Promise<Nota[]> => {
    const key = claveMes(anio, mes);

    if (!forzar && cacheMesesRef.current.has(key)) {
      const datosEnCache = cacheMesesRef.current.get(key)!;
      setNotasDelMes(datosEnCache);
      return datosEnCache;
    }

    try {
      setErrorNotas("");
      const { inicioISO, finISO } = rangoDelMes(anio, mes);
      const datos = (await obtenerNotasPorMesDeDB(inicioISO, finISO)) as unknown as Nota[];
      cacheMesesRef.current.set(key, datos);
      setNotasDelMes(datos);
      return datos;
    } catch (err) {
      console.error("Error al cargar notas del mes desde Firestore:", err);
      setErrorNotas("No se pudieron cargar las notas. Revisá tu conexión.");
      return [];
    }
  };

  // Ejecuta la búsqueda por palabra clave contra Firestore (no filtra en
  // el navegador: la consulta ya viene filtrada del servidor).
  const ejecutarBusqueda = async (termino: string) => {
    const palabras = palabrasParaBuscar(termino);

    if (palabras.length === 0) {
      setResultadosBusqueda([]);
      return;
    }

    setBuscando(true);
    try {
      setErrorNotas("");
      const datos = (await buscarNotasPorPalabrasClaveDeDB(palabras)) as unknown as Nota[];
      setResultadosBusqueda(datos);
    } catch (err) {
      console.error("Error al buscar notas en Firestore:", err);
      setErrorNotas("No se pudo completar la búsqueda. Intentá de nuevo.");
    } finally {
      setBuscando(false);
    }
  };

  // Vuelve a pedir lo que esté visible en este momento (mes actual o
  // resultados de búsqueda), invalidando la caché de meses. Se usa después
  // de publicar una nota o agregar un comentario, para que el cambio se
  // vea reflejado sin tener que recargar toda la pantalla.
  const recargarVistaActual = async () => {
    cacheMesesRef.current.clear();
    if (terminoActivo.trim() !== "") {
      await ejecutarBusqueda(terminoActivo);
    } else {
      await cargarMes(mesSeleccionado.anio, mesSeleccionado.mes, true);
    }
  };

  // Carga el mes seleccionado cada vez que cambia (incluye la carga
  // inicial al montar). Solo la primera vez calcula "notas nuevas" y
  // marca como leídas las notas de ese mes.
  useEffect(() => {
    (async () => {
      setCargandoNotas(true);
      const datos = await cargarMes(mesSeleccionado.anio, mesSeleccionado.mes);

      if (esPrimeraCargaRef.current) {
        esPrimeraCargaRef.current = false;

        const leidasPorUsuario = cargarLeidasPorUsuario();
        const leidasDeEsteUsuario = new Set(leidasPorUsuario[usuario.nombre] ?? []);
        const nuevas = new Set(
          datos
            .filter((n) => n.autor !== usuario.nombre && !leidasDeEsteUsuario.has(n.id))
            .map((n) => n.id)
        );
        setNotasNuevasIds(nuevas);

        leidasPorUsuario[usuario.nombre] = datos.map((n) => n.id);
        localStorage.setItem(LEIDAS_KEY, JSON.stringify(leidasPorUsuario));

        onListo?.();
      }

      setCargandoNotas(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSeleccionado.anio, mesSeleccionado.mes]);

  const handleBuscar = () => {
    const termino = busqueda.trim();
    setTerminoActivo(termino);

    if (termino === "") {
      setResultadosBusqueda([]);
      return;
    }

    ejecutarBusqueda(termino);
  };

  const handleLimpiarBusqueda = () => {
    setBusqueda("");
    setTerminoActivo("");
    setResultadosBusqueda([]);
    setBuscando(false);
  };

  const handleBusquedaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleBuscar();
  };

  const handleNoteCreated = async (contenido: string) => {
    try {
      await crearNotaEnDB({ contenido, autor: usuario.nombre });
      await recargarVistaActual();
    } catch (err) {
      console.error("Error al crear nota en Firestore:", err);
      setErrorNotas("No se pudo crear la nota. Intentá de nuevo.");
      throw err;
    }
  };

  const handleAddComment = async (notaId: string, contenido: string) => {
    try {
      await agregarComentarioEnDB(notaId, { contenido, autor: usuario.nombre });
      await recargarVistaActual();
    } catch (err) {
      console.error("Error al agregar comentario en Firestore:", err);
      setErrorNotas("No se pudo agregar el comentario. Intentá de nuevo.");
    }
  };

  const cambiarMes = (delta: number) => {
    setMesSeleccionado((prev) => {
      const nuevaFecha = new Date(prev.anio, prev.mes + delta, 1);
      return { anio: nuevaFecha.getFullYear(), mes: nuevaFecha.getMonth() };
    });
  };

  // "Intérprete" de fechas: si la nota es de hoy, ayer o antes de ayer,
  // muestra un texto relativo + la hora ("Hoy 14:30", "Ayer 14:30",
  // "Antes de ayer 14:30"). Para cualquier fecha más vieja, muestra la
  // fecha completa como antes. La comparación de días ignora la hora,
  // así que se compara solo año/mes/día en la zona horaria local.
  const formatearFecha = (iso: string) => {
    const fecha = new Date(iso);
    const hoy = new Date();

    const soloFecha = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDias = Math.round((soloFecha(hoy) - soloFecha(fecha)) / 86_400_000);

    const hora = fecha.toLocaleString("es-UY", { hour: "2-digit", minute: "2-digit" });

    if (diffDias === 0) return `Hoy ${hora}`;
    if (diffDias === 1) return `Ayer ${hora}`;
    if (diffDias === 2) return `Antes de ayer ${hora}`;

    return fecha.toLocaleString("es-UY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hayBusqueda = terminoActivo.trim() !== "";

  // Con búsqueda activa se muestran los resultados de Firestore (ya vienen
  // ordenados por fecha desc); sin búsqueda, las notas del mes seleccionado
  // (también ya ordenadas por la consulta) — no hace falta volver a
  // filtrar ni ordenar del lado del cliente en ninguno de los dos casos.
  const notasVisibles = hayBusqueda ? resultadosBusqueda : notasDelMes;

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d1117] px-6 py-16 text-white">

      <div className="mb-6 flex w-full max-w-2xl items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <h1 className="text-3xl font-bold">Notas</h1>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Plus size={18} />
          Nueva nota
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-6 flex w-full max-w-2xl gap-2">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleBusquedaKeyDown}
            placeholder="Buscar por depto, recepción, mantenimiento…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />
        </div>
        <button
          onClick={handleBuscar}
          className="rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Buscar
        </button>
      </div>

      {/* Selector de mes (oculto mientras hay una búsqueda activa) */}
      {hayBusqueda ? (
        <div className="mb-6 flex items-center gap-3 text-sm text-gray-400">
          <span>
            Resultados para "<span className="font-medium text-white">{terminoActivo}</span>"
          </span>
          <button
            onClick={handleLimpiarBusqueda}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300 transition hover:bg-white/10"
          >
            Limpiar
          </button>
        </div>
      ) : (
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => cambiarMes(-1)}
            className="rounded-lg border border-white/10 p-2 transition hover:bg-white/10"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="w-44 text-center text-lg font-semibold capitalize">
            {MESES[mesSeleccionado.mes]} {mesSeleccionado.anio}
          </p>
          <button
            onClick={() => cambiarMes(1)}
            className="rounded-lg border border-white/10 p-2 transition hover:bg-white/10"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div className="flex w-full max-w-2xl flex-col gap-4">
        {cargandoNotas ? (
          <p className="text-center text-gray-400">Cargando notas…</p>
        ) : errorNotas ? (
          <p className="text-center text-red-400">{errorNotas}</p>
        ) : (
          <>
            {notasVisibles.length === 0 && (
              <p className="text-center text-gray-400">
                {hayBusqueda
                  ? `No se encontraron notas para "${terminoActivo}".`
                  : `No hay notas en ${MESES[mesSeleccionado.mes].toLowerCase()} de ${mesSeleccionado.anio}.`}
              </p>
            )}

            {notasVisibles.map((nota) => (
              <NoteCard
                key={nota.id}
                nota={nota}
                esNueva={notasNuevasIds.has(nota.id)}
                formatearFecha={formatearFecha}
                onAddComment={(contenido) => handleAddComment(nota.id, contenido)}
              />
            ))}
          </>
        )}
      </div>

      <CreateNoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNoteCreated={handleNoteCreated}
      />

      <Loader visible={buscando} mensaje="Buscando notas…" />
    </main>
  );
}