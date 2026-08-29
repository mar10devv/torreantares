import { useEffect, useRef, useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Check,
  Tag as TagIcon,
  KeyRound,
  CircleDollarSign,
  Hash,
} from "lucide-react";
import {
  crearNotaEnDB,
  crearControlTagEnDB,
  obtenerControlesTagsDeDB,
  actualizarControlTagEnDB,
  eliminarControlTagEnDB,
  crearFacturaEnDB,
  generarProximoNumeroFacturaEnDB,
} from "../lib/firebase";
import { CONFIG_FACTURA } from "./Facturas";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface ControlTagProps {
  usuario: Usuario;
  onVolver: () => void;
  onListo?: () => void;
}

export type TipoControlTag = "control" | "tag";
export type EstadoPago = "pagado" | "pendiente";

// Registro de controles y tags, guardado en la colección "controlesTags"
// de Firestore (ver lib/firebase.js: crearControlTagEnDB,
// obtenerControlesTagsDeDB, actualizarControlTagEnDB,
// eliminarControlTagEnDB) — mismo patrón que "residentes".
//
// Además, cada venta nueva dispara automáticamente una Nota (vía
// crearNotaEnDB) en la colección "notas" — ver generarContenidoNota() y
// handleGuardarNuevo().
export interface RegistroControlTag {
  id: string;
  apartamento: string;
  nombre: string;
  apellido: string;
  numeroSerie?: string; // opcional — sirve para identificar al dueño si se encuentra un tag/control suelto
  tipo: TipoControlTag;
  estadoPago: EstadoPago;
  monto?: number; // solo tiene sentido si estadoPago === "pendiente"
  autor: string;
  fechaCreacion: string; // ISO
}

const TIPO_LABEL: Record<TipoControlTag, string> = {
  control: "Control",
  tag: "Tag",
};

const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  pagado: "Pagado",
  pendiente: "Pendiente",
};

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Precios de referencia, solo para probar mientras no haya una lista de
// precios real cargada en algún lado. Se usan para autocompletar el
// campo "Monto a cobrar" según el tipo elegido — el campo sigue siendo
// editable a mano si el precio real es otro.
const MONTO_POR_DEFECTO: Record<TipoControlTag, number> = {
  control: 650,
  tag: 450,
};

// Arma el texto de la nota automática que se publica en "Notas" cada vez
// que se vende un control o un tag. El depto siempre va primero, como se
// pidió:
//   "710 Compro Tag dejo pago y quedo configurado"
//   "710 Compro Control, quedo pendiente para cobrar $1500"
function generarContenidoNota(registro: RegistroControlTag): string {
  const tipoTexto = TIPO_LABEL[registro.tipo]; // "Control" o "Tag"

  if (registro.estadoPago === "pagado") {
    return `${registro.apartamento} Compro ${tipoTexto} dejo pago y quedo configurado`;
  }

  const monto = registro.monto ?? 0;
  return `${registro.apartamento} Compro ${tipoTexto}, quedo pendiente para cobrar $${monto}`;
}

// Genera la factura automática cuando un control/tag queda pagado (ya sea
// que se cargó directamente como "Pagado", o que se marcó como pagado
// después de estar pendiente). Usa el mismo generador de número atómico y
// el mismo CONFIG_FACTURA que ya usa Facturas.tsx, así que cuando llegue
// el RUT/CAE definitivo esto se actualiza solo sin tocar nada acá.
//
// NOTA: la factura queda "provisoria" (como el resto de la app) hasta que
// se complete CONFIG_FACTURA.numeroCAE en Facturas.tsx — igual se genera
// y se guarda ahora, para no perder la numeración ni el registro contable
// mientras tanto.
async function crearFacturaDeControlTag(
  registro: RegistroControlTag,
  usuario: Usuario
) {
  const siguiente = await generarProximoNumeroFacturaEnDB();
  const numero = `${CONFIG_FACTURA.prefijoSerie}${String(siguiente).padStart(4, "0")}`;
  const tipoTexto = TIPO_LABEL[registro.tipo];
  const importe = registro.monto ?? MONTO_POR_DEFECTO[registro.tipo];

  await crearFacturaEnDB({
    numero,
    titulo: `Fac. ${tipoTexto} (Depto ${registro.apartamento})`,
    fecha: new Date().toISOString().slice(0, 10),
    unidad: registro.apartamento,
    nombreCliente: `${registro.nombre} ${registro.apellido}`,
    emailCliente: "",
    concepto: `Venta de ${tipoTexto.toLowerCase()}${
      registro.numeroSerie ? ` (N.º ${registro.numeroSerie})` : ""
    }`,
    importe,
    reservaId: registro.id, // reutiliza el mismo campo que usan las reservas de parrillero, acá apunta al registro de control/tag que originó la factura
    estado: "nueva",
    autor: usuario.nombre,
    fechaCreacion: new Date().toISOString(),
  });
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-400";

/* ---------------------------------------------------------- */
/* Tarjeta de registro: clickeable (abre el detalle) + menú      */
/* de 3 puntitos (mismo patrón que ResidenteCard)                */
/* ---------------------------------------------------------- */

function RegistroCard({
  registro,
  onClick,
  onEditar,
  onEliminar,
}: {
  registro: RegistroControlTag;
  onClick: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const esControl = registro.tipo === "control";
  const esPagado = registro.estadoPago === "pagado";

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 pr-12 text-left transition hover:bg-white/[0.06] active:scale-[0.99]"
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
            esControl ? "bg-[rgba(239,68,68,0.2)] text-red-300" : "bg-[rgba(99,102,241,0.2)] text-indigo-300"
          }`}
        >
          {registro.apartamento}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-white">
              {registro.nombre} {registro.apellido}
            </p>
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                esControl ? "bg-[rgba(239,68,68,0.15)] text-red-400" : "bg-[rgba(99,102,241,0.15)] text-indigo-400"
              }`}
            >
              {TIPO_LABEL[registro.tipo]}
            </span>
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                esPagado ? "bg-[rgba(16,185,129,0.15)] text-emerald-400" : "bg-[rgba(234,179,8,0.15)] text-yellow-400"
              }`}
            >
              {ESTADO_PAGO_LABEL[registro.estadoPago]}
              {!esPagado && registro.monto ? ` · $${registro.monto}` : ""}
            </span>
          </div>

          {registro.numeroSerie && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
              <Hash size={12} /> {registro.numeroSerie}
            </p>
          )}
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuAbierto((prev) => !prev);
        }}
        className="absolute right-2 top-2 rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
      >
        <MoreVertical size={18} />
      </button>

      {menuAbierto && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-11 z-10 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#171b22] shadow-2xl"
        >
          <button
            onClick={() => {
              setMenuAbierto(false);
              onEditar();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/10"
          >
            <Pencil size={15} />
            Editar datos
          </button>
          <button
            onClick={() => {
              setMenuAbierto(false);
              onEliminar();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-white/10"
          >
            <Trash2 size={15} />
            Eliminar registro
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Modal: crear / editar registro                                */
/* ---------------------------------------------------------- */

interface DatosRegistroForm {
  apartamento: string;
  nombre: string;
  apellido: string;
  numeroSerie: string;
  tipo: TipoControlTag;
  estadoPago: EstadoPago;
  monto: string;
}

// Los valores iniciales del modal pueden venir de un RegistroControlTag
// (donde "monto" es number | undefined, tal como se guarda) o de un
// DatosRegistroForm (donde "monto" es siempre string, tal como lo maneja
// el formulario). Este tipo acepta ambos casos sin pisar el resto de los
// campos de Partial<DatosRegistroForm>.
type ValoresInicialesRegistro = Omit<Partial<DatosRegistroForm>, "monto"> & {
  monto?: number | string;
};

function RegistroModal({
  titulo,
  valoresIniciales,
  enviando,
  onClose,
  onGuardar,
}: {
  titulo: string;
  valoresIniciales?: ValoresInicialesRegistro;
  enviando?: boolean;
  onClose: () => void;
  onGuardar: (datos: DatosRegistroForm) => void;
}) {
  const [apartamento, setApartamento] = useState(valoresIniciales?.apartamento ?? "");
  const [nombre, setNombre] = useState(valoresIniciales?.nombre ?? "");
  const [apellido, setApellido] = useState(valoresIniciales?.apellido ?? "");
  const [numeroSerie, setNumeroSerie] = useState(valoresIniciales?.numeroSerie ?? "");
  const [tipo, setTipo] = useState<TipoControlTag>(valoresIniciales?.tipo ?? "control");
  const [estadoPago, setEstadoPago] = useState<EstadoPago>(valoresIniciales?.estadoPago ?? "pendiente");
  const [monto, setMonto] = useState(
    valoresIniciales?.monto !== undefined
      ? String(valoresIniciales.monto)
      : String(MONTO_POR_DEFECTO[tipo])
  );
  // Mientras el usuario no toque el campo "Monto" a mano, lo mantenemos
  // sincronizado con el precio de referencia del tipo elegido. En cuanto
  // lo edita una vez, dejamos de tocarlo (así no le pisamos un precio
  // real que haya cargado). Si se está editando un registro existente
  // que ya tenía un monto guardado, arrancamos directamente como "tocado"
  // para no sobrescribirlo.
  const [montoTocado, setMontoTocado] = useState(valoresIniciales?.monto !== undefined);

  useEffect(() => {
    if (!montoTocado) {
      setMonto(String(MONTO_POR_DEFECTO[tipo]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const handleConfirmar = () => {
    const faltantes: string[] = [];
    if (!apartamento.trim()) faltantes.push("Apartamento");
    if (!nombre.trim()) faltantes.push("Nombre");
    if (!apellido.trim()) faltantes.push("Apellido");
    if (estadoPago === "pendiente" && !monto.trim()) faltantes.push("Monto a cobrar");

    if (faltantes.length > 0) {
      window.alert(`Faltan completar: ${faltantes.join(", ")}`);
      return;
    }

    onGuardar({
      apartamento: apartamento.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      numeroSerie: numeroSerie.trim(),
      tipo,
      estadoPago,
      monto: estadoPago === "pendiente" ? monto.trim() : "",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-xl font-bold text-white">{titulo}</h2>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Tipo: Control o Tag */}
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setTipo("control")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tipo === "control" ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <KeyRound size={15} />
              Control
            </button>
            <button
              type="button"
              onClick={() => setTipo("tag")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tipo === "tag" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <TagIcon size={15} />
              Tag
            </button>
          </div>

          <div>
            <label className={labelClass}>Apartamento</label>
            <input
              autoFocus
              type="text"
              value={apartamento}
              onChange={(e) => setApartamento(e.target.value)}
              placeholder="Ej: 914"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Número de serie <span className="text-gray-500">· opcional</span>
            </label>
            <input
              type="text"
              value={numeroSerie}
              onChange={(e) => setNumeroSerie(e.target.value)}
              placeholder="Para identificar el control/tag si se encuentra suelto"
              className={inputClass}
            />
          </div>

          {/* Estado de pago */}
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setEstadoPago("pendiente")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                estadoPago === "pendiente" ? "bg-yellow-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <CircleDollarSign size={15} />
              Pendiente
            </button>
            <button
              type="button"
              onClick={() => setEstadoPago("pagado")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                estadoPago === "pagado" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Check size={15} />
              Pagado
            </button>
          </div>

          {/* Monto a cobrar: solo aplica si quedó pendiente */}
          {estadoPago === "pendiente" && (
            <div>
              <label className={labelClass}>Monto a cobrar</label>
              <input
                type="number"
                inputMode="decimal"
                value={monto}
                onChange={(e) => {
                  setMonto(e.target.value);
                  setMontoTocado(true);
                }}
                placeholder="Ej: 1500"
                className={inputClass}
              />
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <button
              onClick={onClose}
              disabled={enviando}
              className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={enviando}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              <Check size={16} />
              {enviando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Modal: detalle de un registro (al tocar una tarjeta)          */
/* ---------------------------------------------------------- */

function RegistroDetalleModal({
  registro,
  onClose,
  onMarcarComoPagado,
  marcandoPago,
}: {
  registro: RegistroControlTag;
  onClose: () => void;
  onMarcarComoPagado: () => void;
  marcandoPago?: boolean;
}) {
  const esControl = registro.tipo === "control";
  const esPagado = registro.estadoPago === "pagado";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#171b22]/95 p-8 text-center shadow-2xl backdrop-blur-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-white/10"
        >
          <X className="text-white" size={20} />
        </button>

        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            esControl ? "bg-red-600/20 text-red-300" : "bg-indigo-600/20 text-indigo-300"
          }`}
        >
          {esControl ? <KeyRound size={34} /> : <TagIcon size={34} />}
        </div>

        <h2 className="mt-4 text-2xl font-bold leading-tight text-white">
          {registro.nombre} {registro.apellido}
        </h2>
        <p className="mt-0.5 text-base text-gray-300">Depto {registro.apartamento}</p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              esControl ? "bg-[rgba(239,68,68,0.15)] text-red-400" : "bg-[rgba(99,102,241,0.15)] text-indigo-400"
            }`}
          >
            {TIPO_LABEL[registro.tipo]}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              esPagado ? "bg-[rgba(16,185,129,0.15)] text-emerald-400" : "bg-[rgba(234,179,8,0.15)] text-yellow-400"
            }`}
          >
            {ESTADO_PAGO_LABEL[registro.estadoPago]}
            {!esPagado && registro.monto ? ` · $${registro.monto}` : ""}
          </span>
        </div>

        {registro.numeroSerie ? (
          <p className="mt-5 flex items-center justify-center gap-1.5 text-sm text-gray-400">
            <Hash size={14} />
            N.º de serie: <span className="text-gray-200">{registro.numeroSerie}</span>
          </p>
        ) : (
          <p className="mt-5 text-sm text-gray-500">No se cargó número de serie.</p>
        )}

        {/* Solo se muestra si está pendiente: permite cobrarlo y pasarlo
            a pagado sin tener que abrir "Editar datos". */}
        {!esPagado && (
          <button
            onClick={onMarcarComoPagado}
            disabled={marcandoPago}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            <Check size={16} />
            {marcandoPago ? "Guardando…" : "Marcar como pagado"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Pantalla principal                                            */
/* ---------------------------------------------------------- */

type EstadoModal = { modo: "crear" } | { modo: "editar"; registro: RegistroControlTag } | null;

export default function ControlTag({ usuario, onVolver, onListo }: ControlTagProps) {
  const [busqueda, setBusqueda] = useState("");
  const [modalEstado, setModalEstado] = useState<EstadoModal>(null);
  const [enviando, setEnviando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<RegistroControlTag | null>(null);
  const [marcandoPagoId, setMarcandoPagoId] = useState<string | null>(null);

  const [registros, setRegistros] = useState<RegistroControlTag[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  // Trae todos los registros de Firestore. Se usa al montar la pantalla y
  // después de cada crear/editar/eliminar, para que lo que se ve siempre
  // refleje lo que hay guardado (mismo patrón que Notas.tsx).
  const recargarRegistros = async () => {
    try {
      setErrorCarga("");
      const datos = (await obtenerControlesTagsDeDB()) as unknown as RegistroControlTag[];
      setRegistros(datos);
      return datos;
    } catch (err) {
      console.error("Error al cargar controles/tags desde Firestore:", err);
      setErrorCarga("No se pudieron cargar los registros. Revisá tu conexión.");
      return [];
    }
  };

  useEffect(() => {
    (async () => {
      setCargando(true);
      await recargarRegistros();
      setCargando(false);
      onListo?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Publica una Nota automática en la colección "notas". Si falla (por
  // ejemplo sin conexión), el registro igual queda guardado — solo se
  // avisa que la nota no se pudo publicar, para no perder la operación
  // por un problema de red.
  const publicarNota = async (contenido: string) => {
    try {
      await crearNotaEnDB({ contenido, autor: usuario.nombre });
    } catch (err) {
      console.error("Error al crear la nota automática de Control/Tag:", err);
      window.alert(
        "El registro se guardó, pero no se pudo publicar la nota automática en Notas."
      );
    }
  };

  const handleGuardarNuevo = async (datos: DatosRegistroForm) => {
    setEnviando(true);
    try {
      const nuevoSinId = {
        apartamento: datos.apartamento,
        nombre: datos.nombre,
        apellido: datos.apellido,
        numeroSerie: datos.numeroSerie || undefined,
        tipo: datos.tipo,
        estadoPago: datos.estadoPago,
        monto: datos.monto ? Number(datos.monto) : undefined,
        autor: usuario.nombre,
        fechaCreacion: new Date().toISOString(),
      };

      const id = await crearControlTagEnDB(nuevoSinId);
      const nuevo: RegistroControlTag = { id, ...nuevoSinId };

      await publicarNota(generarContenidoNota(nuevo));

      if (nuevo.estadoPago === "pagado") {
        try {
          await crearFacturaDeControlTag(nuevo, usuario);
        } catch (err) {
          console.error("Error al generar la factura automática de Control/Tag:", err);
          window.alert(
            "El registro se guardó, pero no se pudo generar la factura automáticamente."
          );
        }
      }

      await recargarRegistros();
      setModalEstado(null);
    } catch (err) {
      console.error("Error al crear el registro de control/tag:", err);
      window.alert("No se pudo guardar el registro. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const handleGuardarEdicion = async (id: string, datos: DatosRegistroForm) => {
    setEnviando(true);
    try {
      await actualizarControlTagEnDB(id, {
        apartamento: datos.apartamento,
        nombre: datos.nombre,
        apellido: datos.apellido,
        numeroSerie: datos.numeroSerie || undefined,
        tipo: datos.tipo,
        estadoPago: datos.estadoPago,
        monto: datos.monto ? Number(datos.monto) : undefined,
      });
      await recargarRegistros();
      setModalEstado(null);
    } catch (err) {
      console.error("Error al editar el registro de control/tag:", err);
      window.alert("No se pudieron guardar los cambios. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  // Se dispara desde el modal de detalle: pasa un registro pendiente a
  // pagado en un solo paso, sin tener que abrir "Editar datos". Además
  // publica una nota avisando que se cobró, para que quede constancia.
  const handleMarcarComoPagado = async (registro: RegistroControlTag) => {
    setMarcandoPagoId(registro.id);
    try {
      await actualizarControlTagEnDB(registro.id, { estadoPago: "pagado" });

      const tipoTexto = TIPO_LABEL[registro.tipo];
      await publicarNota(
        `${registro.apartamento} Se cobró el ${tipoTexto} que estaba pendiente, ahora queda pago`
      );

      try {
        await crearFacturaDeControlTag({ ...registro, estadoPago: "pagado" }, usuario);
      } catch (err) {
        console.error("Error al generar la factura automática de Control/Tag:", err);
        window.alert(
          "Se marcó como pagado, pero no se pudo generar la factura automáticamente."
        );
      }

      const datosActualizados = await recargarRegistros();
      const actualizado = datosActualizados.find((r) => r.id === registro.id);
      setSeleccionado(actualizado ?? { ...registro, estadoPago: "pagado" });
    } catch (err) {
      console.error("Error al marcar el registro como pagado:", err);
      window.alert("No se pudo marcar como pagado. Intentá de nuevo.");
    } finally {
      setMarcandoPagoId(null);
    }
  };

  const handleEliminar = async (registro: RegistroControlTag) => {
    const confirmado = window.confirm(
      `¿Seguro que querés eliminar el ${TIPO_LABEL[registro.tipo].toLowerCase()} de ${registro.nombre} ${registro.apellido} (depto ${registro.apartamento})?`
    );
    if (!confirmado) return;

    try {
      await eliminarControlTagEnDB(registro.id);
      await recargarRegistros();
    } catch (err) {
      console.error("Error al eliminar el registro de control/tag:", err);
      window.alert("No se pudo eliminar el registro. Intentá de nuevo.");
    }
  };

  const query = normalizar(busqueda.trim());

  const registrosFiltrados = useMemo(() => {
    if (!query) return registros;
    return registros.filter((r) => {
      const nombreCompleto = normalizar(`${r.nombre} ${r.apellido}`);
      const serie = normalizar(r.numeroSerie ?? "");
      return nombreCompleto.includes(query) || r.apartamento.includes(query) || serie.includes(query);
    });
  }, [registros, query]);

  const listaOrdenada = useMemo(
    () => [...registrosFiltrados].sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true })),
    [registrosFiltrados]
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d1117] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mb-8 flex w-full max-w-2xl items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <h1 className="text-xl font-bold sm:text-2xl">Controles / Tags</h1>

        <button
          onClick={() => setModalEstado({ modo: "crear" })}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Plus size={18} />
          Agregar
        </button>
      </div>

      <div className="mb-6 w-full max-w-2xl">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por apartamento, nombre o número de serie…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />
        </div>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-2">
        {cargando ? (
          <p className="text-center text-gray-400">Cargando registros…</p>
        ) : errorCarga ? (
          <p className="text-center text-red-400">{errorCarga}</p>
        ) : listaOrdenada.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center text-gray-500">
            <TagIcon size={28} />
            <p className="text-sm">
              {registros.length === 0
                ? "Todavía no hay controles ni tags registrados."
                : "No se encontró nada con esa búsqueda."}
            </p>
          </div>
        ) : (
          listaOrdenada.map((registro) => (
            <RegistroCard
              key={registro.id}
              registro={registro}
              onClick={() => setSeleccionado(registro)}
              onEditar={() => setModalEstado({ modo: "editar", registro })}
              onEliminar={() => handleEliminar(registro)}
            />
          ))
        )}
      </div>

      {modalEstado?.modo === "crear" && (
        <RegistroModal
          titulo="Nuevo control/tag"
          enviando={enviando}
          onClose={() => setModalEstado(null)}
          onGuardar={handleGuardarNuevo}
        />
      )}

      {modalEstado?.modo === "editar" && (
        <RegistroModal
          titulo="Editar registro"
          valoresIniciales={modalEstado.registro}
          enviando={enviando}
          onClose={() => setModalEstado(null)}
          onGuardar={(datos) => handleGuardarEdicion(modalEstado.registro.id, datos)}
        />
      )}

      {seleccionado && (
        <RegistroDetalleModal
          registro={seleccionado}
          onClose={() => setSeleccionado(null)}
          onMarcarComoPagado={() => handleMarcarComoPagado(seleccionado)}
          marcandoPago={marcandoPagoId === seleccionado.id}
        />
      )}
    </main>
  );
}