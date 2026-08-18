import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  UserRound,
  Building2,
  Wrench,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import CreateContactoModal from "./CreateContactoModal";
import ContactoDetalleModal, { type ContactoDetalle } from "./ContactoDetalleModal";
import {
  crearContactoEnDB,
  obtenerContactosDeDB,
  actualizarContactoEnDB,
  eliminarContactoEnDB,
  crearServicioEnDB,
  obtenerServiciosDeDB,
  actualizarServicioEnDB,
  eliminarServicioEnDB,
} from "../lib/firebase";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

export interface Contacto {
  id: string;
  nombre: string;
  apellido: string;
  apartamento?: string;
  email: string;
  telefono: string;
  autor: string;
  fechaCreacion: string; // ISO
}

export type NuevoContactoData = Omit<Contacto, "id" | "autor" | "fechaCreacion">;

interface ContactosProps {
  usuario: Usuario;
  /** Usuarios (personal) cargados en Home; se muestran anclados arriba de todo. */
  usuarios: Usuario[];
  onVolver: () => void;
  onListo?: () => void;
}

/**
 * Números de servicios / reclamos / terceros (cardiomóvil, ascensores, taxis,
 * piscina, etc.). Se muestran anclados debajo de "Personal de Torre Antares"
 * y arriba de la agenda normal de contactos. Viven en Firestore (colección
 * "servicios"), editables desde la app igual que los contactos.
 *
 * La lista de acá abajo es solo la "semilla" inicial: si la colección
 * "servicios" está vacía la primera vez que se abre la pantalla (proyecto
 * recién migrado), se cargan estos valores a Firestore una única vez. Una
 * vez que existen documentos ahí, esta lista ya no se vuelve a usar.
 */
interface ServicioTercero {
  id: string;
  nombre: string;
  subtitulo?: string;
  telefono: string;
}

const SERVICIOS_TERCEROS_SEMILLA: Omit<ServicioTercero, "id">[] = [
  { nombre: "Administración", telefono: "Int. 1030-1040" },
  { nombre: "D'Atlántico", subtitulo: "Ascensores e informática", telefono: "094402193 / 42232598" },
  { nombre: "Cardiomóvil", telefono: "42228700 / 42229000" },
  { nombre: "Taxis Cantegril", telefono: "42486680" },
  { nombre: "Supermercado Tortu", telefono: "095025602 / 42485019" },
  { nombre: "Barométrica", telefono: "099575689" },
  // UTE: acá va el número de cuenta de reclamos, no un teléfono. El "0061" no
  // se pudo identificar con certeza en la planilla física, se deja tal cual
  // hasta confirmarlo.
  { nombre: "UTE", subtitulo: "N.º de cuenta (a confirmar)", telefono: "34538100 · 0061" },
  { nombre: "Scotiabank", subtitulo: "Sucursal 19", telefono: "0695801100" },
  { nombre: "Noguerina", subtitulo: "Cocinas", telefono: "42224561" },
  { nombre: "Megal", telefono: "098300700" },
  { nombre: "Acodike", telefono: "42221201" },
  { nombre: "Riogas", telefono: "42221235" },
  { nombre: "Punta Cable", telefono: "42494242" },
];

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // saca acentos para que la búsqueda no dependa de tildes
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-400";

// Tarjeta de contacto con menú de 3 puntitos (Editar / Eliminar), mismo
// patrón que ya usa UserCard.tsx en el login.
function ContactoCard({
  contacto,
  onClick,
  onEditar,
  onEliminar,
}: {
  contacto: Contacto;
  onClick: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const inicial = contacto.nombre.trim().charAt(0).toUpperCase() || "?";
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

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 pr-12 text-left transition hover:bg-white/[0.06] active:scale-[0.99]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-base font-bold text-blue-300">
          {inicial}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">
            {contacto.nombre} {contacto.apellido}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            {contacto.apartamento && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> Depto {contacto.apartamento}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Phone size={12} /> {contacto.telefono}
            </span>
            <span className="flex items-center gap-1 truncate">
              <Mail size={12} /> {contacto.email}
            </span>
          </div>
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuAbierto((prev) => !prev);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition hover:bg-white/10"
      >
        <MoreVertical className="text-gray-400" size={18} />
      </button>

      {menuAbierto && (
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-12 z-10 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#171b22] shadow-2xl"
        >
          <button
            onClick={() => {
              setMenuAbierto(false);
              onEditar();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/10"
          >
            <Pencil size={15} />
            Editar contacto
          </button>
          <button
            onClick={() => {
              setMenuAbierto(false);
              onEliminar();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-white/10"
          >
            <Trash2 size={15} />
            Eliminar contacto
          </button>
        </div>
      )}
    </div>
  );
}

// Tarjeta genérica para las secciones ancladas (Personal / Servicios). Solo
// "Servicios" pasa onEditar/onEliminar (por eso son opcionales acá): "Personal"
// no se edita desde acá porque sale directo de los usuarios de Home.
interface ItemFijo {
  nombre: string;
  subtitulo?: string;
  telefono: string;
  email?: string;
}

function ItemFijoCard({
  item,
  color,
  onClick,
  onEditar,
  onEliminar,
}: {
  item: ItemFijo;
  color: "emerald" | "amber";
  onClick: () => void;
  onEditar?: () => void;
  onEliminar?: () => void;
}) {
  const inicial = item.nombre.trim().charAt(0).toUpperCase() || "?";
  const colorClases =
    color === "emerald" ? "bg-emerald-600/20 text-emerald-300" : "bg-amber-500/20 text-amber-300";
  const editable = Boolean(onEditar || onEliminar);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editable) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editable]);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06] active:scale-[0.99] ${
          editable ? "pr-12" : ""
        }`}
      >
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${colorClases}`}>
          {inicial}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">{item.nombre}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
            {item.subtitulo && <span>{item.subtitulo}</span>}
            {item.telefono && (
              <span className="flex items-center gap-1">
                <Phone size={12} /> {item.telefono}
              </span>
            )}
            {item.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail size={12} /> {item.email}
              </span>
            )}
          </div>
        </div>
      </button>

      {editable && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuAbierto((prev) => !prev);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition hover:bg-white/10"
          >
            <MoreVertical className="text-gray-400" size={18} />
          </button>

          {menuAbierto && (
            <div
              ref={menuRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-2 top-12 z-10 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#171b22] shadow-2xl"
            >
              {onEditar && (
                <button
                  onClick={() => {
                    setMenuAbierto(false);
                    onEditar();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/10"
                >
                  <Pencil size={15} />
                  Editar
                </button>
              )}
              {onEliminar && (
                <button
                  onClick={() => {
                    setMenuAbierto(false);
                    onEliminar();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 transition hover:bg-white/10"
                >
                  <Trash2 size={15} />
                  Eliminar
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Modal de crear/editar un servicio de terceros (mismo patrón que VehiculoModal en Cocheras.tsx)
function ServicioModal({
  servicioInicial,
  onClose,
  onGuardar,
}: {
  servicioInicial?: ServicioTercero | null;
  onClose: () => void;
  onGuardar: (datos: { nombre: string; subtitulo?: string; telefono: string }) => void;
}) {
  const esEdicion = !!servicioInicial;
  const [nombre, setNombre] = useState(servicioInicial?.nombre ?? "");
  const [subtitulo, setSubtitulo] = useState(servicioInicial?.subtitulo ?? "");
  const [telefono, setTelefono] = useState(servicioInicial?.telefono ?? "");

  const handleConfirmar = () => {
    if (!nombre.trim() || !telefono.trim()) {
      window.alert("Completá al menos el nombre y el teléfono / dato de contacto.");
      return;
    }
    onGuardar({
      nombre: nombre.trim(),
      subtitulo: subtitulo.trim() || undefined,
      telefono: telefono.trim(),
    });
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
          <h2 className="text-xl font-bold text-white">{esEdicion ? "Editar servicio" : "Nuevo servicio"}</h2>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              autoFocus
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Cardiomóvil"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Detalle <span className="text-gray-500">· opcional</span>
            </label>
            <input
              type="text"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Ej: Emergencias médicas"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono / dato de contacto</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 42228700"
              className={inputClass}
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
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Check size={16} />
              {esEdicion ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Contactos({ usuario, usuarios, onVolver, onListo }: ContactosProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactoEditando, setContactoEditando] = useState<Contacto | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<ContactoDetalle | null>(null);
  const [modalServicioAbierto, setModalServicioAbierto] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<ServicioTercero | null>(null);

  // Contactos y servicios ahora viven en Firestore, no en localStorage.
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [servicios, setServicios] = useState<ServicioTercero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarContactos = async () => {
    const datos = await obtenerContactosDeDB();
    setContactos(datos as unknown as Contacto[]);
  };

  const cargarServicios = async () => {
    let datos = await obtenerServiciosDeDB();

    // Primera vez que se usa esta colección (proyecto recién migrado): la
    // sembramos una única vez con la lista de siempre.
    if (datos.length === 0) {
      for (const s of SERVICIOS_TERCEROS_SEMILLA) {
        await crearServicioEnDB(s);
      }
      datos = await obtenerServiciosDeDB();
    }

    setServicios(datos as unknown as ServicioTercero[]);
  };

  useEffect(() => {
    (async () => {
      try {
        setError("");
        await Promise.all([cargarContactos(), cargarServicios()]);
      } catch (err) {
        console.error("Error al cargar contactos/servicios desde Firestore:", err);
        setError("No se pudieron cargar los contactos. Revisá tu conexión.");
      } finally {
        setCargando(false);
        onListo?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContactoCreado = async (datos: NuevoContactoData) => {
    try {
      await crearContactoEnDB({
        ...datos,
        autor: usuario.nombre,
        fechaCreacion: new Date().toISOString(),
      });
      await cargarContactos();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error al crear contacto en Firestore:", err);
      setError("No se pudo crear el contacto. Intentá de nuevo.");
    }
  };

  const handleContactoEditado = async (datos: NuevoContactoData) => {
    if (!contactoEditando) return;
    try {
      await actualizarContactoEnDB(contactoEditando.id, datos);
      await cargarContactos();
      setContactoEditando(null);
    } catch (err) {
      console.error("Error al editar contacto en Firestore:", err);
      setError("No se pudo guardar la edición. Intentá de nuevo.");
    }
  };

  const handleEliminarContacto = async (contacto: Contacto) => {
    const confirmado = window.confirm(
      `¿Seguro que querés eliminar a ${contacto.nombre} ${contacto.apellido} de los contactos?`
    );
    if (!confirmado) return;
    try {
      await eliminarContactoEnDB(contacto.id);
      await cargarContactos();
    } catch (err) {
      console.error("Error al eliminar contacto en Firestore:", err);
      setError("No se pudo eliminar el contacto. Intentá de nuevo.");
    }
  };

  const handleCrearServicio = async (datos: { nombre: string; subtitulo?: string; telefono: string }) => {
    try {
      await crearServicioEnDB(datos);
      await cargarServicios();
      setModalServicioAbierto(false);
    } catch (err) {
      console.error("Error al crear servicio en Firestore:", err);
      setError("No se pudo agregar el servicio. Intentá de nuevo.");
    }
  };

  const handleEditarServicio = async (datos: { nombre: string; subtitulo?: string; telefono: string }) => {
    if (!servicioEditando) return;
    try {
      await actualizarServicioEnDB(servicioEditando.id, datos);
      await cargarServicios();
      setServicioEditando(null);
    } catch (err) {
      console.error("Error al editar servicio en Firestore:", err);
      setError("No se pudo guardar la edición. Intentá de nuevo.");
    }
  };

  const handleEliminarServicio = async (servicio: ServicioTercero) => {
    const confirmado = window.confirm(`¿Seguro que querés eliminar "${servicio.nombre}" de los servicios?`);
    if (!confirmado) return;
    try {
      await eliminarServicioEnDB(servicio.id);
      await cargarServicios();
    } catch (err) {
      console.error("Error al eliminar servicio en Firestore:", err);
      setError("No se pudo eliminar el servicio. Intentá de nuevo.");
    }
  };

  const query = normalizar(busqueda.trim());

  // "Personal de Torre Antares": se arma solo con los usuarios de Home,
  // no hace falta cargarlos a mano acá.
  const personalFiltrado = useMemo(() => {
    const items: ItemFijo[] = usuarios
      .map((u) => ({ nombre: u.nombre, subtitulo: u.cargo, telefono: u.telefono, email: u.gmail }))
      .sort((a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre)));

    if (!query) return items;
    return items.filter((i) => normalizar(i.nombre).includes(query));
  }, [usuarios, query]);

  const serviciosFiltrados = useMemo(() => {
    if (!query) return servicios;
    return servicios.filter((s) => normalizar(s.nombre).includes(query));
  }, [servicios, query]);

  const contactosFiltrados = useMemo(() => {
    if (!query) return contactos;
    return contactos.filter((c) => {
      const nombreCompleto = normalizar(`${c.nombre} ${c.apellido}`);
      const apartamento = normalizar(c.apartamento ?? "");
      return nombreCompleto.includes(query) || apartamento.includes(query);
    });
  }, [contactos, query]);

  // Orden alfabético por nombre, agrupado por inicial (estilo agenda de teléfono)
  const grupos = useMemo(() => {
    const ordenados = [...contactosFiltrados].sort((a, b) =>
      normalizar(a.nombre).localeCompare(normalizar(b.nombre)) ||
      normalizar(a.apellido).localeCompare(normalizar(b.apellido))
    );

    const mapa: { letra: string; items: Contacto[] }[] = [];
    ordenados.forEach((contacto) => {
      const letra = contacto.nombre.trim().charAt(0).toUpperCase() || "#";
      const grupoExistente = mapa.find((g) => g.letra === letra);
      if (grupoExistente) {
        grupoExistente.items.push(contacto);
      } else {
        mapa.push({ letra, items: [contacto] });
      }
    });

    return mapa;
  }, [contactosFiltrados]);

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

        <h1 className="text-2xl font-bold sm:text-3xl">Contactos</h1>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Plus size={18} />
          Nuevo contacto
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
            placeholder="Buscar por nombre o apartamento…"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />
        </div>
      </div>

      {cargando ? (
        <p className="text-gray-400">Cargando contactos…</p>
      ) : (
        <div className="flex w-full max-w-2xl flex-col gap-6">
          {personalFiltrado.length === 0 && serviciosFiltrados.length === 0 && grupos.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center text-gray-500">
              <UserRound size={28} />
              <p className="text-sm">
                {contactos.length === 0 && usuarios.length === 0
                  ? "Todavía no hay contactos cargados."
                  : "No se encontraron contactos con esa búsqueda."}
              </p>
            </div>
          )}

          {personalFiltrado.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">Personal de Torre Antares</span>
              </div>
              <div className="flex flex-col gap-2">
                {personalFiltrado.map((item) => (
                  <ItemFijoCard
                    key={`personal-${item.nombre}-${item.telefono}`}
                    item={item}
                    color="emerald"
                    onClick={() => setSeleccionado(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {(serviciosFiltrados.length > 0 || !query) && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">Servicios de Reclamos o Terceros</span>
                </div>
                <button
                  onClick={() => setModalServicioAbierto(true)}
                  className="flex items-center gap-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                >
                  <Plus size={13} />
                  Agregar
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {serviciosFiltrados.map((item) => (
                  <ItemFijoCard
                    key={item.id}
                    item={item}
                    color="amber"
                    onClick={() => setSeleccionado(item)}
                    onEditar={() => setServicioEditando(item)}
                    onEliminar={() => handleEliminarServicio(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {grupos.map((grupo) => (
            <div key={grupo.letra} className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-blue-400">{grupo.letra}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="flex flex-col gap-2">
                {grupo.items.map((contacto) => (
                  <ContactoCard
                    key={contacto.id}
                    contacto={contacto}
                    onClick={() =>
                      setSeleccionado({
                        nombre: `${contacto.nombre} ${contacto.apellido}`,
                        subtitulo: contacto.apartamento ? `Depto ${contacto.apartamento}` : undefined,
                        telefono: contacto.telefono,
                        email: contacto.email,
                      })
                    }
                    onEditar={() => setContactoEditando(contacto)}
                    onEliminar={() => handleEliminarContacto(contacto)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateContactoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        usuario={usuario}
        onCrear={handleContactoCreado}
      />

      <CreateContactoModal
        isOpen={!!contactoEditando}
        onClose={() => setContactoEditando(null)}
        usuario={usuario}
        onCrear={handleContactoEditado}
        contactoInicial={contactoEditando}
      />

      {modalServicioAbierto && (
        <ServicioModal onClose={() => setModalServicioAbierto(false)} onGuardar={handleCrearServicio} />
      )}

      {servicioEditando && (
        <ServicioModal
          servicioInicial={servicioEditando}
          onClose={() => setServicioEditando(null)}
          onGuardar={handleEditarServicio}
        />
      )}

      <ContactoDetalleModal contacto={seleccionado} onClose={() => setSeleccionado(null)} />
    </main>
  );
}