import { useContext, useState } from "react";
import { Link as RouterLink, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { Alert, AlertIcon, Button, Flex, FormControl, FormLabel, Input, Link, Stack } from "@chakra-ui/react";
import { FiLogIn } from "react-icons/fi";
import AuthShell from "../components/auth/AuthShell";
import PasswordField from "../components/auth/PasswordField";
import { AuthContext } from "../context/AuthContext";
import { logIn } from "../services/auth";
import { apiErrorMessage } from "../services/api";

export default function Login() {
  const { login, token } = useContext(AuthContext);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const expired = !!searchParams.get("expired");
  const passwordReset = !!location.state?.passwordReset;
  // Si se llegó aquí desde una página protegida, se vuelve a ella al entrar.
  const redirectTo = location.state?.from ?? "/dashboard";

  if (token) return <Navigate to={redirectTo} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }
    setLoading(true);
    try {
      const res = await logIn({ email: email.trim(), password });
      login(res.data.accessToken, res.data.user, redirectTo);
    } catch (err) {
      setError(
        err.response
          ? apiErrorMessage(err, "No se pudo iniciar sesión.")
          : "No hay conexión con el servidor. Revisa que la API esté levantada."
      );
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Inicia sesión" subtitle="Usa el correo de tu cuenta de la empresa.">
      <Stack as="form" spacing={5} onSubmit={submit} noValidate>
        {error ? (
          <Alert status="error" rounded="md" fontSize="sm">
            <AlertIcon />
            {error}
          </Alert>
        ) : expired ? (
          <Alert status="info" rounded="md" fontSize="sm">
            <AlertIcon />
            Tu sesión venció. Vuelve a entrar para continuar.
          </Alert>
        ) : passwordReset ? (
          <Alert status="success" rounded="md" fontSize="sm">
            <AlertIcon />
            Contraseña actualizada. Ya puedes entrar con ella.
          </Alert>
        ) : null}

        <FormControl isRequired>
          <FormLabel>Correo</FormLabel>
          <Input
            type="email"
            autoComplete="username"
            autoFocus={!email}
            placeholder="nombre@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            size="lg"
          />
        </FormControl>

        <FormControl isRequired>
          <Flex justify="space-between" align="baseline">
            <FormLabel>Contraseña</FormLabel>
            <Link
              as={RouterLink}
              to="/auth/password_recovery"
              state={{ email: email.trim() }}
              fontSize="sm"
              color="accent.fg"
              fontWeight={600}
            >
              ¿La olvidaste?
            </Link>
          </Flex>
          <PasswordField
            autoComplete="current-password"
            autoFocus={!!email}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="lg"
          />
        </FormControl>

        <Button type="submit" size="lg" isLoading={loading} loadingText="Entrando" rightIcon={<FiLogIn />}>
          Entrar
        </Button>
      </Stack>
    </AuthShell>
  );
}
