import { useState, useEffect } from "react";
import { ArrowLeft, Beef, ShieldAlert, Receipt, ChevronRight } from "lucide-react";
import Penalizaciones from "./Penalizaciones";
import CobrarParrilleros from "./CobrarParrilleros";
import Facturas from "./Facturas";

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

interface ColorClases {
  bg: string;
  text: string;
}

const COLOR_CLASSES: Record<Color, ColorClases> = {
  amber: { bg: "bg-amber-500/15", text: "text-amber-400" },
  red: { bg: "bg-red-500/15", text: "text-red-400" },
  blue: { bg: "bg-blue-500/15", text: "text-blue-400" },
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
    <main className="flex min-h-screen flex-col items-center bg-[#0d1117] px-6 py-16 text-white">
      <div className="mb-6 flex w-full max-w-2xl items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <h1 className="text-3xl font-bold">Administración</h1>

        {/* Espaciador invisible del mismo ancho aproximado que el botón
            de la izquierda, para que el título quede centrado — mismo
            truco de layout que usa Notas con su botón "Nueva nota". */}
        <div className="w-[92px]" aria-hidden="true" />
      </div>

      <div className="mt-2 flex w-full max-w-2xl flex-col gap-4">
        {secciones.map(({ nombre, icon: Icon, color }) => {
          const clases = COLOR_CLASSES[color];
          return (
            <button
              key={nombre}
              onClick={() => handleAbrirSeccion(nombre)}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${clases.bg} ${clases.text}`}>
                <Icon size={20} />
              </div>
              <p className="flex-1 font-semibold text-white">{nombre}</p>
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          );
        })}
      </div>

      <CobrarParrilleros
        isOpen={modalCobrarAbierto}
        onClose={() => setModalCobrarAbierto(false)}
        usuario={usuario}
      />
    </main>
  );
}