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

// IMPORTANTE — por qué acá no usamos from-blue-500/to-blue-700 ni bg-blue-500/15:
// Tailwind v4 compila esas clases usando color-mix(in oklab, ...) por debajo,
// una función de CSS que Chrome recién soportó desde la v111. La PC de
// trabajo tiene Chrome 109, así que esas declaraciones se descartan enteras
// (aunque ya hayamos arreglado oklch() por separado con el plugin de
// PostCSS — color-mix() es OTRA función, sin relación). La solución acá es
// usar directamente valores arbitrarios de Tailwind (bg-[rgba(...)],
// bg-[linear-gradient(...)]), que generan CSS plano con rgba()/hex, sin
// pasar por oklch() ni color-mix() en ningún punto — funciona igual en
// cualquier Chrome, viejo o nuevo.
type Acento = "blue" | "orange" | "emerald" | "cyan" | "fuchsia" | "indigo";

const ACENTOS: Record<
  Acento,
  { gradiente: string; glow: string; borderHover: string; chipBg: string; chipText: string }
> = {
  blue: {
    gradiente: "bg-[linear-gradient(135deg,#3b82f6,#1d4ed8)]",
    glow: "shadow-[0_0_40px_-12px_rgba(59,130,246,0.55)]",
    borderHover: "hover:border-[rgba(59,130,246,0.4)]",
    chipBg: "bg-[rgba(59,130,246,0.15)]",
    chipText: "text-blue-300",
  },
  orange: {
    gradiente: "bg-[linear-gradient(135deg,#f97316,#c2410c)]",
    glow: "shadow-[0_0_40px_-12px_rgba(249,115,22,0.55)]",
    borderHover: "hover:border-[rgba(249,115,22,0.4)]",
    chipBg: "bg-[rgba(249,115,22,0.15)]",
    chipText: "text-orange-300",
  },
  emerald: {
    gradiente: "bg-[linear-gradient(135deg,#10b981,#047857)]",
    glow: "shadow-[0_0_40px_-12px_rgba(16,185,129,0.55)]",
    borderHover: "hover:border-[rgba(16,185,129,0.4)]",
    chipBg: "bg-[rgba(16,185,129,0.15)]",
    chipText: "text-emerald-300",
  },
  cyan: {
    gradiente: "bg-[linear-gradient(135deg,#06b6d4,#0e7490)]",
    glow: "shadow-[0_0_40px_-12px_rgba(6,182,212,0.55)]",
    borderHover: "hover:border-[rgba(6,182,212,0.4)]",
    chipBg: "bg-[rgba(6,182,212,0.15)]",
    chipText: "text-cyan-300",
  },
  fuchsia: {
    gradiente: "bg-[linear-gradient(135deg,#d946ef,#a21caf)]",
    glow: "shadow-[0_0_40px_-12px_rgba(217,70,239,0.55)]",
    borderHover: "hover:border-[rgba(217,70,239,0.4)]",
    chipBg: "bg-[rgba(217,70,239,0.15)]",
    chipText: "text-fuchsia-300",
  },
  indigo: {
    gradiente: "bg-[linear-gradient(135deg,#6366f1,#4338ca)]",
    glow: "shadow-[0_0_40px_-12px_rgba(99,102,241,0.55)]",
    borderHover: "hover:border-[rgba(99,102,241,0.4)]",
    chipBg: "bg-[rgba(99,102,241,0.15)]",
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
      className={`group relative flex h-52 w-44 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] px-4 shadow-xl transition-[transform,background-color,border-color] duration-200 ease-out will-change-transform hover:scale-105 hover:bg-[rgba(255,255,255,0.1)] ${acento.borderHover}`}
    >
      {/* Franja de acento arriba de la card */}
      <div className={`absolute inset-x-0 top-0 h-1 ${acento.gradiente}`} />

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((prev) => !prev);
        }}
        className="absolute right-2 top-4 rounded-full p-1.5 text-gray-400 transition hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
      >
        <MoreVertical size={18} />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-11 z-10 w-40 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#171b22] shadow-2xl"
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-white transition hover:bg-[rgba(255,255,255,0.1)]"
          >
            Editar usuario
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-[rgba(255,255,255,0.1)]"
          >
            Eliminar usuario
          </button>
        </div>
      )}

      {/* Avatar con glow de color detrás — el gradiente ahora es un
          bg-[linear-gradient(...)] con hex literal, no from-/to- de
          Tailwind, así que renderiza igual en cualquier Chrome. */}
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white ${acento.gradiente} ${acento.glow}`}
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