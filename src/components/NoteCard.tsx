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
  esNueva?: boolean;
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
  const dimensiones = tamano === "sm" ? "h-9 w-9 text-sm" : "h-6 w-6 text-[11px]";

  return (
    <div
      className={`flex ${dimensiones} shrink-0 items-center justify-center rounded-full font-semibold text-white ${colorParaNombre(nombre)}`}
    >
      {inicial}
    </div>
  );
}

// Detecta si la nota fue generada automáticamente (cancelación o ingreso
// nuevo) y separa el prefijo fijo del resto, para poder destacar solo el
// prefijo con un fondo de color: rojo para cancelaciones, verde para
// ingresos nuevos. Se prueba cada patrón en orden y se usa el primero que
// matchee.
const PREFIJOS_DESTACADOS: { regex: RegExp; color: "red" | "emerald" }[] = [
  { regex: /^(Cancela (?:parrillero unidad|ingreso depto)[^:]*:)\s*([\s\S]*)$/, color: "red" },
  { regex: /^(Nuevo ingreso depto[^:]*:)\s*([\s\S]*)$/, color: "emerald" },
];

const COLOR_CLASSES: Record<"red" | "emerald", string> = {
  red: "bg-red-500/25 text-red-200",
  emerald: "bg-emerald-500/25 text-emerald-200",
};

function ContenidoTexto({ contenido }: { contenido: string }) {
  for (const { regex, color } of PREFIJOS_DESTACADOS) {
    const match = contenido.match(regex);
    if (!match) continue;

    const [, prefijo, resto] = match;
    return (
      <p className="text-[15px] font-medium leading-snug">
        <span className={`mr-1.5 inline-block rounded-md px-2 py-0.5 font-semibold ${COLOR_CLASSES[color]}`}>
          {prefijo}
        </span>
        {resto}
      </p>
    );
  }

  return <p className="text-[15px] leading-snug">{contenido}</p>;
}

export default function NoteCard({ nota, onAddComment, formatearFecha, esNueva }: NoteCardProps) {
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
    <div className="flex items-start gap-2.5">
      <Avatar nombre={nota.autor} tamano="sm" />

      {/* Una sola burbuja: nota + comentarios + input, todo adentro */}
      <div
        className={`relative max-w-[80%] flex-1 rounded-2xl rounded-tl-sm bg-[#202c33] px-3.5 py-2 text-gray-100 shadow-md ${
          esNueva ? "ring-2 ring-blue-400/60" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className={`mb-0.5 text-xs font-semibold ${colorParaNombre(nota.autor).replace("bg-", "text-")}`}>
              {nota.autor}
            </p>
            <ContenidoTexto contenido={nota.contenido} />
          </div>
          {esNueva && (
            <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">
              Nuevo
            </span>
          )}
        </div>
        <p className="mt-1 text-right text-[11px] text-gray-400">{formatearFecha(nota.fecha)}</p>

        {/* Comentarios, como filas dentro de la misma burbuja */}
        {nota.comentarios.length > 0 && (
          <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {nota.comentarios.length === 1 ? "1 comentario añadido" : `${nota.comentarios.length} comentarios añadidos`}
            </p>
            {nota.comentarios.map((c, index) => (
              <div key={index} className="flex items-start gap-2">
                <Avatar nombre={c.autor} tamano="xs" />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${colorParaNombre(c.autor).replace("bg-", "text-")}`}>
                    {c.autor}
                  </p>
                  <p className="text-sm leading-snug text-gray-100">{c.contenido}</p>
                  <p className="mt-0.5 text-right text-[10px] text-gray-500">{formatearFecha(c.fecha)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Añadir comentario / input, siempre dentro de la misma burbuja */}
        <div className="mt-2 border-t border-white/10 pt-2">
          {mostrarInput ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribir un comentario..."
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
              />
              <button
                onClick={handleEnviar}
                className="flex shrink-0 items-center justify-center rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-500"
              >
                <Send size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setMostrarInput(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-white"
            >
              <MessageSquarePlus size={14} />
              Añadir un comentario sobre esta nota
            </button>
          )}
        </div>
      </div>
    </div>
  );
}