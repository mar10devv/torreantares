import { useState, useRef } from "react";
import { X, Download, Loader2, Lock } from "lucide-react";
import type { ReservaParrillero, Ubicacion } from "./DayGrillModal";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_SEMANA_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function formatearImporte(valor: number) {
  return valor.toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  });
}

// Busca, para un día/turno/parrillero puntual, la reserva activa (no
// cancelada). En teoría solo puede haber una vigente por slot a la vez.
function buscarReservaDelSlot(
  reservas: ReservaParrillero[],
  fecha: string,
  turno: "mediodia" | "noche",
  parrillero: 1 | 2
) {
  return reservas.find(
    (r) => r.fecha === fecha && r.turno === turno && r.parrillero === parrillero && !r.cancelada
  );
}

/* ---------------------------------------------------------- */
/* Documento imprimible                                         */
/* ---------------------------------------------------------- */
// Mismo criterio que FacturaDocumento: SOLO estilos inline, nunca clases
// de Tailwind, porque html2canvas no interpreta los colores oklch/color()
// que genera Tailwind v4 y el PDF sale roto.

function CeldaSlot({ reserva }: { reserva: ReservaParrillero | undefined }) {
  if (!reserva) {
    return (
      <td style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "center", color: "#9ca3af" }}>
        —
      </td>
    );
  }

  const colorEstado = reserva.pagado ? "#15803d" : "#b45309"; // verde pagado / ámbar pendiente

  return (
    <td style={{ border: "1px solid #d1d5db", padding: "6px 8px", textAlign: "center" }}>
      <div style={{ fontWeight: 700 }}>Unidad {reserva.unidad}</div>
      <div style={{ fontSize: "11px", color: "#374151" }}>{formatearImporte(reserva.importe)}</div>
      <div style={{ fontSize: "10px", fontWeight: 600, color: colorEstado }}>
        {reserva.pagado ? "PAGADO" : "PENDIENTE"}
      </div>
    </td>
  );
}

function PlanillaDocumento({
  reservas,
  ubicacion,
  anio,
  mes,
}: {
  reservas: ReservaParrillero[];
  ubicacion: Ubicacion;
  anio: number;
  mes: number; // 0-indexado
}) {
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1);

  const activasDelMes = reservas.filter((r) => {
    if (r.ubicacion !== ubicacion || r.cancelada) return false;
    const [a, m] = r.fecha.split("-").map(Number);
    return a === anio && m - 1 === mes;
  });

  const totalPagado = activasDelMes.filter((r) => r.pagado).reduce((acc, r) => acc + r.importe, 0);
  const totalPendiente = activasDelMes.filter((r) => !r.pagado).reduce((acc, r) => acc + r.importe, 0);

  const estiloTh: React.CSSProperties = {
    border: "1px solid #1a1a1a",
    padding: "8px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.03em",
    backgroundColor: "#f3f4f6",
    color: "#1a1a1a",
  };

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        color: "#1a1a1a",
        border: "1px solid #1a1a1a",
        fontFamily: "inherit",
        fontSize: "12px",
      }}
    >
      {/* Encabezado */}
      <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "16px", fontWeight: 700 }}>
          CONTROL USO PARRILLERO — {ubicacion === "interior" ? "INTERIOR" : "EXTERIOR"}
        </span>
        <span style={{ fontSize: "13px", fontWeight: 700 }}>
          {MESES[mes].toUpperCase()} {anio}
        </span>
      </div>

      <div style={{ borderTop: "1px solid #1a1a1a" }} />

      {/* Tabla */}
      <div style={{ padding: "16px 20px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...estiloTh, width: "12%" }}>Día</th>
              <th style={estiloTh}>Parrillero 1 — Mediodía</th>
              <th style={estiloTh}>Parrillero 1 — Noche</th>
              <th style={estiloTh}>Parrillero 2 — Mediodía</th>
              <th style={estiloTh}>Parrillero 2 — Noche</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((dia) => {
              const fecha = `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
              const diaSemana = DIAS_SEMANA_CORTOS[new Date(anio, mes, dia).getDay()];
              return (
                <tr key={dia}>
                  <td style={{ border: "1px solid #d1d5db", padding: "6px 8px", fontWeight: 600, textAlign: "center" }}>
                    {dia} <span style={{ fontWeight: 400, color: "#6b7280" }}>({diaSemana})</span>
                  </td>
                  <CeldaSlot reserva={buscarReservaDelSlot(activasDelMes, fecha, "mediodia", 1)} />
                  <CeldaSlot reserva={buscarReservaDelSlot(activasDelMes, fecha, "noche", 1)} />
                  <CeldaSlot reserva={buscarReservaDelSlot(activasDelMes, fecha, "mediodia", 2)} />
                  <CeldaSlot reserva={buscarReservaDelSlot(activasDelMes, fecha, "noche", 2)} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid #1a1a1a" }} />

      {/* Totales del mes */}
      <div style={{ padding: "14px 20px", display: "flex", justifyContent: "flex-end", gap: "28px" }}>
        <span>
          Cobrado: <strong style={{ color: "#15803d" }}>{formatearImporte(totalPagado)}</strong>
        </span>
        <span>
          Pendiente: <strong style={{ color: "#b45309" }}>{formatearImporte(totalPendiente)}</strong>
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Modal con preview + descarga PDF                              */
/* ---------------------------------------------------------- */

interface PlanillaParrilleroModalProps {
  reservas: ReservaParrillero[];
  ubicacion: Ubicacion;
  anio: number;
  mes: number;
  /** Solo un mes ya cerrado habilita la descarga real del PDF. Mientras
   * el mes está en curso, el modal se abre igual para previsualizar, pero
   * el botón de descarga queda bloqueado. */
  puedeDescargar: boolean;
  onClose: () => void;
}

export default function PlanillaParrilleroModal({
  reservas,
  ubicacion,
  anio,
  mes,
  puedeDescargar,
  onClose,
}: PlanillaParrilleroModalProps) {
  const contenidoRef = useRef<HTMLDivElement>(null);
  const [descargando, setDescargando] = useState(false);

  const handleDescargar = async () => {
    if (!puedeDescargar || !contenidoRef.current) return;
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

      // Apaisado (landscape): la tabla es más ancha que alta.
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const anchoPagina = pdf.internal.pageSize.getWidth();
      const altoPagina = pdf.internal.pageSize.getHeight();
      const anchoImagen = anchoPagina;
      const altoImagen = (canvas.height * anchoImagen) / canvas.width;

      // Si la tabla no entra en una sola hoja (meses largos), se reparte
      // en varias páginas — mismo patrón estándar de jsPDF + html2canvas.
      let alturaRestante = altoImagen;
      let posicionY = 0;

      pdf.addImage(imgData, "PNG", 0, posicionY, anchoImagen, altoImagen);
      alturaRestante -= altoPagina;

      while (alturaRestante > 0) {
        posicionY = alturaRestante - altoImagen;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, posicionY, anchoImagen, altoImagen);
        alturaRestante -= altoPagina;
      }

      const nombreUbicacion = ubicacion === "interior" ? "Interior" : "Exterior";
      pdf.save(`Planilla-Parrillero-${nombreUbicacion}-${MESES[mes]}-${anio}.pdf`);
    } catch (err) {
      console.error("Error al generar el PDF de la planilla:", err);
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
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#171b22] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="font-semibold text-white">
              Planilla {ubicacion === "interior" ? "Interior" : "Exterior"} — {MESES[mes]} {anio}
            </p>
            {!puedeDescargar && (
              <p className="mt-0.5 text-xs text-amber-400">
                Vista previa · la descarga se habilita cuando termine el mes
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div ref={contenidoRef} className="overflow-hidden rounded-xl">
            <PlanillaDocumento reservas={reservas} ubicacion={ubicacion} anio={anio} mes={mes} />
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={handleDescargar}
            disabled={!puedeDescargar || descargando}
            title={!puedeDescargar ? "Disponible cuando el mes termine" : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500"
          >
            {descargando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : !puedeDescargar ? (
              <Lock size={16} />
            ) : (
              <Download size={16} />
            )}
            {descargando
              ? "Generando PDF…"
              : !puedeDescargar
              ? "Se habilita al terminar el mes"
              : "Descargar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}