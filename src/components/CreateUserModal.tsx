import { useState, useEffect } from "react";
import { X, Lock } from "lucide-react";
import { crearUsuarioEnDB } from "../lib/firebase";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (usuario: Usuario) => void;
  onUserUpdated: (usuario: Usuario) => void;
  usuarioEditando: Usuario | null;
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onUserCreated,
  onUserUpdated,
  usuarioEditando,
}: CreateUserModalProps) {
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("Recepcionista");
  const [gmail, setGmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // --- Verificación de PIN actual (solo aplica en modo edición) ---
  const [pinVerificado, setPinVerificado] = useState(false);
  const [pinVerificacion, setPinVerificacion] = useState("");
  const [errorVerificacion, setErrorVerificacion] = useState("");

  const esEdicion = usuarioEditando !== null;

  // Cuando se abre el modal en modo edición, precarga los datos (menos el PIN,
  // que ahora se define desde cero una vez verificado el actual).
  // Cuando se abre en modo creación, arranca todo vacío.
  useEffect(() => {
    if (!isOpen) return;

    if (usuarioEditando) {
      setNombre(usuarioEditando.nombre);
      setCargo(usuarioEditando.cargo);
      setGmail(usuarioEditando.gmail);
      setTelefono(usuarioEditando.telefono);
      setContrasena("");
    } else {
      setNombre("");
      setCargo("Recepcionista");
      setGmail("");
      setTelefono("");
      setContrasena("");
    }

    // En modo edición siempre arranca sin verificar, así nadie puede
    // tocar el formulario sin antes confirmar el PIN actual.
    setPinVerificado(false);
    setPinVerificacion("");
    setErrorVerificacion("");
    setError("");
  }, [isOpen, usuarioEditando]);

  if (!isOpen) return null;

  const resetForm = () => {
    setNombre("");
    setCargo("Recepcionista");
    setGmail("");
    setTelefono("");
    setContrasena("");
    setError("");
    setPinVerificado(false);
    setPinVerificacion("");
    setErrorVerificacion("");
  };

  const handleClose = () => {
    if (guardando) return; // evita cerrar mientras se está guardando
    resetForm();
    onClose();
  };

  // El PIN solo acepta dígitos y se corta a 4 caracteres.
  const soloDigitos4 = (valor: string) => valor.replace(/\D/g, "").slice(0, 4);

  const handlePinVerificacionChange = (valor: string) => {
    setPinVerificacion(soloDigitos4(valor));
    if (errorVerificacion) setErrorVerificacion("");
  };

  const handlePinChange = (valor: string) => {
    setContrasena(soloDigitos4(valor));
  };

  const handleVerificarPin = () => {
    if (!usuarioEditando) return;

    if (!/^\d{1,4}$/.test(pinVerificacion)) {
      setErrorVerificacion("Ingresá el PIN actual.");
      return;
    }

    if (pinVerificacion !== usuarioEditando.contrasena) {
      setErrorVerificacion("El PIN es incorrecto.");
      return;
    }

    setErrorVerificacion("");
    setPinVerificado(true);
  };

  const handleGuardar = async () => {
    // Nadie debería llegar acá sin haber verificado el PIN actual en modo
    // edición, pero lo bloqueamos igual por las dudas.
    if (esEdicion && !pinVerificado) {
      setError("Primero tenés que verificar el PIN actual.");
      return;
    }

    if (!nombre.trim() || !cargo.trim() || !gmail.trim() || !telefono.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(gmail)) {
      setError("Ingresá un correo válido.");
      return;
    }

    // En creación el PIN es obligatorio. En edición es opcional: si se deja
    // vacío, se mantiene el PIN que ya tenía el usuario.
    if (!esEdicion && !contrasena.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (contrasena.trim() && !/^\d{1,4}$/.test(contrasena)) {
      setError("El PIN debe tener solo números, máximo 4 dígitos.");
      return;
    }

    setError("");

    const datosUsuario: Usuario = {
      nombre: nombre.trim(),
      cargo,
      gmail: gmail.trim(),
      telefono: telefono.trim(),
      contrasena: contrasena.trim()
        ? contrasena
        : (usuarioEditando as Usuario).contrasena,
    };

    if (esEdicion) {
      // La edición contra Firestore la conectamos en un paso aparte.
      onUserUpdated(datosUsuario);
      resetForm();
      onClose();
      return;
    }

    try {
      setGuardando(true);
      await crearUsuarioEnDB(datosUsuario);
      onUserCreated(datosUsuario);
      resetForm();
      onClose();
    } catch (err) {
      console.error("Error al crear usuario en Firestore:", err);
      setError("No se pudo crear el usuario. Intentá de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  // Modo edición, pero todavía no se verificó el PIN actual: mostramos
  // solo la pantalla de verificación, sin exponer ni permitir tocar nada más.
  const mostrarVerificacion = esEdicion && !pinVerificado;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#171b22]/90 p-8 shadow-2xl backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {mostrarVerificacion
              ? "Verificar PIN actual"
              : esEdicion
              ? "Editar usuario"
              : "Nuevo usuario"}
          </h2>

          <button
            onClick={handleClose}
            className="rounded-full p-2 transition hover:bg-white/10"
          >
            <X className="text-white" size={22} />
          </button>
        </div>

        {mostrarVerificacion ? (
          /* --- Paso 1: verificar el PIN actual --- */
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <Lock className="shrink-0 text-blue-400" size={20} />
              <p className="text-sm text-gray-300">
                Por seguridad, ingresá el PIN actual de{" "}
                <span className="font-semibold text-white">
                  {usuarioEditando?.nombre}
                </span>{" "}
                antes de poder modificar sus datos.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                PIN actual <span className="text-red-500">*</span>
              </label>

              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                required
                value={pinVerificacion}
                onChange={(e) => handlePinVerificacionChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerificarPin();
                }}
                maxLength={4}
                placeholder="••••"
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none transition focus:outline-2 focus:outline-blue-500"
              />
            </div>

            {errorVerificacion && (
              <p className="text-sm text-red-500">{errorVerificacion}</p>
            )}

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={handleClose}
                className="rounded-xl border border-white/10 px-5 py-3 text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>

              <button
                onClick={handleVerificarPin}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
              >
                Verificar
              </button>
            </div>
          </div>
        ) : (
          /* --- Paso 2 (o creación directa): formulario completo --- */
          <>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Nombre del empleado <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:outline-2 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Cargo <span className="text-red-500">*</span>
                </label>

                <select
                  required
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:outline-2 focus:outline-blue-500"
                >
                  <option className="bg-[#171b22] text-white" value="Recepcionista">
                    Recepcionista
                  </option>
                  <option className="bg-[#171b22] text-white" value="Administración">
                    Administración
                  </option>
                  <option className="bg-[#171b22] text-white" value="Limpieza">
                    Limpieza
                  </option>
                  <option className="bg-[#171b22] text-white" value="Mantenimiento">
                    Mantenimiento
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Gmail <span className="text-red-500">*</span>
                </label>

                <input
                  type="email"
                  required
                  value={gmail}
                  onChange={(e) => setGmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:outline-2 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Número de teléfono <span className="text-red-500">*</span>
                </label>

                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition focus:outline-2 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  {esEdicion
                    ? "Nuevo PIN (opcional)"
                    : "PIN (máximo 4 dígitos)"}{" "}
                  {!esEdicion && <span className="text-red-500">*</span>}
                </label>

                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  required={!esEdicion}
                  value={contrasena}
                  onChange={(e) => handlePinChange(e.target.value)}
                  maxLength={4}
                  placeholder="••••"
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none transition focus:outline-2 focus:outline-blue-500"
                />

                {esEdicion && (
                  <p className="mt-2 text-xs text-gray-400">
                    Dejalo vacío para mantener el PIN actual.
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            {/* Botones */}
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={handleClose}
                disabled={guardando}
                className="rounded-xl border border-white/10 px-5 py-3 text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}