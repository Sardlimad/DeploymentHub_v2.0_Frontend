import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Select,
  SimpleGrid,
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
  useRadio,
  useRadioGroup,
  useToast,
} from "@chakra-ui/react";
import { FiEdit2, FiMoreVertical, FiPlus, FiSearch, FiTrash2, FiUserCheck, FiUserX } from "react-icons/fi";
import Layout from "../components/Layout";
import PageHeader from "../components/common/PageHeader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { EmptyBlock, ErrorBlock, LoadingRows } from "../components/common/DataState";
import PasswordField, { PasswordChecklist } from "../components/auth/PasswordField";
import { isStrongPassword } from "../helpers/passwords";
import { AuthContext } from "../context/AuthContext";
import { createUser, deleteUser, getUsers, updateUser } from "../services/users";
import { getRoles } from "../services/roles";
import { apiErrorMessage } from "../services/api";
import { timeAgo, formatDateTime, pluralize } from "../helpers/format";
import { RoleAbilities, RoleColors, RoleLabels, roleCode } from "../helpers/roles";

const ROLE_ORDER = ["ADMIN", "INFRA", "DEVELOPER"];
const STATUS_FILTERS = { "": "Todos los estados", active: "Activos", inactive: "Inactivos", pending: "Sin contraseña" };

function userStatus(u) {
  if (!u.isActive) return { label: "Inactivo", color: "gray", hint: "No puede entrar." };
  if (!u.hasPassword) return { label: "Sin contraseña", color: "orange", hint: "Debe crearla con «¿La olvidaste?» en el inicio de sesión." };
  return { label: "Activo", color: "green" };
}

/** Tarjeta de rol seleccionable con lo que permite. */
function RoleCard({ code, isDisabled, ...radioProps }) {
  const { getInputProps, getRadioProps } = useRadio({ ...radioProps, isDisabled });
  return (
    <Box as="label" cursor={isDisabled ? "not-allowed" : "pointer"} opacity={isDisabled ? 0.6 : 1}>
      <input {...getInputProps()} />
      <Box
        {...getRadioProps()}
        h="full"
        borderWidth="1px"
        borderColor="border.subtle"
        rounded="md"
        p={3}
        _checked={{ borderColor: "brand.500", bg: "accent.subtle", boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)" }}
      >
        <Badge colorScheme={RoleColors[code]}>{RoleLabels[code]}</Badge>
        <Stack spacing={1} mt={2}>
          {RoleAbilities[code].map((a) => (
            <Text key={a} fontSize="xs" color="text.muted">
              · {a}
            </Text>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

function UserModal({ isOpen, onClose, editing, roles, currentUserId, onSaved }) {
  const toast = useToast();
  const isSelf = editing?.id === currentUserId;
  const [form, setForm] = useState({ name: "", email: "", roleId: "", isActive: true });
  const [passwordMode, setPasswordMode] = useState("user"); // "user" | "now" (alta) · "keep" | "reset" (edición)
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const developer = roles.find((r) => roleCode(r.name) === "DEVELOPER");
    setForm(
      editing
        ? { name: editing.name, email: editing.email, roleId: editing.roleId, isActive: editing.isActive }
        : { name: "", email: "", roleId: developer?.id ?? roles[0]?.id ?? "", isActive: true }
    );
    setPasswordMode(editing ? "keep" : "user");
    setPassword("");
  }, [isOpen, editing, roles]);

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: "role",
    value: form.roleId,
    onChange: (roleId) => setForm((f) => ({ ...f, roleId })),
  });

  const needsPassword = passwordMode === "now" || passwordMode === "reset";
  const emailInvalid = form.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const canSave =
    form.name.trim() && form.email.trim() && !emailInvalid && form.roleId && (!needsPassword || isStrongPassword(password));

  const save = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      roleId: form.roleId,
      ...(needsPassword ? { password } : {}),
    };
    try {
      if (editing) {
        await updateUser({ ...payload, id: editing.id, isActive: form.isActive });
        toast({ title: "Usuario actualizado", status: "success" });
      } else {
        await createUser(payload);
        toast({
          title: "Usuario creado",
          description: needsPassword
            ? "Ya puede entrar con la contraseña que definiste."
            : "Pídele que cree su contraseña con «¿La olvidaste?» en el inicio de sesión.",
          status: "success",
          duration: 6000,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: "No se pudo guardar", description: apiErrorMessage(err), status: "error" });
    } finally {
      setSaving(false);
    }
  };

  const orderedRoles = ROLE_ORDER.map((code) => roles.find((r) => roleCode(r.name) === code)).filter(Boolean);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={save} noValidate mx={4}>
        <ModalHeader>{editing ? `Editar a ${editing.name}` : "Nuevo usuario"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={5}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nombre completo</FormLabel>
                <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormControl>
              <FormControl isRequired isInvalid={emailInvalid}>
                <FormLabel>Correo</FormLabel>
                <Input
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <FormErrorMessage>Escribe un correo válido.</FormErrorMessage>
              </FormControl>
            </SimpleGrid>

            <FormControl isRequired>
              <FormLabel>Rol</FormLabel>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} {...getRootProps()}>
                {orderedRoles.map((role) => (
                  <RoleCard key={role.id} code={roleCode(role.name)} isDisabled={isSelf} {...getRadioProps({ value: role.id })} />
                ))}
              </SimpleGrid>
              {isSelf && <FormHelperText>No puedes cambiar tu propio rol.</FormHelperText>}
            </FormControl>

            <FormControl>
              <FormLabel>Contraseña</FormLabel>
              <RadioGroup value={passwordMode} onChange={setPasswordMode}>
                <Stack spacing={2}>
                  {editing ? (
                    <>
                      <Radio value="keep">Mantener la actual</Radio>
                      <Radio value="reset">Restablecerla ahora</Radio>
                    </>
                  ) : (
                    <>
                      <Radio value="user">Que la cree el usuario con «¿La olvidaste?» (recomendado)</Radio>
                      <Radio value="now">Definirla ahora y comunicársela</Radio>
                    </>
                  )}
                </Stack>
              </RadioGroup>
              {needsPassword && (
                <Box mt={3} maxW="sm">
                  <PasswordField autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <PasswordChecklist value={password} />
                </Box>
              )}
            </FormControl>

            {editing && (
              <FormControl display="flex" alignItems="center" gap={3}>
                <Switch
                  id="user-active"
                  isChecked={form.isActive}
                  isDisabled={isSelf}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <FormLabel htmlFor="user-active" mb={0}>
                  {form.isActive ? "Puede entrar" : "Desactivado: no puede entrar"}
                </FormLabel>
              </FormControl>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" colorScheme="gray" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saving} loadingText="Guardando" isDisabled={!canSave}>
            {editing ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useContext(AuthContext);
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(null); // { editing: user | null }
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([getUsers(), getRoles()]);
      setError(null);
      setUsers(usersRes.data);
      setRoles(rolesRes.data.filter((r) => r.isActive !== false));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // load() actualiza el estado después del await (carga asíncrona); la regla no lo distingue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const counts = useMemo(() => {
    const byRole = Object.fromEntries(ROLE_ORDER.map((code) => [code, 0]));
    (users ?? []).forEach((u) => (byRole[u.roleCode] = (byRole[u.roleCode] ?? 0) + 1));
    return byRole;
  }, [users]);

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return (users ?? [])
      .filter((u) => !text || `${u.name} ${u.email}`.toLowerCase().includes(text))
      .filter((u) => !roleFilter || u.roleCode === roleFilter)
      .filter(
        (u) =>
          !statusFilter ||
          (statusFilter === "active" && u.isActive) ||
          (statusFilter === "inactive" && !u.isActive) ||
          (statusFilter === "pending" && u.isActive && !u.hasPassword)
      )
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, "es"));
  }, [users, search, roleFilter, statusFilter]);

  const setActive = async (u, isActive) => {
    try {
      await updateUser({ id: u.id, name: u.name, email: u.email, roleId: u.roleId, isActive });
      toast({ title: isActive ? `${u.name} puede volver a entrar` : `${u.name} ya no puede entrar`, status: "success" });
      load();
    } catch (err) {
      toast({ title: "No se pudo cambiar el estado", description: apiErrorMessage(err), status: "error" });
    }
  };

  const remove = async () => {
    try {
      await deleteUser(toDelete.id);
      toast({ title: "Usuario eliminado", status: "success" });
      setToDelete(null);
      load();
    } catch (err) {
      toast({ title: "No se pudo eliminar", description: apiErrorMessage(err), status: "error" });
    }
  };

  const total = users?.length ?? 0;

  return (
    <Layout>
      <PageHeader
        title="Usuarios"
        description="Quién puede entrar y qué puede hacer. Desactiva a quien deje el equipo en lugar de eliminarlo: así se conserva su historial."
        actions={
          <Button leftIcon={<FiPlus />} onClick={() => setModal({ editing: null })} isDisabled={roles.length === 0}>
            Nuevo usuario
          </Button>
        }
      />

      <Flex gap={3} mb={4} wrap="wrap" align="center">
        <InputGroup maxW={{ base: "full", md: "300px" }}>
          <InputLeftElement pointerEvents="none" color="text.muted">
            <FiSearch />
          </InputLeftElement>
          <Input placeholder="Buscar por nombre o correo" value={search} onChange={(e) => setSearch(e.target.value)} bg="bg.surface" />
        </InputGroup>
        <ButtonGroup size="sm" isAttached variant="outline" colorScheme="gray" flexWrap="wrap">
          <Button onClick={() => setRoleFilter("")} isActive={!roleFilter}>
            Todos ({total})
          </Button>
          {ROLE_ORDER.map((code) => (
            <Button key={code} onClick={() => setRoleFilter(code)} isActive={roleFilter === code}>
              {RoleLabels[code]} ({counts[code] ?? 0})
            </Button>
          ))}
        </ButtonGroup>
        <Select size="sm" maxW="180px" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} bg="bg.surface">
          {Object.entries(STATUS_FILTERS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Flex>

      <Card overflow="hidden">
        {error ? (
          <ErrorBlock message={error} onRetry={load} />
        ) : users === null ? (
          <Box p={4}>
            <LoadingRows rows={4} height="52px" />
          </Box>
        ) : visible.length === 0 ? (
          <EmptyBlock
            title={total === 0 ? "Aún no hay usuarios" : "Ningún usuario coincide con el filtro"}
            actionLabel={total === 0 ? "Crear el primero" : "Quitar filtros"}
            onAction={() => {
              if (total === 0) setModal({ editing: null });
              setSearch("");
              setRoleFilter("");
              setStatusFilter("");
            }}
          />
        ) : (
          <Box overflowX="auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Usuario</Th>
                  <Th>Rol</Th>
                  <Th>Estado</Th>
                  <Th display={{ base: "none", md: "table-cell" }}>Último acceso</Th>
                  <Th w="1%" />
                </Tr>
              </Thead>
              <Tbody>
                {visible.map((u) => {
                  const status = userStatus(u);
                  const isSelf = u.id === me?.id;
                  return (
                    <Tr key={u.id} opacity={u.isActive ? 1 : 0.65} _hover={{ bg: "bg.hover" }}>
                      <Td>
                        <HStack spacing={3}>
                          <Avatar size="sm" name={u.name} bg={u.isActive ? "brand.600" : "gray.400"} color="white" />
                          <Box minW={0}>
                            <HStack spacing={2}>
                              <Text fontWeight={600} noOfLines={1}>
                                {u.name}
                              </Text>
                              {isSelf && (
                                <Badge colorScheme="brand" variant="subtle">
                                  Tú
                                </Badge>
                              )}
                            </HStack>
                            <Text fontSize="xs" color="text.muted" noOfLines={1}>
                              {u.email}
                            </Text>
                          </Box>
                        </HStack>
                      </Td>
                      <Td>
                        <Badge colorScheme={RoleColors[u.roleCode] ?? "gray"}>{RoleLabels[u.roleCode] ?? u.roleName}</Badge>
                      </Td>
                      <Td>
                        <Tooltip label={status.hint} isDisabled={!status.hint}>
                          <Badge colorScheme={status.color} variant="subtle">
                            {status.label}
                          </Badge>
                        </Tooltip>
                      </Td>
                      <Td display={{ base: "none", md: "table-cell" }} color="text.muted" fontSize="sm">
                        <Tooltip label={formatDateTime(u.lastLoginAt)} isDisabled={!u.lastLoginAt}>
                          <span>{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Nunca"}</span>
                        </Tooltip>
                      </Td>
                      <Td>
                        <HStack spacing={1} justify="flex-end">
                          <Button size="sm" variant="ghost" leftIcon={<FiEdit2 />} onClick={() => setModal({ editing: u })}>
                            Editar
                          </Button>
                          <Menu placement="bottom-end">
                            <MenuButton
                              as={IconButton}
                              size="sm"
                              variant="ghost"
                              colorScheme="gray"
                              icon={<FiMoreVertical />}
                              aria-label={`Más acciones para ${u.name}`}
                              isDisabled={isSelf}
                            />
                            <MenuList>
                              {u.isActive ? (
                                <MenuItem icon={<FiUserX />} onClick={() => setActive(u, false)}>
                                  Desactivar
                                </MenuItem>
                              ) : (
                                <MenuItem icon={<FiUserCheck />} onClick={() => setActive(u, true)}>
                                  Reactivar
                                </MenuItem>
                              )}
                              <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => setToDelete(u)}>
                                Eliminar
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </Card>
      {users && visible.length > 0 && (
        <Text fontSize="sm" color="text.muted" mt={3}>
          {visible.length === total ? pluralize(total, "usuario") : `${visible.length} de ${pluralize(total, "usuario")}`}
        </Text>
      )}

      <UserModal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        editing={modal?.editing ?? null}
        roles={roles}
        currentUserId={me?.id}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={`¿Eliminar a ${toDelete?.name}?`}
        body="Dejará de aparecer en la lista y no podrá entrar. Si solo deja de trabajar en el equipo, es mejor desactivarlo."
        confirmLabel="Eliminar"
      />
    </Layout>
  );
}
