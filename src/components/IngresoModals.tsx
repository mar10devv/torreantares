import { useState } from "react";
import { X, Check, Zap, CarFront, TriangleAlert } from "lucide-react";
import type { Ingreso, Ocupacion, NuevoIngresoData } from "./Ingresos";
import { PRECIO_UTE, buscarConflictoDeFechas } from "./Ingresos";
import { buscarCochera, UBICACION_LABEL, MENSAJE_SIN_COCHERA, MarcaInput, MARCAS_AUTO } from "./Cocheras";
import type { Cochera } from "./Cocheras";
import {
  buscarContadorUte,
  calcularTorrePorRecibo,
  MENSAJE_SIN_CONTADOR,
  MENSAJE_TORRE_NO_DETERMINADA,
} from "./Ute";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatearImporte(valor: number) {
  return valor.toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  });
}

function formatearFechaCorta(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const d = new Date(anio, mes - 1, dia);
  return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500";
const labelClass = "mb-1 block text-xs font-medium text-gray-400";

// Aviso reutilizable: muestra qué cochera corresponde a un depto, o el mensaje
// de "no tiene cochera" si no está en la lista.
function AvisoCochera({ apartamento }: { apartamento: string }) {
  const cochera: Cochera | undefined = buscarCochera(apartamento);

  if (cochera) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-emerald-300">
        <CarFront size={14} className="mt-0.5 shrink-0" />
        <span>
          Debe usar la cochera <span className="font-semibold">{cochera.numeroCochera}</span> ·{" "}
          {UBICACION_LABEL[cochera.ubicacion]}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-amber-300">
      <TriangleAlert size={14} className="mt-0.5 shrink-0" />
      <span className="font-medium">{MENSAJE_SIN_COCHERA}</span>
    </div>
  );
}

// Aviso reutilizable: muestra en qué torre y con qué número está el contador
// de UTE de un depto, usando los mismos datos que la pantalla de UTE.
function AvisoUte({ apartamento }: { apartamento: string }) {
  const registro = buscarContadorUte(apartamento);

  if (!registro) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-300">
        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
        <span>No hay datos de UTE cargados para este apartamento. Confirmar con administración.</span>
      </div>
    );
  }

  if (!registro.recibo) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-300">
        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
        <span>{MENSAJE_SIN_CONTADOR}</span>
      </div>
    );
  }

  const torre = calcularTorrePorRecibo(registro.recibo);

  if (!torre) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-300">
        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
        <span>
          Contador {registro.recibo}: {MENSAJE_TORRE_NO_DETERMINADA}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-300">
      <Zap size={14} className="mt-0.5 shrink-0" />
      <span>
        Contador en torre <span className="font-semibold">{torre}</span> · número{" "}
        <span className="font-semibold">{registro.recibo}</span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Aviso informativo: el depto está ocupado en esas fechas       */
/* (no bloquea, solo avisa al salir del campo "Apartamento";     */
// Mensaje inline (no modal) que se actualiza en vivo mientras se escribe el
// depto o se cambia la fecha de ingreso. Rojo si hay conflicto de fechas con
// un ingreso activo de ese depto, verde si está disponible.
function EstadoDeptoAviso({ conflicto }: { conflicto: Ingreso | undefined }) {
  if (conflicto) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.08] px-3 py-2.5 text-xs leading-relaxed text-red-300">
        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
        <span>
          Este depto está ocupado por <span className="font-semibold">{conflicto.nombre}</span>. Se libera el{" "}
          <span className="font-semibold">{formatearFechaCorta(conflicto.fechaSalida)}</span>.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-emerald-300">
      <Check size={14} className="mt-0.5 shrink-0" />
      <span>Depto disponible para esta fecha de ingreso.</span>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Nuevo ingreso                                                */
/* ---------------------------------------------------------- */

interface NewIngresoModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: Usuario;
  ingresos: Ingreso[];
  onCrear: (datos: NuevoIngresoData) => Promise<boolean>;
}

const ESTADO_INICIAL = {
  fechaIngreso: hoyISO(),
  fechaSalida: "",
  nombre: "",
  documento: "",
  domicilio: "",
  codigoPostal: "",
  email: "",
  telefono: "",
  ciudad: "",
  apartamento: "",
  lecturaUteEntrada: "",
  ocupacion: "inquilino" as Ocupacion,
  auto: "",
  matricula: "",
};

export function NewIngresoModal({ isOpen, onClose, usuario, ingresos, onCrear }: NewIngresoModalProps) {
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [tomaConsumoUte, setTomaConsumoUte] = useState(false);
  const [tieneAuto, setTieneAuto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (!isOpen) return null;

  // Se recalcula en cada render, en vivo, mientras cambian depto o fecha de
  // ingreso — no hace falta esperar a salir del campo ni a confirmar.
  const conflicto =
    form.apartamento.trim() !== "" && form.fechaIngreso
      ? buscarConflictoDeFechas(ingresos, form.apartamento.trim(), form.fechaIngreso)
      : undefined;

  const set = (campo: keyof typeof ESTADO_INICIAL, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  // Estilo de un campo obligatorio: se pone verde apenas se completa, para
  // dar feedback visual de qué falta y qué ya está listo.
  const campoClass = (valor: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500 ${
      valor.trim() !== "" ? "border-emerald-500/40 bg-emerald-500/[0.05]" : "border-white/10 bg-white/5"
    }`;

  // Todos los campos son obligatorios EXCEPTO auto/matrícula (no todos los
  // inquilinos tienen auto) y la lectura de UTE (se puede cargar después).
  const formCompleto =
    form.fechaIngreso.trim() !== "" &&
    form.fechaSalida.trim() !== "" &&
    form.nombre.trim() !== "" &&
    form.documento.trim() !== "" &&
    form.codigoPostal.trim() !== "" &&
    form.domicilio.trim() !== "" &&
    form.ciudad.trim() !== "" &&
    form.email.trim() !== "" &&
    form.telefono.trim() !== "" &&
    form.apartamento.trim() !== "";

  // Si el depto tiene un ingreso activo (sin finalizar ni cancelar), su
  // fecha de salida es el primer día disponible para un ingreso nuevo. Se
  // usa como "min" del calendario nativo, así el recepcionista no puede
  // ni seleccionar un día anterior por error.
  const ingresoActivoDelDepto = form.apartamento.trim()
    ? ingresos.find(
        (i) => i.apartamento === form.apartamento.trim() && !i.finalizado && !i.cancelado
      )
    : undefined;
  const minFechaIngreso = ingresoActivoDelDepto?.fechaSalida;

  const handleClose = () => {
    if (enviando) return;
    setForm(ESTADO_INICIAL);
    setTomaConsumoUte(false);
    setTieneAuto(false);
    onClose();
  };

  const handleSubmit = async () => {
    const faltantes: string[] = [];
    if (!form.nombre.trim()) faltantes.push("Nombre y apellido");
    if (!form.documento.trim()) faltantes.push("Documento de identidad");
    if (!form.domicilio.trim()) faltantes.push("Domicilio");
    if (!form.codigoPostal.trim()) faltantes.push("Código postal");
    if (!form.ciudad.trim()) faltantes.push("Ciudad");
    if (!form.email.trim()) faltantes.push("Email");
    if (!form.telefono.trim()) faltantes.push("Teléfono");
    if (!form.apartamento.trim()) faltantes.push("Apartamento");
    if (!form.fechaIngreso) faltantes.push("Fecha de ingreso");
    if (!form.fechaSalida) faltantes.push("Fecha de salida");
    // Auto/matrícula quedan siempre opcionales (no todos tienen auto), y la
    // lectura de UTE ya NO es obligatoria: si se marcó el check pero no se
    // cargó, se guarda igual y se pide después (modal de "falta la lectura").

    if (faltantes.length > 0) {
      window.alert(`Faltan completar los siguientes datos obligatorios:\n\n${faltantes.join("\n")}`);
      return;
    }

    const tieneLecturaValida = form.lecturaUteEntrada !== "" && !isNaN(Number(form.lecturaUteEntrada));

    const datos: NuevoIngresoData = {
      fechaIngreso: form.fechaIngreso,
      fechaSalida: form.fechaSalida,
      nombre: form.nombre.trim(),
      documento: form.documento.trim(),
      domicilio: form.domicilio.trim(),
      codigoPostal: form.codigoPostal.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      ciudad: form.ciudad.trim(),
      apartamento: form.apartamento.trim(),
      tomaConsumoUte,
      lecturaUteEntrada: tomaConsumoUte && tieneLecturaValida ? Number(form.lecturaUteEntrada) : undefined,
      ocupacion: form.ocupacion,
      auto: tieneAuto ? form.auto.trim() || undefined : undefined,
      matricula: tieneAuto ? form.matricula.trim() || undefined : undefined,
    };

    // El padre (Ingresos.tsx) decide si se puede crear (conflicto de fechas,
    // errores de Firestore, etc.) y devuelve si salió bien o no. Si falla,
    // el padre ya se encarga de mostrar el motivo en su propio modal — acá
    // solo evitamos perder lo que la persona ya completó.
    setEnviando(true);
    const exito = await onCrear(datos);
    setEnviando(false);

    if (exito) {
      setForm(ESTADO_INICIAL);
      setTomaConsumoUte(false);
      setTieneAuto(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-xl font-bold text-white">Nuevo ingreso</h2>
          <button onClick={handleClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Apartamento y ocupación: primero de todo, para que el aviso de
              disponibilidad se vea apenas se escribe el depto. */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Apartamento</label>
              <input
                type="text"
                autoFocus
                value={form.apartamento}
                onChange={(e) => set("apartamento", e.target.value)}
                placeholder="N.º de depto"
                className={
                  form.apartamento.trim() !== ""
                    ? conflicto
                      ? "w-full rounded-lg border border-red-500/50 bg-red-500/[0.05] px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-red-500"
                      : "w-full rounded-lg border border-emerald-500/40 bg-emerald-500/[0.05] px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
                    : "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
                }
              />
            </div>
            <div>
              <label className={labelClass}>Ocupación</label>
              <select
                value={form.ocupacion}
                onChange={(e) => set("ocupacion", e.target.value)}
                className={inputClass}
              >
                <option value="inquilino" className="bg-white text-black">Inquilino</option>
                <option value="invitado" className="bg-white text-black">Invitado</option>
                <option value="propietario" className="bg-white text-black">Propietario</option>
              </select>
            </div>
          </div>

          {form.apartamento.trim() !== "" && <EstadoDeptoAviso conflicto={conflicto} />}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha de ingreso</label>
              <input
                type="date"
                value={form.fechaIngreso}
                min={minFechaIngreso}
                onChange={(e) => set("fechaIngreso", e.target.value)}
                className={campoClass(form.fechaIngreso)}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de salida</label>
              <input
                type="date"
                value={form.fechaSalida}
                onChange={(e) => set("fechaSalida", e.target.value)}
                className={campoClass(form.fechaSalida)}
              />
            </div>
          </div>

          {/* Datos del inquilino */}
          <div>
            <label className={labelClass}>Nombre y apellido</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Nombre completo"
              className={campoClass(form.nombre)}
            />
          </div>

          <div>
            <label className={labelClass}>Documento de identidad</label>
            <input
              type="text"
              value={form.documento}
              onChange={(e) => set("documento", e.target.value)}
              placeholder="CI / Pasaporte"
              className={campoClass(form.documento)}
            />
          </div>

          <div>
            <label className={labelClass}>Domicilio</label>
            <input
              type="text"
              value={form.domicilio}
              onChange={(e) => set("domicilio", e.target.value)}
              placeholder="Calle y número"
              className={campoClass(form.domicilio)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Código postal</label>
              <input
                type="text"
                value={form.codigoPostal}
                onChange={(e) => set("codigoPostal", e.target.value)}
                className={campoClass(form.codigoPostal)}
              />
            </div>
            <div>
              <label className={labelClass}>Ciudad</label>
              <input
                type="text"
                value={form.ciudad}
                onChange={(e) => set("ciudad", e.target.value)}
                className={campoClass(form.ciudad)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={campoClass(form.email)}
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                className={campoClass(form.telefono)}
              />
            </div>
          </div>

          {/* UTE: ahora es opcional, controlado por checkbox */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={tomaConsumoUte}
                onChange={(e) => setTomaConsumoUte(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 accent-blue-600"
              />
              Tomar consumo de UTE (se cobrará la luz al finalizar la estadía)
            </label>

            {tomaConsumoUte && (
              <div className="mt-3 flex flex-col gap-1">
                <div>
                  <label className={labelClass}>
                    Lectura de UTE (entrada) <span className="text-gray-500">· opcional, se puede cargar después</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-gray-500" />
                    <input
                      type="number"
                      value={form.lecturaUteEntrada}
                      onChange={(e) => set("lecturaUteEntrada", e.target.value)}
                      placeholder="Ej: 1820"
                      className={inputClass}
                    />
                  </div>
                </div>

                {form.apartamento.trim() !== "" && <AvisoUte apartamento={form.apartamento} />}
              </div>
            )}
          </div>

          {/* Auto: detrás de un toggle, así el aviso de cochera solo aparece
              si el inquilino realmente tiene auto (no todos tienen). */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={tieneAuto}
                onChange={(e) => setTieneAuto(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 accent-blue-600"
              />
              Tiene auto
            </label>

            {tieneAuto && (
              <div className="mt-3 flex flex-col gap-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Auto (opcional)</label>
                    <MarcaInput value={form.auto} onChange={(v) => set("auto", v)} marcas={MARCAS_AUTO} />
                  </div>
                  <div>
                    <label className={labelClass}>Matrícula (opcional)</label>
                    <input
                      type="text"
                      value={form.matricula}
                      onChange={(e) => set("matricula", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {form.apartamento.trim() !== "" && <AvisoCochera apartamento={form.apartamento} />}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Firma del funcionario: <span className="text-gray-300">{usuario.nombre}</span> · se registra al confirmar
          </p>

          <div className="mt-2 flex gap-2">
            <button
              onClick={handleClose}
              disabled={enviando}
              className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formCompleto || enviando}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500 disabled:hover:bg-white/10"
            >
              <Check size={16} />
              {enviando ? "Guardando…" : "Confirmar ingreso"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Finalizar estadía                                            */
/* ---------------------------------------------------------- */

interface FinalizarIngresoModalProps {
  ingreso: Ingreso | null;
  onClose: () => void;
  onFinalizar: (id: string, lecturaUteSalida?: number, lecturaUteEntradaSiFaltaba?: number) => void;
  onCancelar: (id: string, motivo: string) => void;
}

export function FinalizarIngresoModal({ ingreso, onClose, onFinalizar, onCancelar }: FinalizarIngresoModalProps) {
  const [modo, setModo] = useState<"finalizar" | "cancelar">("finalizar");
  const [lecturaSalida, setLecturaSalida] = useState("");
  const [lecturaEntradaFaltante, setLecturaEntradaFaltante] = useState("");
  const [motivo, setMotivo] = useState("");

  if (!ingreso) return null;

  const necesitaEntrada = ingreso.tomaConsumoUte && ingreso.lecturaUteEntrada === undefined;
  const entradaEfectiva = necesitaEntrada
    ? Number(lecturaEntradaFaltante)
    : ingreso.lecturaUteEntrada ?? 0;

  const entradaValida = !necesitaEntrada || (lecturaEntradaFaltante !== "" && !isNaN(Number(lecturaEntradaFaltante)));
  const salidaNum = Number(lecturaSalida);
  const salidaValida = lecturaSalida !== "" && !isNaN(salidaNum) && salidaNum >= entradaEfectiva;

  const esValida = !ingreso.tomaConsumoUte || (entradaValida && salidaValida);
  const consumo = ingreso.tomaConsumoUte && esValida ? salidaNum - entradaEfectiva : null;
  const importe = consumo !== null ? consumo * PRECIO_UTE : null;

  const resetYCerrar = () => {
    setLecturaSalida("");
    setLecturaEntradaFaltante("");
    setMotivo("");
    setModo("finalizar");
    onClose();
  };

  const handleConfirmar = () => {
    if (ingreso.tomaConsumoUte && !esValida) {
      window.alert("Completá la lectura de UTE correctamente (la salida debe ser mayor o igual a la entrada).");
      return;
    }
    if (ingreso.tomaConsumoUte) {
      onFinalizar(ingreso.id, salidaNum, necesitaEntrada ? Number(lecturaEntradaFaltante) : undefined);
    } else {
      onFinalizar(ingreso.id);
    }
    resetYCerrar();
  };

  const handleConfirmarCancelacion = () => {
    if (!motivo.trim()) {
      window.alert("Tenés que indicar el motivo por el que el inquilino no se quedó.");
      return;
    }
    onCancelar(ingreso.id, motivo.trim());
    resetYCerrar();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={resetYCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {modo === "finalizar" ? "Finalizar estadía" : "Cancelar ingreso"}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {ingreso.nombre} · Depto {ingreso.apartamento}
            </p>
          </div>
          <button onClick={resetYCerrar} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        {modo === "finalizar" ? (
          <div className="flex flex-col gap-4">
            {!ingreso.tomaConsumoUte ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-400">
                Esta estadía no tiene cobro de luz asociado.
              </div>
            ) : (
              <>
                {necesitaEntrada ? (
                  <div>
                    <label className={labelClass}>
                      Falta la lectura de entrada <span className="text-red-400">· obligatorio</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-gray-500" />
                      <input
                        type="number"
                        value={lecturaEntradaFaltante}
                        onChange={(e) => setLecturaEntradaFaltante(e.target.value)}
                        placeholder="Ej: 1820"
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300">
                    Lectura de entrada: <span className="font-semibold text-white">{ingreso.lecturaUteEntrada}</span>
                  </div>
                )}

                <div>
                  <label className={labelClass}>
                    Lectura de UTE (salida) <span className="text-red-400">· obligatorio</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-gray-500" />
                    <input
                      autoFocus
                      type="number"
                      value={lecturaSalida}
                      onChange={(e) => setLecturaSalida(e.target.value)}
                      placeholder="Ej: 2020"
                      className={inputClass}
                    />
                  </div>
                </div>

                {esValida && consumo !== null && importe !== null && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm">
                    <span className="text-gray-400">
                      Consumo: <span className="text-white">{consumo}</span> × {formatearImporte(PRECIO_UTE)}
                    </span>
                    <span className="font-semibold text-emerald-400">{formatearImporte(importe)}</span>
                  </div>
                )}
              </>
            )}

            <div className="mt-2 flex gap-2">
              <button
                onClick={resetYCerrar}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={ingreso.tomaConsumoUte && !esValida}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check size={16} />
                {ingreso.tomaConsumoUte ? "Cobrar y finalizar" : "Finalizar estadía"}
              </button>
            </div>

            <button
              onClick={() => setModo("cancelar")}
              className="text-xs text-gray-500 underline-offset-2 transition hover:text-gray-300 hover:underline"
            >
              El inquilino no se quedó (vio el depto y se fue)
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-400">
              Esto cierra el ingreso sin cobrar UTE y deja registrado el motivo en una nota firmada por vos.
            </p>

            <div>
              <label className={labelClass}>
                Motivo <span className="text-red-400">· obligatorio</span>
              </label>
              <textarea
                autoFocus
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: El depto no estaba en condiciones"
                rows={3}
                className={inputClass}
              />
            </div>

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setModo("finalizar")}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmarCancelacion}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                <Check size={16} />
                Confirmar cancelación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Aviso de cochera, tras confirmar un ingreso                  */
/* ---------------------------------------------------------- */

interface CocheraAvisoModalProps {
  ingreso: Ingreso | null;
  onClose: () => void;
}

export function CocheraAvisoModal({ ingreso, onClose }: CocheraAvisoModalProps) {
  if (!ingreso) return null;

  const cochera: Cochera | undefined = buscarCochera(ingreso.apartamento);

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
          <div>
            <h2 className="text-xl font-bold text-white">Ingreso registrado</h2>
            <p className="mt-1 text-sm text-gray-400">
              {ingreso.nombre} · Depto {ingreso.apartamento}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        {cochera ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <CarFront size={20} />
            </div>
            <div>
              <p className="text-sm text-white">
                Debe usar la cochera <span className="font-bold">{cochera.numeroCochera}</span>
              </p>
              <p className="mt-1 text-xs text-emerald-400">{UBICACION_LABEL[cochera.ubicacion]}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <TriangleAlert size={20} />
            </div>
            <p className="text-sm text-gray-200">{MENSAJE_SIN_COCHERA}</p>
          </div>
        )}

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

/* ---------------------------------------------------------- */
/* Falta la lectura de entrada de UTE (post-guardado)            */
/* ---------------------------------------------------------- */

interface CompletarLecturaUteModalProps {
  ingreso: Ingreso | null;
  onClose: () => void;
  onCompletar: (id: string, lectura: number) => void;
}

export function CompletarLecturaUteModal({ ingreso, onClose, onCompletar }: CompletarLecturaUteModalProps) {
  const [lectura, setLectura] = useState("");

  if (!ingreso) return null;

  const esValida = lectura !== "" && !isNaN(Number(lectura));

  const resetYCerrar = () => {
    setLectura("");
    onClose();
  };

  const handleConfirmar = () => {
    if (!esValida) {
      window.alert("Ingresá un número de lectura válido.");
      return;
    }
    onCompletar(ingreso.id, Number(lectura));
    resetYCerrar();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={resetYCerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#171b22]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Falta la lectura de entrada</h2>
            <p className="mt-1 text-sm text-gray-400">
              {ingreso.nombre} · Depto {ingreso.apartamento}
            </p>
          </div>
          <button onClick={resetYCerrar} className="rounded-full p-2 transition hover:bg-white/10">
            <X className="text-white" size={20} />
          </button>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <TriangleAlert size={20} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="text-sm text-gray-200">
            Has marcado que a este ingreso se le debe tomar el consumo de UTE, pero todavía no cargaste el consumo de
            inicio.
          </p>
        </div>

        <label className={labelClass}>
          Lectura de UTE (entrada) <span className="text-red-400">· obligatorio</span>
        </label>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-gray-500" />
          <input
            autoFocus
            type="number"
            value={lectura}
            onChange={(e) => setLectura(e.target.value)}
            placeholder="Ej: 1820"
            className={inputClass}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={resetYCerrar}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
          >
            Cargar más tarde
          </button>
          <button
            onClick={handleConfirmar}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Check size={16} />
            Guardar lectura
          </button>
        </div>
      </div>
    </div>
  );
}