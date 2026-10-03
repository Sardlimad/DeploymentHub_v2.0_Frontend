import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { FiArrowDown, FiArrowUp, FiDownload, FiPlus, FiSend, FiTrash2 } from "react-icons/fi";
import Layout from "../components/Layout";
import PageHeader from "../components/common/PageHeader";
import Mono from "../components/common/Mono";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { ArtifactTypeLabel, ChangeTypeBadge, CustomBadge } from "../components/common/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingRows } from "../components/common/DataState";
import ArtifactEditor from "../components/packages/ArtifactEditor";
import { AuthContext } from "../context/AuthContext";
import { addPackageArtifact, createPackage, deletePackage, getPackages, removePackageArtifact, updatePackageArtifact } from "../services/packages";
import { listClients, listProducts } from "../services/catalog";
import { apiErrorMessage } from "../services/api";
import { RealtimeEvents } from "../services/deploymentsRealtime";
import { useRealtimeRefresh } from "../hooks/useDeploymentsRealtime";
import { ArtifactType } from "../helpers/deploymentStatus";
import { toPackageArtifacts } from "../helpers/packageArtifacts";
import { formatDate } from "../helpers/format";
import { isValidUrl } from "../helpers/validations";

function PackageDrawer({ pkg, isOpen, onClose, onChanged, canEdit }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [draft, setDraft] = useState({ type: "StoredProcedure", code: "", path: "" });
  const [busy, setBusy] = useState(false);
  const deleteDialog = useDisclosure();
  const editable = canEdit && pkg && !pkg.isLocked;

  const run = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      if (message) toast({ title: message, status: "success" });
      await onChanged();
    } catch (err) {
      toast({ title: "No se pudo completar", description: apiErrorMessage(err), status: "error" });
    } finally {
      setBusy(false);
    }
  };

  // Mover = intercambiar el orden de ejecución con el vecino.
  const move = (index, delta) => {
    const a = pkg.artifacts[index];
    const b = pkg.artifacts[index + delta];
    run(async () => {
      await updatePackageArtifact(pkg.id, a.id, { executionOrder: b.executionOrder, notes: a.notes });
      await updatePackageArtifact(pkg.id, b.id, { executionOrder: a.executionOrder, notes: b.notes });
    });
  };

  const addDraft = () =>
    run(
      () => addPackageArtifact(pkg.id, { type: draft.type, code: draft.code.trim(), path: draft.path.trim() || null }),
      `${draft.code.trim().toUpperCase()} agregado`
    ).then(() => setDraft({ ...draft, code: "", path: "" }));

  if (!pkg) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="lg">
      <DrawerOverlay />
      <DrawerContent bg="bg.surface">
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor="border.subtle">
          <Text>{pkg.description}</Text>
          <Text fontSize="sm" fontWeight={500} color="text.muted">
            {pkg.productName} · creado {formatDate(pkg.createdAt)}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          <Stack spacing={5} py={2}>
            {pkg.isCustom && (
              <Alert status="info" rounded="md" fontSize="sm" colorScheme="purple">
                <AlertIcon />
                Actualización personalizada para {pkg.customClientName}: solo se puede enviar a ese cliente y no cambia su versión vigente.
              </Alert>
            )}
            {pkg.isLocked ? (
              <Alert status="info" rounded="md" fontSize="sm">
                <AlertIcon />
                Ya se envió en una solicitud: su contenido quedó fijo para conservar lo desplegado.
              </Alert>
            ) : (
              <Text fontSize="sm" color="text.muted">
                Puedes cambiar los artefactos hasta que el paquete se envíe en una solicitud.
              </Text>
            )}

            {pkg.packageUrl ? (
              <Button as="a" href={pkg.packageUrl} target="_blank" rel="noopener noreferrer" variant="outline" leftIcon={<FiDownload />} alignSelf="start">
                Descargar paquete
              </Button>
            ) : (
              <Text fontSize="sm" color="orange.500">
                Este paquete no tiene enlace al comprimido.
              </Text>
            )}

            {(pkg.branch || pkg.commitId) && (
              <Grid templateColumns="1fr 1fr" gap={4}>
                <Box>
                  <Text fontSize="xs" color="text.muted" fontWeight={600}>
                    Rama
                  </Text>
                  <Mono>{pkg.branch ?? "—"}</Mono>
                </Box>
                <Box>
                  <Text fontSize="xs" color="text.muted" fontWeight={600}>
                    Commit
                  </Text>
                  <Mono>{pkg.commitId?.slice(0, 10) ?? "—"}</Mono>
                </Box>
              </Grid>
            )}

            <Stack spacing={1.5}>
              {pkg.artifacts.map((a, index) => (
                <HStack key={a.id} borderWidth="1px" borderColor={a.isNew ? "green.300" : "border.subtle"} rounded="md" px={3} py={2} spacing={3}>
                  <Text fontSize="sm" color="text.muted" w="24px" className="tabular">
                    {a.executionOrder}.
                  </Text>
                  <Box flex="1" minW={0}>
                    <HStack spacing={2}>
                      <Mono fontWeight={600} noOfLines={1}>
                        {a.code}
                      </Mono>
                      <ChangeTypeBadge changeType={a.changeType} />
                      {a.ownerClientId && <CustomBadge clientName={a.ownerClientName} />}
                    </HStack>
                    <ArtifactTypeLabel type={a.type} />
                  </Box>
                  {editable && (
                    <>
                      <IconButton size="xs" variant="ghost" colorScheme="gray" aria-label="Subir" icon={<FiArrowUp />} isDisabled={index === 0 || busy} onClick={() => move(index, -1)} />
                      <IconButton size="xs" variant="ghost" colorScheme="gray" aria-label="Bajar" icon={<FiArrowDown />} isDisabled={index === pkg.artifacts.length - 1 || busy} onClick={() => move(index, 1)} />
                      <Tooltip label={a.isNew ? "Quitar (también sale del catálogo si ningún otro paquete lo usa)" : "Quitar del paquete"}>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Quitar"
                          icon={<FiTrash2 />}
                          isDisabled={busy}
                          onClick={() => run(() => removePackageArtifact(pkg.id, a.id), `${a.code} quitado`)}
                        />
                      </Tooltip>
                    </>
                  )}
                </HStack>
              ))}
            </Stack>

            {editable && (
              <Box borderWidth="1px" borderStyle="dashed" borderColor="border.subtle" rounded="md" p={3}>
                <Text fontSize="sm" fontWeight={700} mb={2}>
                  Agregar artefacto
                </Text>
                <Stack spacing={2}>
                  <HStack>
                    <Select id="drawer-artifact-type" size="sm" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                      {Object.entries(ArtifactType).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Input id="drawer-artifact-code" size="sm" fontFamily="mono" placeholder="Código" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
                  </HStack>
                  <Input id="drawer-artifact-path" size="sm" fontFamily="mono" placeholder="Ruta (opcional)" value={draft.path} onChange={(e) => setDraft({ ...draft, path: e.target.value })} />
                  <Text fontSize="xs" color="text.muted">
                    Se usa {pkg.isCustom ? `la versión de ${pkg.customClientName}` : "la versión general"}; si no existe, entra como «Nuevo».
                  </Text>
                  <Button
                    size="sm"
                    leftIcon={<FiPlus />}
                    alignSelf="start"
                    isDisabled={!draft.code.trim()}
                    isLoading={busy}
                    // Por código se usa la versión del destinatario del paquete (o se crea), así que no hay conflicto.
                    onClick={addDraft}
                  >
                    Agregar
                  </Button>
                </Stack>
              </Box>
            )}
          </Stack>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px" borderColor="border.subtle" justifyContent="space-between">
          {editable ? (
            <Button variant="ghost" colorScheme="red" leftIcon={<FiTrash2 />} onClick={deleteDialog.onOpen}>
              Borrar paquete
            </Button>
          ) : (
            <span />
          )}
          {canEdit && (
            <Button
              leftIcon={<FiSend />}
              isDisabled={pkg.artifacts.length === 0}
              onClick={() => navigate("/deployments/new", { state: { productId: pkg.productId, packageId: pkg.id } })}
            >
              Crear solicitud con este paquete
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.onClose}
        title="Borrar paquete"
        body="Los artefactos que entraron al catálogo con este paquete y no usa ningún otro también se retiran del catálogo."
        confirmLabel="Borrar"
        onConfirm={() =>
          run(() => deletePackage(pkg.id), "Paquete borrado").then(() => onClose())
        }
      />
    </Drawer>
  );
}

function NewPackageModal({ isOpen, onClose, products, clients, onCreated }) {
  const toast = useToast();
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");
  const [packageUrl, setPackageUrl] = useState("");
  // "" = paquete general · null = personalizado sin cliente elegido · id del cliente
  const [customClientId, setCustomClientId] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProductId(products.length === 1 ? products[0].id : "");
      setDescription("");
      setPackageUrl("");
      setCustomClientId("");
      setItems([]);
    }
  }, [isOpen, products]);

  const save = async () => {
    setSaving(true);
    try {
      const created = await createPackage({
        productId,
        description: description.trim(),
        packageUrl: packageUrl || null,
        customClientId: customClientId || null,
        artifacts: toPackageArtifacts(items),
      });
      toast({
        title: "Paquete creado",
        description: created.newArtifactsCount ? `${created.newArtifactsCount} artefactos nuevos entraron al catálogo.` : undefined,
        status: "success",
      });
      onCreated(created);
      onClose();
    } catch (err) {
      toast({ title: "No se pudo crear el paquete", description: apiErrorMessage(err), status: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Nuevo paquete</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <Grid templateColumns={{ base: "1fr", md: "1fr 2fr" }} gap={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Producto</FormLabel>
                <Select id="new-package-product" placeholder="Elige un producto" value={productId} onChange={(e) => { setProductId(e.target.value); setItems([]); }}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Descripción</FormLabel>
                <Input id="new-package-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anulación de facturas en Cajas" maxLength={500} />
              </FormControl>
            </Grid>
            <FormControl isInvalid={!!packageUrl && !isValidUrl(packageUrl)}>
              <FormLabel fontSize="sm">Enlace del paquete en OneDrive</FormLabel>
              <Input id="new-package-url" type="url" placeholder="https://…sharepoint.com/…" value={packageUrl} onChange={(e) => setPackageUrl(e.target.value.trim())} maxLength={1000} />
            </FormControl>
            <HStack spacing={4} align="end" wrap="wrap">
              <FormControl display="flex" alignItems="center" w="auto">
                <Switch id="new-package-custom" colorScheme="purple" isChecked={customClientId !== ""} onChange={(e) => setCustomClientId(e.target.checked ? null : "")} />
                <FormLabel htmlFor="new-package-custom" mb={0} ml={3}>
                  Actualización personalizada
                </FormLabel>
              </FormControl>
              {customClientId !== "" && (
                <Select id="new-package-client" size="sm" maxW="280px" placeholder="Cliente" value={customClientId ?? ""} onChange={(e) => setCustomClientId(e.target.value || null)}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </HStack>
            {productId ? (
              <ArtifactEditor
                productId={productId}
                items={items}
                onChange={setItems}
                packageClientId={customClientId || ""}
                packageClientName={clients.find((c) => c.id === customClientId)?.name ?? null}
              />
            ) : (
              <Text fontSize="sm" color="text.muted">
                Elige el producto para buscar en su catálogo.
              </Text>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" colorScheme="gray" onClick={onClose}>
            Volver
          </Button>
          <Button onClick={save} isLoading={saving} isDisabled={!productId || !description.trim() || items.length === 0 || (!!packageUrl && !isValidUrl(packageUrl)) || customClientId === null}>
            Crear paquete
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function PackagesInner() {
  const { hasRole } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const productId = params.get("product") ?? "";
  const [packages, setPackages] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const newModal = useDisclosure();
  const canEdit = hasRole("DEVELOPER");

  const load = useCallback(async () => {
    try {
      setPackages(await getPackages(productId || undefined));
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    listProducts().then((p) => setProducts(p.filter((x) => x.isActive))).catch(() => {});
    listClients().then((c) => setClients(c.filter((x) => x.isActive))).catch(() => {});
  }, []);

  useRealtimeRefresh(load, (e) => e.type === RealtimeEvents.ARTIFACT_ADDED_TO_CATALOG || e.type === RealtimeEvents.DEPLOYMENT_SUBMITTED);

  const openPackage = useMemo(() => packages.find((p) => p.id === openId), [packages, openId]);

  return (
    <>
      <PageHeader
        title="Paquetes"
        description="Un paquete es el conjunto ordenado de artefactos que se ejecuta en cada cliente. Los artefactos «Nuevo» entraron al catálogo con ese paquete."
        actions={
          canEdit && (
            <Button leftIcon={<FiPlus />} onClick={newModal.onOpen}>
              Nuevo paquete
            </Button>
          )
        }
      />

      <Card>
        <Flex p={4} gap={3}>
          <Select
            id="packages-product"
            maxW="260px"
            value={productId}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              e.target.value ? next.set("product", e.target.value) : next.delete("product");
              setParams(next, { replace: true });
            }}
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Flex>
        <Box px={4} pb={4}>
          {loading ? (
            <LoadingRows rows={5} />
          ) : error ? (
            <ErrorBlock message={error} onRetry={load} />
          ) : packages.length === 0 ? (
            <EmptyBlock
              title="Todavía no hay paquetes"
              description="Crea uno aquí o directamente desde «Nueva solicitud»."
              actionLabel={canEdit ? "Nuevo paquete" : undefined}
              onAction={newModal.onOpen}
            />
          ) : (
            <Box overflowX="auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Paquete</Th>
                    <Th>Producto</Th>
                    <Th isNumeric>Artefactos</Th>
                    <Th>Estado</Th>
                    <Th display={{ base: "none", md: "table-cell" }}>Creado</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {packages.map((p) => (
                    <Tr key={p.id} cursor="pointer" _hover={{ bg: "bg.hover" }} onClick={() => setOpenId(p.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenId(p.id)}>
                      <Td maxW="360px">
                        <HStack spacing={2}>
                          <Text fontWeight={600} noOfLines={1}>
                            {p.description}
                          </Text>
                          {p.isCustom && <CustomBadge clientName={p.customClientName} />}
                        </HStack>
                        {(p.branch || p.commitId) && (
                          <Mono fontSize="xs" color="text.muted">
                            {[p.branch, p.commitId?.slice(0, 8)].filter(Boolean).join(" · ")}
                          </Mono>
                        )}
                      </Td>
                      <Td>{p.productName}</Td>
                      <Td isNumeric className="tabular">
                        {p.artifacts.length}
                        {p.newArtifactsCount > 0 && (
                          <Badge ml={2} colorScheme="green" variant="solid">
                            {p.newArtifactsCount} nuevos
                          </Badge>
                        )}
                      </Td>
                      <Td>
                        {p.isLocked ? (
                          <Badge colorScheme="purple" variant="subtle">
                            Enviado
                          </Badge>
                        ) : (
                          <Badge colorScheme="gray" variant="subtle">
                            Editable
                          </Badge>
                        )}
                      </Td>
                      <Td display={{ base: "none", md: "table-cell" }}>{formatDate(p.createdAt)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </Card>

      <PackageDrawer pkg={openPackage} isOpen={!!openPackage} onClose={() => setOpenId(null)} onChanged={load} canEdit={canEdit} />
      <NewPackageModal
        isOpen={newModal.isOpen}
        onClose={newModal.onClose}
        products={products}
        clients={clients}
        onCreated={async (created) => {
          await load();
          setOpenId(created.id);
        }}
      />
    </>
  );
}

export default function Packages() {
  return (
    <Layout>
      <PackagesInner />
    </Layout>
  );
}
