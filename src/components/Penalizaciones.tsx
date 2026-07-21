import { useState, useEffect } from "react";
import { ArrowLeft, Plus, X, Check, AlertTriangle, History, ShieldAlert, Search } from "lucide-react";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface PenalizacionesProps {
  usuario: Usuario;
  onVolver: () => void;
}

interface Penalizacion {
  id: string;
  apartamento: string;
  motivo: string;
  fecha: string; // ISO
  autor: string;
  cicloCerrado: boolean; // true = ya se pagó la multa que incluía esta penalización
  multaId?: string; // agrupa las penalizaciones que formaron parte de la misma multa pagada
  fechaPago?: string; // ISO, cuándo se registró el pago de esa multa
  autorPago?: string; // quién registró el pago
}

const STORAGE_KEY = "torreantares_penalizaciones";

function generarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface GrupoDepto {
  apartamento: string;
  activas: Penalizacion[];
  historial: Penalizacion[]; // todas (activas + cerradas), más recientes primero
}

interface MultaPagada {
  multaId: string;
  apartamento: string;
  fecha: string; // fecha de pago
  autor: string; // quien registró el pago
  penalizaciones: Penalizacion[]; // las que formaron parte de esta multa
}

export default function Penalizaciones({ usuario, onVolver }: PenalizacionesProps) {
  const [penalizaciones, setPenalizaciones] = useState<Penalizacion[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false);
  const [penalizacionSeleccionada, setPenalizacionSeleccionada] = useState<Penalizacion | null>(null);
  const [historialesAbiertos, setHistorialesAbiertos] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [deptoAConfirmarPago, setDeptoAConfirmarPago] = useState<string | null>(null);
  const [tab, setTab] = useState<"activas" | "multas">("activas");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(penalizaciones));
  }, [penalizaciones]);

  // Agrupa por depto: activas (cuentan para los 3 círculos) e historial completo.
  const grupos: GrupoDepto[] = (() => {
    const mapa = new Map<string, Penalizacion[]>();
    penalizaciones.forEach((p) => {
      const lista = mapa.get(p.apartamento) ?? [];
      lista.push(p);
      mapa.set(p.apartamento, lista);
    });

    const resultado: GrupoDepto[] = [];
    mapa.forEach((lista, apartamento) => {
      const historial = [...lista].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      const activas = lista
        .filter((p) => !p.cicloCerrado)
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      resultado.push({ apartamento, activas, historial });
    });

    // Los que deben multa (o están más cerca) primero, y dentro de eso, actividad más reciente
    const ordenados = resultado.sort((a, b) => {
      if (b.activas.length !== a.activas.length) return b.activas.length - a.activas.length;
      return new Date(b.historial[0].fecha).getTime() - new Date(a.historial[0].fecha).getTime();
    });

    // Pestaña "Activas": solo deptos con al menos 1 penalización activa ahora mismo.
    const activos = ordenados.filter((g) => g.activas.length > 0);

    if (!busqueda.trim()) return activos;
    return activos.filter((g) => g.apartamento.includes(busqueda.trim()));
  })();

  // Pestaña "Multas realizadas": una card por CADA pago de multa (agrupado por multaId),
  // no por depto. Si un depto pagó dos veces, aparecen dos cards separadas, cada una
  // con las 3 penalizaciones (y motivos) que la originaron.
  const multas: MultaPagada[] = (() => {
    const mapa = new Map<string, Penalizacion[]>();
    penalizaciones.forEach((p) => {
      if (!p.multaId) return;
      const lista = mapa.get(p.multaId) ?? [];
      lista.push(p);
      mapa.set(p.multaId, lista);
    });

    const resultado: MultaPagada[] = [];
    mapa.forEach((lista, multaId) => {
      const primero = lista[0];
      resultado.push({
        multaId,
        apartamento: primero.apartamento,
        fecha: primero.fechaPago ?? primero.fecha,
        autor: primero.autorPago ?? primero.autor,
        penalizaciones: [...lista].sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        ),
      });
    });

    const ordenado = resultado.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    if (!busqueda.trim()) return ordenado;
    return ordenado.filter((m) => m.apartamento.includes(busqueda.trim()));
  })();

  const handleCrearPenalizacion = (apartamento: string, motivo: string) => {
    const activasActuales = penalizaciones.filter(
      (p) => p.apartamento === apartamento && !p.cicloCerrado
    );

    if (activasActuales.length >= 3) {
      window.alert(
        `El depto ${apartamento} ya tiene 3 penalizaciones activas y debe multa. Tenés que registrar el pago de la multa antes de agregar una nueva.`
      );
      return;
    }

    const nueva: Penalizacion = {
      id: generarId(),
      apartamento,
      motivo,
      fecha: new Date().toISOString(),
      autor: usuario.nombre,
      cicloCerrado: false,
    };
    setPenalizaciones((prev) => [...prev, nueva]);
    setModalNuevaAbierto(false);
  };

  const handlePagarMulta = (apartamento: string) => {
    setDeptoAConfirmarPago(apartamento);
  };

  const confirmarPagoMulta = () => {
    if (!deptoAConfirmarPago) return;
    const apartamento = deptoAConfirmarPago;
    const multaId = generarId();
    const ahora = new Date().toISOString();

    setPenalizaciones((prev) =>
      prev.map((p) =>
        p.apartamento === apartamento && !p.cicloCerrado
          ? { ...p, cicloCerrado: true, multaId, fechaPago: ahora, autorPago: usuario.nombre }
          : p
      )
    );
    setDeptoAConfirmarPago(null);
  };

  const toggleHistorial = (apartamento: string) => {
    setHistorialesAbiertos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(apartamento)) {
        nuevo.delete(apartamento);
      } else {
        nuevo.add(apartamento);
      }
      return nuevo;
    });
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

        <h1 className="text-2xl font-bold sm:text-3xl">Penalizaciones</h1>

        <button
          onClick={() => setModalNuevaAbierto(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Plus size={18} />
          Nueva
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-6 w-full max-w-3xl">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número de depto…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />
        </div>
      </div>

      {/* Pestañas */}
      <div className="mb-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setTab("activas")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "activas" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Penalizaciones activas
        </button>
        <button
          onClick={() => setTab("multas")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "multas" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Multas realizadas
        </button>
      </div>

      <div className="flex w-full max-w-3xl flex-col gap-4">
        {tab === "activas" ? (
          grupos.length === 0 ? (
            <p className="text-center text-gray-400">
              {busqueda.trim()
                ? `No hay deptos con penalizaciones activas para "${busqueda.trim()}".`
                : "No hay deptos con penalizaciones activas por ahora."}
            </p>
          ) : (
            grupos.map((grupo) => {
              const debeMulta = grupo.activas.length >= 3;
              const historialAbierto = historialesAbiertos.has(grupo.apartamento);
              const estado = debeMulta
                ? { icon: "text-red-400", iconBg: "bg-red-500/15", border: "border-red-500/30", cardBg: "bg-red-500/[0.06]" }
                : { icon: "text-amber-400", iconBg: "bg-amber-500/15", border: "border-white/10", cardBg: "bg-white/[0.04]" };

              return (
                <div
                  key={grupo.apartamento}
                  className={`rounded-2xl border p-5 transition-colors ${estado.border} ${estado.cardBg}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${estado.iconBg} ${estado.icon}`}
                      >
                        <ShieldAlert size={22} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-white">Depto {grupo.apartamento}</p>
                        <p className="text-xs text-gray-400">
                          {grupo.activas.length} de 3 penalizaciones activas
                        </p>
                      </div>
                    </div>

                    {debeMulta && (
                      <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400">
                        <AlertTriangle size={13} />
                        Debe multa
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2.5">
                    {[0, 1, 2].map((i) => {
                      const p = grupo.activas[i];
                      return (
                        <button
                          key={i}
                          disabled={!p}
                          onClick={() => p && setPenalizacionSeleccionada(p)}
                          className={`h-10 w-10 rounded-full border-2 transition ${
                            p
                              ? "border-red-400/50 bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.55)] hover:scale-110"
                              : "border-white/10 bg-white/[0.05] cursor-default"
                          }`}
                          title={p ? "Ver motivo" : undefined}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {debeMulta && (
                      <button
                        onClick={() => handlePagarMulta(grupo.apartamento)}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                      >
                        <Check size={14} />
                        Registrar pago de multa
                      </button>
                    )}
                    <button
                      onClick={() => toggleHistorial(grupo.apartamento)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 transition hover:bg-white/10"
                    >
                      <History size={14} />
                      {historialAbierto ? "Ocultar" : "Ver"} historial ({grupo.historial.length})
                    </button>
                  </div>

                  {historialAbierto && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
                      {grupo.historial.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="text-gray-200">{p.motivo}</p>
                            <p className="mt-1 text-gray-500">
                              {p.autor} · {formatearFecha(p.fecha)}
                            </p>
                          </div>
                          {p.cicloCerrado && (
                            <span className="whitespace-nowrap rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-400">
                              Multa pagada
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : multas.length === 0 ? (
          <p className="text-center text-gray-400">
            {busqueda.trim()
              ? `No hay multas registradas para "${busqueda.trim()}".`
              : "Todavía no se registró el pago de ninguna multa."}
          </p>
        ) : (
          multas.map((multa) => (
            <div
              key={multa.multaId}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                    <Check size={22} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">Depto {multa.apartamento}</p>
                    <p className="text-xs text-gray-400">
                      Multa pagada · {formatearFecha(multa.fecha)}
                    </p>
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
                  Saldada
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
                {multa.penalizaciones.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-semibold text-red-400">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-gray-200">{p.motivo}</p>
                      <p className="mt-1 text-gray-500">
                        {p.autor} · {formatearFecha(p.fecha)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[11px] text-gray-500">
                Pago registrado por <span className="text-gray-300">{multa.autor}</span>
              </p>
            </div>
          ))
        )}
      </div>

      {modalNuevaAbierto && (
        <NuevaPenalizacionModal
          onClose={() => setModalNuevaAbierto(false)}
          onCrear={handleCrearPenalizacion}
        />
      )}

      {penalizacionSeleccionada && (
        <DetallePenalizacionModal
          penalizacion={penalizacionSeleccionada}
          onClose={() => setPenalizacionSeleccionada(null)}
        />
      )}

      {deptoAConfirmarPago && (
        <ConfirmarPagoMultaModal
          apartamento={deptoAConfirmarPago}
          onConfirmar={confirmarPagoMulta}
          onCancelar={() => setDeptoAConfirmarPago(null)}
        />
      )}
    </main>
  );
}

/* ---------------------------------------------------------- */
/* Modal: nueva penalización                                    */
/* ---------------------------------------------------------- */

function NuevaPenalizacionModal({
  onClose,
  onCrear,
}: {
  onClose: () => void;
  onCrear: (apartamento: string, motivo: string) => void;
}) {
  const [apartamento, setApartamento] = useState("");
  const [motivo, setMotivo] = useState("");

  const handleConfirmar = () => {
    if (!apartamento.trim() || !motivo.trim()) {
      window.alert("Completá el depto y el motivo de la penalización.");
      return;
    }
    onCrear(apartamento.trim(), motivo.trim());
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
          <h2 className="text-xl font-bold text-white">Nueva penalización</h2>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Apartamento</label>
            <input
              autoFocus
              type="text"
              value={apartamento}
              onChange={(e) => setApartamento(e.target.value)}
              placeholder="Ej: 914"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              Motivo <span className="text-red-400">· obligatorio</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Ruidos molestos después de las 23hs"
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
            />
          </div>

          <div className="mt-2 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              <Check size={16} />
              Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Modal: detalle de una penalización                           */
/* ---------------------------------------------------------- */

function DetallePenalizacionModal({
  penalizacion,
  onClose,
}: {
  penalizacion: Penalizacion;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-xl font-bold text-white">Depto {penalizacion.apartamento}</h2>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-gray-100">{penalizacion.motivo}</p>
          <p className="mt-2 text-xs text-gray-500">
            Registrado por <span className="text-gray-300">{penalizacion.autor}</span> ·{" "}
            {formatearFecha(penalizacion.fecha)}
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Modal: confirmar pago de multa                                */
/* ---------------------------------------------------------- */

function ConfirmarPagoMultaModal({
  apartamento,
  onConfirmar,
  onCancelar,
}: {
  apartamento: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onCancelar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400">
          <Check size={22} />
        </div>

        <h2 className="mt-4 text-lg font-bold text-white">Registrar pago de multa</h2>
        <p className="mt-2 text-sm text-gray-400">
          ¿Confirmás que el depto <span className="font-medium text-white">{apartamento}</span> pagó la
          multa? Los círculos se van a reiniciar, pero las 3 penalizaciones quedan en el historial.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onCancelar}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Check size={16} />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}