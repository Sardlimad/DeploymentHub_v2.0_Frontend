/**
 * Detección de artefactos de base de datos a partir de archivos .sql.
 * Reglas sacadas de los scripts reales de ClassLimitless (carpetas 01.TABLAS … 05.AGREGAR_DATOS).
 */

/** Decodifica un .sql respetando su codificación: UTF-16 (SSMS), UTF-8 con o sin BOM, o Windows-1252. */
export function decodeSqlBytes(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder("utf-8").decode(bytes.subarray(3));

  // UTF-16 sin BOM: muchos ceros en posiciones impares.
  const sample = bytes.subarray(0, Math.min(bytes.length, 400));
  let zeros = 0;
  for (let i = 1; i < sample.length; i += 2) if (sample[i] === 0) zeros++;
  if (sample.length > 8 && zeros > sample.length / 4) return new TextDecoder("utf-16le").decode(bytes);

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/**
 * Quita comentarios (-- y /* *\/, anidados) y el contenido de los textos entre comillas,
 * para que el SQL dinámico (EXEC('CREATE TABLE …')) no se confunda con el objeto del script.
 */
export function stripSqlNoise(sql) {
  let out = "";
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === "-" && next === "-") {
      while (i < n && sql[i] !== "\n") i++;
      out += " ";
    } else if (c === "/" && next === "*") {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (sql[i] === "*" && sql[i + 1] === "/") {
          depth--;
          i += 2;
        } else i++;
      }
      out += " ";
    } else if (c === "'") {
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") i += 2;
        else if (sql[i] === "'") break;
        else i++;
      }
      i++;
      out += "''";
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

const OBJECT_KINDS = {
  PROCEDURE: "StoredProcedure",
  PROC: "StoredProcedure",
  FUNCTION: "Function",
  VIEW: "View",
  TRIGGER: "Trigger",
  TABLE: "Table",
};

// Carpeta (sin el prefijo numérico) → tipo esperado.
const FOLDER_HINTS = [
  [/^TABLAS?$/, "Table"],
  [/^VISTAS?$/, "View"],
  [/^FUNCION(ES)?$/, "Function"],
  [/^PROCEDIMIENTOS?$|^SP$|^STORED_?PROCEDURES?$/, "StoredProcedure"],
  [/^TRIGGERS?$|^DISPARADORES$/, "Trigger"],
  [/AGREGAR_DATOS|^DATOS$|^DATA$|INSERT/, "DataScript"],
];

const NAME = String.raw`((?:\[[^\]]+\]|"[^"]+"|[\w$#@]+)(?:\s*\.\s*(?:\[[^\]]+\]|"[^"]+"|[\w$#@]+)){0,2})`;
const DDL = new RegExp(String.raw`\b(CREATE\s+OR\s+ALTER|CREATE|ALTER)\s+(PROCEDURE|PROC|FUNCTION|VIEW|TRIGGER|TABLE)\s+` + NAME, "gi");
const INDEX = new RegExp(String.raw`\bCREATE\s+(?:UNIQUE\s+)?(?:(?:NON)?CLUSTERED\s+)?INDEX\s+[\w\[\]"]+\s+ON\s+` + NAME, "gi");
const TYPE = new RegExp(String.raw`\bCREATE\s+TYPE\s+` + NAME, "gi");

/** «[dbo].[usp_X]» → «usp_X»; otros esquemas se conservan («cst.usp_X»). */
export function normalizeObjectName(raw) {
  const parts = raw
    .split(/\s*\.\s*/)
    .map((p) => p.trim().replace(/^\[|\]$/g, "").replace(/^"|"$/g, ""))
    .filter(Boolean);
  const [schema, name] = parts.length >= 2 ? parts.slice(-2) : [null, parts[0]];
  if (!name) return null;
  return schema && schema.toLowerCase() !== "dbo" ? `${schema}.${name}` : name;
}

const isRealObject = (name) => !!name && !/^[#@]/.test(name) && !/['+]/.test(name);

export function folderHint(path) {
  const segments = path.split("/").slice(0, -1).map((s) => s.replace(/^\s*\d+\s*[._-]?\s*/, "").toUpperCase());
  for (let i = segments.length - 1; i >= 0; i--) {
    const hit = FOLDER_HINTS.find(([pattern]) => pattern.test(segments[i]));
    if (hit) return hit[1];
  }
  return null;
}

const fileBaseName = (path) => path.split("/").pop().replace(/\.sql$/i, "").trim();

/**
 * Divide el script en lotes por las líneas «GO» (separador de lotes de SQL Server).
 * Recibe el texto ya limpio de comentarios y cadenas.
 */
export const splitBatches = (clean) => clean.split(/^\s*GO\s*\d*\s*$/gim).filter((b) => b.trim());

const TYPE_LABEL = {
  Table: "tabla",
  View: "vista",
  Function: "función",
  StoredProcedure: "procedimiento",
  Trigger: "trigger",
  DataScript: "script de datos",
};

/**
 * Detecta TODOS los artefactos que define un .sql (un archivo puede traer varios procedimientos,
 * una tabla y su trigger, etc.).
 *
 * Regla de T-SQL que se aprovecha: CREATE/ALTER PROCEDURE, FUNCTION, VIEW y TRIGGER deben ser la
 * primera instrucción de su lote. Por eso cada lote con uno de ellos es UN artefacto, y lo que haya
 * dentro de su cuerpo (tablas temporales, ALTER TABLE…) no se cuenta aparte. En los lotes sin módulo,
 * cada tabla creada o alterada (y cada índice, sobre su tabla) es un artefacto.
 *
 * @returns {{ path: string, type: string, code: string, warnings: string[] }[]}
 */
export function analyzeScript(path, sql) {
  const hint = folderHint(path);

  // Los scripts de datos se identifican por archivo aunque alteren tablas.
  if (hint === "DataScript") {
    return [{ path, type: "DataScript", code: fileBaseName(path), warnings: [], info: [] }];
  }

  const found = [];
  const seen = new Set();
  const add = (type, name, warning) => {
    if (!isRealObject(name)) return;
    const key = `${type}|${name.toUpperCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ path, type, code: name, warnings: warning ? [warning] : [], info: [] });
  };

  for (const batch of splitBatches(stripSqlNoise(sql))) {
    const definitions = [...batch.matchAll(DDL)].map((m) => ({
      type: OBJECT_KINDS[m[2].toUpperCase()],
      name: normalizeObjectName(m[3]),
    }));

    // Lote de módulo: solo cuenta el objeto que define.
    const module = definitions.find((d) => d.type !== "Table" && isRealObject(d.name));
    if (module) {
      add(module.type, module.name);
      continue;
    }

    definitions.filter((d) => d.type === "Table").forEach((d) => add("Table", d.name));
    [...batch.matchAll(INDEX)].forEach((m) => add("Table", normalizeObjectName(m[1]), "Incluye un índice: se registra sobre su tabla."));
    [...batch.matchAll(TYPE)].forEach((m) => add("Other", normalizeObjectName(m[1]), "Crea un tipo de dato definido por el usuario."));
  }

  if (found.length === 0) {
    return [
      {
        path,
        type: "DataScript",
        code: fileBaseName(path),
        warnings: ["No se encontró CREATE/ALTER de un objeto: se registra como script de datos."],
        info: [],
      },
    ];
  }

  // Avisos útiles para revisar: objetos que no corresponden a la carpeta.
  if (hint) {
    found
      .filter((o) => o.type !== hint && !(hint === "Table" && o.type === "Trigger"))
      .forEach((o) => o.warnings.push(`Está en la carpeta de ${TYPE_LABEL[hint] ?? hint} pero es ${TYPE_LABEL[o.type] ?? o.type}.`));
  }
  if (found.length > 1) {
    found.forEach((o) => o.info.push(`Su archivo define ${found.length} objetos; cada uno se registra por separado.`));
  }
  return found;
}

/** Reportes de SSRS: un .rdl (o .rdlc) es un artefacto con el nombre del archivo como código. */
export const isReportFile = (path) => /\.rdlc?$/i.test(path);

export const analyzeReport = (path) => ({
  path,
  type: "Report",
  code: path.split("/").pop().replace(/\.rdlc?$/i, "").trim(),
  warnings: [],
  info: [],
});

/** Orden natural: «2.x» antes que «10.x»; respeta 01.TABLAS → 05.AGREGAR_DATOS. */
export const naturalCompare = (a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });

/**
 * Agrupa por objeto (tipo + código) manteniendo el orden del primer archivo.
 * Los scripts van primero (ordenados por ruta) y los reportes al final: un reporte puede
 * depender de procedimientos que se crean en el mismo paquete.
 * Recibe la lista plana de objetos (varios por archivo, en el orden en que aparecen).
 * @returns {{ type, code, path, files: string[], warnings: string[] }[]}
 */
export function groupScripts(analyzed) {
  const groups = new Map();
  const rank = (o) => (o.type === "Report" ? 1 : 0);
  // sort es estable: los objetos de un mismo archivo conservan su orden dentro del archivo.
  const ordered = [...analyzed].sort((a, b) => rank(a) - rank(b) || naturalCompare(a.path, b.path));
  for (const script of ordered) {
    const key = `${script.type}|${script.code.toUpperCase()}`;
    const group = groups.get(key);
    if (group) {
      if (!group.files.includes(script.path)) group.files.push(script.path);
      group.warnings.push(...script.warnings);
      group.info.push(...(script.info ?? []));
    } else {
      groups.set(key, {
        type: script.type,
        code: script.code,
        path: script.path,
        files: [script.path],
        warnings: [...script.warnings],
        info: [...(script.info ?? [])],
      });
    }
  }
  return [...groups.values()].map((g) => ({
    ...g,
    // Advertencias: lo que conviene revisar. Info: datos útiles que no requieren acción.
    warnings: [
      ...new Set(g.warnings),
      ...(g.files.length > 1 && g.type !== "Report"
        ? [`${g.files.length} archivos modifican este objeto; se ejecutan en el orden del comprimido.`]
        : []),
    ],
    info: [
      ...new Set(g.info),
      ...(g.files.length > 1 && g.type === "Report" ? [`El reporte aparece en ${g.files.length} carpetas del paquete.`] : []),
    ],
  }));
}

/** ¿La ruta está dentro de una carpeta SCRIPTS (en cualquier nivel)? */
export const isInScriptsFolder = (path) => path.split("/").slice(0, -1).some((s) => s.trim().toUpperCase() === "SCRIPTS");
