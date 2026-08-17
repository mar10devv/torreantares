import { useState, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import DayGrillModal, { PRECIOS } from "./DayGrillModal";
import type { ReservaParrillero, Turno, Ubicacion } from "./DayGrillModal";
import {
  crearReservaParrilleroEnDB,
  obtenerReservasParrilleroDeDB,
  actualizarReservaParrilleroEnDB,
  crearNotaEnDB,
} from "../lib/firebase";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface ParrillerosProps {
  usuario: Usuario;
  onVolver: () => void;
  onListo?: () => void;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function fechaAKey(anio: number, mes: number, dia: number) {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function esHoy(anio: number, mes: number, dia: number) {
  const hoy = new Date();
  return hoy.getFullYear() === anio && hoy.getMonth() === mes && hoy.getDate() === dia;
}

function esPasado(anio: number, mes: number, dia: number) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(anio, mes, dia);
  return fecha < hoy;
}

export default function Parrilleros({ usuario, onVolver, onListo }: ParrillerosProps) {
  const [ubicacion, setUbicacion] = useState<Ubicacion>("interior");
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date();
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  // Las reservas ahora viven en Firestore, no en localStorage.
  const [reservas, setReservas] = useState<ReservaParrillero[]>([]);
  const [cargandoReservas, setCargandoReservas] = useState(true);
  const [errorReservas, setErrorReservas] = useState("");

  const cargarReservas = async () => {
    try {
      setErrorReservas("");
      const datos = await obtenerReservasParrilleroDeDB();
      setReservas(datos as unknown as ReservaParrillero[]);
    } catch (err) {
      console.error("Error al cargar reservas desde Firestore:", err);
      setErrorReservas("No se pudieron cargar las reservas. Revisá tu conexión.");
    } finally {
      setCargandoReservas(false);
    }
  };

  useEffect(() => {
    (async () => {
      await cargarReservas();
      onListo?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReservar = async (
    parrillero: 1 | 2,
    turno: Turno,
    unidad: string,
    nombreCliente: string,
    emailCliente: string,
    pagado: boolean
  ) => {
    if (!diaSeleccionado) return;

    const nuevaReserva = {
      ubicacion,
      parrillero,
      fecha: diaSeleccionado,
      turno,
      unidad,
      nombreCliente,
      emailCliente,
      importe: PRECIOS[ubicacion],
      autor: usuario.nombre,
      fechaCreacion: new Date().toISOString(),
      pagado,
      cancelada: false,
    };

    try {
      await crearReservaParrilleroEnDB(nuevaReserva);
      await cargarReservas();
    } catch (err) {
      console.error("Error al crear reserva en Firestore:", err);
      setErrorReservas("No se pudo crear la reserva. Intentá de nuevo.");
    }
  };

  const handleTogglePagado = async (id: string) => {
    const reserva = reservas.find((r) => r.id === id);
    if (!reserva) return;

    try {
      await actualizarReservaParrilleroEnDB(id, { pagado: !reserva.pagado });
      await cargarReservas();
    } catch (err) {
      console.error("Error al actualizar el pago en Firestore:", err);
      setErrorReservas("No se pudo actualizar el pago. Intentá de nuevo.");
    }
  };

  const handleCancelar = async (id: string, motivo: string) => {
    const reserva = reservas.find((r) => r.id === id);
    if (!reserva) return;

    try {
      await actualizarReservaParrilleroEnDB(id, {
        cancelada: true,
        fechaCancelacion: new Date().toISOString(),
        canceladoPor: usuario.nombre,
        motivoCancelacion: motivo,
      });

      // Nota automática de la cancelación, ahora en la misma colección
      // "notas" de Firestore que usa el módulo Notas.
      await crearNotaEnDB({
        contenido: `Cancela parrillero unidad ${reserva.unidad}: ${motivo}`,
        autor: usuario.nombre,
      });

      await cargarReservas();
    } catch (err) {
      console.error("Error al cancelar la reserva en Firestore:", err);
      setErrorReservas("No se pudo cancelar la reserva. Intentá de nuevo.");
    }
  };

  const { anio, mes } = mesActual;
  const primerDiaSemana = (new Date(anio, mes, 1).getDay() + 6) % 7; // Lunes = 0
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  const celdas: (number | null)[] = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  const cambiarMes = (delta: number) => {
    setMesActual((prev) => {
      const nuevaFecha = new Date(prev.anio, prev.mes + delta, 1);
      return { anio: nuevaFecha.getFullYear(), mes: nuevaFecha.getMonth() };
    });
  };

  const reservasActivasEnFecha = (fecha: string) =>
    reservas.filter((r) => r.fecha === fecha && r.ubicacion === ubicacion && !r.cancelada);

  const reservasDelDiaSeleccionado = diaSeleccionado
    ? reservas.filter((r) => r.fecha === diaSeleccionado && r.ubicacion === ubicacion)
    : [];

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

        <h1 className="text-2xl font-bold sm:text-3xl">Parrilleros</h1>

        <div className="w-[92px] sm:w-[104px]" />
      </div>

      {errorReservas && (
        <p className="mb-4 text-sm text-red-400">{errorReservas}</p>
      )}

      {/* Tabs Adentro / Afuera */}
      <div className="mb-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setUbicacion("interior")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            ubicacion === "interior" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Adentro
        </button>
        <button
          onClick={() => setUbicacion("exterior")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            ubicacion === "exterior" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Afuera
        </button>
      </div>

      {/* Navegación de mes */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => cambiarMes(-1)}
          className="rounded-lg border border-white/10 p-2 transition hover:bg-white/10"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="w-40 text-center text-lg font-semibold capitalize">
          {MESES[mes]} {anio}
        </p>
        <button
          onClick={() => cambiarMes(1)}
          className="rounded-lg border border-white/10 p-2 transition hover:bg-white/10"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {cargandoReservas ? (
        <p className="text-gray-400">Cargando reservas…</p>
      ) : (
        <>
          {/* Calendario */}
          <div className="w-full max-w-3xl">
            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-gray-500 sm:gap-2">
              {DIAS_SEMANA.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {celdas.map((dia, index) => {
                if (dia === null) return <div key={`vacio-${index}`} />;

                const fechaKey = fechaAKey(anio, mes, dia);
                const activas = reservasActivasEnFecha(fechaKey);
                const pasado = esPasado(anio, mes, dia);

                // Un punto por parrillero (no por turno): rojo si ese parrillero
                // tiene alguna reserva activa ese día (mediodía o noche), verde si está libre.
                const estadoParrilleros = ([1, 2] as const).map((p) =>
                  activas.some((r) => r.parrillero === p)
                );

                return (
                  <button
                    key={fechaKey}
                    onClick={() => setDiaSeleccionado(fechaKey)}
                    className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border p-1 transition hover:border-blue-500/50 hover:bg-white/10 ${
                      esHoy(anio, mes, dia)
                        ? "border-blue-500/50 bg-blue-500/10"
                        : pasado
                        ? "border-white/5 bg-white/[0.015]"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`text-sm font-semibold sm:text-base ${
                        pasado ? "text-gray-600" : "text-white"
                      }`}
                    >
                      {dia}
                    </span>
                    <div className="flex gap-1">
                      {estadoParrilleros.map((ocupado, i) => (
                        <span
                          key={i}
                          className={`h-2.5 w-2.5 rounded-full ${
                            pasado
                              ? ocupado
                                ? "bg-red-900/50"
                                : "bg-white/10"
                              : ocupado
                              ? "bg-red-500"
                              : "bg-emerald-500"
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-6 flex items-center gap-2 text-xs text-gray-500">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Ocupado
            <span className="ml-3 h-2.5 w-2.5 rounded-full bg-emerald-500" /> Libre
          </p>
        </>
      )}

      {diaSeleccionado && (
        <DayGrillModal
          isOpen={diaSeleccionado !== null}
          onClose={() => setDiaSeleccionado(null)}
          fecha={diaSeleccionado}
          ubicacion={ubicacion}
          onCambiarUbicacion={setUbicacion}
          reservasDelDia={reservasDelDiaSeleccionado}
          usuario={usuario}
          onReservar={handleReservar}
          onTogglePagado={handleTogglePagado}
          onCancelar={handleCancelar}
        />
      )}
    </main>
  );
}