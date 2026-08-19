import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, User, Car, Phone, Mail, MapPin, Zap, AlertTriangle } from "lucide-react";
import { NewIngresoModal, FinalizarIngresoModal, CocheraAvisoModal, CompletarLecturaUteModal } from "./IngresoModals";
import { normalizarMatricula, type Vehiculo } from "./Cocheras";
import type { Contacto } from "./Contactos";
import {
  crearIngresoEnDB,
  obtenerIngresosDeDB,
  actualizarIngresoEnDB,
  crearNotaEnDB,
  crearContactoEnDB,
  eliminarContactoEnDB,
  crearVehiculoEnDB,
  eliminarVehiculoEnDB,
} from "../lib/firebase";

export type Ocupacion = "inquilino" | "invitado" | "propietario";

export interface Ingreso {
  id: string;
  fechaIngreso: string; // YYYY-MM-DD
  fechaSalida: string; // YYYY-MM-DD (estimada)
  nombre: string;
  documento: string;
  domicilio: string;
  codigoPostal: string;
  email: string;
  telefono: string;
  ciudad: string;
  apartamento: string;
  /** Si el ingreso debe cobrar luz. Si es false, no se pide ni se cobra nada de UTE. */
  tomaConsumoUte: boolean;
  /** Solo tiene sentido si tomaConsumoUte es true. Puede faltar si no dio tiempo de tomarla al ingresar. */
  lecturaUteEntrada?: number;
  lecturaUteSalida?: number;
  ocupacion: Ocupacion;
  auto?: string;
  matricula?: string;
  autor: string;
  fechaCreacion: string; // ISO
  finalizado: boolean;
  fechaFinalizacion?: string;
  importeUte?: number;
  cancelado?: boolean;
  motivoCancelacion?: string;
  /** id del contacto que se creó automáticamente en Contactos al registrar este ingreso. */
  contactoRegistradoId?: string;
  /** id del vehículo que se creó automáticamente en Cocheras (solo si se cargó matrícula). */
  vehiculoRegistradoId?: string;
}

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface IngresosProps {
  usuario: Usuario;
  onVolver: () => void;
  onListo?: () => void;
}

export const PRECIO_UTE = 15;

export type NuevoIngresoData = Omit<
  Ingreso,
  | "id"
  | "autor"
  | "fechaCreacion"
  | "finalizado"
  | "fechaFinalizacion"
  | "importeUte"
  | "lecturaUteSalida"
  | "contactoRegistradoId"
  | "vehiculoRegistradoId"
>;

const OCUPACION_LABEL: Record<Ocupacion, string> = {
  inquilino: "Inquilino",
  invitado: "Invitado",
  propietario: "Propietario",
};

// El formulario de Ingresos pide "Nombre y apellido" en un solo campo, pero
// Contactos y Cocheras necesitan nombre/apellido separados. Heurística simple:
// la primera palabra es el nombre, el resto el apellido.
function separarNombreApellido(nombreCompleto: string) {
  const partes = nombreCompleto.trim().split(/\s+/);
  const nombre = partes[0] ?? "";
  const apellido = partes.slice(1).join(" ");
  return { nombre, apellido };
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const d = new Date(anio, mes - 1, dia);
  return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatearImporte(valor: number) {
  return valor.toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  });
}

// Un depto puede tener varios ingresos a lo largo del tiempo: lo que no
// puede pasar es que dos se superpongan en fechas. Se considera conflicto
// si hay un ingreso activo (no finalizado ni cancelado) de ese mismo depto
// cuya fecha de salida es POSTERIOR a la fecha de ingreso del nuevo — es
// decir, el nuevo ingreso solo se permite a partir del día en que el
// anterior termina (mismo día incluido).
export function buscarConflictoDeFechas(
  ingresos: Ingreso[],
  apartamento: string,
  fechaIngreso: string
): Ingreso | undefined {
  return ingresos.find(
    (i) =>
      i.apartamento === apartamento &&
      !i.finalizado &&
      !i.cancelado &&
      fechaIngreso < i.fechaSalida
  );
}

// Modal genérico para mostrar por qué no se pudo crear un ingreso (depto
// ocupado en esas fechas, o un error de Firestore). Se muestra por encima
// del modal "Nuevo ingreso", que se mantiene abierto con los datos que ya
// se habían cargado.
function ErrorIngresoModal({ mensaje, onClose }: { mensaje: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <AlertTriangle size={22} />
        </div>

        <h2 className="mt-4 text-lg font-bold text-white">No se pudo registrar el ingreso</h2>
        <p className="mt-2 text-sm text-gray-300">{mensaje}</p>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

function IngresoCard({
  ingreso,
  onFinalizar,
  onCompletarUte,
}: {
  ingreso: Ingreso;
  onFinalizar: (ingreso: Ingreso) => void;
  onCompletarUte: (ingreso: Ingreso) => void;
}) {
  const faltaLecturaEntrada = ingreso.tomaConsumoUte && ingreso.lecturaUteEntrada === undefined;

  const vencido = !ingreso.cancelado && !ingreso.finalizado && ingreso.fechaSalida < hoyISO();

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 ${
        ingreso.cancelado
          ? "border-red-500/20 bg-red-500/[0.03]"
          : ingreso.finalizado
          ? "border-white/10 bg-white/[0.03]"
          : vencido
          ? "border-amber-500/40 bg-amber-500/[0.06]"
          : "border-emerald-500/25 bg-emerald-500/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-white">{ingreso.nombre}</p>
          <p className="text-xs text-gray-400">
            Depto <span className="text-gray-200">{ingreso.apartamento}</span> ·{" "}
            {OCUPACION_LABEL[ingreso.ocupacion]}
          </p>
        </div>
        {ingreso.cancelado ? (
          <span className="whitespace-nowrap rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400">
            Canceló
          </span>
        ) : ingreso.finalizado ? (
          <span className="whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gray-300">
            Finalizado
          </span>
        ) : vencido ? (
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400">
            <AlertTriangle size={12} />
            Venció · validar
          </span>
        ) : (
          <span className="whitespace-nowrap rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
            Activo
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-400">
        <span>
          {formatearFecha(ingreso.fechaIngreso)} → {formatearFecha(ingreso.fechaSalida)}
        </span>
        {ingreso.telefono && (
          <span className="flex items-center gap-1">
            <Phone size={12} /> {ingreso.telefono}
          </span>
        )}
        {ingreso.email && (
          <span className="flex items-center gap-1">
            <Mail size={12} /> {ingreso.email}
          </span>
        )}
        {ingreso.ciudad && (
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {ingreso.ciudad}
          </span>
        )}
        {ingreso.auto && (
          <span className="flex items-center gap-1">
            <Car size={12} /> {ingreso.auto} {ingreso.matricula && `· ${ingreso.matricula}`}
          </span>
        )}
      </div>

      {vencido && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle size={14} className="shrink-0" />
          La fecha de salida ya pasó y la estadía sigue activa. Mientras no se finalice, el depto{" "}
          {ingreso.apartamento} sigue bloqueado para un ingreso nuevo.
        </div>
      )}

      {ingreso.cancelado ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          Motivo: {ingreso.motivoCancelacion}
        </div>
      ) : !ingreso.tomaConsumoUte ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-500">
          No se cobra luz en esta estadía
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <Zap size={13} />
            {ingreso.lecturaUteEntrada !== undefined ? (
              <>
                UTE entrada: <span className="text-gray-200">{ingreso.lecturaUteEntrada}</span>
                {ingreso.finalizado && ingreso.lecturaUteSalida !== undefined && (
                  <>
                    {" "}
                    · salida: <span className="text-gray-200">{ingreso.lecturaUteSalida}</span>
                  </>
                )}
              </>
            ) : (
              <span className="text-amber-400">Falta cargar la lectura de entrada</span>
            )}
          </span>
          {ingreso.finalizado && ingreso.importeUte !== undefined && (
            <span className="font-semibold text-gray-200">{formatearImporte(ingreso.importeUte)}</span>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        Registrado por {ingreso.autor} · {new Date(ingreso.fechaCreacion).toLocaleString("es-UY")}
      </p>

      {!ingreso.cancelado && faltaLecturaEntrada && !ingreso.finalizado && (
        <button
          onClick={() => onCompletarUte(ingreso)}
          className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
        >
          Cargar lectura de entrada
        </button>
      )}

      {!ingreso.finalizado && (
        <button
          onClick={() => onFinalizar(ingreso)}
          className={`mt-1 w-full rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
            vencido ? "bg-amber-600 hover:bg-amber-500" : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          Finalizar estadía
        </button>
      )}
    </div>
  );
}

export default function Ingresos({ usuario, onVolver, onListo }: IngresosProps) {
  const [tab, setTab] = useState<"activos" | "finalizados">("activos");
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [ingresoAFinalizar, setIngresoAFinalizar] = useState<Ingreso | null>(null);
  const [ingresoParaAvisoCochera, setIngresoParaAvisoCochera] = useState<Ingreso | null>(null);
  const [ingresoParaCompletarUte, setIngresoParaCompletarUte] = useState<Ingreso | null>(null);
  const [error, setError] = useState("");
  const [errorCreacion, setErrorCreacion] = useState<string | null>(null);

  const ultimoIngresoCreadoRef = useRef<Ingreso | null>(null);

  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargandoIngresos, setCargandoIngresos] = useState(true);

  const cargarIngresos = async () => {
    const datos = await obtenerIngresosDeDB();
    setIngresos(datos as unknown as Ingreso[]);
  };

  useEffect(() => {
    (async () => {
      try {
        setError("");
        await cargarIngresos();
      } catch (err) {
        console.error("Error al cargar ingresos desde Firestore:", err);
        setError("No se pudieron cargar los ingresos. Revisá tu conexión.");
      } finally {
        setCargandoIngresos(false);
        onListo?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activos = ingresos
    .filter((i) => !i.finalizado)
    .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
  const finalizados = ingresos
    .filter((i) => i.finalizado)
    .sort((a, b) => (b.fechaFinalizacion ?? "").localeCompare(a.fechaFinalizacion ?? ""));

  const listaVisible = tab === "activos" ? activos : finalizados;

  const handleAbrirNuevo = () => {
    setModalNuevoAbierto(true);
  };

  const handleAbrirFinalizar = (ingreso: Ingreso) => setIngresoAFinalizar(ingreso);
  const handleAbrirCompletarUte = (ingreso: Ingreso) => setIngresoParaCompletarUte(ingreso);

  // Borra en Firestore el contacto y/o vehículo que se crearon automáticamente
  // al registrar este ingreso (se llama al finalizar o cancelar la estadía).
  const limpiarRegistrosAsociados = async (ingreso: Ingreso) => {
    if (ingreso.ocupacion !== "inquilino" && ingreso.ocupacion !== "invitado") return;

    try {
      if (ingreso.contactoRegistradoId) {
        await eliminarContactoEnDB(ingreso.contactoRegistradoId);
      }
      if (ingreso.vehiculoRegistradoId) {
        await eliminarVehiculoEnDB(ingreso.vehiculoRegistradoId);
      }
    } catch (err) {
      console.error("Error al limpiar contacto/vehículo asociados:", err);
    }
  };

  const handleCrearIngreso = async (datos: NuevoIngresoData): Promise<boolean> => {
    setErrorCreacion(null);

    const conflicto = buscarConflictoDeFechas(ingresos, datos.apartamento, datos.fechaIngreso);
    if (conflicto) {
      setErrorCreacion(
        `El depto ${datos.apartamento} está ocupado por ${conflicto.nombre} hasta el ${formatearFecha(
          conflicto.fechaSalida
        )}. Podés registrar un ingreso nuevo a partir de esa fecha.`
      );
      return false;
    }

    const { nombre: nombrePila, apellido } = separarNombreApellido(datos.nombre);

    try {
      const nuevoContacto: Omit<Contacto, "id"> = {
        nombre: nombrePila || datos.nombre,
        apellido,
        apartamento: datos.apartamento || undefined,
        email: datos.email,
        telefono: datos.telefono,
        autor: usuario.nombre,
        fechaCreacion: new Date().toISOString(),
      };
      const contactoId = await crearContactoEnDB(nuevoContacto);

      let vehiculoRegistradoId: string | undefined;
      if (datos.matricula && datos.matricula.trim()) {
        const nuevoVehiculo: Omit<Vehiculo, "id"> = {
          tipo: "auto",
          matriculaOriginal: datos.matricula.trim().toUpperCase(),
          matricula: normalizarMatricula(datos.matricula),
          marca: datos.auto ?? "",
          nombre: nombrePila || datos.nombre,
          apellido,
          apartamento: datos.apartamento,
          telefono: datos.telefono,
          correo: datos.email,
          autor: usuario.nombre,
          fechaCreacion: new Date().toISOString(),
        };
        vehiculoRegistradoId = await crearVehiculoEnDB(nuevoVehiculo);
      }

      const nuevoIngresoData = {
        ...datos,
        autor: usuario.nombre,
        fechaCreacion: new Date().toISOString(),
        finalizado: false,
        contactoRegistradoId: contactoId,
        vehiculoRegistradoId,
      };
      const ingresoId = await crearIngresoEnDB(nuevoIngresoData);
      const nuevoIngreso: Ingreso = { ...nuevoIngresoData, id: ingresoId };

      await cargarIngresos();
      setModalNuevoAbierto(false);

      if (nuevoIngreso.auto || nuevoIngreso.matricula) {
        ultimoIngresoCreadoRef.current = nuevoIngreso;
        setIngresoParaAvisoCochera(nuevoIngreso);
      } else if (nuevoIngreso.tomaConsumoUte && nuevoIngreso.lecturaUteEntrada === undefined) {
        setIngresoParaCompletarUte(nuevoIngreso);
      }

      await crearNotaEnDB({
        contenido: `Nuevo ingreso depto ${nuevoIngreso.apartamento}: ${nuevoIngreso.nombre} (${OCUPACION_LABEL[nuevoIngreso.ocupacion]}) del ${formatearFecha(nuevoIngreso.fechaIngreso)} al ${formatearFecha(nuevoIngreso.fechaSalida)}`,
        autor: usuario.nombre,
      });

      return true;
    } catch (err) {
      console.error("Error al crear el ingreso en Firestore:", err);
      setErrorCreacion("No se pudo registrar el ingreso. Revisá tu conexión e intentá de nuevo.");
      return false;
    }
  };

  const handleCerrarAvisoCochera = () => {
    setIngresoParaAvisoCochera(null);
    const ultimo = ultimoIngresoCreadoRef.current;
    ultimoIngresoCreadoRef.current = null;
    if (ultimo && ultimo.tomaConsumoUte && ultimo.lecturaUteEntrada === undefined) {
      setIngresoParaCompletarUte(ultimo);
    }
  };

  const handleCompletarLecturaUte = async (id: string, lectura: number) => {
    try {
      await actualizarIngresoEnDB(id, { lecturaUteEntrada: lectura });
      await cargarIngresos();
    } catch (err) {
      console.error("Error al completar lectura UTE en Firestore:", err);
      setError("No se pudo guardar la lectura. Intentá de nuevo.");
    }
    setIngresoParaCompletarUte(null);
  };

  const handleFinalizarIngreso = async (
    id: string,
    lecturaUteSalida?: number,
    lecturaUteEntradaSiFaltaba?: number
  ) => {
    const ingreso = ingresos.find((i) => i.id === id);
    if (!ingreso) return;

    const cambios: Partial<Ingreso> = ingreso.tomaConsumoUte
      ? (() => {
          const entrada = ingreso.lecturaUteEntrada ?? lecturaUteEntradaSiFaltaba;
          const importeUte =
            entrada !== undefined && lecturaUteSalida !== undefined
              ? (lecturaUteSalida - entrada) * PRECIO_UTE
              : undefined;
          return {
            finalizado: true,
            lecturaUteEntrada: entrada,
            lecturaUteSalida,
            importeUte,
            fechaFinalizacion: new Date().toISOString(),
          };
        })()
      : { finalizado: true, fechaFinalizacion: new Date().toISOString() };

    try {
      await actualizarIngresoEnDB(id, cambios);
      await limpiarRegistrosAsociados(ingreso);
      await cargarIngresos();
    } catch (err) {
      console.error("Error al finalizar el ingreso en Firestore:", err);
      setError("No se pudo finalizar la estadía. Intentá de nuevo.");
    }

    setIngresoAFinalizar(null);
  };

  const handleCancelarIngreso = async (id: string, motivo: string) => {
    const ingreso = ingresos.find((i) => i.id === id);
    if (!ingreso) return;

    try {
      await actualizarIngresoEnDB(id, {
        finalizado: true,
        cancelado: true,
        motivoCancelacion: motivo,
        fechaFinalizacion: new Date().toISOString(),
      });

      await crearNotaEnDB({
        contenido: `Cancela ingreso depto ${ingreso.apartamento}: ${motivo}`,
        autor: usuario.nombre,
      });

      await limpiarRegistrosAsociados(ingreso);
      await cargarIngresos();
    } catch (err) {
      console.error("Error al cancelar el ingreso en Firestore:", err);
      setError("No se pudo cancelar el ingreso. Intentá de nuevo.");
    }

    setIngresoAFinalizar(null);
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

        <h1 className="text-2xl font-bold sm:text-3xl">Ingresos</h1>

        <button
          onClick={handleAbrirNuevo}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Plus size={18} />
          Nuevo ingreso
        </button>
      </div>

      {error && <p className="mb-4 w-full max-w-3xl text-sm text-red-400">{error}</p>}

      <div className="mb-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setTab("activos")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "activos" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Activos ({activos.length})
        </button>
        <button
          onClick={() => setTab("finalizados")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "finalizados" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Finalizados ({finalizados.length})
        </button>
      </div>

      <div className="flex w-full max-w-3xl flex-col gap-4">
        {cargandoIngresos ? (
          <p className="text-center text-gray-400">Cargando ingresos…</p>
        ) : listaVisible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center text-gray-500">
            <User size={28} />
            <p className="text-sm">
              {tab === "activos" ? "No hay inquilinos activos por ahora." : "Todavía no hay ingresos finalizados."}
            </p>
          </div>
        ) : (
          listaVisible.map((ingreso) => (
            <IngresoCard
              key={ingreso.id}
              ingreso={ingreso}
              onFinalizar={handleAbrirFinalizar}
              onCompletarUte={handleAbrirCompletarUte}
            />
          ))
        )}
      </div>

      <NewIngresoModal
        isOpen={modalNuevoAbierto}
        onClose={() => setModalNuevoAbierto(false)}
        usuario={usuario}
        ingresos={ingresos}
        onCrear={handleCrearIngreso}
      />

      <FinalizarIngresoModal
        ingreso={ingresoAFinalizar}
        onClose={() => setIngresoAFinalizar(null)}
        onFinalizar={handleFinalizarIngreso}
        onCancelar={handleCancelarIngreso}
      />

      <CocheraAvisoModal
        ingreso={ingresoParaAvisoCochera}
        onClose={handleCerrarAvisoCochera}
      />

      <CompletarLecturaUteModal
        ingreso={ingresoParaCompletarUte}
        onClose={() => setIngresoParaCompletarUte(null)}
        onCompletar={handleCompletarLecturaUte}
      />

      {errorCreacion && (
        <ErrorIngresoModal mensaje={errorCreacion} onClose={() => setErrorCreacion(null)} />
      )}
    </main>
  );
}