import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Receipt, Download, X, Loader2 } from "lucide-react";
import logo from "../assets/logo.png";
import { obtenerFacturasDeDB, actualizarFacturaEnDB } from "../lib/firebase";

// --------------------------------------------------------------------
// CONFIGURACIÓN DE FACTURACIÓN — único lugar a tocar cuando llegue el
// RUT definitivo, el CAE de DGI, o si cambia el prefijo de serie.
// El logo se toma del mismo archivo que ya usa el resto de la app.
// --------------------------------------------------------------------
export const CONFIG_FACTURA = {
  nombreEmisor: "Torre Antares",
  rut: "RUT PROVISORIO — PENDIENTE DE CONFIRMAR",
  prefijoSerie: "A",
  numeroCAE: "", // se completa cuando DGI habilite el CAE real
  logo,
};

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
  estado: "nueva" | "vista";
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
    maximumFractionDigits: 0,
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

function FacturaDocumento({ factura }: { factura: Factura }) {
  const esProvisoria = !CONFIG_FACTURA.numeroCAE;

  return (
    <div style={{ width: "100%", backgroundColor: "#ffffff", padding: "32px", color: "#1a1a1a" }}>
      {esProvisoria && (
        <div
          style={{
            marginBottom: "16px",
            borderRadius: "6px",
            border: "1px solid #fbbf24",
            backgroundColor: "#fffbeb",
            padding: "8px 12px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 500,
            color: "#b45309",
          }}
        >
          Comprobante provisorio — pendiente de autorización DGI (CAE)
        </div>
      )}

      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={CONFIG_FACTURA.logo.src ?? CONFIG_FACTURA.logo}
            alt=""
            style={{ height: "48px", width: "48px", objectFit: "contain", filter: "invert(1)" }}
          />
          <div>
            <p style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{CONFIG_FACTURA.nombreEmisor}</p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>{CONFIG_FACTURA.rut}</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", margin: 0 }}>
            Factura
          </p>
          <p style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>{factura.numero}</p>
          {CONFIG_FACTURA.numeroCAE && (
            <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>CAE: {CONFIG_FACTURA.numeroCAE}</p>
          )}
        </div>
      </div>

      <div style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "14px" }}>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af", margin: 0 }}>
            Cliente
          </p>
          <p style={{ fontWeight: 500, margin: "2px 0" }}>{factura.nombreCliente}</p>
          <p style={{ color: "#6b7280", margin: 0 }}>Unidad {factura.unidad}</p>
          {factura.emailCliente && <p style={{ color: "#6b7280", margin: 0 }}>{factura.emailCliente}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af", margin: 0 }}>
            Fecha
          </p>
          <p style={{ fontWeight: 500, margin: "2px 0" }}>{formatearFecha(factura.fecha)}</p>
        </div>
      </div>

      <table style={{ marginBottom: "24px", width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #d1d5db", textAlign: "left", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af" }}>
            <th style={{ paddingBottom: "8px", paddingTop: "8px", fontWeight: 600 }}>Concepto</th>
            <th style={{ paddingBottom: "8px", paddingTop: "8px", textAlign: "right", fontWeight: 600 }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
            <td style={{ paddingTop: "12px", paddingBottom: "12px" }}>{factura.concepto}</td>
            <td style={{ paddingTop: "12px", paddingBottom: "12px", textAlign: "right" }}>
              {formatearImporte(factura.importe)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "192px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1px solid #d1d5db",
              paddingTop: "8px",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            <span>Total</span>
            <span>{formatearImporte(factura.importe)}</span>
          </div>
        </div>
      </div>

      <p style={{ marginTop: "32px", textAlign: "center", fontSize: "10px", color: "#9ca3af" }}>
        Emitido por {factura.autor} · {CONFIG_FACTURA.nombreEmisor}
      </p>
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

      const canvas = await html2canvas(contenidoRef.current, { scale: 2, backgroundColor: "#ffffff" });
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