import { useEffect } from "react";
import { StickyNote, Beef, DoorOpen, Car, Users, Settings, LogOut, Zap } from "lucide-react";
import logo from "../assets/logo.png";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface DashboardProps {
  usuario: Usuario;
  onVolver: () => void;
  onNavigate: (modulo: string) => void;
  onListo?: () => void;
}

type Color = "blue" | "orange" | "emerald" | "cyan" | "yellow" | "fuchsia" | "slate";

const COLOR_CLASSES: Record<Color, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "hover:border-blue-500/30" },
  orange: { bg: "bg-orange-500/15", text: "text-orange-400", border: "hover:border-orange-500/30" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "hover:border-emerald-500/30" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "hover:border-cyan-500/30" },
  yellow: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "hover:border-yellow-500/30" },
  fuchsia: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "hover:border-fuchsia-500/30" },
  slate: { bg: "bg-slate-500/15", text: "text-slate-300", border: "hover:border-slate-400/30" },
};

const modulos: { nombre: string; subtitulo?: string; icon: typeof StickyNote; color: Color }[] = [
  { nombre: "Notas", icon: StickyNote, color: "blue" },
  { nombre: "Parrilleros", icon: Beef, color: "orange" },
  { nombre: "Ingresos", icon: DoorOpen, color: "emerald" },
  { nombre: "Cocheras", icon: Car, color: "cyan" },
  { nombre: "UTE", icon: Zap, color: "yellow" },
  { nombre: "Contactos", subtitulo: "Reclamos / Empleados", icon: Users, color: "fuchsia" },
  { nombre: "Administración", icon: Settings, color: "slate" },
];

export default function Dashboard({ usuario, onVolver, onNavigate, onListo }: DashboardProps) {
  useEffect(() => {
    // el Dashboard no tiene fetch propio: apenas termina de montarse
    // (login o "volver" desde un módulo) avisamos que ya está listo.
    onListo?.();
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#0d1117] px-6 py-16 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-45"
        style={{
          backgroundImage: `url(${logo.src})`,
          backgroundSize: "42%",
          filter: "drop-shadow(0 0 55px rgba(255,255,255,0.45)) drop-shadow(0 0 110px rgba(255,255,255,0.2))",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#0d1117]/8 backdrop-blur-sm"
      />

      <div className="relative z-10 flex w-full flex-col items-center">
        <div className="mb-12 flex w-full max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Torre Antares</h1>
            <p className="mt-2 text-sm text-gray-400">
              Sesión iniciada como <span className="text-white">{usuario.nombre}</span> · {usuario.cargo}
            </p>
          </div>

          <button
            onClick={onVolver}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
          >
            <LogOut size={18} />
            Cambiar usuario
          </button>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-2 gap-6 sm:grid-cols-3">
          {modulos.map(({ nombre, subtitulo, icon: Icon, color }) => {
            const clases = COLOR_CLASSES[color];
            return (
              <button
                key={nombre}
                onClick={() => onNavigate(nombre)}
                className={`group flex h-40 flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/15 ${clases.border}`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${clases.bg} ${clases.text}`}
                >
                  <Icon size={26} />
                </div>
                <div>
                  <p className="font-semibold text-white">{nombre}</p>
                  {subtitulo && (
                    <p className="mt-1 text-xs text-gray-400">{subtitulo}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}