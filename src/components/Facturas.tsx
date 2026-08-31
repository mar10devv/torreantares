import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Receipt, Download, X, Loader2 } from "lucide-react";
import logo from "../assets/logo.png";
import {
  obtenerFacturasDeDB,
  actualizarFacturaEnDB,
  generarFacturasPendientes,
  generarFacturasPendientesDeIngresos,
} from "../lib/firebase";

// --------------------------------------------------------------------
// CONFIGURACIÓN DE FACTURACIÓN — único lugar a tocar cuando llegue el
// RUT definitivo, el CAE de DGI, la dirección/contacto real del edificio,
// o si cambia el prefijo de serie.
// --------------------------------------------------------------------
export const CONFIG_FACTURA = {
  nombreEmisor: "Torre Antares",
  rut: "RUT PROVISORIO — PENDIENTE DE CONFIRMAR",
  direccion: "[Dirección del edificio — completar]",
  contacto: "[Teléfono / email — completar]",
  prefijoSerie: "A",
  numeroCAE: "", // se completa cuando DGI habilite el CAE real
  logo,
};

export interface Factura {
  id: string;
  numero: string; // "A0001", "A0002"...
  titulo: string; // "Fac. Parrillero (30/08/2026)" o "Fac. Ingreso (30/08/2026)"
  fecha: string; // fecha de uso, YYYY-MM-DD
  unidad: string;
  nombreCliente: string;
  emailCliente: string;
  concepto: string;
  importe: number;
  reservaId?: string; // presente si la factura viene de un parrillero
  ingresoId?: string; // presente si la factura viene de un ingreso
  // Solo tienen sentido en facturas de ingreso, y solo si tomaConsumoUte
  // era true — igual el bloque de UTE siempre se imprime en la factura,
  // vacío si estos dos no están definidos (ver FacturaDocumento).
  lecturaUteEntrada?: number;
  lecturaUteSalida?: number;
  estado: "nueva" | "vista"; // controla el color de la card (no confundir con "pagado")
  pagado: boolean;
  formaPago?: string; // "Efectivo", "Transferencia", etc.
  autor: string;
  fechaCreacion: string; // ISO
}

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface FacturasProps {
  usuario: Usuario;
  onVolver: () => void;
  onListo?: () => void;
}

function formatearImporte(valor: number) {
  return valor.toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  });
}

function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ---------------------------------------------------------- */
/* Preview / documento imprimible de la factura                 */
/* ---------------------------------------------------------- */
// Todo acá adentro usa estilos inline (style={{...}}), nunca clases de
// Tailwind. html2canvas (la librería que captura este bloque para armar
// el PDF) no sabe leer los colores que genera Tailwind v4 (oklch/color()),
// así que cualquier clase de color acá rompe la descarga. Ver conversación
// previa si hace falta agregar algo nuevo — siempre en style, nunca className
// para colores/bordes.

function Fila({ izquierda, derecha }: { izquierda: React.ReactNode; derecha?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span>{izquierda}</span>
      <span>{derecha}</span>
    </div>
  );
}

function FacturaDocumento({ factura }: { factura: Factura }) {
  const estiloSeccionTitulo: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#374151",
    margin: 0,
  };

  const estiloDivider: React.CSSProperties = {
    borderTop: "1px solid #1a1a1a",
    margin: "0",
  };

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        border: "1px solid #1a1a1a",
        fontFamily: "inherit",
        fontSize: "13px",
      }}
    >
      {/* Encabezado */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "3px" }}>
        <Fila
          izquierda={
            <span style={{ fontSize: "18px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              <img
                src={CONFIG_FACTURA.logo.src ?? CONFIG_FACTURA.logo}
                alt=""
                style={{ height: "26px", width: "26px", objectFit: "contain", filter: "invert(1)" }}
              />
              {CONFIG_FACTURA.nombreEmisor.toUpperCase()}
            </span>
          }
          derecha={<span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em" }}>COMPROBANTE</span>}
        />
        <Fila
          izquierda={<span>RUT {CONFIG_FACTURA.rut}</span>}
          derecha={<span>N.º {factura.numero}</span>}
        />
        <Fila izquierda={<span style={{ color: "#4b5563" }}>{CONFIG_FACTURA.direccion}</span>} />
        <Fila
          izquierda={<span style={{ color: "#4b5563" }}>{CONFIG_FACTURA.contacto}</span>}
          derecha={<span>{formatearFecha(factura.fecha)}</span>}
        />
      </div>

      <div style={estiloDivider} />

      {/* Cliente */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <p style={estiloSeccionTitulo}>CLIENTE</p>
        <div style={{ height: "4px" }} />
        <p style={{ margin: 0 }}>Nombre: {factura.nombreCliente}</p>
        <p style={{ margin: 0 }}>Apartamento: {factura.unidad}</p>
      </div>

      <div style={estiloDivider} />

      {/* Detalle */}
      <div style={{ padding: "16px 20px" }}>
        <p style={{ ...estiloSeccionTitulo, marginBottom: "10px" }}>DETALLE</p>
        <Fila
          izquierda={<span style={{ fontWeight: 600 }}>Concepto</span>}
          derecha={<span style={{ fontWeight: 600 }}>Importe</span>}
        />
        <div style={{ borderTop: "1px solid #9ca3af", margin: "6px 0 10px 0" }} />
        <Fila izquierda={<span>{factura.concepto}</span>} derecha={<span>{formatearImporte(factura.importe)}</span>} />
      </div>

      <div style={estiloDivider} />

      {/* Consumo de UTE — este bloque siempre se imprime, tenga o no
          datos. Si los campos vienen vacíos, se entiende que no se pidió
          tomar consumo en esa estadía; no es un error, es la norma. Las
          facturas de parrillero (que nunca tienen estos campos) también
          muestran este bloque, vacío. */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <p style={estiloSeccionTitulo}>CONSUMO DE UTE</p>
        <div style={{ height: "4px" }} />
        <Fila
          izquierda={<span>Lectura de entrada</span>}
          derecha={<span>{factura.lecturaUteEntrada ?? ""}</span>}
        />
        <Fila
          izquierda={<span>Lectura de salida</span>}
          derecha={<span>{factura.lecturaUteSalida ?? ""}</span>}
        />
      </div>

      <div style={estiloDivider} />

      {/* Total + estado de pago */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <Fila
          izquierda={<span />}
          derecha={
            <span style={{ fontSize: "16px", fontWeight: 700 }}>
              TOTAL&nbsp;&nbsp;{formatearImporte(factura.importe)}
            </span>
          }
        />
        <div style={{ height: "4px" }} />
        <p style={{ margin: 0 }}>
          Estado: <strong>{factura.pagado ? "PAGADO" : "PENDIENTE"}</strong>
        </p>
        {factura.pagado && factura.formaPago && (
          <p style={{ margin: 0 }}>Forma de pago: {factura.formaPago}</p>
        )}
      </div>

      <div style={estiloDivider} />

      {/* Pie */}
      <div style={{ padding: "14px 20px", textAlign: "center", fontSize: "11px", color: "#6b7280" }}>
        Comprobante administrativo generado por el sistema de administración de{" "}
        {CONFIG_FACTURA.nombreEmisor}.
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Modal con preview + descarga PDF                             */
/* ---------------------------------------------------------- */

function FacturaModal({
  factura,
  onClose,
}: {
  factura: Factura;
  onClose: () => void;
}) {
  const contenidoRef = useRef<HTMLDivElement>(null);
  const [descargando, setDescargando] = useState(false);

  const handleDescargar = async () => {
    if (!contenidoRef.current) return;
    setDescargando(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(contenidoRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const anchoPagina = pdf.internal.pageSize.getWidth();
      const alturaImagen = (canvas.height * anchoPagina) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, anchoPagina, alturaImagen);
      pdf.save(`${factura.numero}.pdf`);
    } catch (err) {
      console.error("Error al generar el PDF de la factura:", err);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#171b22] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <p className="font-semibold text-white">{factura.titulo}</p>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div ref={contenidoRef} className="overflow-hidden rounded-xl">
            <FacturaDocumento factura={factura} />
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleDescargar}
            disabled={descargando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {descargando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {descargando ? "Generando PDF…" : "Descargar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Vista principal                                               */
/* ---------------------------------------------------------- */

export default function Facturas({ usuario, onVolver, onListo }: FacturasProps) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [facturaAbierta, setFacturaAbierta] = useState<Factura | null>(null);

  const cargarFacturas = async () => {
    try {
      setError("");
      const datos = await obtenerFacturasDeDB();
      setFacturas(datos as unknown as Factura[]);
    } catch (err) {
      console.error("Error al cargar facturas desde Firestore:", err);
      setError("No se pudieron cargar las facturas. Revisá tu conexión.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    (async () => {
      // Antes de traer la lista, revisa si hay reservas pagadas o ingresos
      // finalizados cuyo margen de espera ya pasó (1hr parrilleros, 2hrs
      // ingresos), y les genera la factura correspondiente (ver
      // generarFacturasPendientes / generarFacturasPendientesDeIngresos en
      // lib/firebase.ts). Cada una tiene su propio try/catch: si una
      // falla, la otra igual corre y las facturas ya existentes se
      // muestran igual.
      try {
        await generarFacturasPendientes();
      } catch (err) {
        console.error("Error al generar facturas pendientes de parrilleros:", err);
      }
      try {
        await generarFacturasPendientesDeIngresos();
      } catch (err) {
        console.error("Error al generar facturas pendientes de ingresos:", err);
      }
      await cargarFacturas();
      onListo?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAbrirFactura = async (factura: Factura) => {
    setFacturaAbierta(factura);
    if (factura.estado === "nueva") {
      try {
        await actualizarFacturaEnDB(factura.id, { estado: "vista" });
        setFacturas((prev) =>
          prev.map((f) => (f.id === factura.id ? { ...f, estado: "vista" } : f))
        );
      } catch (err) {
        console.error("Error al marcar la factura como vista:", err);
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d1117] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mb-8 flex w-full max-w-3xl items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
        >
          <ArrowLeft size={18} />
          Volver
        </button>
        <h1 className="text-2xl font-bold sm:text-3xl">Facturas</h1>
        <div className="w-[92px] sm:w-[104px]" />
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {cargando ? (
        <p className="text-gray-400">Cargando facturas…</p>
      ) : facturas.length === 0 ? (
        <p className="text-gray-500">Todavía no hay facturas generadas.</p>
      ) : (
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {facturas.map((factura) => {
            const esNueva = factura.estado === "nueva";
            return (
              <button
                key={factura.id}
                onClick={() => handleAbrirFactura(factura)}
                className={`flex items-center gap-4 rounded-2xl border p-4 text-left shadow-lg transition hover:scale-[1.02] ${
                  esNueva
                    ? "border-blue-500/30 bg-blue-500/[0.08]"
                    : "border-white/10 bg-white/[0.03] opacity-70"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    esNueva ? "bg-blue-500/15 text-blue-400" : "bg-white/5 text-gray-500"
                  }`}
                >
                  <Receipt size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{factura.titulo}</p>
                  <p className="text-xs text-gray-400">
                    {factura.numero} · {formatearImporte(factura.importe)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {facturaAbierta && (
        <FacturaModal factura={facturaAbierta} onClose={() => setFacturaAbierta(null)} />
      )}
    </main>
  );
}