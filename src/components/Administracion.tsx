import { useState, useEffect } from "react";
import { ArrowLeft, Beef, ShieldAlert, Receipt } from "lucide-react";
import Penalizaciones from "./Penalizaciones";
import CobrarParrilleros from "./CobrarParrilleros";
import Facturas from "./Facturas";
import logo from "../assets/logo.png";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface AdministracionProps {
  usuario: Usuario;
  onVolver: () => void;
  onListo?: () => void;
}

type Color = "amber" | "red" | "blue";

const COLOR_CLASSES: Record<Color, { bg: string; text: string; border: string }> = {
  amber: { bg: "bg-amber-500/15", text: "text-amber-400", border: "hover:border-amber-500/30" },
  red: { bg: "bg-red-500/15", text: "text-red-400", border: "hover:border-red-500/30" },
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "hover:border-blue-500/30" },
};

// 🔽 Acá se van sumando más secciones a medida que las armemos
// (ej: "Reportes", "Configuración", etc.)
const secciones: { nombre: string; icon: typeof Beef; color: Color }[] = [
  { nombre: "Cobrar Parrilleros", icon: Beef, color: "amber" },
  { nombre: "Penalizaciones", icon: ShieldAlert, color: "red" },
  { nombre: "Facturas", icon: Receipt, color: "blue" },
];

export default function Administracion({ usuario, onVolver, onListo }: AdministracionProps) {
  const [subvista, setSubvista] = useState<"menu" | "cobrar-parrilleros" | "penalizaciones" | "facturas">("menu");
  const [modalCobrarAbierto, setModalCobrarAbierto] = useState(false);

  useEffect(() => {
    // --------------------------------------------------------------------
    // ACCESO RESTRINGIDO A ADMINISTRADORES — comentado por ahora.
    // Todavía no se definieron los roles/permisos, así que cualquier
    // usuario puede entrar. Cuando estén definidos, descomentar esto:
    //
    //   if (usuario.cargo !== "Administrador") {
    //     onVolver();
    //     return;
    //   }
    // --------------------------------------------------------------------

    // El Administración no tiene fetch propio todavía: avisamos que
    // ya está listo apenas se monta, para cerrar el loader.
    onListo?.();
  }, []);

  const handleAbrirSeccion = (nombre: string) => {
    if (nombre === "Penalizaciones") {
      setSubvista("penalizaciones");
    } else if (nombre === "Cobrar Parrilleros") {
      setModalCobrarAbierto(true);
    } else if (nombre === "Facturas") {
      setSubvista("facturas");
    } else {
      console.log(`Sección "${nombre}" todavía no implementada`);
    }
  };

  // Navegación interna (menú <-> secciones): no dispara el loader global,
  // mismo criterio que usamos en Notas para el cambio de mes — es instantáneo,
  // no una consulta real.
  if (subvista === "penalizaciones") {
    return <Penalizaciones usuario={usuario} onVolver={() => setSubvista("menu")} />;
  }

  if (subvista === "facturas") {
    return <Facturas usuario={usuario} onVolver={() => setSubvista("menu")} />;
  }

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
            <h1 className="text-4xl font-bold">Administración</h1>
            <p className="mt-2 text-sm text-gray-400">
              Sesión iniciada como <span className="text-white">{usuario.nombre}</span> · {usuario.cargo}
            </p>
          </div>

          <button
            onClick={onVolver}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
          >
            <ArrowLeft size={18} />
            Volver
          </button>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {secciones.map(({ nombre, icon: Icon, color }) => {
            const clases = COLOR_CLASSES[color];
            return (
              <button
                key={nombre}
                onClick={() => handleAbrirSeccion(nombre)}
                className={`group flex h-40 flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/15 ${clases.border}`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${clases.bg} ${clases.text}`}
                >
                  <Icon size={26} />
                </div>
                <p className="font-semibold text-white">{nombre}</p>
              </button>
            );
          })}
        </div>
      </div>

      <CobrarParrilleros
        isOpen={modalCobrarAbierto}
        onClose={() => setModalCobrarAbierto(false)}
        usuario={usuario}
      />
    </main>
  );
}