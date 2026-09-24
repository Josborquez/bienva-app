// backend/tools/etiquetas.ts
// Lee la tabla nutricional de fichas de producto de Jumbo / Santa Isabel y
// genera un BORRADOR de migración para `foods`. No escribe en la base: el SQL
// se revisa (nombre, categoría, aliases, choques de búsqueda) y se copia a una
// migración nueva a mano.
//
// Uso (desde backend/):
//   npx deno run --allow-net=www.jumbo.cl,www.santaisabel.cl tools/etiquetas.ts buscar "yoghurt protein"
//   npx deno run --allow-net=www.jumbo.cl,www.santaisabel.cl tools/etiquetas.ts buscar "yoghurt protein" --extraer --max 3
//   npx deno run --allow-net=www.jumbo.cl,www.santaisabel.cl tools/etiquetas.ts https://www.jumbo.cl/<producto>/p [...]
// Opciones: --sitio jumbo|santaisabel (buscar; por defecto jumbo), --max N (por defecto 5).
//
// Reglas: solo sitios cuyo robots.txt permite fichas y búsqueda (Líder las
// prohíbe; Unimarc bloquea bots). Se respeta robots.txt, una petición a la vez
// y 2 s entre peticiones.

const SITIOS: Record<string, string> = { jumbo: "www.jumbo.cl", santaisabel: "www.santaisabel.cl" };
const PERMITIDOS = new Set(Object.values(SITIOS));
const USER_AGENT = "BienvaEtiquetas/0.1 (+https://bienva.cl)";
const PAUSA_MS = 2000;

// ---------------------------------------------------------------------------
// HTTP educado: robots.txt + pausa entre peticiones
// ---------------------------------------------------------------------------
const robotsCache = new Map<string, RegExp[]>();
let ultimaPeticion = 0;

async function obtener(url: string): Promise<string> {
  const espera = ultimaPeticion + PAUSA_MS - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  ultimaPeticion = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} en ${url}`);
  return await res.text();
}

// Reglas Disallow del bloque "User-agent: *", con * como comodín.
async function reglasRobots(host: string): Promise<RegExp[]> {
  if (robotsCache.has(host)) return robotsCache.get(host)!;
  const txt = await obtener(`https://${host}/robots.txt`);
  const reglas: RegExp[] = [];
  let enBloqueGeneral = false;
  for (const linea of txt.split("\n")) {
    const [clave, ...resto] = linea.split(":");
    const valor = resto.join(":").trim();
    const k = clave.trim().toLowerCase();
    if (k === "user-agent") enBloqueGeneral = valor === "*";
    else if (k === "disallow" && enBloqueGeneral && valor) {
      const patron = valor.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      reglas.push(new RegExp("^" + patron));
    }
  }
  robotsCache.set(host, reglas);
  return reglas;
}

async function permitido(url: URL): Promise<boolean> {
  const ruta = url.pathname + url.search;
  return !(await reglasRobots(url.host)).some((r) => r.test(ruta));
}

async function obtenerPermitido(url: URL): Promise<string> {
  if (!PERMITIDOS.has(url.host)) throw new Error(`sitio no permitido: ${url.host}`);
  if (!(await permitido(url))) throw new Error(`robots.txt no permite ${url.pathname}${url.search}`);
  return await obtener(url.toString());
}

// ---------------------------------------------------------------------------
// Parseo de la ficha
// ---------------------------------------------------------------------------
interface Etiqueta {
  url: string;
  nombre: string;
  marca: string | null;
  porcion_etiqueta: string | null;
  por100: { kcal?: number; prot_g?: number; grasa_g?: number; carb_g?: number; azucar_g?: number; sodio_mg?: number };
  es_liquido: boolean;
}

const limpiar = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const numero = (s: string) => Number(limpiar(s).replace(/\./g, "").replace(",", "."));

function parsearFicha(url: string, html: string): Etiqueta | null {
  let nombre = "", marca: string | null = null;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const datos = [JSON.parse(m[1])].flat();
      const p = datos.find((d) => d?.["@type"] === "Product");
      if (p) {
        nombre = p.name ?? "";
        marca = typeof p.brand === "string" ? p.brand : p.brand?.name ?? null;
      }
    } catch { /* bloque no JSON: se ignora */ }
  }

  const i = html.indexOf("Tabla nutricional");
  if (i < 0) return null;
  const tabla = html.slice(i).match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1];
  if (!tabla) return null;

  const por100: Etiqueta["por100"] = {};
  for (const fila of tabla.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const celdas = [...fila[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    if (celdas.length < 2) continue;
    const etiqueta = limpiar(celdas[0]).toLowerCase();
    const valor = numero(celdas[1]); // columna "Por cada 100g/ml"
    if (!Number.isFinite(valor)) continue;
    if (etiqueta.startsWith("energ")) por100.kcal = valor;
    else if (etiqueta.startsWith("prote")) por100.prot_g = valor;
    else if (etiqueta.startsWith("grasas totales")) por100.grasa_g = valor;
    else if (etiqueta.startsWith("hidratos")) por100.carb_g = valor;
    else if (etiqueta.startsWith("azúcares") || etiqueta.startsWith("azucares")) por100.azucar_g = valor;
    else if (etiqueta.startsWith("sodio")) por100.sodio_mg = valor;
  }
  if (por100.kcal === undefined || por100.prot_g === undefined) return null;

  const porcion = html.match(/Porci[óo]n<!-- -->:<\/span>\s*(?:<!-- -->)?([^<]+)</)?.[1]?.trim() ?? null;
  return { url, nombre, marca, porcion_etiqueta: porcion, por100, es_liquido: /\d\s*(ml|cc|l|lt)\b/i.test(nombre) };
}

// ---------------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------------
async function buscar(termino: string, sitio: string, max: number): Promise<string[]> {
  const host = SITIOS[sitio];
  if (!host) throw new Error(`sitio desconocido: ${sitio} (usa ${Object.keys(SITIOS).join(" o ")})`);
  const html = await obtenerPermitido(new URL(`https://${host}/busqueda?ft=${encodeURIComponent(termino)}`));
  const rutas = [...new Set([...html.matchAll(/href="(\/[a-z0-9-]+\/p)"/g)].map((m) => m[1]))];
  return rutas.slice(0, max).map((r) => `https://${host}${r}`);
}

// ---------------------------------------------------------------------------
// Borrador SQL
// ---------------------------------------------------------------------------
const sql = (s: string | null) => (s === null ? "null" : `'${s.replace(/'/g, "''")}'`);
const num = (n: number | undefined) => (n === undefined ? "null" : String(Math.round(n * 10) / 10));

// Porción de la etiqueta ("1 Sachet de Yoghurt (150 g)") si trae gramos; si no,
// 100 g/ml. Importa porque analyze escala por `cantidad` cuando no sabe los
// gramos: "1 yogurt" debe ser el sachet completo, no 100 g.
function porcionFood(e: Etiqueta): { desc: string; g: number } {
  const m = e.porcion_etiqueta?.match(/^(.*?)\s*\((\d+(?:[.,]\d+)?)\s*(g|ml|cc)\)/i);
  if (m) return { desc: m[1].trim().toLowerCase() || `${m[2]} ${m[3]}`, g: Number(m[2].replace(",", ".")) };
  return { desc: e.es_liquido ? "100 ml" : "100 g", g: 100 };
}

function borradorSQL(e: Etiqueta): string {
  const hoy = new Date().toISOString().slice(0, 10);
  const porcion = porcionFood(e);
  const f = porcion.g / 100;
  const alias = e.nombre.toLowerCase().replace(/\s+\d+([.,]\d+)?\s*(g|kg|ml|cc|l|lt|un\.?)\b.*$/i, "").trim();
  const p = e.por100;
  const x = (v: number | undefined) => (v === undefined ? undefined : v * f);
  return `-- ${e.url}  (leído ${hoy})
-- Etiqueta por 100 ${e.es_liquido ? "ml" : "g"}: ${p.kcal} kcal, ${p.prot_g} g prot, grasa ${p.grasa_g ?? "?"} g, carb ${p.carb_g ?? "?"} g, azúcares ${p.azucar_g ?? "?"} g, sodio ${p.sodio_mg ?? "?"} mg. Porción de la etiqueta: ${e.porcion_etiqueta ?? "?"}.
-- REVISAR: nombre, categoria, aliases y que no le gane búsquedas genéricas a otro alimento.
insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado)
select ${sql(e.nombre)}, ${sql(e.marca)}, null, array[${sql(alias)}], ${sql(porcion.desc)}, ${porcion.g}, ${num(x(p.kcal))}, ${num(x(p.prot_g))}, ${num(x(p.carb_g))}, ${num(x(p.grasa_g))}, 'etiqueta', true
where not exists (select 1 from foods where nombre = ${sql(e.nombre)} and marca is not distinct from ${sql(e.marca)});
`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function opcion(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
}

async function extraer(urls: string[]) {
  for (const u of urls) {
    try {
      const url = new URL(u);
      const e = parsearFicha(u, await obtenerPermitido(url));
      console.log(e ? borradorSQL(e) : `-- ${u}\n-- sin tabla nutricional en la ficha; se omite.\n`);
    } catch (err) {
      console.error(`-- ${u}\n-- error: ${err instanceof Error ? err.message : err}\n`);
    }
  }
}

if (import.meta.main) {
  const args = Deno.args;
  if (args[0] === "buscar" && args[1]) {
    const urls = await buscar(args[1], opcion(args, "--sitio") ?? "jumbo", Number(opcion(args, "--max") ?? 5));
    if (args.includes("--extraer")) await extraer(urls);
    else urls.forEach((u) => console.log(u));
  } else if (args.length && args.every((a) => a.startsWith("https://"))) {
    await extraer(args);
  } else {
    console.error('Uso: etiquetas.ts buscar "<término>" [--sitio jumbo|santaisabel] [--max N] [--extraer] | etiquetas.ts <url> [...]');
    Deno.exit(1);
  }
}
