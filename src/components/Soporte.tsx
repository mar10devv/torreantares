import {
  ArrowLeft,
  StickyNote,
  Beef,
  DoorOpen,
  Home,
  Car,
  Zap,
  Users,
  Settings,
  Database,
  Code2,
} from "lucide-react";
interface SoporteProps {
  onVolver: () => void;
}

type ColorModulo = "blue" | "orange" | "emerald" | "cyan" | "yellow" | "fuchsia" | "slate" | "indigo";

// Mismos colores que en Dashboard.tsx para cada módulo, así la card de
// Soporte se identifica de un vistazo por color y no solo por el nombre.
const COLOR_MODULO: Record<ColorModulo, { iconBg: string; iconText: string; borde: string }> = {
  blue: {
    iconBg: "bg-[rgba(59,130,246,0.18)]",
    iconText: "text-blue-400",
    borde: "border-l-[3px] border-l-[rgba(59,130,246,0.6)]",
  },
  orange: {
    iconBg: "bg-[rgba(249,115,22,0.18)]",
    iconText: "text-orange-400",
    borde: "border-l-[3px] border-l-[rgba(249,115,22,0.6)]",
  },
  emerald: {
    iconBg: "bg-[rgba(16,185,129,0.18)]",
    iconText: "text-emerald-400",
    borde: "border-l-[3px] border-l-[rgba(16,185,129,0.6)]",
  },
  cyan: {
    iconBg: "bg-[rgba(6,182,212,0.18)]",
    iconText: "text-cyan-400",
    borde: "border-l-[3px] border-l-[rgba(6,182,212,0.6)]",
  },
  yellow: {
    iconBg: "bg-[rgba(234,179,8,0.18)]",
    iconText: "text-yellow-400",
    borde: "border-l-[3px] border-l-[rgba(234,179,8,0.6)]",
  },
  fuchsia: {
    iconBg: "bg-[rgba(217,70,239,0.18)]",
    iconText: "text-fuchsia-400",
    borde: "border-l-[3px] border-l-[rgba(217,70,239,0.6)]",
  },
  slate: {
    iconBg: "bg-[rgba(148,163,184,0.18)]",
    iconText: "text-slate-300",
    borde: "border-l-[3px] border-l-[rgba(148,163,184,0.6)]",
  },
  indigo: {
    iconBg: "bg-[rgba(99,102,241,0.18)]",
    iconText: "text-indigo-400",
    borde: "border-l-[3px] border-l-[rgba(99,102,241,0.6)]",
  },
};

interface SeccionModulo {
  nombre: string;
  icon: typeof StickyNote;
  color: ColorModulo;
  descripcion: string;
}

// Descripción funcional de cada módulo del sistema, pensada para que
// cualquier empleado nuevo entienda de un vistazo qué hace cada sección
// y por qué existe, sin necesidad de que se lo expliquen de palabra.
const MODULOS_INFO: SeccionModulo[] = [
  {
    nombre: "Notas",
    icon: StickyNote,
    color: "blue",
    descripcion:
      "Cumple la función del libro de actas tradicional: permite dejar asentados los sucesos importantes de recepción y administración. Incorpora un buscador que localiza cualquier nota por depto o palabra clave, sin importar la antigüedad de la publicación, evitando así la pérdida de información que suele ocurrir con el registro en papel.",
  },
  {
    nombre: "Parrilleros",
    icon: Beef,
    color: "orange",
    descripcion:
      "Genera una planilla mensual para la reserva de los espacios de parrillero, tanto internos como externos. Cada reserva queda asociada al depto correspondiente y a un estado de pago —pagado o pendiente—, que debe actualizarse en cuanto se recibe el pago, de forma que administración cuente siempre con un registro contable preciso.",
  },
  {
    nombre: "Ingresos",
    icon: DoorOpen,
    color: "emerald",
    descripcion:
      "Permite registrar el ingreso de inquilinos, inquilinos anuales, invitados y propietarios, nuevos o existentes. Al cargar cada ingreso se consulta si corresponde tomar el consumo de UTE y si el ingresante cuenta con vehículo, para que sus datos queden completos desde el primer momento.",
  },
  {
    nombre: "Propietarios/Inquilinos",
    icon: Home,
    color: "indigo",
    descripcion:
      "Concentra el registro de los residentes fijos del edificio: propietarios e inquilinos con contrato anual, manteniendo su información disponible de forma permanente más allá de estadías puntuales.",
  },
  {
    nombre: "Cocheras",
    icon: Car,
    color: "cyan",
    descripcion:
      "Guarda el registro de los vehículos pertenecientes a inquilinos y propietarios. Ante un choque, un reclamo por mal estacionamiento o cualquier inconveniente, permite identificar rápidamente al responsable a partir del número de matrícula.",
  },
  {
    nombre: "UTE",
    icon: Zap,
    color: "yellow",
    descripcion:
      "Facilita la localización del contador correspondiente a cada torre y depto a la hora de tomar la lectura de consumo, agilizando ese trámite durante el proceso de ingreso.",
  },
  {
    nombre: "Contactos",
    icon: Users,
    color: "fuchsia",
    descripcion:
      "Reúne los números de servicios de uso frecuente, como Cardiomóvil o Central de Informática, junto con los contactos de los empleados del sistema y de propietarios, inquilinos e invitados. Los contactos de residentes o visitantes temporales se eliminan al finalizar su estadía, conservándose únicamente los de propietarios e inquilinos anuales.",
  },
  {
    nombre: "Administración",
    icon: Settings,
    color: "slate",
    descripcion:
      "Módulo de acceso restringido al personal de administración. Concentra la contabilidad del dinero que circula por recepción y un sistema de multas que deja constancia de los deptos que incumplen el reglamento, generando un historial de comportamiento documentado.",
  },
];

export default function Soporte({ onVolver }: SoporteProps) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d1117] px-6 py-16 text-white">
      <div className="w-full max-w-3xl">
        <button
          onClick={onVolver}
          className="mb-8 flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-4 py-2.5 text-sm text-white shadow-sm transition-colors duration-200 hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.1)]"
        >
          <ArrowLeft size={18} />
          Volver al inicio
        </button>

        <h1 className="text-3xl font-bold sm:text-4xl">Soporte e información</h1>
        <p className="mt-2 text-sm text-white/70">
          Todo lo que necesitás saber sobre el sistema y cómo utilizarlo.
        </p>

        {/* Propósito del sistema */}
        <section className="mt-10 rounded-3xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white">¿Para qué sirve este sistema?</h2>
          <p className="mt-3 text-sm leading-relaxed text-white">
            Torre Antares es un sistema de gestión desarrollado para ordenar y optimizar el trabajo
            diario de la administración y recepción del edificio. Su respaldo es Firebase, la base de
            datos de Google, lo que garantiza que la información quede almacenada de forma segura y
            accesible en todo momento.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white">
            Cada empleado de recepción y administración cuenta con su propio usuario dentro del
            sistema, desde el cual puede consultar las notas publicadas por sus compañeros, los
            parrilleros alquilados y los ingresos registrados. Centralizar esta información reduce
            errores de facturación, evita el papeleo disperso y elimina el riesgo de perder notas o
            registros con el paso del tiempo.
          </p>
        </section>

        {/* Módulos */}
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Los módulos del sistema</h2>
          <div className="flex flex-col gap-4">
            {MODULOS_INFO.map(({ nombre, icon: Icon, color, descripcion }) => {
              const clases = COLOR_MODULO[color];
              return (
                <div
                  key={nombre}
                  className={`flex gap-4 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] p-5 ${clases.borde}`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${clases.iconBg} ${clases.iconText}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className={`font-semibold ${clases.iconText}`}>{nombre}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white">{descripcion}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sobre el desarrollador */}
        <section className="mt-8 mb-4 rounded-3xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white">Desarrollo y respaldo técnico</h2>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.08)] text-gray-300">
              <Code2 size={20} />
            </div>
            <p className="text-sm leading-relaxed text-white">
              Este sistema fue desarrollado por <span className="font-medium text-white">iNovaTech</span>,
              empresa de desarrollo de software fundada por{" "}
              <span className="font-medium text-white">Martín Martínez</span>, programador
              responsable del diseño y la implementación de esta aplicación.
            </p>
          </div>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.08)] text-gray-300">
              <Database size={20} />
            </div>
            <p className="text-sm leading-relaxed text-white">
              La información del sistema se almacena y respalda mediante Firebase, la plataforma de
              base de datos de Google, asegurando estabilidad, disponibilidad y protección de los
              datos administrados por el edificio.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}