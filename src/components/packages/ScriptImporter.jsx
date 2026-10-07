import { useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Flex,
  HStack,
  Input,
  Progress,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import { FiAlertTriangle, FiFolder, FiInfo, FiPackage } from "react-icons/fi";
import Mono from "../common/Mono";
import { ArtifactTypeLabel, ChangeTypeBadge, CustomBadge } from "../common/StatusBadge";
import { listZipEntries, readZipEntry } from "../../helpers/zipReader";
import { belongsTo } from "../../helpers/customArtifacts";
import { analyzeReport, analyzeScript, decodeSqlBytes, groupScripts, isInScriptsFolder, isReportFile } from "../../helpers/sqlScripts";
import { pluralize } from "../../helpers/format";

const PAGE = 100;

/**
 * De los archivos del paquete toma los .sql de la carpeta SCRIPTS (si no existe, todos los .sql)
 * y los reportes .rdl de cualquier carpeta.
 */
function pickPackageFiles(files) {
  const sql = files.filter((f) => /\.sql$/i.test(f.path));
  const inScripts = sql.filter((f) => isInScriptsFolder(f.path));
  const reports = files.filter((f) => isReportFile(f.path));
  const useAllSql = inScripts.length === 0 && sql.length > 0;
  return {
    chosen: [...(useAllSql ? sql : inScripts), ...reports],
    note: useAllSql ? "sin carpeta SCRIPTS: se leyeron todos los .sql" : null,
  };
}
const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "new", label: "Nuevos" },
  { key: "warn", label: "Con advertencia" },
];

/**
 * Detecta los artefactos de un paquete: cada objeto definido en los .sql de la carpeta SCRIPTS
 * (un archivo puede traer varios) y cada reporte .rdl. El comprimido se lee en el navegador:
 * no se sube a ningún servidor.
 */
export default function ScriptImporter({ catalog, existingItems, onAdd, packageClientId, packageClientName }) {
  const zipInput = useRef(null);
  const folderInput = useRef(null);
  const [progress, setProgress] = useState(null); // { done, total }
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);
  const [results, setResults] = useState(null);
  const [excluded, setExcluded] = useState(new Set());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE);

  // Se busca la versión del destinatario del paquete (la de su cliente o la general).
  const catalogByKey = useMemo(
    () => new Map(catalog.filter((a) => belongsTo(a, packageClientId)).map((a) => [`${a.type}|${a.code.toUpperCase()}`, a])),
    [catalog, packageClientId]
  );
  const otherVersionsByKey = useMemo(() => {
    const map = new Map();
    catalog
      .filter((a) => !belongsTo(a, packageClientId))
      .forEach((a) => {
        const key = `${a.type}|${a.code.toUpperCase()}`;
        map.set(key, [...(map.get(key) ?? []), a.ownerClientName ?? "versión general"]);
      });
    return map;
  }, [catalog, packageClientId]);
  const inPackage = useMemo(
    () => new Set(existingItems.map((i) => `${i.type}|${i.code.toUpperCase()}`)),
    [existingItems]
  );

  const analyze = async (sources, label) => {
    setError(null);
    setResults(null);
    setExcluded(new Set());
    setVisibleCount(PAGE);
    setSource(label);
    setProgress({ done: 0, total: sources.length });

    const analyzed = [];
    const unreadable = [];
    for (let i = 0; i < sources.length; i++) {
      const { path, read } = sources[i];
      try {
        if (isReportFile(path)) analyzed.push(analyzeReport(path));
        else analyzed.push(...analyzeScript(path, decodeSqlBytes(await read())));
      } catch (err) {
        unreadable.push(`${path}: ${err.message}`);
      }
      if (i % 25 === 0 || i === sources.length - 1) setProgress({ done: i + 1, total: sources.length });
    }

    const groups = groupScripts(analyzed).map((g) => {
      const key = `${g.type}|${g.code.toUpperCase()}`;
      const match = catalogByKey.get(key);
      const others = otherVersionsByKey.get(key) ?? [];
      return {
        ...g,
        info: [
          ...(g.info ?? []),
          ...(!match && others.length > 0
            ? [`Con este nombre ya hay: ${others.join(", ")}. Se registra ${packageClientId ? `la versión de ${packageClientName}` : "la versión general"}.`]
            : []),
        ],
        key,
        productArtifactId: match?.id ?? null,
        ownerClientId: packageClientId || null,
        ownerClientName: packageClientId ? packageClientName : null,
        isNew: !match,
        alreadyInPackage: inPackage.has(key),
      };
    });
    setResults({ groups, unreadable, files: sources.length - unreadable.length });
    setProgress(null);
  };

  // El valor se limpia al abrir el selector (y no al leer): así se puede volver a elegir el mismo
  // archivo y, mientras tanto, la guía de KRUD ve que ya se eligió uno.
  const abrirSelector = (input) => {
    if (!input.current) return;
    input.current.value = "";
    input.current.click();
  };

  const onZipChosen = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setProgress({ done: 0, total: 0 });
      const entries = await listZipEntries(file);
      const files = entries.filter((e) => !e.isDirectory);
      const { chosen, note } = pickPackageFiles(files.map((e) => ({ path: e.name, entry: e })));
      if (chosen.length === 0) {
        setProgress(null);
        setError(`«${file.name}» no contiene archivos .sql ni reportes .rdl.`);
        return;
      }
      await analyze(
        chosen.map(({ path, entry }) => ({ path, read: () => readZipEntry(file, entry) })),
        note ? `${file.name} (${note})` : file.name
      );
    } catch (err) {
      setProgress(null);
      setError(err.message);
    }
  };

  const onFolderChosen = async (event) => {
    const all = [...(event.target.files ?? [])];
    const { chosen, note } = pickPackageFiles(all.map((f) => ({ path: f.webkitRelativePath || f.name, file: f })));
    if (chosen.length === 0) {
      setError("La carpeta elegida no contiene archivos .sql ni reportes .rdl.");
      return;
    }
    const folder = all[0]?.webkitRelativePath?.split("/")[0] ?? "";
    await analyze(
      chosen.map(({ path, file }) => ({ path, read: async () => new Uint8Array(await file.arrayBuffer()) })),
      `carpeta ${folder}${note ? ` (${note})` : ""}`
    );
  };

  const selectable = results?.groups.filter((g) => !g.alreadyInPackage) ?? [];
  const selected = selectable.filter((g) => !excluded.has(g.key));
  const shown = (results?.groups ?? [])
    .filter((g) => (filter === "new" ? g.isNew : filter === "warn" ? g.warnings.length > 0 : true))
    .filter((g) => !search || `${g.code} ${g.path}`.toLowerCase().includes(search.toLowerCase()));

  const toggle = (key) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const add = () => {
    onAdd(
      // Mismo orden que el análisis: scripts por ruta (y por posición dentro del archivo), reportes al final.
      selected.map((g) => ({
          key: `s-${g.key}`,
          productArtifactId: g.productArtifactId,
          type: g.type,
          code: g.code,
          path: g.path,
          isNew: g.isNew,
          ownerClientId: g.ownerClientId,
          ownerClientName: g.ownerClientName,
          notes: g.files.length > 1 ? `Archivos: ${g.files.map((f) => f.split("/").pop()).join(", ")}`.slice(0, 1000) : null,
        }))
    );
    setResults(null);
    setSource((prev) => `${prev} · ${pluralize(selected.length, "artefacto agregado", "artefactos agregados")}`);
  };

  const counts = results && {
    nuevos: results.groups.filter((g) => g.isNew).length,
    advertencias: results.groups.filter((g) => g.warnings.length).length,
  };

  return (
    <Box borderWidth="1px" borderColor="brand.200" _dark={{ borderColor: "brand.700" }} bg="accent.subtle" rounded="md" p={4}>
      <Flex justify="space-between" align={{ base: "start", md: "center" }} gap={3} wrap="wrap">
        <Box maxW="62ch">
          <Text fontWeight={700}>Detectar scripts y reportes del paquete</Text>
          <Text fontSize="sm" color="text.muted">
            Elige el comprimido que subiste a OneDrive o su carpeta. Se lee en tu equipo, no se sube a ningún lado. De cada .sql de
            SCRIPTS se registran todos los objetos que define, y cada reporte .rdl como reporte.
          </Text>
        </Box>
        <HStack>
          {/* La guía de KRUD lee el valor del input oculto: el contenedor lleva el data-guia. */}
          <Box display="inline-flex" data-guia="paquete.elegir-zip">
            <input ref={zipInput} type="file" accept=".zip,application/zip" hidden onChange={onZipChosen} />
            <Button size="sm" leftIcon={<FiPackage />} onClick={() => abrirSelector(zipInput)} isDisabled={!!progress}>
              Elegir comprimido .zip
            </Button>
          </Box>
          <Box display="inline-flex" data-guia="paquete.elegir-carpeta">
            <input ref={folderInput} type="file" hidden webkitdirectory="" directory="" multiple onChange={onFolderChosen} />
            <Button size="sm" variant="outline" leftIcon={<FiFolder />} onClick={() => abrirSelector(folderInput)} isDisabled={!!progress}>
              Carpeta del paquete
            </Button>
          </Box>
        </HStack>
      </Flex>

      {progress && (
        <Box mt={4}>
          <Text fontSize="sm" mb={1} className="tabular">
            {progress.total ? `Leyendo archivos: ${progress.done} de ${progress.total}` : "Leyendo el índice del comprimido…"}
          </Text>
          <Progress size="sm" rounded="full" value={progress.total ? (progress.done / progress.total) * 100 : undefined} isIndeterminate={!progress.total} />
        </Box>
      )}

      {error && (
        <Alert status="error" mt={4} rounded="md" fontSize="sm">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {!results && !progress && source && (
        <Text fontSize="sm" mt={3} color="text.muted">
          Último análisis: {source}
        </Text>
      )}

      {results && (
        <Stack spacing={3} mt={4}>
          <HStack spacing={2} wrap="wrap">
            <Badge colorScheme="brand" variant="solid">
              {pluralize(results.groups.length, "objeto")} en {pluralize(results.files, "archivo")}
            </Badge>
            <Badge colorScheme="green" variant="subtle">
              {pluralize(counts.nuevos, "nuevo")}
            </Badge>
            <Badge colorScheme="blue" variant="subtle">
              {pluralize(results.groups.length - counts.nuevos, "modificado")}
            </Badge>
            {counts.advertencias > 0 && (
              <Badge colorScheme="orange" variant="subtle">
                {counts.advertencias} con advertencia
              </Badge>
            )}
            <Text fontSize="xs" color="text.muted">
              {source}
            </Text>
          </HStack>

          {results.unreadable.length > 0 && (
            <Alert status="warning" rounded="md" fontSize="sm">
              <AlertIcon />
              No se pudieron leer {results.unreadable.length} archivos: {results.unreadable.slice(0, 3).join(" · ")}
            </Alert>
          )}

          <Flex gap={2} wrap="wrap" align="center">
            <ButtonGroup size="xs" isAttached variant="outline">
              {FILTERS.map((f) => (
                <Button key={f.key} variant={filter === f.key ? "solid" : "outline"} colorScheme={filter === f.key ? "brand" : "gray"} onClick={() => { setFilter(f.key); setVisibleCount(PAGE); }}>
                  {f.label}
                </Button>
              ))}
            </ButtonGroup>
            <Input id="script-filter" size="xs" maxW="240px" bg="bg.surface" placeholder="Buscar objeto o archivo" value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE); }} />
            <Checkbox
              size="sm"
              isChecked={selected.length === selectable.length && selectable.length > 0}
              isIndeterminate={selected.length > 0 && selected.length < selectable.length}
              onChange={(e) => setExcluded(e.target.checked ? new Set() : new Set(selectable.map((g) => g.key)))}
            >
              Elegir todos
            </Checkbox>
          </Flex>

          <Box maxH="360px" overflowY="auto" bg="bg.surface" rounded="md" borderWidth="1px" borderColor="border.subtle">
            <Table size="sm">
              <Thead position="sticky" top={0} bg="bg.surface" zIndex={1}>
                <Tr>
                  <Th w="32px" />
                  <Th>Objeto</Th>
                  <Th>Tipo</Th>
                  <Th>Cambio</Th>
                  <Th display={{ base: "none", lg: "table-cell" }}>Archivo</Th>
                </Tr>
              </Thead>
              <Tbody>
                {shown.slice(0, visibleCount).map((g) => (
                  <Tr key={g.key} opacity={g.alreadyInPackage ? 0.5 : 1}>
                    <Td>
                      <Checkbox
                        aria-label={`Incluir ${g.code}`}
                        isChecked={!g.alreadyInPackage && !excluded.has(g.key)}
                        isDisabled={g.alreadyInPackage}
                        onChange={() => toggle(g.key)}
                      />
                    </Td>
                    <Td maxW="300px">
                      <HStack spacing={1.5}>
                        <Mono fontSize="sm" noOfLines={1} title={g.code}>
                          {g.code}
                        </Mono>
                        {g.warnings.length > 0 ? (
                          <Tooltip label={[...g.warnings, ...g.info].join(" ")} hasArrow>
                            <Box as="span" color="orange.400" display="inline-flex">
                              <FiAlertTriangle />
                            </Box>
                          </Tooltip>
                        ) : (
                          g.info.length > 0 && (
                            <Tooltip label={g.info.join(" ")} hasArrow>
                              <Box as="span" color="text.muted" display="inline-flex">
                                <FiInfo />
                              </Box>
                            </Tooltip>
                          )
                        )}
                      </HStack>
                      {g.alreadyInPackage && (
                        <Text fontSize="xs" color="text.muted">
                          Ya está en el paquete
                        </Text>
                      )}
                    </Td>
                    <Td>
                      <ArtifactTypeLabel type={g.type} />
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <ChangeTypeBadge changeType={g.isNew ? "Added" : "Modified"} />
                        {g.ownerClientId && <CustomBadge clientName={g.ownerClientName} />}
                      </HStack>
                    </Td>
                    <Td display={{ base: "none", lg: "table-cell" }} maxW="320px">
                      <Mono fontSize="xs" color="text.muted" noOfLines={1} title={g.files.join("\n")}>
                        {g.path}
                      </Mono>
                      {g.files.length > 1 && (
                        <Text fontSize="xs" color="text.muted">
                          +{g.files.length - 1} archivo(s)
                        </Text>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {shown.length > visibleCount && (
              <Box textAlign="center" py={2}>
                <Button size="xs" variant="ghost" onClick={() => setVisibleCount((n) => n + PAGE * 3)}>
                  Mostrar más ({shown.length - visibleCount} restantes)
                </Button>
              </Box>
            )}
            {shown.length === 0 && (
              <Text fontSize="sm" color="text.muted" p={4} textAlign="center">
                Ningún objeto coincide con el filtro.
              </Text>
            )}
          </Box>

          <HStack justify="flex-end">
            <Button variant="ghost" colorScheme="gray" size="sm" onClick={() => setResults(null)}>
              Descartar
            </Button>
            <Button size="sm" onClick={add} isDisabled={selected.length === 0} data-guia="paquete.agregar-detectados">
              Agregar {pluralize(selected.length, "artefacto")} al paquete
            </Button>
          </HStack>
        </Stack>
      )}
    </Box>
  );
}
