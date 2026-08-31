import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Receipt, Download, X, Loader2 } from "lucide-react";
import logo from "../assets/logo.png";
import { OCUPACION_LABEL, type Ocupacion } from "./Ingresos";
import {
  obtenerFacturasDeDB,
  actualizarFacturaEnDB,
  generarFacturasPendientes,
  obtenerFacturasIngresosDeDB,
  actualizarFacturaIngresoEnDB,
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

/* ---------------------------------------------------------- */
/* Tipos: dos sistemas de factura separados                     */
/* ---------------------------------------------------------- */

// Facturas "generales" — hoy solo Parrilleros, a futuro podrían sumarse
// Controles/Tags. Viven en la colección "facturas".
export interface Factura {
  id: string;
  numero: string; // "A0001", "A0002"...
  titulo: string; // "Fac. Parrillero (30/08/2026)"
  fecha: string; // fecha de uso, YYYY-MM-DD
  unidad: string;
  nombreCliente: string;
  emailCliente: string;
  concepto: string;
  importe: number;
  reservaId: string;
  estado: "nueva" | "vista"; // controla el color de la card (no confundir con "pagado")
  pagado: boolean;
  formaPago?: string; // "Efectivo", "Transferencia", etc.
  autor: string;
  fechaCreacion: string; // ISO
}

// Facturas de Ingresos — completamente aparte, viven en la colección
// "facturasIngresos" y numeran distinto (prefijo "I"). Llevan todos los
// datos del ocupante y siempre el bloque de consumo de UTE.
export interface FacturaIngreso {
  id: string;
  numero: string; // "I0001", "I0002"...
  titulo: string; // "Fac. Ingreso (30/08/2026)"
  fecha: string; // fecha de ingreso, YYYY-MM-DD
  fechaSalida?: string; // YYYY-MM-DD, puede venir vacía (propietario/inquilino anual)
  unidad: string;
  nombreCliente: string;
  emailCliente: string;
  documento?: string;
  telefono?: string;
  ciudad?: string;
  ocupacion: Ocupacion;
  auto?: string;
  matricula?: string;
  tomaConsumoUte: boolean;
  lecturaUteEntrada?: number;
  lecturaUteSalida?: number;
  concepto: string;
  importe: number;
  ingresoId: string;
  estado: "nueva" | "vista";
  pagado: boolean;
  formaPago?: string;
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

function formatearFecha(fecha?: string) {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ---------------------------------------------------------- */
/* Estilos compartidos del documento imprimible                  */
/* ---------------------------------------------------------- */
// Todo esto usa estilos inline (style={{...}}), nunca clases de Tailwind.
// html2canvas (la librería que captura el bloque para armar el PDF) no
// sabe leer los colores que genera Tailwind v4 (oklch/color()), así que
// cualquier clase de color acá rompe la descarga. Siempre en style, nunca
// className para colores/bordes.

function Fila({ izquierda, derecha }: { izquierda: React.ReactNode; derecha?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span>{izquierda}</span>
      <span>{derecha}</span>
    </div>
  );
}

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

const estiloContenedor: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#ffffff",
  color: "#1a1a1a",
  border: "1px solid #1a1a1a",
  fontFamily: "inherit",
  fontSize: "13px",
};

function EncabezadoFactura({ numero, fecha }: { numero: string; fecha: string }) {
  return (
    <>
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
          derecha={<span>N.º {numero}</span>}
        />
        <Fila izquierda={<span style={{ color: "#4b5563" }}>{CONFIG_FACTURA.direccion}</span>} />
        <Fila
          izquierda={<span style={{ color: "#4b5563" }}>{CONFIG_FACTURA.contacto}</span>}
          derecha={<span>{formatearFecha(fecha)}</span>}
        />
      </div>
      <div style={estiloDivider} />
    </>
  );
}

function PieFactura() {
  return (
    <div style={{ padding: "14px 20px", textAlign: "center", fontSize: "11px", color: "#6b7280" }}>
      Comprobante administrativo generado por el sistema de administración de{" "}
      {CONFIG_FACTURA.nombreEmisor}.
    </div>
  );
}

function BloqueTotalYPago({ importe, pagado, formaPago }: { importe: number; pagado: boolean; formaPago?: string }) {
  return (
    <>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <Fila
          izquierda={<span />}
          derecha={
            <span style={{ fontSize: "16px", fontWeight: 700 }}>
              TOTAL&nbsp;&nbsp;{formatearImporte(importe)}
            </span>
          }
        />
        <div style={{ height: "4px" }} />
        <p style={{ margin: 0 }}>
          Estado: <strong>{pagado ? "PAGADO" : "PENDIENTE"}</strong>
        </p>
        {pagado && formaPago && <p style={{ margin: 0 }}>Forma de pago: {formaPago}</p>}
      </div>
      <div style={estiloDivider} />
    </>
  );
}

/* ---------------------------------------------------------- */
/* Documento: facturas GENERALES (Parrilleros y similares)       */
/* ---------------------------------------------------------- */
// Diseño original, sin ningún dato de UTE — eso es exclusivo de las
// facturas de Ingreso.

function FacturaDocumento({ factura }: { factura: Factura }) {
  return (
    <div style={estiloContenedor}>
      <EncabezadoFactura numero={factura.numero} fecha={factura.fecha} />

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <p style={estiloSeccionTitulo}>CLIENTE</p>
        <div style={{ height: "4px" }} />
        <p style={{ margin: 0 }}>Nombre: {factura.nombreCliente}</p>
        <p style={{ margin: 0 }}>Apartamento: {factura.unidad}</p>
      </div>

      <div style={estiloDivider} />

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

      <BloqueTotalYPago importe={factura.importe} pagado={factura.pagado} formaPago={factura.formaPago} />

      <PieFactura />
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Documento: facturas de INGRESOS                               */
/* ---------------------------------------------------------- */
// Diseño propio: datos completos del ocupante + bloque de UTE siempre
// presente (vacío si no correspondía tomar consumo).

function FacturaIngresoDocumento({ factura }: { factura: FacturaIngreso }) {
  return (
    <div style={estiloContenedor}>
      <EncabezadoFactura numero={factura.numero} fecha={factura.fecha} />

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <p style={estiloSeccionTitulo}>OCUPANTE</p>
        <div style={{ height: "4px" }} />
        <p style={{ margin: 0 }}>Nombre: {factura.nombreCliente}</p>
        {factura.documento && <p style={{ margin: 0 }}>Documento: {factura.documento}</p>}
        <p style={{ margin: 0 }}>Apartamento: {factura.unidad}</p>
        {factura.telefono && <p style={{ margin: 0 }}>Teléfono: {factura.telefono}</p>}
        {factura.emailCliente && <p style={{ margin: 0 }}>E-mail: {factura.emailCliente}</p>}
        {factura.ciudad && <p style={{ margin: 0 }}>Ciudad: {factura.ciudad}</p>}
        <p style={{ margin: 0 }}>Carácter de ocupación: {OCUPACION_LABEL[factura.ocupacion]}</p>
        {(factura.auto || factura.matricula) && (
          <p style={{ margin: 0 }}>
            Auto: {factura.auto ?? ""} {factura.matricula && `· ${factura.matricula}`}
          </p>
        )}
        <p style={{ margin: 0 }}>
          Estadía: {formatearFecha(factura.fecha)}
          {factura.fechaSalida ? ` → ${formatearFecha(factura.fechaSalida)}` : " · sin fecha de salida fija"}
        </p>
      </div>

      <div style={estiloDivider} />

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

      {/* Bloque de UTE: SIEMPRE se imprime en las facturas de ingreso. Si
          los campos vienen vacíos, es porque no se pidió tomar consumo en
          esa estadía — no es un error, es la norma. */}
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

      <BloqueTotalYPago importe={factura.importe} pagado={factura.pagado} formaPago={factura.formaPago} />

      <PieFactura />
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Modal con preview + descarga PDF (genérico para ambos tipos)  */
/* ---------------------------------------------------------- */

function FacturaModal({
  titulo,
  numero,
  documento,
  onClose,
}: {
  titulo: string;
  numero: string;
  documento: React.ReactNode;
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
      pdf.save(`${numero}.pdf`);
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
          <p className="font-semibold text-white">{titulo}</p>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div ref={contenidoRef} className="overflow-hidden rounded-xl">
            {documento}
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
  const [tab, setTab] = useState<"general" | "ingresos">("general");

  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [facturasIngresos, setFacturasIngresos] = useState<FacturaIngreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [facturaAbierta, setFacturaAbierta] = useState<Factura | null>(null);
  const [facturaIngresoAbierta, setFacturaIngresoAbierta] = useState<FacturaIngreso | null>(null);

  const cargarTodo = async () => {
    try {
      setError("");
      const [datosGenerales, datosIngresos] = await Promise.all([
        obtenerFacturasDeDB(),
        obtenerFacturasIngresosDeDB(),
      ]);
      setFacturas(datosGenerales as unknown as Factura[]);
      setFacturasIngresos(datosIngresos as unknown as FacturaIngreso[]);
    } catch (err) {
      console.error("Error al cargar facturas desde Firestore:", err);
      setError("No se pudieron cargar las facturas. Revisá tu conexión.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    (async () => {
      // Antes de traer las listas, revisa reservas de parrillero pagadas
      // (+1hr de margen) e ingresos finalizados (sin margen) que todavía
      // no generaron su factura, y las crea. Cada sistema es independiente
      // — colección propia, contador propio, try/catch propio.
      try {
        await generarFacturasPendientes();
      } catch (err) {
        console.error("Error al generar facturas pendientes generales:", err);
      }
      try {
        await generarFacturasPendientesDeIngresos();
      } catch (err) {
        console.error("Error al generar facturas pendientes de ingresos:", err);
      }
      await cargarTodo();
      onListo?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAbrirFactura = async (factura: Factura) => {
    setFacturaAbierta(factura);
    if (factura.estado === "nueva") {
      try {
        await actualizarFacturaEnDB(factura.id, { estado: "vista" });
        setFacturas((prev) => prev.map((f) => (f.id === factura.id ? { ...f, estado: "vista" } : f)));
      } catch (err) {
        console.error("Error al marcar la factura como vista:", err);
      }
    }
  };

  const handleAbrirFacturaIngreso = async (factura: FacturaIngreso) => {
    setFacturaIngresoAbierta(factura);
    if (factura.estado === "nueva") {
      try {
        await actualizarFacturaIngresoEnDB(factura.id, { estado: "vista" });
        setFacturasIngresos((prev) => prev.map((f) => (f.id === factura.id ? { ...f, estado: "vista" } : f)));
      } catch (err) {
        console.error("Error al marcar la factura de ingreso como vista:", err);
      }
    }
  };

  const listaVisible = tab === "general" ? facturas : facturasIngresos;

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

      <div className="mb-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setTab("general")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "general" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          General ({facturas.length})
        </button>
        <button
          onClick={() => setTab("ingresos")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "ingresos" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Ingresos ({facturasIngresos.length})
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {cargando ? (
        <p className="text-gray-400">Cargando facturas…</p>
      ) : listaVisible.length === 0 ? (
        <p className="text-gray-500">Todavía no hay facturas generadas en esta sección.</p>
      ) : (
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {tab === "general"
            ? facturas.map((factura) => {
                const esNueva = factura.estado === "nueva";
                return (
                  <button
                    key={factura.id}
                    onClick={() => handleAbrirFactura(factura)}
                    className={`flex items-center gap-4 rounded-2xl border p-4 text-left shadow-lg transition hover:scale-[1.02] ${
                      esNueva ? "border-blue-500/30 bg-blue-500/[0.08]" : "border-white/10 bg-white/[0.03] opacity-70"
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
              })
            : facturasIngresos.map((factura) => {
                const esNueva = factura.estado === "nueva";
                return (
                  <button
                    key={factura.id}
                    onClick={() => handleAbrirFacturaIngreso(factura)}
                    className={`flex items-center gap-4 rounded-2xl border p-4 text-left shadow-lg transition hover:scale-[1.02] ${
                      esNueva ? "border-blue-500/30 bg-blue-500/[0.08]" : "border-white/10 bg-white/[0.03] opacity-70"
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
        <FacturaModal
          titulo={facturaAbierta.titulo}
          numero={facturaAbierta.numero}
          documento={<FacturaDocumento factura={facturaAbierta} />}
          onClose={() => setFacturaAbierta(null)}
        />
      )}

      {facturaIngresoAbierta && (
        <FacturaModal
          titulo={facturaIngresoAbierta.titulo}
          numero={facturaIngresoAbierta.numero}
          documento={<FacturaIngresoDocumento factura={facturaIngresoAbierta} />}
          onClose={() => setFacturaIngresoAbierta(null)}
        />
      )}
    </main>
  );
}