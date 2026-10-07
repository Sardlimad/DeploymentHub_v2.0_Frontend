import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge,
  HStack,
  Box,
  Button,
  Card,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Link,
  Select,
  SimpleGrid,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import { FiSend } from "react-icons/fi";
import Layout from "../components/Layout";
import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/common/StatCard";
import Mono from "../components/common/Mono";
import { EmptyBlock, ErrorBlock, LoadingRows } from "../components/common/DataState";
import { AuthContext } from "../context/AuthContext";
import { getInstallations } from "../services/installations";
import { listEnvironments, listProducts } from "../services/catalog";
import { apiErrorMessage } from "../services/api";
import { RealtimeEvents } from "../services/deploymentsRealtime";
import { useRealtimeRefresh } from "../hooks/useDeploymentsRealtime";
import { formatDate } from "../helpers/format";
import { LogoMark } from "../components/brand/Logo";

// El símbolo de la marca como estado: la brecha entre lo instalado y lo publicado.
function VersionState({ installation }) {
  if (installation.pendingRequestId) {
    return (
      <HStack spacing={2}>
        <LogoMark size={18} estado="desplegando" />
        <Badge colorScheme="purple" variant="subtle">
          Actualización en curso
        </Badge>
      </HStack>
    );
  }
  if (installation.isOutdated) {
    return (
      <HStack spacing={2}>
        <LogoMark size={18} estado="desactualizado" />
        <Badge colorScheme="orange" variant="subtle">
          Desactualizado
        </Badge>
      </HStack>
    );
  }
  if (!installation.currentPackageId) {
    return (
      <Badge colorScheme="gray" variant="subtle">
        Sin despliegues
      </Badge>
    );
  }
  return (
    <HStack spacing={2}>
      <LogoMark size={18} estado="al-dia" />
      <Badge colorScheme="green" variant="subtle">
        Al día
      </Badge>
    </HStack>
  );
}

function ClientsStatusInner() {
  const navigate = useNavigate();
  const { hasRole } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const productId = params.get("product") ?? "";
  const environmentId = params.get("environment") ?? "";
  const onlyOutdated = params.get("outdated") === "1";
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [environments, setEnvironments] = useState([]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    try {
      setRows(
        await getInstallations({
          productId: productId || undefined,
          environmentId: environmentId || undefined,
        })
      );
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [productId, environmentId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([listProducts(), listEnvironments()])
      .then(([p, e]) => {
        setProducts(p);
        setEnvironments(e);
      })
      .catch(() => {});
  }, []);

  useRealtimeRefresh(load, (e) =>
    [RealtimeEvents.INSTALLATION_UPDATED, RealtimeEvents.DEPLOYMENT_SUBMITTED, RealtimeEvents.DEPLOYMENT_STATUS_CHANGED].includes(e.type)
  );

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!onlyOutdated || r.isOutdated) &&
          (!search || `${r.clientName} ${r.clientCode}`.toLowerCase().includes(search.toLowerCase()))
      ),
    [rows, onlyOutdated, search]
  );

  const outdated = rows.filter((r) => r.isOutdated);
  const upToDate = rows.filter((r) => r.currentPackageId && !r.isOutdated);
  const inProgress = rows.filter((r) => r.pendingRequestId);

  // Solo se puede crear una solicitud de un producto a la vez.
  const outdatedWithoutRequest = visible.filter((r) => r.isOutdated && !r.pendingRequestId);
  const productsInOutdated = [...new Set(outdatedWithoutRequest.map((r) => r.productId))];
  const canCreateFromHere = hasRole("DEVELOPER") && productsInOutdated.length === 1;

  const motivoSinActualizar =
    productsInOutdated.length > 1
      ? "Filtra por un producto para crear la solicitud"
      : outdatedWithoutRequest.length === 0
      ? "No hay clientes desactualizados sin solicitud"
      : "";

  return (
    <>
      <PageHeader
        title="Estado de clientes"
        description="Qué versión tiene cada cliente en cada ambiente, comparada con la última aplicada en ese producto y ambiente."
        actions={
          hasRole("DEVELOPER") && (
            <Tooltip label={motivoSinActualizar} isDisabled={canCreateFromHere}>
              <Button
                leftIcon={<FiSend />}
                isDisabled={!canCreateFromHere}
                // KRUD lee el title de un control desactivado para explicar por qué.
                title={canCreateFromHere ? undefined : motivoSinActualizar}
                data-guia="estado.actualizar-desactualizados"
                onClick={() =>
                  navigate("/deployments/new", {
                    state: { productId: productsInOutdated[0], installationIds: outdatedWithoutRequest.map((r) => r.id) },
                  })
                }
              >
                Actualizar desactualizados ({outdatedWithoutRequest.length})
              </Button>
            </Tooltip>
          )
        }
      />

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <StatCard label="Instalaciones" value={rows.length} hint="Cliente × producto × ambiente" />
        <StatCard label="Al día" value={upToDate.length} tone="success" />
        <StatCard label="Desactualizadas" value={outdated.length} tone="warning" onClick={() => setParam("outdated", "1")} />
        <StatCard label="Con actualización en curso" value={inProgress.length} tone="brand" />
      </SimpleGrid>

      <Card>
        <Flex gap={3} p={4} wrap="wrap" align="end">
          <Input id="status-search" maxW={{ base: "full", md: "260px" }} placeholder="Buscar cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select id="status-product" maxW={{ base: "full", md: "220px" }} value={productId} onChange={(e) => setParam("product", e.target.value)}>
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select id="status-environment" maxW={{ base: "full", md: "200px" }} value={environmentId} onChange={(e) => setParam("environment", e.target.value)}>
            <option value="">Todos los ambientes</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </Select>
          <FormControl display="flex" alignItems="center" w="auto">
            <Switch id="status-outdated" data-guia="estado.solo-desactualizados" isChecked={onlyOutdated} onChange={(e) => setParam("outdated", e.target.checked ? "1" : "")} />
            <FormLabel htmlFor="status-outdated" mb={0} ml={2} fontSize="sm">
              Solo desactualizados
            </FormLabel>
          </FormControl>
        </Flex>

        <Box px={4} pb={4}>
          {loading ? (
            <LoadingRows rows={6} />
          ) : error ? (
            <ErrorBlock message={error} onRetry={load} />
          ) : visible.length === 0 ? (
            <EmptyBlock
              title={rows.length === 0 ? "Todavía no hay clientes con productos asignados" : "Ningún cliente coincide con los filtros"}
              description={rows.length === 0 ? "Asigna productos a los clientes desde Catálogo › Clientes." : undefined}
              actionLabel={rows.length === 0 && hasRole() ? "Ir a clientes" : undefined}
              onAction={() => navigate("/catalogs/clients")}
            />
          ) : (
            <Box overflowX="auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Cliente</Th>
                    <Th>Producto</Th>
                    <Th>Ambiente</Th>
                    <Th>Versión actual</Th>
                    <Th display={{ base: "none", lg: "table-cell" }}>Última disponible</Th>
                    <Th>Estado</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {visible.map((r) => (
                    <Tr key={r.id} opacity={r.isActive ? 1 : 0.55}>
                      <Td>
                        <Text fontWeight={600}>{r.clientName}</Text>
                        <Mono fontSize="xs" color="text.muted">
                          {r.clientCode}
                        </Mono>
                      </Td>
                      <Td>{r.productName}</Td>
                      <Td>
                        <Mono>{r.environmentCode}</Mono>
                      </Td>
                      <Td maxW="260px">
                        <Text noOfLines={1}>{r.currentPackageDescription ?? "—"}</Text>
                        {r.currentPackageAppliedAt && (
                          <Text fontSize="xs" color="text.muted">
                            aplicado {formatDate(r.currentPackageAppliedAt)}
                          </Text>
                        )}
                      </Td>
                      <Td display={{ base: "none", lg: "table-cell" }} maxW="260px">
                        <Text noOfLines={1} color={r.isOutdated ? "orange.500" : "text.muted"}>
                          {r.latestPackageDescription ?? "—"}
                        </Text>
                      </Td>
                      <Td>
                        <VersionState installation={r} />
                        {r.pendingRequestId && (
                          <Link display="block" fontSize="xs" color="accent.fg" mt={1} onClick={() => navigate(`/deployments/${r.pendingRequestId}`)}>
                            DR-{String(r.pendingRequestNumber).padStart(6, "0")}
                          </Link>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </Card>
    </>
  );
}

export default function ClientsStatus() {
  return (
    <Layout>
      <ClientsStatusInner />
    </Layout>
  );
}
