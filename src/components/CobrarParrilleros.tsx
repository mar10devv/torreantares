import { useState, useEffect } from "react";
import { X, Wallet, Check, History } from "lucide-react";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

// Compatible con ReservaParrillero de DayGrillModal.tsx, con el campo
// "retiradoPorAdmin" que vamos a sumarle a ese archivo en el próximo paso.
interface ReservaParrillero {
  id: string;
  ubicacion: "interior" | "exterior";
  parrillero: 1 | 2;
  fecha: string;
  turno: "mediodia" | "noche";
  unidad: string;
  nombreCliente: string;
  emailCliente?: string;
  importe: number;
  autor: string;
  fechaCreacion: string;
  pagado: boolean;
  cancelada: boolean;
  fechaCancelacion?: string;
  canceladoPor?: string;
  motivoCancelacion?: string;
  retiradoPorAdmin?: boolean;
}

interface Retiro {
  id: string;
  monto: number;
  fecha: string; // ISO
  autor: string;
}

const STORAGE_KEY_RESERVAS = "torreantares_parrilleros";
const STORAGE_KEY_RETIROS = "torreantares_retiros_parrilleros";

function generarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatearImporte(valor: number) {
  return valor.toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  });
}

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CobrarParrillerosProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: Usuario;
}

export default function CobrarParrilleros({ isOpen, onClose, usuario }: CobrarParrillerosProps) {
  const [reservas, setReservas] = useState<ReservaParrillero[]>([]);
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [confirmando, setConfirmando] = useState(false);

  // Recarga los datos cada vez que se abre el modal, por si cambió algo
  // mientras estaba cerrado (nuevas reservas pagadas, cancelaciones, etc.)
  useEffect(() => {
    if (!isOpen) return;

    try {
      const guardadoReservas = localStorage.getItem(STORAGE_KEY_RESERVAS);
      setReservas(guardadoReservas ? JSON.parse(guardadoReservas) : []);
    } catch {
      setReservas([]);
    }

    try {
      const guardadoRetiros = localStorage.getItem(STORAGE_KEY_RETIROS);
      setRetiros(guardadoRetiros ? JSON.parse(guardadoRetiros) : []);
    } catch {
      setRetiros([]);
    }

    setConfirmando(false);
  }, [isOpen]);

  if (!isOpen) return null;

  // Cuenta como "disponible para retirar" toda reserva pagada, no cancelada,
  // y que todavía no haya sido marcada como retirada en un cobro anterior.
  const disponibles = reservas.filter((r) => r.pagado && !r.cancelada && !r.retiradoPorAdmin);
  const totalDisponible = disponibles.reduce((acc, r) => acc + r.importe, 0);

  const ultimoRetiro = [...retiros].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )[0];

  const handleRetirar = () => {
    if (totalDisponible <= 0) return;
    setConfirmando(true);
  };

  const confirmarRetiro = () => {
    const monto = totalDisponible;
    const ahora = new Date().toISOString();

    // Marca como "retiradas" todas las reservas que se acaban de contar,
    // así no se vuelven a sumar en el próximo cobro.
    const idsDisponibles = new Set(disponibles.map((r) => r.id));
    const nuevasReservas = reservas.map((r) =>
      idsDisponibles.has(r.id) ? { ...r, retiradoPorAdmin: true } : r
    );
    localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(nuevasReservas));
    setReservas(nuevasReservas);

    // Registra el retiro para poder mostrar "último retiro" la próxima vez.
    const nuevoRetiro: Retiro = { id: generarId(), monto, fecha: ahora, autor: usuario.nombre };
    const nuevosRetiros = [...retiros, nuevoRetiro];
    localStorage.setItem(STORAGE_KEY_RETIROS, JSON.stringify(nuevosRetiros));
    setRetiros(nuevosRetiros);

    setConfirmando(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-xl font-bold text-white">Cobrar Parrilleros</h2>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        {!confirmando ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="flex items-center gap-1.5 text-xs text-gray-400">
                <History size={13} />
                Último retiro
              </p>
              {ultimoRetiro ? (
                <p className="mt-1.5 text-sm text-gray-200">
                  {formatearImporte(ultimoRetiro.monto)}{" "}
                  <span className="text-gray-500">
                    · {formatearFechaHora(ultimoRetiro.fecha)} · {ultimoRetiro.autor}
                  </span>
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-gray-500">Todavía no se registró ningún retiro.</p>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <Wallet size={22} />
              </div>
              <p className="text-xs text-gray-400">Dinero para retirar ahora</p>
              <p className="text-3xl font-bold text-white">{formatearImporte(totalDisponible)}</p>
              <p className="text-xs text-gray-500">
                {disponibles.length} {disponibles.length === 1 ? "parrillero pagado" : "parrilleros pagados"} sin retirar
              </p>
            </div>

            <button
              onClick={handleRetirar}
              disabled={totalDisponible <= 0}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={16} />
              Retirar dinero
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-300">
              ¿Confirmás el retiro de{" "}
              <span className="font-semibold text-white">{formatearImporte(totalDisponible)}</span>? El
              contador vuelve a $0 y queda registrado con tu nombre y la fecha de hoy.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRetiro}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Check size={16} />
                Confirmar retiro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}