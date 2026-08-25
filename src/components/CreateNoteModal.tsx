import { useRef, useState } from "react";
import { X, Send, Loader2 } from "lucide-react";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteCreated: (contenido: string) => void | Promise<void>;
}

const ALTURA_MAX_TEXTAREA = 200; // px, a partir de acá el textarea scrollea en vez de seguir creciendo

export default function CreateNoteModal({
  isOpen,
  onClose,
  onNoteCreated,
}: CreateNoteModalProps) {
  const [contenido, setContenido] = useState("");
  const [error, setError] = useState("");
  const [publicando, setPublicando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setContenido("");
    setError("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  // Mientras se está publicando, no dejamos cerrar el modal (ni por la X
  // ni haciendo click afuera), para que el usuario no pierda de vista que
  // la nota se está guardando.
  const handleClose = () => {
    if (publicando) return;
    resetForm();
    onClose();
  };

  // El textarea crece con el contenido, como el compositor de un chat,
  // hasta un tope, a partir del cual empieza a scrollear internamente.
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContenido(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, ALTURA_MAX_TEXTAREA)}px`;
  };

  const handleGuardar = async () => {
    if (!contenido.trim()) {
      setError("La nota no puede estar vacía.");
      return;
    }

    setError("");
    setPublicando(true);
    try {
      // Esperamos a que la nota quede realmente publicada (creada en la
      // base de datos y reflejada en la lista) antes de cerrar el modal.
      await onNoteCreated(contenido.trim());
      resetForm();
      onClose();
    } catch (err) {
      console.error("Error al publicar la nota:", err);
      setError("No se pudo publicar la nota. Intentá de nuevo.");
    } finally {
      setPublicando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter publica, Shift+Enter agrega un salto de línea (como en Telegram).
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGuardar();
    }
  };

  const puedeEnviar = contenido.trim() !== "" && !publicando;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#171b22]/95 shadow-2xl backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Nueva nota</h2>
            <p className="text-xs text-gray-500">Se publica en el muro para todos</p>
          </div>

          <button
            onClick={handleClose}
            disabled={publicando}
            className="rounded-full p-2 transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
          >
            <X className="text-white" size={20} />
          </button>
        </div>

        {/* Cuerpo: barra de composición estilo chat */}
        <div className="px-6 py-6">
          <div
            className={`flex items-end gap-2 rounded-3xl border bg-white/5 px-4 py-2.5 transition ${
              error ? "border-red-500/50" : "border-white/10 focus-within:border-blue-500/60"
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={contenido}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Escribí una nota, ej: Apartamento 500 rompió un vaso..."
              disabled={publicando}
              className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[15px] text-white outline-none placeholder:text-gray-500 disabled:opacity-50"
            />

            <button
              onClick={handleGuardar}
              disabled={!puedeEnviar}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition enabled:hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500"
            >
              {publicando ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={16} className="translate-x-[-1px]" />
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between px-1">
            <p className="text-xs text-red-500">{error}</p>
            <p className="text-[11px] text-gray-600">Enter para publicar · Shift+Enter para salto de línea</p>
          </div>
        </div>
      </div>
    </div>
  );
}