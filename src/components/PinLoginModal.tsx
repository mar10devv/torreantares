import { useState, useEffect } from "react";
import { X, Lock, LogIn } from "lucide-react";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface PinLoginModalProps {
  usuario: Usuario | null;
  onClose: () => void;
  onSuccess: (usuario: Usuario) => void;
}

export default function PinLoginModal({ usuario, onClose, onSuccess }: PinLoginModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  // Cada vez que se abre (cambia de usuario), arranca limpio.
  useEffect(() => {
    setPin("");
    setError("");
  }, [usuario]);

  if (!usuario) return null;

  const handlePinChange = (valor: string) => {
    const soloDigitos = valor.replace(/\D/g, "").slice(0, 5);
    setPin(soloDigitos);
    if (error) setError("");
  };

  const handleConfirmar = () => {
    if (!pin) {
      setError("Ingresá tu PIN.");
      return;
    }
    if (pin !== usuario.contrasena) {
      setError("PIN incorrecto.");
      setPin("");
      return;
    }
    onSuccess(usuario);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleConfirmar();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{usuario.nombre}</h2>
              <p className="text-xs text-gray-400">{usuario.cargo}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-gray-400">Ingresá tu PIN</label>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={5}
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="••••"
          className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center text-2xl tracking-[0.4em] text-white outline-none transition placeholder:tracking-normal placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
        />

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <button
          onClick={handleConfirmar}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
        >
          <LogIn size={18} />
          Ingresar
        </button>
      </div>
    </div>
  );
}