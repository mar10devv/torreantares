import { useEffect, useState } from "react";
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
  CircleHelp,
  Tag,
  Lock,
} from "lucide-react";
import logo from "../assets/logo.png";
import type { Ingreso } from "./Ingresos";
import type { ReservaParrillero } from "./DayGrillModal";
import { obtenerIngresosDeDB, obtenerReservasParrilleroDeDB } from "../lib/firebase";
import Soporte from "./Soporte";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
  // Viene de Firestore (colección "usuarios", campo creado en
  // crearUsuarioEnDB). Se marca opcional porque los usuarios cargados
  // antes de este cambio no lo tienen guardado — para esos, tratamos
  // "undefined" igual que "false" (sin acceso) más abajo.
  accesoAdministracion?: boolean;
}

interface DashboardProps {
  usuario: Usuario;
  onVolver: () => void;
  onNavigate: (modulo: string) => void;
  onListo?: () => void;
}

type Color =
  | "blue"
  | "orange"
  | "emerald"
  | "cyan"
  | "yellow"
  | "fuchsia"
  | "slate"
  | "indigo"
  | "gray"
  | "red";

interface ColorClases {
  bg: string;
  text: string;
  border: string;
  gradiente: string;
  glow: string;
}

// IMPORTANTE — por qué acá no usamos from-blue-500/to-blue-700 ni bg-blue-500/15:
// Tailwind v4 compila esas clases con color-mix(in oklab, ...) por debajo,
// una función de CSS que Chrome recién soportó desde la v111 — distinta de
// oklch() (que ya solucionamos con el plugin de PostCSS). La PC de trabajo
// tiene Chrome 109, así que sigue descartando estas declaraciones aunque
// oklch() ya esté arreglado. Se reemplaza todo por valores arbitrarios de
// Tailwind (bg-[rgba(...)], bg-[linear-gradient(...)]) que generan CSS
// plano sin pasar por oklch() ni color-mix() en ningún punto.
const COLOR_CLASSES: Record<Color, ColorClases> = {
  blue: {
    bg: "bg-[rgba(59,130,246,0.15)]",
    text: "text-blue-400",
    border: "hover:border-[rgba(59,130,246,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#3b82f6,#1d4ed8)]",
    glow: "shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)]",
  },
  orange: {
    bg: "bg-[rgba(249,115,22,0.15)]",
    text: "text-orange-400",
    border: "hover:border-[rgba(249,115,22,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#f97316,#c2410c)]",
    glow: "shadow-[0_0_30px_-10px_rgba(249,115,22,0.5)]",
  },
  emerald: {
    bg: "bg-[rgba(16,185,129,0.15)]",
    text: "text-emerald-400",
    border: "hover:border-[rgba(16,185,129,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#10b981,#047857)]",
    glow: "shadow-[0_0_30px_-10px_rgba(16,185,129,0.5)]",
  },
  cyan: {
    bg: "bg-[rgba(6,182,212,0.15)]",
    text: "text-cyan-400",
    border: "hover:border-[rgba(6,182,212,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#06b6d4,#0e7490)]",
    glow: "shadow-[0_0_30px_-10px_rgba(6,182,212,0.5)]",
  },
  yellow: {
    bg: "bg-[rgba(234,179,8,0.15)]",
    text: "text-yellow-400",
    border: "hover:border-[rgba(234,179,8,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#eab308,#a16207)]",
    glow: "shadow-[0_0_30px_-10px_rgba(234,179,8,0.5)]",
  },
  fuchsia: {
    bg: "bg-[rgba(217,70,239,0.15)]",
    text: "text-fuchsia-400",
    border: "hover:border-[rgba(217,70,239,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#d946ef,#a21caf)]",
    glow: "shadow-[0_0_30px_-10px_rgba(217,70,239,0.5)]",
  },
  slate: {
    bg: "bg-[rgba(148,163,184,0.15)]",
    text: "text-slate-300",
    border: "hover:border-[rgba(148,163,184,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#94a3b8,#475569)]",
    glow: "shadow-[0_0_30px_-10px_rgba(148,163,184,0.4)]",
  },
  indigo: {
    bg: "bg-[rgba(99,102,241,0.15)]",
    text: "text-indigo-400",
    border: "hover:border-[rgba(99,102,241,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#6366f1,#4338ca)]",
    glow: "shadow-[0_0_30px_-10px_rgba(99,102,241,0.5)]",
  },
  gray: {
    bg: "bg-[rgba(115,115,115,0.15)]",
    text: "text-gray-400",
    border: "hover:border-[rgba(115,115,115,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#737373,#404040)]",
    glow: "shadow-[0_0_30px_-10px_rgba(115,115,115,0.5)]",
  },
  red: {
    bg: "bg-[rgba(239,68,68,0.15)]",
    text: "text-red-400",
    border: "hover:border-[rgba(239,68,68,0.3)]",
    gradiente: "bg-[linear-gradient(135deg,#ef4444,#b91c1c)]",
    glow: "shadow-[0_0_30px_-10px_rgba(239,68,68,0.5)]",
  },
};

interface ModuloInfo {
  nombre: string;
  subtitulo?: string;
  icon: typeof StickyNote;
  color: Color;
}

const modulos: ModuloInfo[] = [
  { nombre: "Notas", icon: StickyNote, color: "blue" },
  { nombre: "Parrilleros", icon: Beef, color: "orange" },
  { nombre: "Ingresos", icon: DoorOpen, color: "emerald" },
  { nombre: "Propietarios/Inquilinos", subtitulo: "Residentes fijos", icon: Home, color: "indigo" },
  { nombre: "Cocheras", subtitulo: "Registro de vehículos", icon: Car, color: "cyan" },
  { nombre: "UTE", icon: Zap, color: "yellow" },
  { nombre: "Contactos", subtitulo: "Reclamos / Empleados", icon: Users, color: "fuchsia" },
  { nombre: "Controles/Tag", icon: Tag, color: "red" },
  { nombre: "Administración", icon: Settings, color: "slate" },
  { nombre: "Soporte", subtitulo: "Soporte e información", icon: CircleHelp, color: "gray" },
];

// Mismo criterio que en UserCard: cada usuario "hereda" un color según
// su nombre, para que el avatar del header tenga la misma identidad
// visual que su card en el login.
const ORDEN_ACENTOS: Color[] = ["blue", "emerald", "orange", "fuchsia", "cyan", "indigo"];

function acentoParaNombre(nombre: string): Color {
  const hash = nombre
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ORDEN_ACENTOS[hash % ORDEN_ACENTOS.length];
}

/* ---------------------------------------------------------- */
/* Centro de notificaciones                                     */
/* ---------------------------------------------------------- */

type TipoNotificacion = "vence_hoy" | "vencida" | "parrillero_impago";

interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  modulo: "Ingresos" | "Parrilleros";
}

interface NotifEstilo {
  icon: typeof TriangleAlert;
  iconBg: string;
  iconColor: string;
  border: string;
}

const NOTIF_ESTILOS: Record<TipoNotificacion, NotifEstilo> = {
  vence_hoy: {
    icon: Bell,
    iconBg: "bg-[rgba(245,158,11,0.15)]",
    iconColor: "text-amber-400",
    border: "border-[rgba(245,158,11,0.25)]",
  },
  vencida: {
    icon: TriangleAlert,
    iconBg: "bg-[rgba(239,68,68,0.15)]",
    iconColor: "text-red-400",
    border: "border-[rgba(239,68,68,0.25)]",
  },
  parrillero_impago: {
    icon: CircleDollarSign,
    iconBg: "bg-[rgba(249,115,22,0.15)]",
    iconColor: "text-orange-400",
    border: "border-[rgba(249,115,22,0.25)]",
  },
};

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Antes esto leía de localStorage ("torreantares_ingresos" /
// "torreantares_parrilleros"), pero esas claves quedaron obsoletas desde
// que Ingresos.tsx y Parrilleros.tsx migraron a Firestore — por eso las
// notificaciones solo aparecían en localhost (datos viejos de pruebas
// que quedaron ahí de antes de la migración) y nunca en producción,
// donde esa clave nunca se llegó a escribir. Ahora se trae la misma
// info real desde las mismas colecciones de Firestore que usan esos
// módulos, así el comportamiento es igual en cualquier PC/instalación.
async function cargarNotificaciones(): Promise<Notificacion[]> {
  const notificaciones: Notificacion[] = [];
  const hoy = hoyISO();

  try {
    const ingresos = (await obtenerIngresosDeDB()) as unknown as Ingreso[];

    ingresos.forEach((i) => {
      if (i.finalizado) return;
      // Los propietarios pueden no tener fechaSalida (entran/salen cuando
      // quieren). Sin esta guarda, "" comparada como fecha generaba
      // notificaciones de "venció" falsas para cada propietario activo.
      if (!i.fechaSalida) return;
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
  } catch (err) {
    console.error("Error al leer ingresos desde Firestore para notificaciones:", err);
    // si falla la lectura, simplemente no mostramos notificaciones de Ingresos
  }

  try {
    const reservas = (await obtenerReservasParrilleroDeDB()) as unknown as ReservaParrillero[];

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
  } catch (err) {
    console.error("Error al leer reservas desde Firestore para notificaciones:", err);
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
        className="shrink-0 rounded-full p-1 text-gray-500 transition hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ModuloEnDesarrolloModal({
  nombre,
  onClose,
}: {
  nombre: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-[rgba(255,255,255,0.1)] bg-[#171b22] p-6 text-center shadow-2xl"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(148,163,184,0.15)] text-slate-300">
          <Settings size={22} />
        </div>

        <h2 className="mt-4 text-lg font-bold text-white">{nombre} — todavía no disponible</h2>
        <p className="mt-2 text-sm text-gray-400">
          Este módulo sigue en desarrollo. Pronto vas a poder usarlo desde acá.
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

// Se muestra en vez de navegar a "Administración" cuando el usuario
// logueado no tiene accesoAdministracion === true en su documento de
// Firestore (colección "usuarios").
function SinAccesoAdministracionModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-[rgba(255,255,255,0.1)] bg-[#171b22] p-6 text-center shadow-2xl"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(239,68,68,0.15)] text-red-400">
          <Lock size={22} />
        </div>

        <h2 className="mt-4 text-lg font-bold text-white">No tenés acceso a Administración</h2>
        <p className="mt-2 text-sm text-gray-400">
          Acá Administración lleva la contabilidad y las facturas del dinero que pasa por recepción.
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

export default function Dashboard({ usuario, onVolver, onNavigate, onListo }: DashboardProps) {
  const [descartadas, setDescartadas] = useState<string[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [moduloEnDesarrollo, setModuloEnDesarrollo] = useState<string | null>(null);
  // Soporte no navega al router principal: se muestra encima del propio
  // Dashboard controlado por este estado, así no depende de que la app
  // padre conozca esa ruta.
  const [mostrarSoporte, setMostrarSoporte] = useState(false);
  // Se activa cuando el usuario toca "Administración" sin tener
  // accesoAdministracion === true.
  const [mostrarSinAcceso, setMostrarSinAcceso] = useState(false);
  const notificacionesVisibles = notificaciones.filter((n) => !descartadas.includes(n.id));

  // Módulos que todavía no están listos para usarse: en vez de navegar,
  // se muestra un aviso. Para volver a habilitar uno, alcanza con
  // sacarlo de este set.
  const MODULOS_NO_DISPONIBLES = new Set<string>([]);

  const handleClickModulo = (nombre: string) => {
    if (nombre === "Soporte") {
      setMostrarSoporte(true);
      return;
    }
    if (nombre === "Administración" && !usuario.accesoAdministracion) {
      setMostrarSinAcceso(true);
      return;
    }
    if (MODULOS_NO_DISPONIBLES.has(nombre)) {
      setModuloEnDesarrollo(nombre);
      return;
    }
    onNavigate(nombre);
  };

  const acentoUsuario = COLOR_CLASSES[acentoParaNombre(usuario.nombre)];
  const inicialUsuario = usuario.nombre.trim().charAt(0).toUpperCase();

  useEffect(() => {
    // El Dashboard en sí no tiene fetch propio para renderizarse — avisamos
    // que ya está listo de inmediato (login/volver siguen siendo
    // instantáneos). Las notificaciones se traen aparte, en paralelo, y
    // aparecen solas cuando llegan, sin bloquear ni demorar la entrada.
    onListo?.();
    cargarNotificaciones().then(setNotificaciones);
  }, []);

  // Si Soporte está activo, se muestra en lugar del grid de módulos.
  if (mostrarSoporte) {
    return <Soporte onVolver={() => setMostrarSoporte(false)} />;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#0d1117] px-6 py-30 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-45"
        style={{
          backgroundImage: `url(${logo.src})`,
          backgroundSize: "42%",
          filter: "drop-shadow(0 0 70px rgba(255,255,255,0.3))",
          backgroundPosition: "center 95%",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[rgba(13,17,23,0.6)]"
      />

      <div className="relative z-10 flex w-full flex-col items-center">
        <div className="mb-12 flex w-full max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            {/* El logo ahora también aparece como marca chica junto al
                título, no solo como watermark gigante de fondo — le da
                identidad de marca real al header. */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] p-2 shadow-lg">
              <img src={logo.src} alt="Torre Antares" className="h-full w-full object-contain" />
            </div>

            <div>
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Torre Antares</h1>

              {/* Chip de usuario: avatar con el mismo color que su
                  UserCard en el login + nombre + cargo, en vez de una
                  línea de texto plana. */}
              <div className="mt-2 flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${acentoUsuario.gradiente}`}
                >
                  {inicialUsuario}
                </div>
                <p className="text-sm text-gray-400">
                  <span className="font-medium text-white">{usuario.nombre}</span>
                  {" · "}
                  <span className={acentoUsuario.text}>{usuario.cargo}</span>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onVolver}
            className="flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-4 py-2.5 text-sm text-white shadow-sm transition-colors duration-200 hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.1)]"
          >
            <LogOut size={18} />
            Cambiar usuario
          </button>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
          {modulos.map(({ nombre, subtitulo, icon: Icon, color }) => {
            const clases = COLOR_CLASSES[color];
            const noDisponible = MODULOS_NO_DISPONIBLES.has(nombre);
            return (
              <button
                key={nombre}
                onClick={() => handleClickModulo(nombre)}
                className={`group relative flex h-40 flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] p-4 text-center shadow-xl transition-[transform,background-color,border-color] duration-200 ease-out will-change-transform hover:scale-105 hover:bg-[rgba(255,255,255,0.1)] ${clases.border} ${noDisponible ? "opacity-60" : ""}`}
              >
                {/* Franja de acento arriba — mismo lenguaje visual que las
                    UserCard del login, para que la app se sienta como un
                    solo diseño coherente en vez de pantallas sueltas. */}
                <div className={`absolute inset-x-0 top-0 h-1 ${clases.gradiente}`} />

                {noDisponible && (
                  <span className="absolute right-2 top-4 rounded-full bg-[rgba(255,255,255,0.1)] px-2 py-0.5 text-[10px] font-medium text-gray-300">
                    Próximamente
                  </span>
                )}

                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white transition-transform duration-200 ease-out group-hover:scale-110 ${clases.gradiente} ${clases.glow}`}
                >
                  <Icon size={24} />
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

      {moduloEnDesarrollo && (
        <ModuloEnDesarrolloModal
          nombre={moduloEnDesarrollo}
          onClose={() => setModuloEnDesarrollo(null)}
        />
      )}

      {mostrarSinAcceso && (
        <SinAccesoAdministracionModal onClose={() => setMostrarSinAcceso(false)} />
      )}

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