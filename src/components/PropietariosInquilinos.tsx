import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Phone,
  Mail,
  Home,
  MoreVertical,
  Pencil,
  Trash2,
  Repeat,
  Building2,
  KeyRound,
  X,
  Check,
  CarFront,
  Bike,
} from "lucide-react";
import ContactoDetalleModal, { type ContactoDetalle } from "./ContactoDetalleModal";
import { MarcaInput, MARCAS_AUTO, MARCAS_MOTO, normalizarMatricula } from "./Cocheras";
import {
  crearResidenteEnDB,
  obtenerResidentesDeDB,
  actualizarResidenteEnDB,
  eliminarResidenteEnDB,
  crearVehiculoEnDB,
  eliminarVehiculosDeResidenteEnDB,
  crearContactoEnDB,
  actualizarContactoEnDB,
  eliminarContactoEnDB,
} from "../lib/firebase";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface PropietariosInquilinosProps {
  usuario: Usuario;
  onVolver: () => void;
  onListo?: () => void;
}

export type TipoResidente = "propietario" | "inquilino";

export interface Residente {
  id: string;
  apartamento: string;
  tipo: TipoResidente;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fechaInicio?: string; // YYYY-MM-DD — legado: ya no se pide al cargar, pero se conserva en docs viejos
  activo: boolean; // false = ya no vive ahí (se fue o se vendió el depto)
  fechaFin?: string; // YYYY-MM-DD, cuándo dejó de ser el residente activo
  contactoId?: string; // id del contacto espejo en la colección "contactos"
  autor: string;
  fechaCreacion: string; // ISO
}

const TIPO_LABEL: Record<TipoResidente, string> = {
  propietario: "Propietario",
  inquilino: "Inquilino anual",
};

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const d = new Date(anio, mes - 1, dia);
  return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-400";

// Usado por Ingresos.tsx: dado un depto y un tipo ("propietario" o
// "inquilino"), busca si hay un residente ACTIVO cargado en Firestore para
// esa combinación. Devuelve undefined si no hay nada — no es un error, es
// el caso normal de "todavía no está registrado".
export async function buscarResidenteActivo(
  apartamento: string,
  tipo: TipoResidente
): Promise<Residente | undefined> {
  const datos = (await obtenerResidentesDeDB()) as unknown as Residente[];
  return datos.find(
    (r) => r.activo && r.tipo === tipo && r.apartamento === apartamento.trim()
  );
}

/* ---------------------------------------------------------- */
/* Tarjeta de residente: clickeable (abre el detalle, mismo      */
/* patrón que ContactoCard en Contactos.tsx) + menú de 3 puntitos */
/* ---------------------------------------------------------- */

function ResidenteCard({
  residente,
  onClick,
  onEditar,
  onEliminar,
  onReemplazar,
}: {
  residente: Residente;
  onClick: () => void;
  onEditar: () => void;
  onEliminar: () => void;
  onReemplazar: (nuevoTipo: TipoResidente) => void;
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

  const esPropietario = residente.tipo === "propietario";

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 pr-12 text-left transition hover:bg-white/[0.06] active:scale-[0.99]"
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
            esPropietario ? "bg-[rgba(16,185,129,0.2)] text-emerald-300" : "bg-[rgba(59,130,246,0.2)] text-blue-300"
          }`}
        >
          {residente.apartamento}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-white">
              {residente.nombre} {residente.apellido}
            </p>
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                esPropietario ? "bg-[rgba(16,185,129,0.15)] text-emerald-400" : "bg-[rgba(59,130,246,0.15)] text-blue-400"
              }`}
            >
              {TIPO_LABEL[residente.tipo]}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            {residente.telefono && (
              <span className="flex items-center gap-1">
                <Phone size={12} /> {residente.telefono}
              </span>
            )}
            {residente.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail size={12} /> {residente.email}
              </span>
            )}
          </div>
          {residente.fechaInicio && (
            <p className="mt-1 text-[11px] text-gray-500">Desde {formatearFecha(residente.fechaInicio)}</p>
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
              onReemplazar("propietario");
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-emerald-400 transition hover:bg-white/10"
          >
            <Repeat size={15} />
            Nuevo propietario
          </button>
          <button
            onClick={() => {
              setMenuAbierto(false);
              onReemplazar("inquilino");
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-blue-400 transition hover:bg-white/10"
          >
            <Repeat size={15} />
            Nuevo inquilino
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
/* Modal: crear / editar residente                              */
/* ---------------------------------------------------------- */

interface DatosVehiculoForm {
  tipo: "auto" | "moto";
  matricula: string;
  marca: string;
}

interface DatosResidenteForm {
  apartamento: string;
  tipo: TipoResidente;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  vehiculo?: DatosVehiculoForm;
}

function ResidenteModal({
  titulo,
  valoresIniciales,
  bloquearApartamento,
  // Solo se ofrece cargar vehículo al dar de alta (crear/reemplazo). En
  // edición de datos ya existentes no tocamos vehículos: eso se gestiona
  // desde el propio módulo de Cocheras para no adivinar a cuál vehículo
  // del residente correspondería el cambio.
  permitirVehiculo,
  enviando,
  onClose,
  onGuardar,
}: {
  titulo: string;
  valoresIniciales?: Partial<DatosResidenteForm>;
  /** true cuando viene de "Nuevo propietario/inquilino": el depto ya está fijado. */
  bloquearApartamento?: boolean;
  permitirVehiculo?: boolean;
  enviando?: boolean;
  onClose: () => void;
  onGuardar: (datos: DatosResidenteForm) => void;
}) {
  const [apartamento, setApartamento] = useState(valoresIniciales?.apartamento ?? "");
  const [tipo, setTipo] = useState<TipoResidente>(valoresIniciales?.tipo ?? "inquilino");
  const [nombre, setNombre] = useState(valoresIniciales?.nombre ?? "");
  const [apellido, setApellido] = useState(valoresIniciales?.apellido ?? "");
  const [telefono, setTelefono] = useState(valoresIniciales?.telefono ?? "");
  const [email, setEmail] = useState(valoresIniciales?.email ?? "");

  // --- Vehículo opcional, se carga junto con el residente ---
  const [tieneVehiculo, setTieneVehiculo] = useState(false);
  const [tipoVehiculo, setTipoVehiculo] = useState<"auto" | "moto">("auto");
  const [matriculaVehiculo, setMatriculaVehiculo] = useState("");
  const [marcaVehiculo, setMarcaVehiculo] = useState("");

  const marcasDisponibles = tipoVehiculo === "auto" ? MARCAS_AUTO : MARCAS_MOTO;

  const handleConfirmar = () => {
    const faltantes: string[] = [];
    if (!apartamento.trim()) faltantes.push("Apartamento");
    if (!nombre.trim()) faltantes.push("Nombre");
    if (!apellido.trim()) faltantes.push("Apellido");
    if (!telefono.trim()) faltantes.push("Teléfono");
    if (tieneVehiculo && !matriculaVehiculo.trim()) faltantes.push("Matrícula del vehículo");

    if (faltantes.length > 0) {
      window.alert(`Faltan completar: ${faltantes.join(", ")}`);
      return;
    }

    onGuardar({
      apartamento: apartamento.trim(),
      tipo,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      vehiculo: tieneVehiculo
        ? {
            tipo: tipoVehiculo,
            matricula: matriculaVehiculo.trim().toUpperCase(),
            marca: marcaVehiculo.trim(),
          }
        : undefined,
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
          {/* Tipo */}
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setTipo("inquilino")}
              disabled={bloquearApartamento}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                tipo === "inquilino" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <KeyRound size={15} />
              Inquilino anual
            </button>
            <button
              type="button"
              onClick={() => setTipo("propietario")}
              disabled={bloquearApartamento}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                tipo === "propietario" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Building2 size={15} />
              Propietario
            </button>
          </div>

          <div>
            <label className={labelClass}>Apartamento</label>
            <input
              autoFocus={!bloquearApartamento}
              type="text"
              value={apartamento}
              disabled={bloquearApartamento}
              onChange={(e) => setApartamento(e.target.value)}
              placeholder="Ej: 914"
              className={`${inputClass} ${bloquearApartamento ? "cursor-not-allowed opacity-60" : ""}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                autoFocus={bloquearApartamento}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="09X XXX XXX"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Email <span className="text-gray-500">· opcional</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Vehículo opcional: solo al dar de alta un residente nuevo,
              para cargar todo junto y no hacer perder tiempo agregándolo
              aparte desde Cocheras. */}
          {permitirVehiculo && (
            <div className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-white">
                <input
                  type="checkbox"
                  checked={tieneVehiculo}
                  onChange={(e) => setTieneVehiculo(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-600"
                />
                ¿Tiene auto o moto? Cargalo de una vez
              </label>

              {tieneVehiculo && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => setTipoVehiculo("auto")}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                        tipoVehiculo === "auto" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <CarFront size={15} />
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoVehiculo("moto")}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                        tipoVehiculo === "moto" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Bike size={15} />
                      Moto
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Matrícula</label>
                      <input
                        type="text"
                        value={matriculaVehiculo}
                        onChange={(e) => setMatriculaVehiculo(e.target.value)}
                        placeholder="Ej: ABC 1234"
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Marca <span className="text-gray-500">· opcional</span>
                      </label>
                      <MarcaInput value={marcaVehiculo} onChange={setMarcaVehiculo} marcas={marcasDisponibles} />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    El nombre, depto y contacto del vehículo se toman de los datos de arriba.
                  </p>
                </div>
              )}
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
/* Pantalla principal                                            */
/* ---------------------------------------------------------- */

type EstadoModal =
  | { modo: "crear" }
  | { modo: "editar"; residente: Residente }
  | { modo: "reemplazo"; apartamento: string; tipo: TipoResidente }
  | null;

export default function PropietariosInquilinos({ usuario, onVolver, onListo }: PropietariosInquilinosProps) {
  const [busqueda, setBusqueda] = useState("");
  const [modalEstado, setModalEstado] = useState<EstadoModal>(null);
  const [enviando, setEnviando] = useState(false);
  // Residente seleccionado para ver en el modal de detalle (mismo patrón que
  // "seleccionado" en Contactos.tsx, reusando el mismo ContactoDetalleModal).
  const [seleccionado, setSeleccionado] = useState<ContactoDetalle | null>(null);

  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarResidentes = async () => {
    const datos = await obtenerResidentesDeDB();
    setResidentes(datos as unknown as Residente[]);
  };

  useEffect(() => {
    (async () => {
      try {
        setError("");
        await cargarResidentes();
      } catch (err) {
        console.error("Error al cargar residentes desde Firestore:", err);
        setError("No se pudieron cargar los propietarios/inquilinos. Revisá tu conexión.");
      } finally {
        setCargando(false);
        onListo?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el formulario venía con datos de vehículo, lo crea en la colección
  // de Cocheras/vehículos reusando nombre, apellido, depto, teléfono y
  // correo del residente recién cargado — así no hay que volver a tipearlos
  // en el módulo de Cocheras. Se le pasa también el residenteId ya generado
  // para que el vehículo quede vinculado y se pueda borrar en cascada si el
  // residente se elimina más adelante.
  const crearVehiculoSiCorresponde = async (datos: DatosResidenteForm, residenteId: string) => {
    if (!datos.vehiculo) return;

    try {
      await crearVehiculoEnDB({
        tipo: datos.vehiculo.tipo,
        matricula: normalizarMatricula(datos.vehiculo.matricula),
        matriculaOriginal: datos.vehiculo.matricula,
        marca: datos.vehiculo.marca,
        nombre: datos.nombre,
        apellido: datos.apellido,
        apartamento: datos.apartamento,
        telefono: datos.telefono,
        correo: datos.email,
        residenteId,
        autor: usuario.nombre,
        fechaCreacion: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error al crear vehículo en Firestore:", err);
      // No bloqueamos el alta del residente por esto: ya quedó guardado.
      // Avisamos aparte para que se pueda cargar el vehículo a mano desde Cocheras.
      window.alert(
        "El propietario/inquilino se guardó bien, pero no se pudo registrar el vehículo. Podés cargarlo a mano desde el módulo de Cocheras."
      );
    }
  };

  const handleGuardarNuevo = async (datos: DatosResidenteForm) => {
    try {
      setEnviando(true);
      const nuevoId = await crearResidenteEnDB({
        apartamento: datos.apartamento,
        tipo: datos.tipo,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        email: datos.email,
        activo: true,
        autor: usuario.nombre,
        fechaCreacion: new Date().toISOString(),
      });

      // Crea el contacto espejo en Contactos y guarda su id en el residente,
      // para poder editarlo/eliminarlo en cascada más adelante.
      const contactoId = await crearContactoEnDB({
        nombre: datos.nombre,
        apellido: datos.apellido,
        apartamento: datos.apartamento,
        email: datos.email,
        telefono: datos.telefono,
        autor: usuario.nombre,
        fechaCreacion: new Date().toISOString(),
      });
      await actualizarResidenteEnDB(nuevoId, { contactoId });

      await crearVehiculoSiCorresponde(datos, nuevoId);
      await cargarResidentes();
      setModalEstado(null);
    } catch (err) {
      console.error("Error al crear residente en Firestore:", err);
      window.alert("No se pudo guardar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

    const handleGuardarEdicion = async (residente: Residente, datos: DatosResidenteForm) => {
    try {
      setEnviando(true);
      await actualizarResidenteEnDB(residente.id, {
        apartamento: datos.apartamento,
        tipo: datos.tipo,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        email: datos.email,
      });

      // Mantiene sincronizado el contacto espejo, si existe.
      if (residente.contactoId) {
        await actualizarContactoEnDB(residente.contactoId, {
          nombre: datos.nombre,
          apellido: datos.apellido,
          apartamento: datos.apartamento,
          email: datos.email,
          telefono: datos.telefono,
        });
      }

      await cargarResidentes();
      setModalEstado(null);
    } catch (err) {
      console.error("Error al editar residente en Firestore:", err);
      window.alert("No se pudo guardar la edición. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  // Al eliminar un propietario/inquilino, se borran primero sus vehículos
  // registrados en Cocheras (para no dejar autos/motos huérfanos) y recién
  // después se elimina el residente en sí.
   const handleEliminar = async (residente: Residente) => {
    const confirmado = window.confirm(
      `¿Seguro que querés eliminar el registro de ${residente.nombre} ${residente.apellido} (depto ${residente.apartamento})? Esto también eliminará sus vehículos registrados en Cocheras y su contacto en la agenda.`
    );
    if (!confirmado) return;

    try {
      await eliminarVehiculosDeResidenteEnDB({
        residenteId: residente.id,
        apartamento: residente.apartamento,
        nombre: residente.nombre,
        apellido: residente.apellido,
      });
      if (residente.contactoId) {
        await eliminarContactoEnDB(residente.contactoId);
      }
      await eliminarResidenteEnDB(residente.id);
      await cargarResidentes();
    } catch (err) {
      console.error("Error al eliminar residente en Firestore:", err);
      window.alert("No se pudo eliminar. Revisá tu conexión e intentá de nuevo.");
    }
  };

  // Archiva al residente actual (queda con activo:false y fechaFin) y abre
  // el modal para cargar a la persona nueva, con el depto ya precargado.
  const handleReemplazar = async (residente: Residente, nuevoTipo: TipoResidente) => {
    try {
      await actualizarResidenteEnDB(residente.id, { activo: false, fechaFin: hoyISO() });
      await cargarResidentes();
      setModalEstado({ modo: "reemplazo", apartamento: residente.apartamento, tipo: nuevoTipo });
    } catch (err) {
      console.error("Error al archivar residente en Firestore:", err);
      window.alert("No se pudo procesar el reemplazo. Revisá tu conexión e intentá de nuevo.");
    }
  };

  const query = normalizar(busqueda.trim());

  const residentesFiltrados = useMemo(() => {
    const activos = residentes.filter((r) => r.activo);
    if (!query) return activos;
    return activos.filter((r) => {
      const nombreCompleto = normalizar(`${r.nombre} ${r.apellido}`);
      return nombreCompleto.includes(query) || r.apartamento.includes(query);
    });
  }, [residentes, query]);

  const listaOrdenada = useMemo(
    () => [...residentesFiltrados].sort((a, b) => a.apartamento.localeCompare(b.apartamento, undefined, { numeric: true })),
    [residentesFiltrados]
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

        <h1 className="text-xl font-bold sm:text-2xl">Propietarios / Inquilinos</h1>

        <button
          onClick={() => setModalEstado({ modo: "crear" })}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Plus size={18} />
          Agregar
        </button>
      </div>

      {error && <p className="mb-4 w-full max-w-2xl text-sm text-red-400">{error}</p>}

      <div className="mb-6 w-full max-w-2xl">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por apartamento o nombre…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />
        </div>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-2">
        {cargando ? (
          <p className="text-center text-gray-400">Cargando…</p>
        ) : listaOrdenada.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center text-gray-500">
            <Home size={28} />
            <p className="text-sm">
              {residentes.filter((r) => r.activo).length === 0
                ? "Todavía no hay propietarios ni inquilinos cargados."
                : "No se encontró nadie con esa búsqueda."}
            </p>
          </div>
        ) : (
          listaOrdenada.map((residente) => (
            <ResidenteCard
              key={residente.id}
              residente={residente}
              onClick={() =>
                setSeleccionado({
                  nombre: `${residente.nombre} ${residente.apellido}`,
                  subtitulo: `Depto ${residente.apartamento} · ${TIPO_LABEL[residente.tipo]}`,
                  telefono: residente.telefono,
                  email: residente.email,
                })
              }
              onEditar={() => setModalEstado({ modo: "editar", residente })}
              onEliminar={() => handleEliminar(residente)}
              onReemplazar={(nuevoTipo) => handleReemplazar(residente, nuevoTipo)}
            />
          ))
        )}
      </div>

      {modalEstado?.modo === "crear" && (
        <ResidenteModal
          titulo="Nuevo propietario/inquilino"
          permitirVehiculo
          enviando={enviando}
          onClose={() => setModalEstado(null)}
          onGuardar={handleGuardarNuevo}
        />
      )}

      {modalEstado?.modo === "editar" && (
        <ResidenteModal
          titulo="Editar datos"
          valoresIniciales={modalEstado.residente}
          enviando={enviando}
          onClose={() => setModalEstado(null)}
          onGuardar={(datos) => handleGuardarEdicion(modalEstado.residente, datos)}
        />
      )}

      {modalEstado?.modo === "reemplazo" && (
        <ResidenteModal
          titulo={modalEstado.tipo === "propietario" ? "Nuevo propietario" : "Nuevo inquilino"}
          valoresIniciales={{ apartamento: modalEstado.apartamento, tipo: modalEstado.tipo }}
          bloquearApartamento
          permitirVehiculo
          enviando={enviando}
          onClose={() => setModalEstado(null)}
          onGuardar={handleGuardarNuevo}
        />
      )}

      <ContactoDetalleModal contacto={seleccionado} onClose={() => setSeleccionado(null)} />
    </main>
  );
}