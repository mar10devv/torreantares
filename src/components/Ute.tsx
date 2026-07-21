import { useState, useEffect } from "react";
import { ArrowLeft, Search, Zap, TriangleAlert } from "lucide-react";

interface Usuario {
  nombre: string;
  cargo: string;
  gmail: string;
  telefono: string;
  contrasena: string;
}

interface UteProps {
  usuario: Usuario;
  onVolver: () => void;
  onListo?: () => void;
}

export type Torre = "Puerta 1" | "Puerta 2" | "Puerta 3" | "Central" | "Antares 3";

export interface ContadorUte {
  apartamento: string;
  /** Número de recibo/contador. null = todavía no tiene contador asignado en la planilla. */
  recibo: string | null;
}

export const MENSAJE_SIN_CONTADOR =
  "Este apartamento todavía no tiene un contador de UTE asignado en la planilla. Confirmar con administración.";

export const MENSAJE_TORRE_NO_DETERMINADA =
  "El número de contador no permite determinar automáticamente la torre (caso especial de penthouse). Confirmar ubicación física con administración.";

/**
 * La torre donde está físicamente el contador NO depende del depto, sino de los
 * últimos 2 dígitos del número de RECIBO (los contadores de UTE están agrupados
 * por sótano/torre, sin relación con la torre "real" del apartamento).
 *
 * Ej: depto 914 → recibo 917 → unidad "17" → torre Antares 3.
 */
const RANGOS_UNIDAD_TORRE: { unidades: string[]; torre: Torre }[] = [
  { unidades: ["01", "02", "03", "04"], torre: "Puerta 1" },
  { unidades: ["05", "06", "13", "14"], torre: "Central" },
  { unidades: ["07", "08", "09"], torre: "Puerta 2" },
  { unidades: ["10", "11", "12"], torre: "Puerta 3" },
  { unidades: ["15", "16", "17", "18"], torre: "Antares 3" },
];

export function calcularTorrePorRecibo(recibo: string): Torre | null {
  const soloNumeros = recibo.replace(/\D/g, "");
  if (soloNumeros.length < 2) return null;
  const unidad = soloNumeros.slice(-2);
  const grupo = RANGOS_UNIDAD_TORRE.find((g) => g.unidades.includes(unidad));
  return grupo ? grupo.torre : null;
}

/**
 * Datos fijos, transcritos a mano desde la planilla física de UTE (2 hojas fotografiadas).
 * Para agregar, corregir o eliminar un registro: editar este array directamente.
 *
 * PENDIENTES DE REVISAR (marcados en la propia planilla como dudosos/incompletos):
 * — 213 y 215: aparecen resaltadas en la planilla SIN número de recibo. Se cargaron
 *   con recibo: null (se muestra "sin contador asignado"). Confirmar si ya se instaló.
 * — 210 → 209 y 218 → 209: dos deptos distintos apuntan al mismo número de recibo.
 *   Puede ser error de transcripción en la planilla original. Confirmar cuál es correcto.
 * — 602 → 603 tiene, en la foto, un círculo con las anotaciones "ES." y "NO" al lado,
 *   sugiriendo que ese dato podría estar mal. La fila "603 → 602" está remarcada en
 *   amarillo (aparentemente la corrección). Se cargaron ambos valores tal cual figuran
 *   impresos (602→603 y 603→602) pero conviene confirmar con administración cuál es
 *   el correcto, ya que podrían estar cruzados.
 * — 906 → 907 tiene un tachón con otra anotación al lado que no se pudo leer con
 *   certeza en la foto. Se cargó "907" como mejor lectura disponible. Además el
 *   recibo 907 se repite en 909 → 907 (posible duplicado a confirmar).
 * — 119 a 124 (penthouse) tienen recibos 153 a 158: no encajan en la regla normal de
 *   unidad (ej. "153" no tiene una unidad de 2 dígitos reconocible: "53" no existe
 *   en ninguna torre). calcularTorrePorRecibo() va a devolver null para estos casos;
 *   la UI muestra un aviso pidiendo confirmar la torre a mano. Falta que nos digan
 *   en qué torre están estos 6 contadores.
 * — 1010 → 1009 tiene anotado al lado, a mano, "1011-1012" (motivo no confirmado).
 * — No existe información para los deptos 101 a 118 (no aparecen en ninguna de las
 *   dos hojas fotografiadas). Si existen, falta cargar esa parte de la planilla.
 */
export const CONTADORES_UTE: ContadorUte[] = [
  // --- Hoja 2 (119-124, 2xx, 3xx, 4xx, 5xx, 6xx) ---
  { apartamento: "119", recibo: "153" },
  { apartamento: "120", recibo: "154" },
  { apartamento: "121", recibo: "155" },
  { apartamento: "122", recibo: "156" },
  { apartamento: "123", recibo: "157" },
  { apartamento: "124", recibo: "158" },
  { apartamento: "201", recibo: "201" },
  { apartamento: "202", recibo: "202" },
  { apartamento: "203", recibo: "203" },
  { apartamento: "204", recibo: "204" },
  { apartamento: "205", recibo: "205" },
  { apartamento: "206", recibo: "212" },
  { apartamento: "207", recibo: "206" },
  { apartamento: "208", recibo: "207" },
  { apartamento: "209", recibo: "208" },
  { apartamento: "210", recibo: "209" }, // ver PENDIENTE: coincide con 218
  { apartamento: "211", recibo: "210" },
  { apartamento: "212", recibo: "211" },
  { apartamento: "213", recibo: null }, // ver PENDIENTE: sin recibo asignado
  { apartamento: "214", recibo: "214" },
  { apartamento: "215", recibo: null }, // ver PENDIENTE: sin recibo asignado
  { apartamento: "216", recibo: "216" },
  { apartamento: "217", recibo: "217" },
  { apartamento: "218", recibo: "209" }, // ver PENDIENTE: coincide con 210
  { apartamento: "301", recibo: "301" },
  { apartamento: "302", recibo: "302" },
  { apartamento: "303", recibo: "303" },
  { apartamento: "304", recibo: "401" },
  { apartamento: "305", recibo: "305" },
  { apartamento: "306", recibo: "312" },
  { apartamento: "307", recibo: "306" },
  { apartamento: "308", recibo: "307" },
  { apartamento: "309", recibo: "308" },
  { apartamento: "310", recibo: "309" },
  { apartamento: "311", recibo: "311" },
  { apartamento: "312", recibo: "310" },
  { apartamento: "313", recibo: "313" },
  { apartamento: "314", recibo: "314" },
  { apartamento: "315", recibo: "315" },
  { apartamento: "316", recibo: "316" },
  { apartamento: "317", recibo: "317" },
  { apartamento: "318", recibo: "318" },
  { apartamento: "401", recibo: "304" },
  { apartamento: "402", recibo: "402" },
  { apartamento: "403", recibo: "403" },
  { apartamento: "404", recibo: "404" },
  { apartamento: "405", recibo: "405" },
  { apartamento: "406", recibo: "412" },
  { apartamento: "407", recibo: "406" },
  { apartamento: "408", recibo: "407" },
  { apartamento: "409", recibo: "408" },
  { apartamento: "410", recibo: "409" },
  { apartamento: "411", recibo: "410" },
  { apartamento: "412", recibo: "411" },
  { apartamento: "413", recibo: "413" },
  { apartamento: "414", recibo: "414" },
  { apartamento: "415", recibo: "415" },
  { apartamento: "416", recibo: "416" },
  { apartamento: "417", recibo: "417" },
  { apartamento: "418", recibo: "418" },
  { apartamento: "501", recibo: "501" },
  { apartamento: "502", recibo: "502" },
  { apartamento: "503", recibo: "503" },
  { apartamento: "504", recibo: "504" },
  { apartamento: "505", recibo: "505" },
  { apartamento: "506", recibo: "512" },
  { apartamento: "507", recibo: "506" },
  { apartamento: "508", recibo: "507" },
  { apartamento: "509", recibo: "508" },
  { apartamento: "510", recibo: "509" },
  { apartamento: "511", recibo: "510" },
  { apartamento: "512", recibo: "511" },
  { apartamento: "513", recibo: "513" },
  { apartamento: "514", recibo: "514" },
  { apartamento: "515", recibo: "515" },
  { apartamento: "516", recibo: "516" },
  { apartamento: "517", recibo: "517" },
  { apartamento: "518", recibo: "518" },
  { apartamento: "601", recibo: "601" },
  { apartamento: "602", recibo: "603" }, // ver PENDIENTE: dato marcado dudoso en la planilla
  { apartamento: "603", recibo: "602" }, // ver PENDIENTE: dato marcado dudoso en la planilla
  { apartamento: "604", recibo: "604" },
  { apartamento: "605", recibo: "605" },
  { apartamento: "606", recibo: "612" },
  { apartamento: "607", recibo: "606" },
  { apartamento: "608", recibo: "607" },
  { apartamento: "609", recibo: "608" },
  { apartamento: "610", recibo: "609" },
  { apartamento: "611", recibo: "610" },
  { apartamento: "612", recibo: "611" },

  // --- Hoja 1 (6xx-9xx, 10xx, 11xx) ---
  { apartamento: "613", recibo: "613" },
  { apartamento: "614", recibo: "614" },
  { apartamento: "615", recibo: "615" },
  { apartamento: "616", recibo: "616" },
  { apartamento: "617", recibo: "617" },
  { apartamento: "618", recibo: "618" },
  { apartamento: "701", recibo: "701" },
  { apartamento: "702", recibo: "702" },
  { apartamento: "703", recibo: "703" },
  { apartamento: "704", recibo: "704" },
  { apartamento: "705", recibo: "705" },
  { apartamento: "706", recibo: "712" },
  { apartamento: "707", recibo: "706" },
  { apartamento: "708", recibo: "707" },
  { apartamento: "709", recibo: "708" },
  { apartamento: "710", recibo: "709" },
  { apartamento: "711", recibo: "710" },
  { apartamento: "712", recibo: "711" },
  { apartamento: "713", recibo: "713" },
  { apartamento: "714", recibo: "714" },
  { apartamento: "715", recibo: "715" },
  { apartamento: "716", recibo: "716" },
  { apartamento: "717", recibo: "717" },
  { apartamento: "718", recibo: "718" },
  { apartamento: "801", recibo: "801" },
  { apartamento: "802", recibo: "802" },
  { apartamento: "803", recibo: "803" },
  { apartamento: "804", recibo: "804" },
  { apartamento: "805", recibo: "805" },
  { apartamento: "806", recibo: "811" },
  { apartamento: "807", recibo: "806" },
  { apartamento: "808", recibo: "807" },
  { apartamento: "809", recibo: "808" },
  { apartamento: "810", recibo: "809" },
  { apartamento: "811", recibo: "810" },
  { apartamento: "813", recibo: "813" },
  { apartamento: "814", recibo: "814" },
  { apartamento: "815", recibo: "815" },
  { apartamento: "816", recibo: "816" },
  { apartamento: "817", recibo: "817" },
  { apartamento: "818", recibo: "818" },
  { apartamento: "901", recibo: "901" },
  { apartamento: "902", recibo: "902" },
  { apartamento: "903", recibo: "903" },
  { apartamento: "904", recibo: "904" },
  { apartamento: "905", recibo: "905" },
  { apartamento: "906", recibo: "907" }, // ver PENDIENTE: tachado en la planilla, confirmar
  { apartamento: "907", recibo: "906" },
  { apartamento: "908", recibo: "908" },
  { apartamento: "909", recibo: "907" }, // ver PENDIENTE: recibo repetido con 906
  { apartamento: "910", recibo: "909" },
  { apartamento: "911", recibo: "910" },
  { apartamento: "912", recibo: "911" },
  { apartamento: "913", recibo: "913" },
  { apartamento: "914", recibo: "914" },
  { apartamento: "915", recibo: "915" },
  { apartamento: "916", recibo: "916" },
  { apartamento: "917", recibo: "917" },
  { apartamento: "918", recibo: "918" },
  { apartamento: "1001", recibo: "1001" },
  { apartamento: "1002", recibo: "1002" },
  { apartamento: "1003", recibo: "1003" },
  { apartamento: "1004", recibo: "1004" },
  { apartamento: "1005", recibo: "1005" },
  { apartamento: "1006", recibo: "1012" },
  { apartamento: "1007", recibo: "1006" },
  { apartamento: "1008", recibo: "1007" },
  { apartamento: "1009", recibo: "1008" },
  { apartamento: "1010", recibo: "1009" }, // anotado a mano "1011-1012" al lado, ver PENDIENTE
  { apartamento: "1011", recibo: "1010" },
  { apartamento: "1013", recibo: "1013" },
  { apartamento: "1014", recibo: "1014" },
  { apartamento: "1015", recibo: "1015" },
  { apartamento: "1016", recibo: "1016" },
  { apartamento: "1017", recibo: "1017" },
  { apartamento: "1018", recibo: "1018" },
  { apartamento: "1101", recibo: "1101" },
  { apartamento: "1102", recibo: "1102" },
  { apartamento: "1103", recibo: "1103" },
  { apartamento: "1104", recibo: "1104" },
  { apartamento: "1105", recibo: "1105" },
  { apartamento: "1106", recibo: "1106" },
  { apartamento: "1107", recibo: "1107" },
  { apartamento: "1108", recibo: "1108" },
  { apartamento: "1109", recibo: "1109" },
  { apartamento: "1110", recibo: "1110" },
  { apartamento: "1111", recibo: "1111" },
];

export function buscarContadorUte(apartamento: string): ContadorUte | undefined {
  const query = apartamento.trim();
  return CONTADORES_UTE.find((c) => c.apartamento === query);
}

export default function Ute({ onVolver, onListo }: UteProps) {
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    // Datos estáticos (transcritos de la planilla física), sin fetch:
    // avisamos que ya está listo apenas se monta.
    onListo?.();
  }, []);

  const buscoAlgo = busqueda.trim().length > 0;
  const registro = buscoAlgo ? buscarContadorUte(busqueda) : undefined;
  const torre = registro?.recibo ? calcularTorrePorRecibo(registro.recibo) : null;

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d1117] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mb-10 flex w-full max-w-xl items-center justify-between">
        <button
          onClick={onVolver}
          className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <h1 className="text-2xl font-bold sm:text-3xl">UTE</h1>

        <div className="w-[92px] sm:w-[104px]" />
      </div>

      <div className="w-full max-w-xl">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar contador por número de apartamento… ej: 914"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-gray-500 focus:outline-2 focus:outline-blue-500"
          />
        </div>

        {buscoAlgo && (
          <div className="mt-6">
            {!registro ? (
              <div className="flex items-start gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <TriangleAlert size={22} />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Apartamento no encontrado</p>
                  <p className="mt-1 text-sm text-gray-300">
                    No hay datos cargados de UTE para ese número de apartamento.
                  </p>
                </div>
              </div>
            ) : !registro.recibo ? (
              <div className="flex items-start gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <TriangleAlert size={22} />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Sin contador asignado</p>
                  <p className="mt-1 text-sm text-gray-300">{MENSAJE_SIN_CONTADOR}</p>
                </div>
              </div>
            ) : torre ? (
              <div className="flex items-start gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Zap size={22} />
                </div>
                <div>
                  <p className="text-base text-white">
                    El depto <span className="font-bold">{registro.apartamento}</span> tiene el contador en la
                    torre <span className="font-bold">{torre}</span>
                  </p>
                  <p className="mt-1 text-sm text-emerald-400">
                    Número de contador: {registro.recibo}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <TriangleAlert size={22} />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">
                    Contador {registro.recibo} — torre sin determinar
                  </p>
                  <p className="mt-1 text-sm text-gray-300">{MENSAJE_TORRE_NO_DETERMINADA}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}