import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, User, Car, Phone, Mail, MapPin, Zap, AlertTriangle } from "lucide-react";
import { NewIngresoModal, FinalizarIngresoModal, CocheraAvisoModal, CompletarLecturaUteModal } from "./IngresoModals";
import { leerVehiculos, guardarVehiculos, normalizarMatricula, type Vehiculo } from "./Cocheras";
import { leerContactos, guardarContactos, type Contacto } from "./Contactos";

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

const STORAGE_KEY = "torreantares_ingresos";
const NOTAS_STORAGE_KEY = "torreantares_notas";
export const PRECIO_UTE = 15;

interface ComentarioNota {
  contenido: string;
  autor: string;
  fecha: string;
}

interface NotaAutomatica {
  contenido: string;
  autor: string;
  fecha: string;
  comentarios: ComentarioNota[];
}

function agregarNotaDesdeIngreso(autor: string, contenido: string) {
  if (typeof window === "undefined") return;
  try {
    const guardado = localStorage.getItem(NOTAS_STORAGE_KEY);
    const notas: NotaAutomatica[] = guardado ? JSON.parse(guardado) : [];
    const nuevaNota: NotaAutomatica = {
      contenido,
      autor,
      fecha: new Date().toISOString(),
      comentarios: [],
    };
    localStorage.setItem(NOTAS_STORAGE_KEY, JSON.stringify([...notas, nuevaNota]));
  } catch {
    // Si falla el guardado de la nota, no bloqueamos la creación/cancelación del ingreso.
  }
}

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

function generarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

  // Activo, no cancelado, y la fecha de salida estimada ya pasó: la estadía
  // debería haber terminado pero nadie la finalizó en el sistema. Mientras
  // quede así, ese depto sigue "ocupado" para la app (bloquea un ingreso
  // nuevo), así que hay que resaltarlo para que se valide cuanto antes.
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

  // guarda el último ingreso creado para poder encadenar el modal de "falta
  // la lectura de UTE" justo después de cerrar el aviso de cochera
  const ultimoIngresoCreadoRef = useRef<Ingreso | null>(null);

  const [ingresos, setIngresos] = useState<Ingreso[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ingresos));
  }, [ingresos]);

  useEffect(() => {
    onListo?.();
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

  const limpiarRegistrosAsociados = (ingreso: Ingreso) => {
    if (ingreso.ocupacion !== "inquilino" && ingreso.ocupacion !== "invitado") return;

    if (ingreso.contactoRegistradoId) {
      guardarContactos(leerContactos().filter((c) => c.id !== ingreso.contactoRegistradoId));
    }
    if (ingreso.vehiculoRegistradoId) {
      guardarVehiculos(leerVehiculos().filter((v) => v.id !== ingreso.vehiculoRegistradoId));
    }
  };

  const handleCrearIngreso = (datos: NuevoIngresoData) => {
    const yaOcupado = ingresos.find(
      (i) => i.apartamento === datos.apartamento && !i.finalizado && !i.cancelado
    );
    if (yaOcupado) {
      window.alert(
        `El depto ${datos.apartamento} ya tiene un ingreso activo (${yaOcupado.nombre}). ` +
          `Hay que finalizar o cancelar esa estadía antes de cargar una nueva.`
      );
      return;
    }

    const { nombre: nombrePila, apellido } = separarNombreApellido(datos.nombre);

    const nuevoContacto: Contacto = {
      id: generarId(),
      nombre: nombrePila || datos.nombre,
      apellido,
      apartamento: datos.apartamento || undefined,
      email: datos.email,
      telefono: datos.telefono,
      autor: usuario.nombre,
      fechaCreacion: new Date().toISOString(),
    };
    guardarContactos([...leerContactos(), nuevoContacto]);

    let vehiculoRegistradoId: string | undefined;
    if (datos.matricula && datos.matricula.trim()) {
      const nuevoVehiculo: Vehiculo = {
        id: generarId(),
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
      guardarVehiculos([...leerVehiculos(), nuevoVehiculo]);
      vehiculoRegistradoId = nuevoVehiculo.id;
    }

    const nuevoIngreso: Ingreso = {
      ...datos,
      id: generarId(),
      autor: usuario.nombre,
      fechaCreacion: new Date().toISOString(),
      finalizado: false,
      contactoRegistradoId: nuevoContacto.id,
      vehiculoRegistradoId,
    };
    setIngresos((prev) => [...prev, nuevoIngreso]);
    setModalNuevoAbierto(false);

    // El aviso de cochera solo tiene sentido si de verdad cargó un auto/moto
    // (tildó "Tiene auto" en el formulario). Si no, saltamos directo al
    // chequeo de UTE en vez de mostrar un aviso de cochera que no aplica.
    if (nuevoIngreso.auto || nuevoIngreso.matricula) {
      ultimoIngresoCreadoRef.current = nuevoIngreso;
      setIngresoParaAvisoCochera(nuevoIngreso);
    } else if (nuevoIngreso.tomaConsumoUte && nuevoIngreso.lecturaUteEntrada === undefined) {
      setIngresoParaCompletarUte(nuevoIngreso);
    }

    // Nota automática del ingreso nuevo, con el mismo mecanismo de prefijo
    // destacado que usamos para cancelaciones, pero en verde (NoteCard.tsx
    // decide el color según el texto del prefijo: "Nuevo ingreso depto...").
    agregarNotaDesdeIngreso(
      usuario.nombre,
      `Nuevo ingreso depto ${nuevoIngreso.apartamento}: ${nuevoIngreso.nombre} (${OCUPACION_LABEL[nuevoIngreso.ocupacion]}) del ${formatearFecha(nuevoIngreso.fechaIngreso)} al ${formatearFecha(nuevoIngreso.fechaSalida)}`
    );
  };

  const handleCerrarAvisoCochera = () => {
    setIngresoParaAvisoCochera(null);
    const ultimo = ultimoIngresoCreadoRef.current;
    ultimoIngresoCreadoRef.current = null;
    if (ultimo && ultimo.tomaConsumoUte && ultimo.lecturaUteEntrada === undefined) {
      setIngresoParaCompletarUte(ultimo);
    }
  };

  const handleCompletarLecturaUte = (id: string, lectura: number) => {
    setIngresos((prev) =>
      prev.map((i) => (i.id === id ? { ...i, lecturaUteEntrada: lectura } : i))
    );
    setIngresoParaCompletarUte(null);
  };

  const handleFinalizarIngreso = (
    id: string,
    lecturaUteSalida?: number,
    lecturaUteEntradaSiFaltaba?: number
  ) => {
    const ingreso = ingresos.find((i) => i.id === id);

    setIngresos((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;

        if (!i.tomaConsumoUte) {
          return { ...i, finalizado: true, fechaFinalizacion: new Date().toISOString() };
        }

        const entrada = i.lecturaUteEntrada ?? lecturaUteEntradaSiFaltaba;
        const importeUte =
          entrada !== undefined && lecturaUteSalida !== undefined
            ? (lecturaUteSalida - entrada) * PRECIO_UTE
            : undefined;

        return {
          ...i,
          finalizado: true,
          lecturaUteEntrada: entrada,
          lecturaUteSalida,
          importeUte,
          fechaFinalizacion: new Date().toISOString(),
        };
      })
    );

    if (ingreso) {
      limpiarRegistrosAsociados(ingreso);
    }

    setIngresoAFinalizar(null);
  };

  const handleCancelarIngreso = (id: string, motivo: string) => {
    const ingreso = ingresos.find((i) => i.id === id);

    setIngresos((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              finalizado: true,
              cancelado: true,
              motivoCancelacion: motivo,
              fechaFinalizacion: new Date().toISOString(),
            }
          : i
      )
    );

    if (ingreso) {
      agregarNotaDesdeIngreso(
        usuario.nombre,
        `Cancela ingreso depto ${ingreso.apartamento}: ${motivo}`
      );
      limpiarRegistrosAsociados(ingreso);
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
        {listaVisible.length === 0 ? (
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
    </main>
  );
}