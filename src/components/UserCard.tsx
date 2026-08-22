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

// Mismo criterio que en Notas: cada persona tiene siempre el mismo color de avatar.
const COLORES_AVATAR = [
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-amber-500 to-amber-700",
  "from-fuchsia-500 to-fuchsia-700",
  "from-cyan-500 to-cyan-700",
  "from-rose-500 to-rose-700",
];

function colorParaNombre(nombre: string) {
  const hash = nombre
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORES_AVATAR[hash % COLORES_AVATAR.length];
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

  return (
    <div
      onClick={onLogin}
      // Antes: backdrop-blur-2xl permanente en cada card + transition-all +
      // hover:scale-105. El blur activo todo el tiempo ya es costoso con
      // varias cards en pantalla, y al escalar en hover el navegador tiene
      // que recalcular esa área de blur en cada frame — ahí se sentía el
      // lag en GPUs con compositing limitado (Win7 sin drivers al día).
      //
      // Ahora: sin backdrop-blur (el "vidrio esmerilado" lo simulamos con
      // un bg-white/10 sólido, que da un efecto visual muy parecido sin
      // pedirle nada al compositor), y transiciones específicas en vez de
      // "all" — solo animamos transform, background-color y border-color,
      // que son baratas cuando no hay blur de por medio.
      className="group relative flex h-48 w-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-4 shadow-xl transition-[transform,background-color,border-color] duration-200 ease-out will-change-transform hover:scale-105 hover:border-blue-500/30 hover:bg-white/15"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((prev) => !prev);
        }}
        className="absolute right-2 top-2 rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
      >
        <MoreVertical size={18} />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-10 z-10 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#171b22] shadow-2xl"
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

      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-lg ${colorParaNombre(
          usuario.nombre
        )}`}
      >
        {inicial}
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="text-base font-semibold leading-tight text-white">{usuario.nombre}</span>
        {usuario.cargo && (
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-gray-300">
            <Briefcase size={11} />
            {usuario.cargo}
          </span>
        )}
      </div>

      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-blue-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        Entrar <LogIn size={12} />
      </span>
    </div>
  );
}