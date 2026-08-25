import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import CreateNoteModal from "./CreateNoteModal";
import NoteCard from "./NoteCard";
import Loader from "./Loader";
import { crearNotaEnDB, obtenerNotasDeDB, agregarComentarioEnDB } from "../lib/firebase";

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

// tiempo simulado (ms) que tarda la "consulta a la base de datos" del buscador.
// Cuando haya una búsqueda real contra un backend, esto desaparece: el loader
// se mostraría mientras dura el fetch real, no un timeout fijo como ahora.
const DEMORA_BUSQUEDA_MS = 700;

function cargarLeidasPorUsuario(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const guardado = localStorage.getItem(LEIDAS_KEY);
    return guardado ? JSON.parse(guardado) : {};
  } catch {
    return {};
  }
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
  const busquedaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Las notas ahora viven en Firestore, no en localStorage.
  const [notas, setNotas] = useState<Nota[]>([]);
  const [cargandoNotas, setCargandoNotas] = useState(true);
  const [errorNotas, setErrorNotas] = useState("");

  // Notas que este usuario todavía no había visto la última vez que entró.
  // Es un snapshot fijo: se calcula una sola vez, apenas terminan de cargar
  // las notas por primera vez, y no vuelve a recalcularse en esta visita.
  const [notasNuevasIds, setNotasNuevasIds] = useState<Set<string>>(new Set());
  const yaCalculoNuevasRef = useRef(false);

  // Trae la lista de notas desde Firestore. Se usa tanto al montar el
  // componente como después de crear una nota o agregar un comentario.
  const cargarNotas = async () => {
    try {
      setErrorNotas("");
      const datos = await obtenerNotasDeDB();
      setNotas(datos as unknown as Nota[]);
      return datos as unknown as Nota[];
    } catch (err) {
      console.error("Error al cargar notas desde Firestore:", err);
      setErrorNotas("No se pudieron cargar las notas. Revisá tu conexión.");
      return [];
    } finally {
      setCargandoNotas(false);
    }
  };

  useEffect(() => {
    (async () => {
      const datos = await cargarNotas();

      // Calcula qué notas son "nuevas" para este usuario, usando el registro
      // de lectura tal como estaba ANTES de esta visita.
      const leidasPorUsuario = cargarLeidasPorUsuario();
      const leidasDeEsteUsuario = new Set(leidasPorUsuario[usuario.nombre] ?? []);
      const nuevas = new Set(
        datos
          .filter((n) => n.autor !== usuario.nombre && !leidasDeEsteUsuario.has(n.id))
          .map((n) => n.id)
      );
      setNotasNuevasIds(nuevas);
      yaCalculoNuevasRef.current = true;

      // Marca todas las notas actuales como leídas para la próxima visita.
      leidasPorUsuario[usuario.nombre] = datos.map((n) => n.id);
      localStorage.setItem(LEIDAS_KEY, JSON.stringify(leidasPorUsuario));

      onListo?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buscador: se dispara manualmente (botón "Buscar" o tecla Enter), no
  // en cada letra tipeada. Simula una consulta a la base de datos con un
  // pequeño delay, mostrando el loader mientras "busca". Cuando el buscador
  // se conecte a un backend real, este bloque pasa a ser un fetch/await con
  // el término como filtro, y el loader se muestra mientras dura ese fetch
  // en vez del timeout.
  const handleBuscar = () => {
    if (busquedaTimeoutRef.current) clearTimeout(busquedaTimeoutRef.current);

    const termino = busqueda.trim();

    if (termino === "") {
      setTerminoActivo("");
      setBuscando(false);
      return;
    }

    setBuscando(true);
    busquedaTimeoutRef.current = setTimeout(() => {
      setTerminoActivo(termino);
      setBuscando(false);
    }, DEMORA_BUSQUEDA_MS);
  };

  const handleLimpiarBusqueda = () => {
    if (busquedaTimeoutRef.current) clearTimeout(busquedaTimeoutRef.current);
    setBusqueda("");
    setTerminoActivo("");
    setBuscando(false);
  };

  const handleBusquedaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleBuscar();
  };

  const handleNoteCreated = async (contenido: string) => {
    try {
      await crearNotaEnDB({ contenido, autor: usuario.nombre });
      await cargarNotas();
    } catch (err) {
      console.error("Error al crear nota en Firestore:", err);
      setErrorNotas("No se pudo crear la nota. Intentá de nuevo.");
      throw err;
    }
  };

  const handleAddComment = async (notaId: string, contenido: string) => {
    try {
      await agregarComentarioEnDB(notaId, { contenido, autor: usuario.nombre });
      await cargarNotas();
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

  // Con búsqueda activa: se busca en TODAS las notas (sin importar el mes),
  // por contenido o autor. Sin búsqueda: se respeta el mes seleccionado.
  const notasFiltradas = hayBusqueda
    ? notas.filter((nota) => {
        const termino = terminoActivo.toLowerCase();
        return (
          nota.contenido.toLowerCase().includes(termino) ||
          nota.autor.toLowerCase().includes(termino)
        );
      })
    : notas.filter((nota) => {
        const fecha = new Date(nota.fecha);
        return fecha.getFullYear() === mesSeleccionado.anio && fecha.getMonth() === mesSeleccionado.mes;
      });

  // Más recientes primero
  const notasOrdenadas = [...notasFiltradas].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

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
            {notasOrdenadas.length === 0 && (
              <p className="text-center text-gray-400">
                {hayBusqueda
                  ? `No se encontraron notas para "${terminoActivo}".`
                  : `No hay notas en ${MESES[mesSeleccionado.mes].toLowerCase()} de ${mesSeleccionado.anio}.`}
              </p>
            )}

            {notasOrdenadas.map((nota) => (
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