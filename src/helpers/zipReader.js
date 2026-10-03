/**
 * Lector mínimo de .zip para el navegador (sin dependencias).
 * Lee solo el directorio central y, bajo demanda, cada archivo que se pida: con File.slice nunca
 * carga el comprimido completo en memoria, aunque pese cientos de MB por los binarios compilados.
 * Soporta métodos «stored» (0) y «deflate» (8), y ZIP64. Usa DecompressionStream("deflate-raw").
 */

const SIG_EOCD = 0x06054b50;
const SIG_EOCD64 = 0x06064b50;
const SIG_EOCD64_LOCATOR = 0x07064b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

const readBytes = async (file, start, length) => new Uint8Array(await file.slice(start, start + length).arrayBuffer());

function decodeName(bytes, utf8Flag) {
  if (utf8Flag) return new TextDecoder("utf-8").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Zips de Windows sin bandera UTF-8: la página de códigos más cercana disponible en el navegador.
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Busca la ruta Unicode (extra 0x7075) que agregan 7-Zip y otros para nombres con acentos. */
function unicodePathFromExtra(extra) {
  const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength);
  let offset = 0;
  while (offset + 4 <= extra.length) {
    const id = view.getUint16(offset, true);
    const size = view.getUint16(offset + 2, true);
    if (id === 0x7075 && size > 5) {
      return new TextDecoder("utf-8").decode(extra.subarray(offset + 9, offset + 4 + size));
    }
    offset += 4 + size;
  }
  return null;
}

function zip64Values(extra, needed) {
  const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength);
  let offset = 0;
  while (offset + 4 <= extra.length) {
    const id = view.getUint16(offset, true);
    const size = view.getUint16(offset + 2, true);
    if (id === 0x0001) {
      const values = {};
      let p = offset + 4;
      for (const key of needed) {
        values[key] = Number(view.getBigUint64(p, true));
        p += 8;
      }
      return values;
    }
    offset += 4 + size;
  }
  return {};
}

async function findEndOfCentralDirectory(file) {
  // El EOCD está en los últimos 22 bytes + comentario (máx. 64 KB).
  const tailLength = Math.min(file.size, 22 + 65535 + 20);
  const tail = await readBytes(file, file.size - tailLength, tailLength);
  const view = new DataView(tail.buffer);
  for (let i = tail.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) !== SIG_EOCD) continue;

    let entries = view.getUint16(i + 10, true);
    let size = view.getUint32(i + 12, true);
    let offset = view.getUint32(i + 16, true);

    // ZIP64: el localizador está justo antes del EOCD.
    if ((entries === 0xffff || size === 0xffffffff || offset === 0xffffffff) && i >= 20 && view.getUint32(i - 20, true) === SIG_EOCD64_LOCATOR) {
      const eocd64Offset = Number(view.getBigUint64(i - 12, true));
      const eocd64 = await readBytes(file, eocd64Offset, 56);
      const v64 = new DataView(eocd64.buffer);
      if (v64.getUint32(0, true) === SIG_EOCD64) {
        entries = Number(v64.getBigUint64(32, true));
        size = Number(v64.getBigUint64(40, true));
        offset = Number(v64.getBigUint64(48, true));
      }
    }
    return { entries, size, offset };
  }
  throw new Error("El archivo no es un .zip válido (no se encontró su índice).");
}

/**
 * Lista las entradas del zip.
 * @returns {Promise<{name: string, compressedSize: number, size: number, method: number, encrypted: boolean, localOffset: number, isDirectory: boolean}[]>}
 */
export async function listZipEntries(file) {
  const eocd = await findEndOfCentralDirectory(file);
  const central = await readBytes(file, eocd.offset, eocd.size);
  const view = new DataView(central.buffer);
  const entries = [];
  let p = 0;

  for (let i = 0; i < eocd.entries && p + 46 <= central.length; i++) {
    if (view.getUint32(p, true) !== SIG_CENTRAL) break;
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    let compressedSize = view.getUint32(p + 20, true);
    let size = view.getUint32(p + 24, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    let localOffset = view.getUint32(p + 42, true);

    const nameBytes = central.subarray(p + 46, p + 46 + nameLength);
    const extra = central.subarray(p + 46 + nameLength, p + 46 + nameLength + extraLength);

    const needed = [];
    if (size === 0xffffffff) needed.push("size");
    if (compressedSize === 0xffffffff) needed.push("compressedSize");
    if (localOffset === 0xffffffff) needed.push("localOffset");
    if (needed.length) {
      const values = zip64Values(extra, needed);
      size = values.size ?? size;
      compressedSize = values.compressedSize ?? compressedSize;
      localOffset = values.localOffset ?? localOffset;
    }

    const name = (unicodePathFromExtra(extra) ?? decodeName(nameBytes, (flags & 0x0800) !== 0)).replace(/\\/g, "/");
    entries.push({
      name,
      size,
      compressedSize,
      method,
      encrypted: (flags & 0x0001) !== 0,
      localOffset,
      isDirectory: name.endsWith("/"),
    });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Devuelve los bytes descomprimidos de una entrada. */
export async function readZipEntry(file, entry) {
  if (entry.encrypted) throw new Error("El archivo está protegido con contraseña.");

  const header = await readBytes(file, entry.localOffset, 30);
  const view = new DataView(header.buffer);
  if (view.getUint32(0, true) !== SIG_LOCAL) throw new Error("Entrada del zip dañada.");
  const dataStart = entry.localOffset + 30 + view.getUint16(26, true) + view.getUint16(28, true);
  const blob = file.slice(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return new Uint8Array(await blob.arrayBuffer());
  if (entry.method === 8) {
    const stream = blob.stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  throw new Error(`Método de compresión no soportado (${entry.method}). Vuelve a comprimir con ZIP estándar.`);
}
