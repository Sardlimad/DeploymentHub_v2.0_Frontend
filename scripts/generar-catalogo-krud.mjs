/*
  Genera el catálogo que KRUD lee de DeploymentHub: public/velo-assistant/velo-deploymenthub.support.v1.json.

  El catálogo SE GENERA, no se edita a mano. La fuente es src/integraciones/krud/recorridos.json.
  Los selectores (`objetivo`) y la señal de fin NO se publican: se quedan en la aplicación y el kit
  los usa en el navegador (ver src/integraciones/krud/KrudAsistente.jsx).

  KRUD valida el catálogo con un esquema estricto (sin campos de más); este script comprueba antes
  las reglas que lo harían rechazar, para que el fallo aparezca aquí y no como «KNOWLEDGE_UNAVAILABLE».

  Se ejecuta solo antes de `npm run dev` y `npm run build` (predev / prebuild).
*/
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const fuente = JSON.parse(readFileSync(join(raiz, "src/integraciones/krud/recorridos.json"), "utf8"));

const RUTA = /^\/[a-z0-9/-]*$/;
// Capacidades que firma el backend (KrudAssertionSigner): mismas reglas que las políticas de la API.
const PERMISOS = new Set(["deployhub.deploy", "deployhub.operate", "deployhub.admin"]);
const errores = [];
const exigir = (cond, mensaje) => cond || errores.push(mensaje);

// La misma regla con que el kit reconoce la pantalla del usuario (rutaDePantalla).
const rutaDePantalla = (ruta) => {
  const partes = [];
  for (const parte of ruta.toLowerCase().split("/").filter(Boolean)) {
    if (/\d/.test(parte) || parte.length > 20) break;
    partes.push(parte);
  }
  return "/" + partes.join("/");
};

const screens = fuente.pantallas.map((p) => {
  exigir(RUTA.test(p.route), `Pantalla «${p.title}»: ruta inválida ${p.route} (minúsculas, sin «_» ni parámetros).`);
  exigir(rutaDePantalla(p.route) === p.route, `Pantalla «${p.title}»: el kit la reconocería como ${rutaDePantalla(p.route)}.`);
  return {
    id: p.route === "/" ? "inicio" : p.route.slice(1).replace(/\//g, "-"),
    title: p.title,
    route: p.route,
    group: p.group,
    ...(p.permiso ? { permission: p.permiso } : {}),
  };
});
const rutas = new Set(screens.map((s) => s.route));
const recorridos = new Set(fuente.recorridos.map((r) => r.id));

const articles = fuente.articulos.map((a) => {
  if (a.ruta) exigir(rutas.has(a.ruta), `Artículo «${a.id}»: la ruta ${a.ruta} no es una pantalla.`);
  if (a.recorrido) exigir(recorridos.has(a.recorrido), `Artículo «${a.id}»: no existe el recorrido ${a.recorrido}.`);
  return {
    id: a.id,
    title: a.titulo,
    paragraphs: a.parrafos,
    keywords: a.claves,
    ...(a.ruta ? { route: a.ruta } : {}),
    ...(a.recorrido ? { guideId: a.recorrido } : {}),
    ...(a.permiso ? { permission: a.permiso } : {}),
  };
});

const guides = fuente.recorridos.map((r) => {
  const conRuta = r.pasos.filter((p) => p.ruta).length;
  exigir(conRuta === 0 || conRuta === r.pasos.length, `Recorrido «${r.id}»: la ruta va en todos los pasos o en ninguno.`);
  exigir(!r.fin || r.fin.evento || r.fin.visible, `Recorrido «${r.id}»: el fin necesita «evento» o «visible»; si no, la guía nunca termina.`);
  r.pasos.forEach((p, i) => {
    if (p.ruta) exigir(rutas.has(p.ruta), `Recorrido «${r.id}», paso ${i + 1}: la ruta ${p.ruta} no es una pantalla.`);
    exigir(p.objetivo?.selector, `Recorrido «${r.id}», paso ${i + 1}: falta el selector.`);
  });
  return {
    id: r.id,
    title: r.titulo,
    purpose: r.proposito,
    steps: r.pasos.map((p) => ({ title: p.titulo, text: p.texto, ...(p.ruta ? { route: p.ruta } : {}) })),
    ...(r.pasos[0]?.ruta ? { route: r.pasos[0].ruta } : {}),
    ...(r.permiso ? { permission: r.permiso } : {}),
  };
});

for (const item of [...fuente.pantallas, ...fuente.articulos, ...fuente.recorridos]) {
  if (item.permiso) exigir(PERMISOS.has(item.permiso), `Permiso desconocido «${item.permiso}» (${item.id ?? item.route}).`);
}
exigir(/^[a-z0-9-]{1,64}$/.test(fuente.applicationId), "applicationId inválido.");
exigir(/^\d+\.\d+\.\d+$/.test(fuente.version), "version debe ser x.y.z.");

if (errores.length) {
  console.error("Catálogo de KRUD inválido:\n  · " + errores.join("\n  · "));
  process.exit(1);
}

const catalogo = { applicationId: fuente.applicationId, version: fuente.version, screens, articles, guides };
const destino = join(raiz, "public/velo-assistant", `${fuente.applicationId}.support.v1.json`);
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, JSON.stringify(catalogo, null, 2) + "\n");
console.log(`Catálogo de KRUD: ${screens.length} pantallas, ${articles.length} artículos, ${guides.length} recorridos → ${destino}`);
