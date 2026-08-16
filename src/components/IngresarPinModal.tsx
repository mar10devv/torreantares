import { useState, useEffect, useRef } from "react";
import { X, Lock } from "lucide-react";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface IngresarPinModalProps {
  /** Usuario que está intentando iniciar sesión. null = modal cerrado. */
  usuario: Usuario | null;
  onClose: () => void;
  /** Se llama solo cuando el PIN ingresado coincide con el del usuario. */
  onCoincide: (usuario: Usuario) => void;
}

export default function IngresarPinModal({ usuario, onClose, onCoincide }: IngresarPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cada vez que se abre para un usuario nuevo, arranca limpio y enfoca el input.
  useEffect(() => {
    if (usuario) {
      setPin("");
      setError(false);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [usuario]);

  if (!usuario) return null;

  const handleChange = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, "").slice(0, 4);
    setPin(soloNumeros);
    setError(false);

    // Se verifica solo, apenas se completan los 4 dígitos (no hace falta botón).
    if (soloNumeros.length === 4) {
      if (soloNumeros === usuario.contrasena) {
        onCoincide(usuario);
      } else {
        setError(true);
      }
    }
  };

  const handleClose = () => {
    setPin("");
    setError(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xs rounded-3xl border border-white/10 bg-[#171b22]/95 p-8 text-center shadow-2xl backdrop-blur-2xl"
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-white/10"
        >
          <X className="text-white" size={20} />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
          <Lock size={26} />
        </div>

        <h2 className="text-lg font-bold text-white">{usuario.nombre}</h2>
        <p className="mt-1 text-sm text-gray-400">Ingresá tu PIN para continuar</p>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={4}
          className={`mt-6 w-full rounded-2xl border bg-white/5 px-4 py-4 text-center text-3xl tracking-[0.5em] text-white outline-none transition ${
            error
              ? "border-red-500/60 focus:outline-2 focus:outline-red-500"
              : "border-white/10 focus:outline-2 focus:outline-blue-500"
          }`}
          placeholder="••••"
        />

        {error && <p className="mt-3 text-sm text-red-400">PIN incorrecto, intentá de nuevo.</p>}
      </div>
    </div>
  );
}