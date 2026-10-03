import { useCallback, useContext, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
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
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  useToast,
  Wrap,
} from "@chakra-ui/react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import Mono from "../common/Mono";
import PageHeader from "../common/PageHeader";
import ConfirmDialog from "../common/ConfirmDialog";
import { ArtifactTypeLabel, CustomBadge } from "../common/StatusBadge";
import { EmptyBlock, ErrorBlock, LoadingRows } from "../common/DataState";
import { AuthContext } from "../../context/AuthContext";
import {
  addProductEnvironment,
  createProduct,
  createProductArtifact,
  deleteProduct,
  deleteProductArtifact,
  deleteProductEnvironment,
  listEnvironments,
  listProductArtifacts,
  listProducts,
  updateProduct,
  updateProductArtifact,
} from "../../services/catalog";
import { apiErrorMessage } from "../../services/api";
import { ArtifactType } from "../../helpers/deploymentStatus";
import { formatDate } from "../../helpers/format";

function useRun() {
  const toast = useToast();
  return async (fn, success) => {
    try {
      await fn();
      if (success) toast({ title: success, status: "success" });
      return true;
    } catch (err) {
      toast({ title: "No se pudo completar", description: apiErrorMessage(err), status: "error", duration: 6000 });
      return false;
    }
  };
}

function EnvironmentsTab({ product, environments, isAdmin, onChanged }) {
  const run = useRun();
  const [environmentId, setEnvironmentId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const available = environments.filter((e) => e.isActive && !product.environments.includes(e.id));

  return (
    <Stack spacing={4}>
      {product.productEnvironments.length === 0 ? (
        <Text fontSize="sm" color="text.muted">
          El producto todavía no tiene ambientes. Sin ambientes no se le pueden asignar clientes.
        </Text>
      ) : (
        <Stack spacing={2}>
          {product.productEnvironments.map((pe) => (
            <HStack key={pe.id} borderWidth="1px" borderColor="border.subtle" rounded="md" px={3} py={2} justify="space-between">
              <Box minW={0}>
                <HStack>
                  <Mono fontWeight={700}>{pe.environmentCode}</Mono>
                  <Text fontSize="sm" color="text.muted">
                    {pe.environmentName}
                  </Text>
                </HStack>
                {pe.baseUrl && (
                  <Mono fontSize="xs" color="text.muted" noOfLines={1}>
                    {pe.baseUrl}
                  </Mono>
                )}
              </Box>
              {isAdmin && (
                <Tooltip label="Quitar ambiente (solo si ningún cliente lo usa)">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    aria-label="Quitar ambiente"
                    icon={<FiTrash2 />}
                    onClick={() => run(() => deleteProductEnvironment(pe.id), "Ambiente quitado").then((ok) => ok && onChanged())}
                  />
                </Tooltip>
              )}
            </HStack>
          ))}
        </Stack>
      )}

      {isAdmin && available.length > 0 && (
        <Box borderWidth="1px" borderStyle="dashed" borderColor="border.subtle" rounded="md" p={3}>
          <Text fontSize="sm" fontWeight={700} mb={2}>
            Agregar ambiente
          </Text>
          <Flex gap={2} wrap="wrap">
            <Select id="pe-environment" size="sm" maxW="200px" placeholder="Ambiente" value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)}>
              {available.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} · {e.name}
                </option>
              ))}
            </Select>
            <Input id="pe-url" size="sm" flex="1" minW="200px" fontFamily="mono" placeholder="URL base (opcional)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            <Button
              size="sm"
              leftIcon={<FiPlus />}
              isDisabled={!environmentId}
              onClick={() =>
                run(() => addProductEnvironment({ productId: product.id, environmentId, baseUrl }), "Ambiente agregado").then((ok) => {
                  if (ok) {
                    setEnvironmentId("");
                    setBaseUrl("");
                    onChanged();
                  }
                })
              }
            >
              Agregar
            </Button>
          </Flex>
        </Box>
      )}
    </Stack>
  );
}

function ArtifactsTab({ product, isAdmin }) {
  const run = useRun();
  const [items, setItems] = useState(null);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ type: "StoredProcedure", code: "", name: "", path: "" });
  const addForm = useDisclosure();

  const load = useCallback(() => {
    listProductArtifacts(product.id, { type, search })
      .then(setItems)
      .catch(() => setItems([]));
  }, [product.id, type, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <Stack spacing={3}>
      <Flex gap={2} wrap="wrap">
        <Input id="artifacts-search" size="sm" maxW="240px" placeholder="Buscar código, nombre o ruta" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select id="artifacts-type" size="sm" maxW="220px" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.entries(ArtifactType).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {isAdmin && (
          <Button size="sm" variant="outline" leftIcon={<FiPlus />} onClick={addForm.onToggle}>
            Registrar a mano
          </Button>
        )}
      </Flex>

      {addForm.isOpen && (
        <Box borderWidth="1px" borderStyle="dashed" borderColor="border.subtle" rounded="md" p={3}>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={2}>
            <Select id="manual-type" size="sm" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              {Object.entries(ArtifactType).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input id="manual-code" size="sm" fontFamily="mono" placeholder="Código" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
            <Input id="manual-name" size="sm" placeholder="Nombre (opcional)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input id="manual-path" size="sm" fontFamily="mono" placeholder="Ruta (opcional)" value={draft.path} onChange={(e) => setDraft({ ...draft, path: e.target.value })} />
          </Grid>
          <HStack justify="flex-end" mt={2}>
            <Button
              size="sm"
              isDisabled={!draft.code.trim()}
              onClick={() =>
                run(
                  () =>
                    createProductArtifact({
                      productId: product.id,
                      type: draft.type,
                      code: draft.code.trim(),
                      name: draft.name.trim() || draft.code.trim(),
                      path: draft.path.trim() || null,
                      description: null,
                    }),
                  "Artefacto registrado"
                ).then((ok) => {
                  if (ok) {
                    setDraft({ ...draft, code: "", name: "", path: "" });
                    load();
                  }
                })
              }
            >
              Registrar
            </Button>
          </HStack>
        </Box>
      )}

      {items === null ? (
        <LoadingRows rows={4} height="40px" />
      ) : items.length === 0 ? (
        <Text fontSize="sm" color="text.muted" py={4}>
          No hay artefactos con ese filtro. Los artefactos entran al catálogo al crear un paquete o registrándolos a mano.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table>
            <Thead>
              <Tr>
                <Th>Artefacto</Th>
                <Th>Tipo</Th>
                <Th>Origen</Th>
                {isAdmin && <Th>Activo</Th>}
                {isAdmin && <Th w="40px" />}
              </Tr>
            </Thead>
            <Tbody>
              {items.map((a) => (
                <Tr key={a.id} opacity={a.isActive ? 1 : 0.55}>
                  <Td maxW="260px">
                    <Mono fontWeight={600}>{a.code}</Mono>
                    {a.path && (
                      <Mono display="block" fontSize="xs" color="text.muted" noOfLines={1}>
                        {a.path}
                      </Mono>
                    )}
                  </Td>
                  <Td>
                    <ArtifactTypeLabel type={a.type} />
                  </Td>
                  <Td>
                    <Box mb={1}>
                      {a.ownerClientId ? (
                        <CustomBadge clientName={a.ownerClientName} />
                      ) : (
                        <Badge colorScheme="gray" variant="outline" fontSize="xs">
                          General
                        </Badge>
                      )}
                    </Box>
                    {a.introducedInPackageId ? (
                      <Tooltip label={`Entró con un paquete el ${formatDate(a.createdAt)}`}>
                        <Badge colorScheme="green" variant="subtle">
                          Por paquete
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge colorScheme="gray" variant="subtle">
                        Manual
                      </Badge>
                    )}
                  </Td>
                  {isAdmin && (
                    <Td>
                      <Switch
                        size="sm"
                        isChecked={a.isActive}
                        aria-label="Activo"
                        onChange={(e) =>
                          run(() =>
                            updateProductArtifact(a.id, {
                              code: a.code,
                              name: a.name,
                              type: a.type,
                              description: a.description,
                              path: a.path,
                              isActive: e.target.checked,
                            })
                          ).then((ok) => ok && load())
                        }
                      />
                    </Td>
                  )}
                  {isAdmin && (
                    <Td>
                      <Tooltip label="Borrar (solo si no está en ningún paquete)">
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Borrar artefacto"
                          icon={<FiTrash2 />}
                          onClick={() => run(() => deleteProductArtifact(a.id), "Artefacto borrado").then((ok) => ok && load())}
                        />
                      </Tooltip>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}

function DataTab({ product, isAdmin, onChanged, onDeleted }) {
  const run = useRun();
  const [form, setForm] = useState({ code: product.code, name: product.name, isActive: product.isActive });
  const deleteDialog = useDisclosure();

  return (
    <Stack spacing={4}>
      <FormControl isRequired>
        <FormLabel>Código</FormLabel>
        <Input id="product-code" fontFamily="mono" value={form.code} isReadOnly={!isAdmin} onChange={(e) => setForm({ ...form, code: e.target.value })} maxLength={30} />
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Nombre</FormLabel>
        <Input id="product-name" value={form.name} isReadOnly={!isAdmin} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={150} />
      </FormControl>
      <FormControl display="flex" alignItems="center">
        <Switch id="product-active" isChecked={form.isActive} isDisabled={!isAdmin} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        <FormLabel htmlFor="product-active" mb={0} ml={3}>
          Activo (los inactivos no aparecen al crear solicitudes)
        </FormLabel>
      </FormControl>
      {isAdmin && (
        <HStack justify="space-between" pt={2}>
          <Button variant="ghost" colorScheme="red" leftIcon={<FiTrash2 />} onClick={deleteDialog.onOpen}>
            Borrar producto
          </Button>
          <Button
            isDisabled={!form.code.trim() || !form.name.trim()}
            onClick={() => run(() => updateProduct(product.id, form), "Producto actualizado").then((ok) => ok && onChanged())}
          >
            Guardar cambios
          </Button>
        </HStack>
      )}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.onClose}
        title={`Borrar ${product.name}`}
        body="Solo se puede borrar si no tiene ambientes. Si ya se usa, desactívalo."
        confirmLabel="Borrar"
        onConfirm={() => run(() => deleteProduct(product.id), "Producto borrado").then((ok) => ok && onDeleted())}
      />
    </Stack>
  );
}

export default function ProductsCatalog() {
  const run = useRun();
  const { hasRole } = useContext(AuthContext);
  const isAdmin = hasRole();
  const [products, setProducts] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [newProduct, setNewProduct] = useState({ code: "", name: "" });
  const createModal = useDisclosure();

  const load = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([listProducts(), listEnvironments()]);
      setProducts(p);
      setEnvironments(e);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = products.find((p) => p.id === openId);

  return (
    <>
      <PageHeader
        title="Productos"
        description="Las aplicaciones que se despliegan (ej: ClassLimitless), sus ambientes y su catálogo de artefactos."
        actions={
          isAdmin && (
            <Button
              leftIcon={<FiPlus />}
              onClick={() => {
                setNewProduct({ code: "", name: "" });
                createModal.onOpen();
              }}
            >
              Nuevo producto
            </Button>
          )
        }
      />
      <Card>
        <Box p={4}>
          {loading ? (
            <LoadingRows rows={4} />
          ) : error ? (
            <ErrorBlock message={error} onRetry={load} />
          ) : products.length === 0 ? (
            <EmptyBlock
              title="No hay productos"
              description="Registra el primer producto; luego asígnale ambientes y clientes."
              actionLabel={isAdmin ? "Nuevo producto" : undefined}
              onAction={createModal.onOpen}
            />
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Producto</Th>
                  <Th>Ambientes</Th>
                  <Th>Estado</Th>
                </Tr>
              </Thead>
              <Tbody>
                {products.map((p) => (
                  <Tr key={p.id} cursor="pointer" _hover={{ bg: "bg.hover" }} onClick={() => setOpenId(p.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpenId(p.id)}>
                    <Td>
                      <Text fontWeight={600}>{p.name}</Text>
                      <Mono fontSize="xs" color="text.muted">
                        {p.code}
                      </Mono>
                    </Td>
                    <Td>
                      <Wrap spacing={1}>
                        {p.productEnvironments.length === 0 ? (
                          <Text fontSize="sm" color="orange.500">
                            Sin ambientes
                          </Text>
                        ) : (
                          p.productEnvironments.map((pe) => (
                            <Badge key={pe.id} variant="outline" colorScheme="gray">
                              {pe.environmentCode}
                            </Badge>
                          ))
                        )}
                      </Wrap>
                    </Td>
                    <Td>
                      <Badge colorScheme={p.isActive ? "green" : "gray"} variant="subtle">
                        {p.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Card>

      <Drawer isOpen={!!open} onClose={() => setOpenId(null)} size="lg">
        <DrawerOverlay />
        <DrawerContent bg="bg.surface">
          <DrawerCloseButton />
          {open && (
            <>
              <DrawerHeader borderBottomWidth="1px" borderColor="border.subtle">
                {open.name}
                <Mono display="block" fontSize="sm" fontWeight={500} color="text.muted">
                  {open.code}
                </Mono>
              </DrawerHeader>
              <DrawerBody>
                <Tabs isLazy>
                  <TabList>
                    <Tab fontWeight={600}>Ambientes</Tab>
                    <Tab fontWeight={600}>Artefactos</Tab>
                    <Tab fontWeight={600}>Datos</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel px={0}>
                      <EnvironmentsTab product={open} environments={environments} isAdmin={isAdmin} onChanged={load} />
                    </TabPanel>
                    <TabPanel px={0}>
                      <ArtifactsTab product={open} isAdmin={isAdmin} />
                    </TabPanel>
                    <TabPanel px={0}>
                      <DataTab
                        key={`${open.id}-${open.code}-${open.name}-${open.isActive}`}
                        product={open}
                        isAdmin={isAdmin}
                        onChanged={load}
                        onDeleted={() => {
                          setOpenId(null);
                          load();
                        }}
                      />
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Nuevo producto</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Código</FormLabel>
                <Input id="new-product-code" fontFamily="mono" placeholder="CLASS" value={newProduct.code} onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })} maxLength={30} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Nombre</FormLabel>
                <Input id="new-product-name" placeholder="ClassLimitless" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} maxLength={150} />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" colorScheme="gray" onClick={createModal.onClose}>
              Volver
            </Button>
            <Button
              isDisabled={!newProduct.code.trim() || !newProduct.name.trim()}
              onClick={async () => {
                let id;
                const ok = await run(async () => {
                  id = await createProduct(newProduct);
                }, "Producto creado");
                if (ok) {
                  createModal.onClose();
                  await load();
                  setOpenId(id);
                }
              }}
            >
              Crear y configurar ambientes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
