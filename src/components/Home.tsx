import { useState, useEffect, useRef, lazy, Suspense } from "react";
import AddUserCard from "./AddUserCard";
import CreateUserModal from "./CreateUserModal";
import UserCard from "./UserCard";
import IngresarPinModal from "./IngresarPinModal";
import ConfirmarBorradoUsuarioModal from "./ConfirmarBorradoUsuarioModal";
import Loader from "./Loader";
import logo from "../assets/logo.png";
import { obtenerUsuariosDeDB } from "../lib/firebase";

// Dashboard se carga siempre (es la primera pantalla tras el login),
// así que lo dejamos como import normal. El resto de las vistas se
// cargan de forma perezosa: el navegador recién parsea/compila ese
// código cuando el usuario realmente navega ahí. En hardware limitado
// (CPU vieja, o simplemente para no tirar de más JS de una), esto baja
// mucho el trabajo que hay que hacer en el primer render.
import Dashboard from "./Dashboard";
const Notas = lazy(() => import("./Notas"));
const Parrilleros = lazy(() => import("./Parrilleros"));
const Ingresos = lazy(() => import("./Ingresos"));
const Cocheras = lazy(() => import("./Cocheras"));
const Ute = lazy(() => import("./Ute"));
const Administracion = lazy(() => import("./Administracion"));
const Contactos = lazy(() => import("./Contactos"));
const PropietariosInquilinos = lazy(() => import("./PropietariosInquilinos"));
const ControlTag = lazy(() => import("./ControlTag"));

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

type Vista =
  | "dashboard"
  | "notas"
  | "parrilleros"
  | "ingresos"
  | "cocheras"
  | "ute"
  | "administracion"
  | "contactos"
  | "residentes" // Propietarios/Inquilinos — acá se van sumando el resto
  | "controlTag"; // Controles/Tag

const SESION_KEY = "torreantares_sesion";

// Mapeo entre cada vista y su ruta en la URL, para que el navegador
// muestre algo como /notas, /parrilleros, etc. en vez de quedarse
// siempre en "/". No usamos un router real (Astro sirve una sola
// página con client:load): esto solo sincroniza la barra de direcciones
// con el estado interno, usando el History API directamente.
const VISTA_A_PATH: Record<Vista, string> = {
  dashboard: "/dashboard",
  notas: "/notas",
  parrilleros: "/parrilleros",
  ingresos: "/ingresos",
  cocheras: "/cocheras",
  ute: "/ute",
  administracion: "/administracion",
  contactos: "/contactos",
  residentes: "/propietarios-inquilinos",
  controlTag: "/controles-tag",
};

const PATH_A_VISTA: Partial<Record<string, Vista>> = Object.fromEntries(
  Object.entries(VISTA_A_PATH).map(([vista, path]) => [path, vista as Vista])
);

// tiempo mínimo (ms) que el loader se mantiene visible, para que la
// animación llegue a verse aunque la carga real sea instantánea.
const LOADER_MIN_MS = 700;

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [usuarioIntentandoLogin, setUsuarioIntentandoLogin] = useState<Usuario | null>(null);

  // Índice del usuario que se está por borrar, mientras se espera la
  // confirmación de contraseña en ConfirmarBorradoUsuarioModal. null =
  // no hay ningún borrado pendiente. El borrado real (handleDeleteUser)
  // solo se ejecuta si la contraseña ingresada es correcta.
  const [usuarioABorrarIndex, setUsuarioABorrarIndex] = useState<number | null>(null);

  // Se restaura al cargar la página: el usuario desde sessionStorage
  // (sobrevive a un F5, se borra si cerrás la pestaña/navegador), y la
  // vista inicial directo desde la URL actual — así un refresh en
  // /parrilleros te mantiene ahí en vez de mandarte al login.
  const [usuarioActivo, setUsuarioActivo] = useState<Usuario | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const guardado = sessionStorage.getItem(SESION_KEY);
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const [vista, setVista] = useState<Vista>(() => {
    if (typeof window === "undefined") return "dashboard";
    return PATH_A_VISTA[window.location.pathname] ?? "dashboard";
  });

  // --- estado del loader, controlado acá y pasado por props ---
  const [cargando, setCargando] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState("Cargando…");
  const loaderInicioRef = useRef<number | null>(null);
  const loaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Los usuarios ahora viven en Firestore, no en localStorage.
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [errorUsuarios, setErrorUsuarios] = useState("");

  // Trae la lista de usuarios desde Firestore. Se usa tanto al montar
  // el componente como después de crear un usuario nuevo.
  const cargarUsuarios = async () => {
    try {
      setErrorUsuarios("");
      const datos = await obtenerUsuariosDeDB();
      setUsuarios(datos as unknown as Usuario[]);
    } catch (err) {
      console.error("Error al cargar usuarios desde Firestore:", err);
      setErrorUsuarios("No se pudieron cargar los usuarios. Revisá tu conexión.");
    } finally {
      setCargandoUsuarios(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Si de verdad no hay sesión (no había nada en sessionStorage) y la URL
  // apunta a un módulo protegido, no hay forma de mostrar esa pantalla —
  // volvemos a "/" para que la URL quede prolija.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!usuarioActivo && window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // Mantiene sessionStorage sincronizado con la sesión actual: se guarda
  // al iniciar sesión, se borra al cerrarla (handleVolver).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (usuarioActivo) {
      sessionStorage.setItem(SESION_KEY, JSON.stringify(usuarioActivo));
    } else {
      sessionStorage.removeItem(SESION_KEY);
    }
  }, [usuarioActivo]);

  // Cada vez que cambia la vista (o se inicia/cierra sesión), reflejamos
  // la ruta correspondiente en la barra de direcciones.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = usuarioActivo ? VISTA_A_PATH[vista] : "/";
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, [vista, usuarioActivo]);

  // Soporte para los botones atrás/adelante del navegador.
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const vistaDestino = PATH_A_VISTA[path];

      if (!vistaDestino) {
        // "/" o cualquier ruta desconocida: volvemos a la selección de usuario.
        setUsuarioActivo(null);
        setVista("dashboard");
        return;
      }

      setVista(vistaDestino);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // El usuario ya fue guardado en Firestore por CreateUserModal.
  // Acá simplemente recargamos la lista para traer el id generado
  // por Firebase y mantener todo sincronizado con la base.
  const handleUserCreated = () => {
    cargarUsuarios();
  };

  const handleUserUpdated = (usuarioActualizado: Usuario) => {
    if (editingIndex === null) return;
    setUsuarios((prev) =>
      prev.map((u, i) => (i === editingIndex ? usuarioActualizado : u))
    );
    setEditingIndex(null);
  };

  // Borrado real del usuario. Solo se llama después de confirmar la
  // contraseña en ConfirmarBorradoUsuarioModal (ver handleSolicitarBorrado
  // y handleConfirmarBorrado más abajo) — nunca directo desde la UserCard.
  const handleDeleteUser = (index: number) => {
    setUsuarios((prev) => prev.filter((_, i) => i !== index));
  };

  // Se llama al tocar "Borrar" en una UserCard: en vez de borrar directo,
  // guarda qué usuario se quiere borrar y abre el modal que pide la
  // contraseña. El borrado efectivo (handleDeleteUser) recién ocurre si
  // la contraseña ingresada es correcta (ver handleConfirmarBorrado).
  const handleSolicitarBorrado = (index: number) => {
    setUsuarioABorrarIndex(index);
  };

  const handleConfirmarBorrado = () => {
    if (usuarioABorrarIndex === null) return;
    handleDeleteUser(usuarioABorrarIndex);
    setUsuarioABorrarIndex(null);
  };

  const handleEditUser = (index: number) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingIndex(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  // arranca el loader y marca el momento en que se mostró, para
  // poder respetar el tiempo mínimo de reproducción en handleListo
  const iniciarCarga = (mensaje: string) => {
    if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
    setMensajeCarga(mensaje);
    loaderInicioRef.current = Date.now();
    setCargando(true);
  };

  const handleLogin = (usuario: Usuario) => {
    // A diferencia de navegar a otro módulo, el Dashboard no tiene fetch
    // propio — se monta al instante y llama a onListo() de una. Mostrar
    // el loader acá solo agregaba una espera artificial de 700ms
    // (LOADER_MIN_MS) sin necesidad real, así que entramos directo.
    setUsuarioActivo(usuario);
    setVista("dashboard");
  };

  // Se llama al tocar una UserCard: en vez de entrar directo, primero
  // pide el PIN. Solo si coincide (ver IngresarPinModal) se llama a handleLogin.
  const handleIntentarLogin = (usuario: Usuario) => {
    setUsuarioIntentandoLogin(usuario);
  };

  const handlePinCoincide = (usuario: Usuario) => {
    setUsuarioIntentandoLogin(null);
    handleLogin(usuario);
  };

  const handleVolver = () => {
    setUsuarioActivo(null);
  };

  const handleNavigate = (modulo: string) => {
    if (modulo === "Notas") {
      iniciarCarga("Cargando notas…");
      setVista("notas");
    } else if (modulo === "Parrilleros") {
      iniciarCarga("Cargando parrilleros…");
      setVista("parrilleros");
    } else if (modulo === "Ingresos") {
      iniciarCarga("Cargando ingresos…");
      setVista("ingresos");
    } else if (modulo === "Propietarios/Inquilinos") {
      iniciarCarga("Cargando propietarios/inquilinos…");
      setVista("residentes");
    } else if (modulo === "Cocheras") {
      iniciarCarga("Cargando cocheras…");
      setVista("cocheras");
    } else if (modulo === "UTE") {
      iniciarCarga("Cargando UTE…");
      setVista("ute");
    } else if (modulo === "Administración") {
      iniciarCarga("Cargando administración…");
      setVista("administracion");
    } else if (modulo === "Contactos") {
      iniciarCarga("Cargando contactos…");
      setVista("contactos");
    } else if (modulo === "Controles/Tag") {
      iniciarCarga("Cargando controles/tags…");
      setVista("controlTag");
    } else {
      // 🔽 Acá luego sumamos el resto
      console.log(`Módulo "${modulo}" todavía no implementado`);
    }
  };

  const handleVolverAlDashboard = () => {
    setVista("dashboard");
  };

  // cada pantalla llama a esto cuando ya terminó de cargar sus datos.
  // Si todavía no pasó el tiempo mínimo de reproducción, esperamos
  // lo que falte antes de ocultar el loader.
  const handleListo = () => {
    const inicio = loaderInicioRef.current ?? Date.now();
    const transcurrido = Date.now() - inicio;
    const faltante = Math.max(0, LOADER_MIN_MS - transcurrido);

    if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);

    if (faltante === 0) {
      setCargando(false);
    } else {
      loaderTimeoutRef.current = setTimeout(() => setCargando(false), faltante);
    }
  };

  return (
    <>
      {/* Se monta una sola vez acá, a nivel raíz de la isla de React */}
      <Loader visible={cargando} mensaje={mensajeCarga} />

      {/* Mismo Loader, reutilizado para la carga inicial de usuarios desde
          Firestore. Antes esto era un <p>Cargando usuarios…</p> suelto en
          el medio de la pantalla — ahora usa el loader real de la app,
          centrado, con su animación ya probada. */}
      <Loader visible={cargandoUsuarios} mensaje="Cargando base de datos…" />

      {usuarioActivo ? (
        // Suspense cubre el momento en que un módulo lazy todavía se está
        // descargando/compilando. El propio Loader ya cubre visualmente
        // ese lapso porque iniciarCarga() se llama antes de cambiar de
        // vista, así que acá el fallback casi nunca llega a verse.
        <Suspense fallback={null}>
          {vista === "notas" ? (
            <Notas usuario={usuarioActivo} onVolver={handleVolverAlDashboard} onListo={handleListo} />
          ) : vista === "parrilleros" ? (
            <Parrilleros usuario={usuarioActivo} onVolver={handleVolverAlDashboard} onListo={handleListo} />
          ) : vista === "ingresos" ? (
            <Ingresos usuario={usuarioActivo} onVolver={handleVolverAlDashboard} onListo={handleListo} />
          ) : vista === "residentes" ? (
            <PropietariosInquilinos usuario={usuarioActivo} onVolver={handleVolverAlDashboard} onListo={handleListo} />
          ) : vista === "cocheras" ? (
            <Cocheras usuario={usuarioActivo} onVolver={handleVolverAlDashboard} onListo={handleListo} />
          ) : vista === "ute" ? (
            <Ute usuario={usuarioActivo} onVolver={handleVolverAlDashboard} onListo={handleListo} />
          ) : vista === "administracion" ? (
            <Administracion usuario={usuarioActivo} onVolver={handleVolverAlDashboard} onListo={handleListo} />
          ) : vista === "contactos" ? (
            <Contactos usuario={usuarioActivo} usuarios={usuarios} onVolver={handleVolverAlDashboard} onListo={handleListo} />
          ) : vista === "controlTag" ? (
            <ControlTag usuario={usuarioActivo} onVolver={handleVolverAlDashboard} onListo={handleListo} />
          ) : (
            <Dashboard
              usuario={usuarioActivo}
              onVolver={handleVolver}
              onNavigate={handleNavigate}
              onListo={handleListo}
            />
          )}
        </Suspense>
      ) : (
        <>
          <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#0d1117] text-white">
            {/*
              Antes había acá dos capas: el logo con doble drop-shadow
              encadenado, más una capa extra con backdrop-blur-sm a
              pantalla completa encima. Esa combinación es carísima en
              GPUs con soporte de compositing limitado (típico en
              Windows 7, sin drivers actualizados): Chrome puede caer a
              rasterizar esa capa por software, lo que se siente como
              lag general aunque la CPU esté sobrada.

              La dejamos en una sola capa: un único drop-shadow (más
              barato que dos encadenados) y sin backdrop-blur — en su
              lugar, un fondo semitransparente simple que da un efecto
              visual muy similar sin pedirle nada al compositor.
            */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-45"
              style={{
                backgroundImage: `url(${logo.src})`,
                backgroundSize: "42%",
                filter: "drop-shadow(0 0 70px rgba(255,255,255,0.3))",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[#0d1117]/60"
            />

            <div className="relative z-10 flex w-full flex-1 flex-col items-center">
              <h1 className="mt-20 mb-20 text-6xl font-bold">
                Torre Antares
              </h1>

              <div className="flex flex-1 items-center justify-center w-full">
                {cargandoUsuarios ? (
                  // El Loader de arriba (visible=cargandoUsuarios) ya cubre
                  // toda la pantalla mientras esto carga, así que acá no
                  // hace falta renderizar nada — evitamos que quede un
                  // hueco vacío debajo del loader.
                  null
                ) : errorUsuarios ? (
                  <p className="text-red-400">{errorUsuarios}</p>
                ) : (
                  <div className="flex flex-wrap justify-center gap-8">

                    {usuarios.map((usuario, index) => (
                      <UserCard
                        key={index}
                        usuario={usuario}
                        onEdit={() => handleEditUser(index)}
                        onDelete={() => handleSolicitarBorrado(index)}
                        onLogin={() => handleIntentarLogin(usuario)}
                      />
                    ))}

                    <AddUserCard onClick={handleOpenCreateModal} />

                  </div>
                )}
              </div>
            </div>
          </main>

          <CreateUserModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onUserCreated={handleUserCreated}
            onUserUpdated={handleUserUpdated}
            usuarioEditando={editingIndex !== null ? usuarios[editingIndex] : null}
          />

          <IngresarPinModal
            usuario={usuarioIntentandoLogin}
            onClose={() => setUsuarioIntentandoLogin(null)}
            onCoincide={handlePinCoincide}
          />
        </>
      )}

      <ConfirmarBorradoUsuarioModal
        usuario={usuarioABorrarIndex !== null ? usuarios[usuarioABorrarIndex] : null}
        onClose={() => setUsuarioABorrarIndex(null)}
        onConfirmar={handleConfirmarBorrado}
      />
    </>
  );
}