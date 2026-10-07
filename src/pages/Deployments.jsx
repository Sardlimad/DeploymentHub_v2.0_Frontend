import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Tab,
  TabList,
  Table,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { FiChevronRight, FiPlus, FiSearch, FiUser } from "react-icons/fi";
import Layout from "../components/Layout";
import PageHeader from "../components/common/PageHeader";
import Mono from "../components/common/Mono";
import TargetProgress from "../components/common/TargetProgress";
import { CustomBadge, RequestStatusBadge } from "../components/common/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingRows } from "../components/common/DataState";
import { AuthContext } from "../context/AuthContext";
import { searchDeploymentRequests } from "../services/deploymentRequests";
import { listClients, listProducts } from "../services/catalog";
import { apiErrorMessage } from "../services/api";
import { useRealtimeRefresh } from "../hooks/useDeploymentsRealtime";
import { REQUEST_VIEWS } from "../helpers/deploymentStatus";
import { formatDate, timeAgo } from "../helpers/format";

const PAGE_SIZE = 20;

function DeploymentsInner() {
  const navigate = useNavigate();
  const { hasRole } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const view = REQUEST_VIEWS.find((v) => v.key === params.get("view")) ?? REQUEST_VIEWS[0];
  const productId = params.get("product") ?? "";
  const clientId = params.get("client") ?? "";
  const onlyMine = params.get("mine") === "1";
  const page = Number(params.get("page") ?? 1);
  const [search, setSearch] = useState(params.get("q") ?? "");

  const [result, setResult] = useState({ items: [], totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);

  const updateParams = useCallback(
    (changes) => {
      const next = new URLSearchParams(params);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) next.delete(key);
        else next.set(key, value);
      });
      if (!("page" in changes)) next.delete("page");
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  // La búsqueda se aplica al dejar de escribir.
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((params.get("q") ?? "") !== search) updateParams({ q: search });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, params, updateParams]);

  const query = useMemo(
    () => ({
      statuses: view.statuses,
      productId: productId || undefined,
      clientId: clientId || undefined,
      search: params.get("q") || undefined,
      mine: onlyMine || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [view, productId, clientId, onlyMine, params, page]
  );

  const load = useCallback(async () => {
    try {
      setResult(await searchDeploymentRequests(query));
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([listProducts(), listClients()])
      .then(([p, c]) => {
        setProducts(p);
        setClients(c);
      })
      .catch(() => {
        // Los filtros son opcionales: sin catálogo la lista sigue funcionando.
      });
  }, []);

  useRealtimeRefresh(load, (event) => !!event.requestId);

  const from = result.totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, result.totalCount);
  const hasFilters = productId || clientId || params.get("q") || onlyMine;

  return (
    <>
      <PageHeader
        title="Solicitudes"
        description="Cada solicitud lleva un paquete a uno o varios clientes. Abre una para ver el estado de cada cliente."
        actions={
          hasRole("DEVELOPER") && (
            <Button leftIcon={<FiPlus />} onClick={() => navigate("/deployments/new")}>
              Nueva solicitud
            </Button>
          )
        }
      />

      <Card>
        <Box px={4} pt={3}>
          <Tabs
            index={REQUEST_VIEWS.indexOf(view)}
            onChange={(i) => updateParams({ view: REQUEST_VIEWS[i].key })}
            variant="line"
            size="sm"
          >
            <TabList overflowX="auto" overflowY="hidden">
              {REQUEST_VIEWS.map((v) => (
                <Tab key={v.key} fontWeight={600} whiteSpace="nowrap">
                  {v.label}
                </Tab>
              ))}
            </TabList>
          </Tabs>
        </Box>

        <Flex gap={3} p={4} wrap="wrap">
          <InputGroup maxW={{ base: "full", md: "320px" }}>
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="text.muted" />
            </InputLeftElement>
            <Input
              id="requests-search"
              placeholder="DR-000012, ticket o descripción"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          <Select
            id="requests-product"
            maxW={{ base: "full", md: "220px" }}
            value={productId}
            onChange={(e) => updateParams({ product: e.target.value })}
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            id="requests-client"
            maxW={{ base: "full", md: "220px" }}
            value={clientId}
            onChange={(e) => updateParams({ client: e.target.value })}
          >
            <option value="">Todos los clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {hasRole("DEVELOPER") && (
            <Button
              variant={onlyMine ? "solid" : "outline"}
              colorScheme={onlyMine ? "brand" : "gray"}
              leftIcon={<FiUser />}
              onClick={() => updateParams({ mine: onlyMine ? "" : "1" })}
              aria-pressed={onlyMine}
            >
              Mis solicitudes
            </Button>
          )}
          {hasFilters && (
            <Button
              variant="ghost"
              colorScheme="gray"
              onClick={() => {
                setSearch("");
                updateParams({ product: "", client: "", q: "", mine: "" });
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </Flex>

        <Box px={4} pb={4}>
          {loading ? (
            <LoadingRows rows={6} height="52px" />
          ) : error ? (
            <ErrorBlock message={error} onRetry={load} />
          ) : result.items.length === 0 ? (
            <EmptyBlock
              title={hasFilters ? "Ninguna solicitud coincide con los filtros" : `No hay solicitudes en «${view.label}»`}
              description={hasFilters ? "Prueba con otro texto o quita algún filtro." : undefined}
              actionLabel={!hasFilters && hasRole("DEVELOPER") ? "Crear solicitud" : undefined}
              onAction={() => navigate("/deployments/new")}
            />
          ) : (
            <Box overflowX="auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Solicitud</Th>
                    <Th display={{ base: "none", lg: "table-cell" }}>Producto</Th>
                    <Th minW="180px">Progreso</Th>
                    <Th>Estado</Th>
                    <Th display={{ base: "none", md: "table-cell" }}>Solicitada por</Th>
                    <Th display={{ base: "none", md: "table-cell" }}>Fecha</Th>
                    <Th w="40px" />
                  </Tr>
                </Thead>
                <Tbody>
                  {result.items.map((r) => (
                    <Tr data-guia="solicitudes.fila"
                      key={r.id}
                      cursor="pointer"
                      _hover={{ bg: "bg.hover" }}
                      onClick={() => navigate(`/deployments/${r.id}`)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && navigate(`/deployments/${r.id}`)}
                    >
                      <Td maxW="360px">
                        <HStack spacing={2}>
                          <Mono fontWeight={700} color="accent.fg">
                            {r.displayNumber}
                          </Mono>
                          {r.isCustom && <CustomBadge clientName={r.customClientName} />}
                        </HStack>
                        <Text noOfLines={1} fontWeight={600}>
                          {r.packageDescription || r.comment || "Sin descripción"}
                        </Text>
                      </Td>
                      <Td display={{ base: "none", lg: "table-cell" }}>{r.productName ?? "—"}</Td>
                      <Td>
                        {r.targetsTotal > 0 ? (
                          <TargetProgress
                            applied={r.targetsApplied}
                            failed={r.targetsFailed}
                            pending={r.targetsPending}
                            total={r.targetsTotal}
                          />
                        ) : (
                          <Text fontSize="xs" color="text.muted">
                            Sin clientes
                          </Text>
                        )}
                      </Td>
                      <Td>
                        <RequestStatusBadge status={r.status} />
                      </Td>
                      <Td display={{ base: "none", md: "table-cell" }}>
                        {r.createdByName ? (
                          <HStack spacing={2}>
                            <Avatar size="xs" name={r.createdByName} bg="brand.600" color="white" />
                            <Box minW={0}>
                              <Text fontSize="sm" noOfLines={1}>
                                {r.createdByName}
                              </Text>
                              {r.submittedByName && r.submittedById !== r.createdById && (
                                <Text fontSize="xs" color="text.muted" noOfLines={1}>
                                  envió {r.submittedByName}
                                </Text>
                              )}
                            </Box>
                          </HStack>
                        ) : (
                          <Text fontSize="sm" color="text.muted">
                            —
                          </Text>
                        )}
                      </Td>
                      <Td display={{ base: "none", md: "table-cell" }}>
                        <Text fontSize="sm">{r.submittedAt ? timeAgo(r.submittedAt) : formatDate(r.createdAt)}</Text>
                        <Text fontSize="xs" color="text.muted">
                          {r.submittedAt ? "enviada" : "creada"}
                        </Text>
                      </Td>
                      <Td>
                        <Icon as={FiChevronRight} color="text.muted" />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}

          {result.totalCount > PAGE_SIZE && (
            <HStack justify="space-between" pt={4}>
              <Text fontSize="sm" color="text.muted" className="tabular">
                {from}–{to} de {result.totalCount}
              </Text>
              <HStack>
                <Button size="sm" variant="outline" isDisabled={page <= 1} onClick={() => updateParams({ page: page - 1 })}>
                  Anterior
                </Button>
                <Button size="sm" variant="outline" isDisabled={to >= result.totalCount} onClick={() => updateParams({ page: page + 1 })}>
                  Siguiente
                </Button>
              </HStack>
            </HStack>
          )}
        </Box>
      </Card>
    </>
  );
}

export default function Deployments() {
  return (
    <Layout>
      <DeploymentsInner />
    </Layout>
  );
}
