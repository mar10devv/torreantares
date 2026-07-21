import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Plus, Search, Phone, Mail, MapPin, UserRound, Building2, Wrench } from "lucide-react";
import CreateContactoModal from "./CreateContactoModal";
import ContactoDetalleModal, { type ContactoDetalle } from "./ContactoDetalleModal";

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

const STORAGE_KEY = "torreantares_contactos";

/**
 * Números fijos de servicios / reclamos / terceros (cardiomóvil, ascensores,
 * taxis, piscina, etc.). Se muestran anclados debajo de "Personal de Torre
 * Antares" y arriba de la agenda normal de contactos.
 *
 * PENDIENTE: cargar acá los números reales (todavía no fueron enviados).
 * Formato: { nombre: "Cardiomóvil", subtitulo: "Emergencias médicas", telefono: "..." }
 */
interface ServicioTercero {
  nombre: string;
  subtitulo?: string;
  telefono: string;
}

const SERVICIOS_TERCEROS: ServicioTercero[] = [
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

function generarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // saca acentos para que la búsqueda no dependa de tildes
}

function ContactoCard({ contacto, onClick }: { contacto: Contacto; onClick: () => void }) {
  const inicial = contacto.nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06] active:scale-[0.99]"
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
  );
}

// Tarjeta genérica para las secciones ancladas (Personal / Servicios),
// que no tienen la misma forma que un Contacto normal.
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
}: {
  item: ItemFijo;
  color: "emerald" | "amber";
  onClick: () => void;
}) {
  const inicial = item.nombre.trim().charAt(0).toUpperCase() || "?";
  const colorClases =
    color === "emerald" ? "bg-emerald-600/20 text-emerald-300" : "bg-amber-500/20 text-amber-300";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06] active:scale-[0.99]"
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
  );
}

export default function Contactos({ usuario, usuarios, onVolver, onListo }: ContactosProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<ContactoDetalle | null>(null);

  const [contactos, setContactos] = useState<Contacto[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contactos));
  }, [contactos]);

  useEffect(() => {
    // Igual que en Notas/Parrilleros/Ingresos/Cocheras: por ahora se lee de
    // localStorage (sincrónico), así que avisamos que ya está listo al montar.
    //
    // Cuando esto pase a consultar una base de datos real, mové este onListo()
    // al finally() de ese fetch en lugar de llamarlo acá.
    onListo?.();
  }, []);

  const handleContactoCreado = (datos: NuevoContactoData) => {
    const nuevoContacto: Contacto = {
      ...datos,
      id: generarId(),
      autor: usuario.nombre,
      fechaCreacion: new Date().toISOString(),
    };
    setContactos((prev) => [...prev, nuevoContacto]);
    setIsModalOpen(false);
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
    if (!query) return SERVICIOS_TERCEROS;
    return SERVICIOS_TERCEROS.filter((s) => normalizar(s.nombre).includes(query));
  }, [query]);

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

        {serviciosFiltrados.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-amber-400" />
              <span className="text-sm font-bold text-amber-400">Servicios de Reclamos o Terceros</span>
            </div>
            <div className="flex flex-col gap-2">
              {serviciosFiltrados.map((item) => (
                <ItemFijoCard
                  key={`servicio-${item.nombre}`}
                  item={item}
                  color="amber"
                  onClick={() => setSeleccionado(item)}
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
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <CreateContactoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        usuario={usuario}
        onCrear={handleContactoCreado}
      />

      <ContactoDetalleModal contacto={seleccionado} onClose={() => setSeleccionado(null)} />
    </main>
  );
}