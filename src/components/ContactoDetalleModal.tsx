import { X, Phone, Mail } from "lucide-react";

export interface ContactoDetalle {
  nombre: string;
  subtitulo?: string;
  telefono?: string;
  email?: string;
}

interface ContactoDetalleModalProps {
  contacto: ContactoDetalle | null;
  onClose: () => void;
}

// Algunos servicios tienen más de un número, separados por "/" (ej: "094402193 / 42232598").
// Se muestran como botones de llamada independientes.
function parsearTelefonos(telefono?: string): string[] {
  if (!telefono) return [];
  return telefono
    .split("/")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function ContactoDetalleModal({ contacto, onClose }: ContactoDetalleModalProps) {
  if (!contacto) return null;

  const inicial = contacto.nombre.trim().charAt(0).toUpperCase() || "?";
  const telefonos = parsearTelefonos(contacto.telefono);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#171b22]/95 p-8 text-center shadow-2xl backdrop-blur-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-white/10"
        >
          <X className="text-white" size={20} />
        </button>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-600/20 text-3xl font-bold text-blue-300">
          {inicial}
        </div>

        <h2 className="mt-4 text-2xl font-bold leading-tight text-white">{contacto.nombre}</h2>
        {contacto.subtitulo && <p className="mt-1 text-base text-gray-400">{contacto.subtitulo}</p>}

        <div className="mt-7 flex flex-col gap-3">
          {telefonos.map((tel) => (
            <a
              key={tel}
              href={`tel:${tel.replace(/\s+/g, "")}`}
              className="flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-4 py-4 text-xl font-bold tracking-wide text-white transition hover:bg-blue-500 active:scale-[0.98]"
            >
              <Phone size={22} />
              {tel}
            </a>
          ))}

          {contacto.email && (
            <a
              href={`mailto:${contacto.email}`}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-gray-200 transition hover:bg-white/10"
            >
              <Mail size={18} />
              <span className="truncate">{contacto.email}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}