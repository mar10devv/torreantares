import { useState } from "react";
import { X } from "lucide-react";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteCreated: (contenido: string) => void;
}

export default function CreateNoteModal({
  isOpen,
  onClose,
  onNoteCreated,
}: CreateNoteModalProps) {
  const [contenido, setContenido] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const resetForm = () => {
    setContenido("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGuardar = () => {
    if (!contenido.trim()) {
      setError("La nota no puede estar vacía.");
      return;
    }

    onNoteCreated(contenido.trim());
    resetForm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#171b22]/90 p-8 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            Nueva nota
          </h2>

          <button
            onClick={handleClose}
            className="rounded-full p-2 transition hover:bg-white/10"
          >
            <X className="text-white" size={22} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Contenido <span className="text-red-500">*</span>
            </label>

            <textarea
              rows={5}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Ej: Apartamento 500 rompió un vaso"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={handleClose}
            className="rounded-xl border border-white/10 px-5 py-3 text-white transition hover:bg-white/10"
          >
            Cancelar
          </button>

          <button
            onClick={handleGuardar}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            Publicar nota
          </button>
        </div>
      </div>
    </div>
  );
}