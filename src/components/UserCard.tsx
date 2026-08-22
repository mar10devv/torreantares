import { useState, useRef, useEffect } from "react";
import { MoreVertical, Briefcase, LogIn } from "lucide-react";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface UserCardProps {
  usuario: Usuario;
  onEdit: () => void;
  onDelete: () => void;
  onLogin: () => void;
}

// Mismo set de acentos que usa el Dashboard, para que la app se sienta
// consistente: cada usuario "hereda" uno de estos colores según su
// nombre, y ese color se usa tanto en el avatar como en el glow/borde
// de la card. Todos los valores acá son estáticos (no se animan en
// bucle), así que no tienen costo de rendimiento extra.
type Acento = "blue" | "orange" | "emerald" | "cyan" | "fuchsia" | "indigo";

const ACENTOS: Record<
  Acento,
  { gradiente: string; glow: string; borderHover: string; chipBg: string; chipText: string }
> = {
  blue: {
    gradiente: "from-blue-500 to-blue-700",
    glow: "shadow-[0_0_40px_-12px_rgba(59,130,246,0.55)]",
    borderHover: "hover:border-blue-500/40",
    chipBg: "bg-blue-500/15",
    chipText: "text-blue-300",
  },
  orange: {
    gradiente: "from-orange-500 to-orange-700",
    glow: "shadow-[0_0_40px_-12px_rgba(249,115,22,0.55)]",
    borderHover: "hover:border-orange-500/40",
    chipBg: "bg-orange-500/15",
    chipText: "text-orange-300",
  },
  emerald: {
    gradiente: "from-emerald-500 to-emerald-700",
    glow: "shadow-[0_0_40px_-12px_rgba(16,185,129,0.55)]",
    borderHover: "hover:border-emerald-500/40",
    chipBg: "bg-emerald-500/15",
    chipText: "text-emerald-300",
  },
  cyan: {
    gradiente: "from-cyan-500 to-cyan-700",
    glow: "shadow-[0_0_40px_-12px_rgba(6,182,212,0.55)]",
    borderHover: "hover:border-cyan-500/40",
    chipBg: "bg-cyan-500/15",
    chipText: "text-cyan-300",
  },
  fuchsia: {
    gradiente: "from-fuchsia-500 to-fuchsia-700",
    glow: "shadow-[0_0_40px_-12px_rgba(217,70,239,0.55)]",
    borderHover: "hover:border-fuchsia-500/40",
    chipBg: "bg-fuchsia-500/15",
    chipText: "text-fuchsia-300",
  },
  indigo: {
    gradiente: "from-indigo-500 to-indigo-700",
    glow: "shadow-[0_0_40px_-12px_rgba(99,102,241,0.55)]",
    borderHover: "hover:border-indigo-500/40",
    chipBg: "bg-indigo-500/15",
    chipText: "text-indigo-300",
  },
};

const ORDEN_ACENTOS: Acento[] = ["blue", "emerald", "orange", "fuchsia", "cyan", "indigo"];

function acentoParaNombre(nombre: string): Acento {
  const hash = nombre
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ORDEN_ACENTOS[hash % ORDEN_ACENTOS.length];
}

export default function UserCard({ usuario, onEdit, onDelete, onLogin }: UserCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const inicial = usuario.nombre.trim().charAt(0).toUpperCase();
  const acento = ACENTOS[acentoParaNombre(usuario.nombre)];

  return (
    <div
      onClick={onLogin}
      className={`group relative flex h-52 w-44 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] px-4 shadow-xl transition-[transform,background-color,border-color] duration-200 ease-out will-change-transform hover:scale-105 hover:bg-white/10 ${acento.borderHover}`}
    >
      {/* Franja de acento arriba de la card — le da identidad de color
          desde el primer vistazo, sin necesitar blur ni animación. */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${acento.gradiente}`} />

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((prev) => !prev);
        }}
        className="absolute right-2 top-4 rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
      >
        <MoreVertical size={18} />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-11 z-10 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#171b22] shadow-2xl"
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/10"
          >
            Editar usuario
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-white/10"
          >
            Eliminar usuario
          </button>
        </div>
      )}

      {/* Avatar con glow de color detrás — el shadow es estático (no
          anima en bucle), así que es "gratis" en términos de rendimiento
          aunque le dé bastante presencia visual a la card. */}
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-bold text-white ${acento.gradiente} ${acento.glow}`}
      >
        {inicial}
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="text-base font-semibold leading-tight text-white">{usuario.nombre}</span>
        {usuario.cargo && (
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${acento.chipBg} ${acento.chipText}`}
          >
            <Briefcase size={11} />
            {usuario.cargo}
          </span>
        )}
      </div>

      <span
        className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${acento.chipText}`}
      >
        Entrar <LogIn size={12} />
      </span>
    </div>
  );
}