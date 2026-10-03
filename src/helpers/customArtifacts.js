// RN-11: versiones de un artefacto por cliente. Un mismo tipo + código puede tener una versión general
// y una personalizada por cliente (el «Rpt_Pagare» de FESC no es el de UDV ni el general).

export const versionKey = (type, code) => `${type}|${code.trim().toUpperCase()}`;

/** ¿La versión corresponde al destinatario del paquete? (packageClientId vacío = paquete general). */
export const belongsTo = (item, packageClientId) => (item.ownerClientId ?? "") === (packageClientId || "");

/** Versiones elegidas a mano que son de OTRO dueño que el destinatario del paquete. */
export const customConflicts = (items, packageClientId) =>
  items.filter((item) => item.ownerClientId && !belongsTo(item, packageClientId));

export const customClientNames = (item) => item.ownerClientName ?? "";

/** Qué pasa al confirmar, según el destinatario del paquete. */
export const customEffectText = (packageClientName) =>
  packageClientName
    ? `Se registrará como versión de ${packageClientName} (si no la tenía, entra como nueva). Las próximas veces se usará directamente la versión de ${packageClientName}, sin avisar.`
    : "Es un paquete general: dejará de ser personalizado. Si no hay versión general, esta pasa a serlo; si la hay, se usa la general y ese cliente pasará a recibirla.";

/**
 * Ordena las versiones de un resultado de búsqueda: primero la del destinatario, luego la general
 * y al final las de otros clientes.
 */
export const rankVersions = (artifacts, packageClientId) => {
  const rank = (a) => (belongsTo(a, packageClientId) ? 0 : a.ownerClientId ? 2 : 1);
  return [...artifacts].sort((a, b) => rank(a) - rank(b));
};

/**
 * Clientes destino de un paquete GENERAL que tienen su propia versión de alguno de sus artefactos:
 * el paquete la reemplazaría. Devuelve { [clientId]: ["RPT_PAGARE", …] }.
 */
export function ownVersionsOverwritten(packageItems, catalog) {
  const keys = new Set(packageItems.map((i) => versionKey(i.type, i.code)));
  const byClient = {};
  for (const artifact of catalog) {
    if (!artifact.ownerClientId || !artifact.isActive || !keys.has(versionKey(artifact.type, artifact.code))) continue;
    (byClient[artifact.ownerClientId] ??= []).push(artifact.code);
  }
  return byClient;
}
