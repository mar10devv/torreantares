import { useState } from "react";
import { X, Trash2, TriangleAlert } from "lucide-react";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

// Contraseña fija para autorizar el borrado de un usuario. Es una
// protección simple del lado del cliente (mismo criterio que el PIN de
// login en IngresarPinModal) — evita que cualquiera que use la pantalla
// borre usuarios sin querer o sin permiso, no es un mecanismo de
// seguridad a nivel de servidor.
const CONTRASENA_BORRADO = "0206";

interface ConfirmarBorradoUsuarioModalProps {
  usuario: Usuario | null;
  onClose: () => void;
  onConfirmar: () => void;
}

export default function ConfirmarBorradoUsuarioModal({
  usuario,
  onClose,
  onConfirmar,
}: ConfirmarBorradoUsuarioModalProps) {
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState(false);

  if (!usuario) return null;

  const resetYCerrar = () => {
    setContrasena("");
    setError(false);
    onClose();
  };

  const handleConfirmar = () => {
    if (contrasena !== CONTRASENA_BORRADO) {
      setError(true);
      return;
    }
    onConfirmar();
    resetYCerrar();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleConfirmar();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={resetYCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-red-500/25 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-5 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
            <Trash2 size={22} />
          </div>
          <button onClick={resetYCerrar} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <h2 className="text-lg font-bold text-white">Borrar a {usuario.nombre}</h2>
        <p className="mt-1 text-sm text-gray-400">
          Esta acción no se puede deshacer. Ingresá la contraseña para confirmar.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-400">Contraseña</label>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            value={contrasena}
            onChange={(e) => {
              setContrasena(e.target.value);
              setError(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="••••"
            className={`w-full rounded-lg border px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 ${
              error
                ? "border-red-500/60 bg-red-500/[0.06] focus:outline-red-500"
                : "border-white/10 bg-white/5 focus:outline-blue-500"
            }`}
          />
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <TriangleAlert size={13} />
              Contraseña incorrecta.
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={resetYCerrar}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            <Trash2 size={16} />
            Borrar usuario
          </button>
        </div>
      </div>
    </div>
  );
}