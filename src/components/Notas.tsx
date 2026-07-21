import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import CreateNoteModal from "./CreateNoteModal";
import NoteCard from "./NoteCard";
import Loader from "./Loader";

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

const STORAGE_KEY = "torreantares_notas";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// tiempo simulado (ms) que tarda la "consulta a la base de datos" del buscador.
// Cuando haya una búsqueda real contra un backend, esto desaparece: el loader
// se mostraría mientras dura el fetch real, no un timeout fijo como ahora.
const DEMORA_BUSQUEDA_MS = 700;

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

  const [notas, setNotas] = useState<Nota[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (!guardado) return [];
      const parsed = JSON.parse(guardado);
      // Compatibilidad: si hay notas viejas sin "comentarios", se les agrega vacío
      return parsed.map((n: Nota) => ({
        ...n,
        comentarios: n.comentarios ?? [],
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
  }, [notas]);

  useEffect(() => {
    // Por ahora las notas se leen de localStorage (sincrónico, sin demora real).
    // Avisamos que ya está listo apenas se monta, para cerrar el loader.
    //
    // Cuando esto pase a consultar una base de datos real, la idea es que la
    // consulta ya venga filtrada por mes/año (traer solo "el mes actual", y
    // pedir el resto bajo demanda al navegar con las flechas), en vez de traer
    // todas las notas y filtrarlas acá como hacemos ahora. Algo así:
    //
    //   useEffect(() => {
    //     (async () => {
    //       try {
    //         const data = await obtenerNotasDesdeApi({
    //           anio: mesSeleccionado.anio,
    //           mes: mesSeleccionado.mes,
    //         });
    //         setNotas(data);
    //       } finally {
    //         onListo?.();
    //       }
    //     })();
    //   }, [mesSeleccionado]);
    onListo?.();
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

  const handleNoteCreated = (contenido: string) => {
    const nuevaNota: Nota = {
      contenido,
      autor: usuario.nombre,
      fecha: new Date().toISOString(),
      comentarios: [],
    };
    setNotas((prev) => [...prev, nuevaNota]);
  };

  const handleAddComment = (notaIndexOriginal: number, contenido: string) => {
    const nuevoComentario: Comentario = {
      contenido,
      autor: usuario.nombre,
      fecha: new Date().toISOString(),
    };

    setNotas((prev) =>
      prev.map((n, i) =>
        i === notaIndexOriginal
          ? { ...n, comentarios: [...n.comentarios, nuevoComentario] }
          : n
      )
    );
  };

  const cambiarMes = (delta: number) => {
    setMesSeleccionado((prev) => {
      const nuevaFecha = new Date(prev.anio, prev.mes + delta, 1);
      return { anio: nuevaFecha.getFullYear(), mes: nuevaFecha.getMonth() };
    });
  };

  const formatearFecha = (iso: string) => {
    const fecha = new Date(iso);
    return fecha.toLocaleString("es-UY", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Guardamos el índice original (en el array "notas" sin ordenar) junto a cada nota,
  // así al agregar un comentario sabemos exactamente cuál actualizar en el estado real.
  const notasConIndice = notas.map((nota, indexOriginal) => ({ nota, indexOriginal }));

  const hayBusqueda = terminoActivo.trim() !== "";

  // Con búsqueda activa: se busca en TODAS las notas (sin importar el mes),
  // por contenido o autor. Sin búsqueda: se respeta el mes seleccionado.
  const notasFiltradas = hayBusqueda
    ? notasConIndice.filter(({ nota }) => {
        const termino = terminoActivo.toLowerCase();
        return (
          nota.contenido.toLowerCase().includes(termino) ||
          nota.autor.toLowerCase().includes(termino)
        );
      })
    : notasConIndice.filter(({ nota }) => {
        const fecha = new Date(nota.fecha);
        return fecha.getFullYear() === mesSeleccionado.anio && fecha.getMonth() === mesSeleccionado.mes;
      });

  // Más recientes primero
  const notasOrdenadas = [...notasFiltradas].sort(
    (a, b) => new Date(b.nota.fecha).getTime() - new Date(a.nota.fecha).getTime()
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
        {notasOrdenadas.length === 0 && (
          <p className="text-center text-gray-400">
            {hayBusqueda
              ? `No se encontraron notas para "${terminoActivo}".`
              : `No hay notas en ${MESES[mesSeleccionado.mes].toLowerCase()} de ${mesSeleccionado.anio}.`}
          </p>
        )}

        {notasOrdenadas.map(({ nota, indexOriginal }) => (
          <NoteCard
            key={indexOriginal}
            nota={nota}
            formatearFecha={formatearFecha}
            onAddComment={(contenido) => handleAddComment(indexOriginal, contenido)}
          />
        ))}
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