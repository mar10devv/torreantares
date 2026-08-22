import { useEffect, useMemo, useState } from "react";
import {
  StickyNote,
  Beef,
  DoorOpen,
  Car,
  Users,
  Settings,
  LogOut,
  Zap,
  Home,
  Bell,
  TriangleAlert,
  CircleDollarSign,
  X,
} from "lucide-react";
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

type Color = "blue" | "orange" | "emerald" | "cyan" | "yellow" | "fuchsia" | "slate" | "indigo";

const COLOR_CLASSES: Record<Color, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "hover:border-blue-500/30" },
  orange: { bg: "bg-orange-500/15", text: "text-orange-400", border: "hover:border-orange-500/30" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "hover:border-emerald-500/30" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "hover:border-cyan-500/30" },
  yellow: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "hover:border-yellow-500/30" },
  fuchsia: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "hover:border-fuchsia-500/30" },
  slate: { bg: "bg-slate-500/15", text: "text-slate-300", border: "hover:border-slate-400/30" },
  indigo: { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "hover:border-indigo-500/30" },
};

const modulos: { nombre: string; subtitulo?: string; icon: typeof StickyNote; color: Color }[] = [
  { nombre: "Notas", icon: StickyNote, color: "blue" },
  { nombre: "Parrilleros", icon: Beef, color: "orange" },
  { nombre: "Ingresos", icon: DoorOpen, color: "emerald" },
  { nombre: "Propietarios/Inquilinos", subtitulo: "Residentes fijos", icon: Home, color: "indigo" },
  { nombre: "Cocheras", icon: Car, color: "cyan" },
  { nombre: "UTE", icon: Zap, color: "yellow" },
  { nombre: "Contactos", subtitulo: "Reclamos / Empleados", icon: Users, color: "fuchsia" },
  { nombre: "Administración", icon: Settings, color: "slate" },
];

/* ---------------------------------------------------------- */
/* Centro de notificaciones                                     */
/* ---------------------------------------------------------- */

// Solo los campos que necesitamos leer de cada módulo — se leen directo de
// localStorage (mismo patrón que Ingresos ↔ Contactos/Cocheras) para no
// tener que importar esos archivos completos acá.
interface IngresoResumen {
  id: string;
  apartamento: string;
  fechaSalida: string; // YYYY-MM-DD
  finalizado: boolean;
  ocupacion: "inquilino" | "invitado" | "propietario";
}

interface ReservaResumen {
  id: string;
  unidad: string;
  fecha: string; // YYYY-MM-DD
  pagado: boolean;
  cancelada: boolean;
}

type TipoNotificacion = "vence_hoy" | "vencida" | "parrillero_impago";

interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  modulo: "Ingresos" | "Parrilleros";
}

const NOTIF_ESTILOS: Record<
  TipoNotificacion,
  { icon: typeof TriangleAlert; iconBg: string; iconColor: string; border: string }
> = {
  vence_hoy: {
    icon: Bell,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    border: "border-amber-500/25",
  },
  vencida: {
    icon: TriangleAlert,
    iconBg: "bg-red-500/15",
    iconColor: "text-red-400",
    border: "border-red-500/25",
  },
  parrillero_impago: {
    icon: CircleDollarSign,
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-400",
    border: "border-orange-500/25",
  },
};

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function leerNotificaciones(): Notificacion[] {
  if (typeof window === "undefined") return [];

  const notificaciones: Notificacion[] = [];
  const hoy = hoyISO();

  try {
    const guardado = localStorage.getItem("torreantares_ingresos");
    const ingresos: IngresoResumen[] = guardado ? JSON.parse(guardado) : [];

    ingresos.forEach((i) => {
      if (i.finalizado) return;
      if (i.fechaSalida === hoy) {
        notificaciones.push({
          id: `ingreso-hoy-${i.id}`,
          tipo: "vence_hoy",
          mensaje: `Hoy vence la estadía del depto ${i.apartamento}. Tocá para finalizarla.`,
          modulo: "Ingresos",
        });
      } else if (i.fechaSalida < hoy) {
        notificaciones.push({
          id: `ingreso-vencida-${i.id}`,
          tipo: "vencida",
          mensaje: `Venció la estadía del depto ${i.apartamento} y todavía no se marcó como finalizada. Tocá para finalizarla.`,
          modulo: "Ingresos",
        });
      }
    });
  } catch {
    // si falla la lectura, simplemente no mostramos notificaciones de Ingresos
  }

  try {
    const guardado = localStorage.getItem("torreantares_parrilleros");
    const reservas: ReservaResumen[] = guardado ? JSON.parse(guardado) : [];

    reservas.forEach((r) => {
      if (r.cancelada || r.pagado) return;
      if (r.fecha < hoy) {
        notificaciones.push({
          id: `parrillero-impago-${r.id}`,
          tipo: "parrillero_impago",
          mensaje: `El parrillero que usó el depto ${r.unidad} ya finalizó y sigue impago. ¿El depto ${r.unidad} ya pagó?`,
          modulo: "Parrilleros",
        });
      }
    });
  } catch {
    // ídem, no bloquea el resto del dashboard
  }

  return notificaciones;
}

function NotificacionToast({
  notificacion,
  onClick,
  onCerrar,
}: {
  notificacion: Notificacion;
  onClick: () => void;
  onCerrar: () => void;
}) {
  const estilo = NOTIF_ESTILOS[notificacion.tipo];
  const Icon = estilo.icon;

  return (
    // Antes: bg-[#171b22]/95 + backdrop-blur-2xl. Como estos toasts pueden
    // apilarse (uno por cada aviso pendiente), cada uno sumaba una capa de
    // blur más. Subimos un poco la opacidad del fondo sólido para compensar
    // y que se siga leyendo bien sin blur.
    <div
      className={`flex w-full max-w-sm items-start gap-3 rounded-2xl border ${estilo.border} bg-[#171b22] p-4 shadow-2xl`}
    >
      <button
        onClick={onClick}
        className="flex flex-1 items-start gap-3 text-left"
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${estilo.iconBg} ${estilo.iconColor}`}>
          <Icon size={18} />
        </div>
        <p className="text-sm leading-snug text-gray-200">{notificacion.mensaje}</p>
      </button>
      <button
        onClick={onCerrar}
        className="shrink-0 rounded-full p-1 text-gray-500 transition hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function Dashboard({ usuario, onVolver, onNavigate, onListo }: DashboardProps) {
  const [descartadas, setDescartadas] = useState<string[]>([]);

  const notificaciones = useMemo(() => leerNotificaciones(), []);
  const notificacionesVisibles = notificaciones.filter((n) => !descartadas.includes(n.id));

  useEffect(() => {
    // el Dashboard no tiene fetch propio: apenas termina de montarse
    // (login o "volver" desde un módulo) avisamos que ya está listo.
    onListo?.();
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#0d1117] px-6 py-30 text-white">
      {/*
        Mismo fix que en Home: un solo drop-shadow (antes eran dos
        encadenados) y sin backdrop-blur-sm a pantalla completa — se
        reemplaza por un fondo sólido semitransparente, que da un
        resultado visual similar sin pedirle recomposición constante
        al navegador.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-45"
        style={{
          backgroundImage: `url(${logo.src})`,
          backgroundSize: "42%",
          filter: "drop-shadow(0 0 70px rgba(255,255,255,0.3))",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#0d1117]/60"
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
              // Antes: backdrop-blur-2xl permanente + transition-all +
              // hover:scale-105 en el botón, con el ícono de adentro
              // animando otro scale por separado. Dos transforms anidados
              // recalculando contra un área con blur activo era el punto
              // más pesado de toda la pantalla. Ahora: fondo sólido (sin
              // blur) y transición limitada a las propiedades que
              // realmente cambian.
              <button
                key={nombre}
                onClick={() => onNavigate(nombre)}
                className={`group flex h-40 flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 text-center shadow-xl transition-[transform,background-color,border-color] duration-200 ease-out will-change-transform hover:scale-105 hover:bg-white/15 ${clases.border}`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 ease-out group-hover:scale-110 ${clases.bg} ${clases.text}`}
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

      {notificacionesVisibles.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 flex w-full max-w-sm flex-col gap-3">
          {notificacionesVisibles.map((n) => (
            <NotificacionToast
              key={n.id}
              notificacion={n}
              onClick={() => onNavigate(n.modulo)}
              onCerrar={() => setDescartadas((prev) => [...prev, n.id])}
            />
          ))}
        </div>
      )}
    </main>
  );
}