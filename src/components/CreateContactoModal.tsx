import { useState } from "react";
import { X, Check } from "lucide-react";
import type { Contacto, NuevoContactoData } from "./Contactos";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface CreateContactoModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: Usuario;
  onCrear: (datos: NuevoContactoData) => void;
  /** Si viene, el modal precarga estos datos y pasa a modo edición. */
  contactoInicial?: Contacto | null;
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-400";

const ESTADO_INICIAL = {
  nombre: "",
  apellido: "",
  apartamento: "",
  email: "",
  telefono: "",
};

export default function CreateContactoModal({
  isOpen,
  onClose,
  onCrear,
  contactoInicial,
}: CreateContactoModalProps) {
  const esEdicion = !!contactoInicial;

  const [form, setForm] = useState(() =>
    contactoInicial
      ? {
          nombre: contactoInicial.nombre,
          apellido: contactoInicial.apellido,
          apartamento: contactoInicial.apartamento ?? "",
          email: contactoInicial.email,
          telefono: contactoInicial.telefono,
        }
      : ESTADO_INICIAL
  );

  if (!isOpen) return null;

  const set = (campo: keyof typeof ESTADO_INICIAL, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const handleClose = () => {
    setForm(ESTADO_INICIAL);
    onClose();
  };

  const handleSubmit = () => {
    const faltantes: string[] = [];
    if (!form.nombre.trim()) faltantes.push("Nombre");
    if (!form.apellido.trim()) faltantes.push("Apellido");
    if (!form.email.trim()) faltantes.push("Email");
    if (!form.telefono.trim()) faltantes.push("Teléfono");

    if (faltantes.length > 0) {
      window.alert(`Faltan completar los siguientes datos obligatorios:\n\n${faltantes.join("\n")}`);
      return;
    }

    const datos: NuevoContactoData = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      apartamento: form.apartamento.trim() || undefined,
      email: form.email.trim(),
      telefono: form.telefono.trim(),
    };

    onCrear(datos);
    setForm(ESTADO_INICIAL);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-xl font-bold text-white">{esEdicion ? "Editar contacto" : "Nuevo contacto"}</h2>
          <button onClick={handleClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                autoFocus
                type="text"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="Nombre"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input
                type="text"
                value={form.apellido}
                onChange={(e) => set("apellido", e.target.value)}
                placeholder="Apellido"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Apartamento <span className="text-gray-500">· opcional</span>
            </label>
            <input
              type="text"
              value={form.apartamento}
              onChange={(e) => set("apartamento", e.target.value)}
              placeholder="N.º de depto"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="correo@ejemplo.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => set("telefono", e.target.value)}
              placeholder="09X XXX XXX"
              className={inputClass}
            />
          </div>

          <div className="mt-2 flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Check size={16} />
              {esEdicion ? "Guardar cambios" : "Guardar contacto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}