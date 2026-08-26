import { useState } from "react";
import { X, Check, Ban, CircleDollarSign, Sun, Moon, Clock, TriangleAlert } from "lucide-react";

export type Turno = "mediodia" | "noche";
export type Ubicacion = "interior" | "exterior";

export const PRECIOS: Record<Ubicacion, number> = {
  interior: 1000,
  exterior: 650,
};

export interface ReservaParrillero {
  id: string;
  ubicacion: Ubicacion;
  parrillero: 1 | 2;
  fecha: string; // YYYY-MM-DD
  turno: Turno;
  unidad: string;
  nombreCliente: string;
  emailCliente: string;
  importe: number;
  autor: string;
  fechaCreacion: string; // ISO
  pagado: boolean;
  cancelada: boolean;
  fechaCancelacion?: string;
  canceladoPor?: string;
  motivoCancelacion?: string;
  retiradoPorAdmin?: boolean; // true = ya fue contado en un cobro de Administración
}

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface DayGrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  fecha: string; // YYYY-MM-DD
  ubicacion: Ubicacion;
  /** Se llama cuando el usuario cambia Adentro/Afuera desde adentro del modal. */
  onCambiarUbicacion?: (ubicacion: Ubicacion) => void;
  reservasDelDia: ReservaParrillero[];
  usuario: Usuario;
  onReservar: (
    parrillero: 1 | 2,
    turno: Turno,
    unidad: string,
    nombreCliente: string,
    emailCliente: string,
    pagado: boolean
  ) => void;
  onTogglePagado: (id: string) => void;
  onCancelar: (id: string, motivo: string) => void;
}

const UBICACIONES: { key: Ubicacion; label: string }[] = [
  { key: "interior", label: "Adentro" },
  { key: "exterior", label: "Afuera" },
];

const TURNOS: { key: Turno; label: string; Icon: typeof Sun }[] = [
  { key: "mediodia", label: "Día", Icon: Sun },
  { key: "noche", label: "Noche", Icon: Moon },
];

function obtenerTemporada(fecha: string): "verano" | "invierno" {
  const mes = Number(fecha.split("-")[1]);
  return mes === 12 || mes <= 3 ? "verano" : "invierno";
}

function obtenerHorario(turno: Turno, temporada: "verano" | "invierno") {
  if (turno === "noche") {
    return temporada === "verano" ? "20:00 - 02:00" : "20:00 - 01:00";
  }
  return temporada === "verano" ? "10:00 - 16:00" : "10:00 - 15:00";
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function esAyer(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaDate = new Date(anio, mes - 1, dia).getTime();

  const ayer = new Date();
  ayer.setHours(0, 0, 0, 0);
  ayer.setDate(ayer.getDate() - 1);

  return fechaDate === ayer.getTime();
}

// Determina si todavía se puede crear una reserva nueva para esa fecha/turno.
// Los días pasados quedan bloqueados, salvo el turno "noche" de ayer, que sigue
// vigente hasta la hora en que realmente termina (01:00 invierno / 02:00 verano).
function puedeReservarTurno(fecha: string, turno: Turno, temporada: "verano" | "invierno") {
  const hoy = hoyISO();

  if (fecha > hoy) return true; // día futuro
  if (fecha === hoy) return true; // hoy, cualquier turno

  // A partir de acá, fecha < hoy (es pasado)
  if (turno === "noche" && esAyer(fecha)) {
    const ahora = new Date();
    const limiteHora = temporada === "verano" ? 2 : 1; // 02:00 verano / 01:00 invierno
    return ahora.getHours() < limiteHora;
  }

  return false;
}

function formatearFechaTitulo(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const d = new Date(anio, mes - 1, dia);
  return d.toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatearHora(iso: string) {
  return new Date(iso).toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearImporte(valor: number) {
  return valor.toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  });
}

function SlotButton({
  reserva,
  seleccionado,
  permiteReservar,
  onClick,
}: {
  reserva: ReservaParrillero | undefined;
  seleccionado: boolean;
  permiteReservar: boolean;
  onClick: () => void;
}) {
  if (seleccionado) {
    const estilos = reserva
      ? reserva.pagado
        ? "border-red-500/50 bg-red-500/10 text-red-300"
        : "border-amber-500/50 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
    return (
      <button
        onClick={onClick}
        className={`w-full rounded-lg border-2 px-3 py-3 text-sm font-semibold transition ${estilos}`}
      >
        Seleccionado
      </button>
    );
  }

  if (!reserva) {
    if (!permiteReservar) {
      return (
        <div className="w-full cursor-not-allowed rounded-lg border border-dashed border-white/10 py-3 text-center text-sm text-gray-600">
          No disponible
        </div>
      );
    }

    return (
      <button
        onClick={onClick}
        className="w-full rounded-lg border border-dashed border-emerald-500/30 py-3 text-sm text-emerald-400/90 transition hover:border-emerald-400/60 hover:text-emerald-300"
      >
        Libre · Reservar
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-sm transition ${
        reserva.pagado
          ? "border-red-500/30 bg-red-500/[0.07] text-red-300 hover:bg-red-500/[0.12]"
          : "border-amber-500/30 bg-amber-500/[0.07] text-amber-300 hover:bg-amber-500/[0.12]"
      }`}
    >
      <span className="font-semibold">Unidad {reserva.unidad}</span>
      <span className="flex items-center gap-1 text-xs">{reserva.pagado ? "Pagado" : "Pendiente"}</span>
    </button>
  );
}

// Reemplaza al window.alert() del navegador (ese cartel gris feo con el
// nombre del sitio) por un modal propio, con el mismo lenguaje visual que
// el resto de la app.
function AvisoModal({ mensaje, onCerrar }: { mensaje: string; onCerrar: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-amber-500/25 bg-[#171b22]/95 p-6 text-center shadow-2xl backdrop-blur-2xl"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <TriangleAlert size={22} />
        </div>

        <p className="mt-4 text-sm leading-relaxed text-gray-200">{mensaje}</p>

        <button
          onClick={onCerrar}
          className="mt-5 w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

function SlotDetailPanel({
  parrillero,
  turno,
  precio,
  reserva,
  usuario,
  onReservar,
  onTogglePagado,
  onCancelar,
  onCerrar,
}: {
  parrillero: 1 | 2;
  turno: Turno;
  precio: number;
  reserva: ReservaParrillero | undefined;
  usuario: Usuario;
  onReservar: (
    parrillero: 1 | 2,
    turno: Turno,
    unidad: string,
    nombreCliente: string,
    emailCliente: string,
    pagado: boolean
  ) => void;
  onTogglePagado: (id: string) => void;
  onCancelar: (id: string, motivo: string) => void;
  onCerrar: () => void;
}) {
  const [unidad, setUnidad] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [pagado, setPagado] = useState(true);
  const [modo, setModo] = useState<"detalle" | "cancelar">("detalle");
  const [motivo, setMotivo] = useState("");
  const [mostrarAvisoMotivo, setMostrarAvisoMotivo] = useState(false);

  const handleConfirmar = () => {
    if (!unidad.trim() || !nombreCliente.trim()) return;
    onReservar(parrillero, turno, unidad.trim(), nombreCliente.trim(), emailCliente.trim(), pagado);
    setUnidad("");
    setNombreCliente("");
    setEmailCliente("");
    setPagado(true);
    onCerrar();
  };

  const handleConfirmarCancelacion = () => {
    if (!reserva) return;
    if (!motivo.trim()) {
      setMostrarAvisoMotivo(true);
      return;
    }
    onCancelar(reserva.id, motivo.trim());
    setMotivo("");
    setModo("detalle");
    onCerrar();
  };

  const estilos = reserva
    ? reserva.pagado
      ? "border-red-500/30 bg-red-500/[0.05]"
      : "border-amber-500/30 bg-amber-500/[0.05]"
    : "border-emerald-500/25 bg-emerald-500/[0.04]";

  return (
    <>
    <div className={`rounded-xl border p-4 ${estilos}`}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Parrillero {parrillero}
      </p>

      {reserva ? (
        modo === "cancelar" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-400">
              Unidad {reserva.unidad}
              {reserva.pagado && ` · se debe devolver ${formatearImporte(reserva.importe)}`}. Esto cierra la
              reserva y deja el motivo registrado en una nota firmada por vos.
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">
                Motivo <span className="text-red-400">· obligatorio</span>
              </label>
              <textarea
                autoFocus
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Se canceló por lluvia"
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModo("detalle");
                  setMotivo("");
                }}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/10"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmarCancelacion}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
              >
                <Check size={14} />
                Confirmar cancelación
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">Unidad {reserva.unidad}</span>
              {reserva.pagado ? (
                <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400">
                  Pagado
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400">
                  Pendiente de pago
                </span>
              )}
            </div>

            <p className="text-sm text-gray-300">{reserva.nombreCliente}</p>
            {reserva.emailCliente && (
              <p className="text-xs text-gray-500">{reserva.emailCliente}</p>
            )}

            <p className="text-xs text-gray-400">
              Importe <span className="text-gray-200">{formatearImporte(reserva.importe)}</span>
            </p>

            <p className="text-xs text-gray-400">
              Registrado por <span className="text-gray-300">{reserva.autor}</span> · {formatearHora(reserva.fechaCreacion)}
            </p>

            <div className="mt-2 flex gap-2">
              {!reserva.pagado && (
                <button
                  onClick={() => onTogglePagado(reserva.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"
                >
                  <CircleDollarSign size={14} />
                  Marcar pagado
                </button>
              )}
              <button
                onClick={() => setModo("cancelar")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
              >
                <Ban size={14} />
                Cancelar
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-2.5">
          <input
            autoFocus
            type="text"
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            placeholder="Nombre del inquilino"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />

          <input
            type="text"
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            placeholder="Número de apartamento"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />

          <input
            type="email"
            value={emailCliente}
            onChange={(e) => setEmailCliente(e.target.value)}
            placeholder="Mail (para enviarle la boleta)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />

          <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setPagado(false)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                !pagado ? "bg-amber-500/20 text-amber-300" : "text-gray-400 hover:text-white"
              }`}
            >
              Se debe cobrar
            </button>
            <button
              type="button"
              onClick={() => setPagado(true)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                pagado ? "bg-red-500/20 text-red-300" : "text-gray-400 hover:text-white"
              }`}
            >
              Pago
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Importe: <span className="text-gray-300">{formatearImporte(precio)}</span> · Firma:{" "}
            <span className="text-gray-300">{usuario.nombre}</span>
          </p>

          <div className="flex gap-2">
            <button
              onClick={onCerrar}
              className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              <Check size={14} />
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>

    {mostrarAvisoMotivo && (
      <AvisoModal
        mensaje="Tenés que indicar un motivo para cancelar la reserva."
        onCerrar={() => setMostrarAvisoMotivo(false)}
      />
    )}
    </>
  );
}

export default function DayGrillModal({
  isOpen,
  onClose,
  fecha,
  ubicacion,
  onCambiarUbicacion,
  reservasDelDia,
  usuario,
  onReservar,
  onTogglePagado,
  onCancelar,
}: DayGrillModalProps) {
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno>("mediodia");
  const [parrilleroSeleccionado, setParrilleroSeleccionado] = useState<1 | 2 | null>(null);

  if (!isOpen) return null;

  const temporada = obtenerTemporada(fecha);
  const precio = PRECIOS[ubicacion];
  const horario = obtenerHorario(turnoSeleccionado, temporada);
  const permiteReservar = puedeReservarTurno(fecha, turnoSeleccionado, temporada);

  const buscarReserva = (parrillero: 1 | 2, turno: Turno) =>
    reservasDelDia.find((r) => r.parrillero === parrillero && r.turno === turno && !r.cancelada);

  const handleCambiarTurno = (turno: Turno) => {
    setTurnoSeleccionado(turno);
    setParrilleroSeleccionado(null);
  };

  const handleCambiarUbicacion = (nuevaUbicacion: Ubicacion) => {
    if (nuevaUbicacion === ubicacion) return;
    if (!onCambiarUbicacion) {
      // Todavía no está conectado el prop en Parrilleros.tsx.
      console.warn(
        "DayGrillModal: falta pasar el prop 'onCambiarUbicacion' desde Parrilleros.tsx para que este botón funcione."
      );
      return;
    }
    onCambiarUbicacion(nuevaUbicacion);
    setParrilleroSeleccionado(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        {/* Encabezado: fecha + botón cerrar */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Reserva de parrillero
            </p>
            <h2 className="mt-1 text-2xl font-bold capitalize text-white">
              {formatearFechaTitulo(fecha)}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-2 transition hover:bg-white/10"
          >
            <X className="text-white" size={20} />
          </button>
        </div>

        {/* Precio destacado: mismo lenguaje visual que la card de "Dinero
            para retirar" en CobrarParrilleros, para que el importe se lea
            como el dato principal y no como una línea de texto más. */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] px-5 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <CircleDollarSign size={22} />
          </div>
          <div>
            <p className="text-xs font-medium capitalize text-emerald-300/80">
              Precio · {ubicacion === "interior" ? "Adentro" : "Afuera"}
            </p>
            <p className="text-3xl font-bold leading-tight text-white">{formatearImporte(precio)}</p>
          </div>
        </div>

        {/* Selector Adentro / Afuera */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Ubicación</p>
        <div className="mb-5 flex rounded-xl border border-white/10 bg-white/5 p-1">
          {UBICACIONES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleCambiarUbicacion(key)}
              className={`flex-1 rounded-lg px-5 py-2 text-sm font-medium transition ${
                ubicacion === key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Selector Día / Noche */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Turno</p>
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex w-full rounded-xl border border-white/10 bg-white/5 p-1">
            {TURNOS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => handleCambiarTurno(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition ${
                  turnoSeleccionado === key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-base font-medium text-gray-200">
            <Clock size={16} className="text-gray-400" />
            {horario}
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Elegí un parrillero
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([1, 2] as const).map((parrillero) => (
            <div key={parrillero} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-gray-300">Parrillero {parrillero}</p>
              <SlotButton
                reserva={buscarReserva(parrillero, turnoSeleccionado)}
                seleccionado={parrilleroSeleccionado === parrillero}
                permiteReservar={permiteReservar}
                onClick={() =>
                  setParrilleroSeleccionado((prev) => (prev === parrillero ? null : parrillero))
                }
              />
            </div>
          ))}
        </div>

        {parrilleroSeleccionado !== null && (
          <div className="mt-4">
            <SlotDetailPanel
              parrillero={parrilleroSeleccionado}
              turno={turnoSeleccionado}
              precio={precio}
              reserva={buscarReserva(parrilleroSeleccionado, turnoSeleccionado)}
              usuario={usuario}
              onReservar={onReservar}
              onTogglePagado={onTogglePagado}
              onCancelar={onCancelar}
              onCerrar={() => setParrilleroSeleccionado(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}