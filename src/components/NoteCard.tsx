import { useState } from "react";
import { MessageSquarePlus, Send } from "lucide-react";

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

interface NoteCardProps {
  nota: Nota;
  onAddComment: (contenido: string) => void;
  formatearFecha: (iso: string) => string;
}

// Genera un color de acento estable a partir del nombre, así cada persona
// siempre tiene el mismo color de avatar en toda la app.
const COLORES_AVATAR = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-fuchsia-500",
  "bg-cyan-500",
  "bg-rose-500",
];

function colorParaNombre(nombre: string) {
  const hash = nombre
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORES_AVATAR[hash % COLORES_AVATAR.length];
}

function Avatar({ nombre, tamano = "sm" }: { nombre: string; tamano?: "sm" | "xs" }) {
  const inicial = nombre.trim().charAt(0).toUpperCase();
  const dimensiones = tamano === "sm" ? "h-8 w-8 text-sm" : "h-6 w-6 text-xs";

  return (
    <div
      className={`flex ${dimensiones} shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorParaNombre(nombre)}`}
    >
      {inicial}
    </div>
  );
}

// Detecta si la nota fue generada automáticamente desde una cancelación
// (Parrilleros o Ingresos) y separa el prefijo fijo del motivo, para poder
// destacar solo el prefijo con un fondo de color.
const PREFIJO_CANCELACION = /^(Cancela (?:parrillero unidad|ingreso depto)[^:]*:)\s*([\s\S]*)$/;

function ContenidoNota({ contenido }: { contenido: string }) {
  const match = contenido.match(PREFIJO_CANCELACION);

  if (!match) {
    return <p className="text-[15px] leading-snug text-white">{contenido}</p>;
  }

  const [, prefijo, motivo] = match;

  return (
    <p className="text-[15px] leading-snug text-white">
      <span className="mr-1.5 inline-block rounded-md bg-red-500/20 px-2 py-0.5 font-semibold text-red-300">
        {prefijo}
      </span>
      {motivo}
    </p>
  );
}

export default function NoteCard({ nota, onAddComment, formatearFecha }: NoteCardProps) {
  const [comentario, setComentario] = useState("");
  const [mostrarInput, setMostrarInput] = useState(false);

  const handleEnviar = () => {
    if (!comentario.trim()) return;
    onAddComment(comentario.trim());
    setComentario("");
    setMostrarInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleEnviar();
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur-2xl">

      {/* Nota principal */}
      <div className="flex gap-3">
        <Avatar nombre={nota.autor} tamano="sm" />
        <div className="min-w-0 flex-1">
          <ContenidoNota contenido={nota.contenido} />
          <p className="mt-1.5 text-xs text-gray-400">
            <span className="font-medium text-gray-300">{nota.autor}</span> · {formatearFecha(nota.fecha)}
          </p>
        </div>
      </div>

      {/* Comentarios: anidados, con hilo conector e indentados a la altura del avatar */}
      {nota.comentarios.length > 0 && (
        <div className="relative mt-4 ml-4 flex flex-col gap-3 border-l-2 border-white/10 pl-6">
          {nota.comentarios.map((c, index) => (
            <div key={index} className="flex gap-2.5 rounded-xl bg-black/25 p-3">
              <Avatar nombre={c.autor} tamano="xs" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-gray-100">{c.contenido}</p>
                <p className="mt-1 text-[11px] text-gray-500">
                  <span className="font-medium text-gray-400">{c.autor}</span> · {formatearFecha(c.fecha)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón para mostrar el input de comentario */}
      {!mostrarInput && (
        <button
          onClick={() => setMostrarInput(true)}
          className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-sm text-gray-400 transition hover:text-white"
        >
          <MessageSquarePlus size={16} />
          Añadir un comentario sobre esta nota
        </button>
      )}

      {/* Input para nuevo comentario */}
      {mostrarInput && (
        <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
          <input
            autoFocus
            type="text"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribir un comentario..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />
          <button
            onClick={handleEnviar}
            className="rounded-lg bg-blue-600 px-3 py-2 text-white transition hover:bg-blue-500"
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
}