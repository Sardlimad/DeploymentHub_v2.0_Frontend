import { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Link,
  PinInput,
  PinInputField,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiArrowLeft } from "react-icons/fi";
import AuthShell from "../components/auth/AuthShell";
import PasswordField, { PasswordChecklist } from "../components/auth/PasswordField";
import { isStrongPassword } from "../helpers/passwords";
import { requestPasswordRecovery, resetPassword, verifyRecoveryCode } from "../services/auth";
import { apiErrorMessage } from "../services/api";

const STEPS = ["Correo", "Código", "Nueva contraseña"];

function StepIndicator({ step }) {
  return (
    <HStack spacing={2} mb={6} aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
      {STEPS.map((label, i) => (
        <Box key={label} flex="1">
          <Box h="4px" rounded="full" bg={i <= step ? "brand.500" : "border.subtle"} />
          <Text fontSize="xs" mt={1.5} fontWeight={i === step ? 700 : 500} color={i === step ? "accent.fg" : "text.muted"}>
            {label}
          </Text>
        </Box>
      ))}
    </HStack>
  );
}

export default function PasswordRecovery() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const run = async (action) => {
    setError("");
    setLoading(true);
    try {
      await action();
    } catch (err) {
      setError(err.response ? apiErrorMessage(err) : "No hay conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const sendCode = (e) => {
    e?.preventDefault();
    if (!email.includes("@")) {
      setError("Escribe un correo válido.");
      return;
    }
    run(async () => {
      await requestPasswordRecovery(email.trim());
      setCode("");
      setNotice(`Si ${email.trim()} tiene una cuenta, le llegará un código de 6 dígitos. Vence en 15 minutos.`);
      setStep(1);
    });
  };

  const verify = (value = code) => {
    if (value.length !== 6) {
      setError("El código tiene 6 dígitos.");
      return;
    }
    run(async () => {
      await verifyRecoveryCode(email.trim(), value);
      setNotice("");
      setStep(2);
    });
  };

  const save = (e) => {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      setError("La contraseña no cumple los requisitos.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    run(async () => {
      await resetPassword(email.trim(), code, password);
      navigate("/login", { replace: true, state: { email: email.trim(), passwordReset: true } });
    });
  };

  return (
    <AuthShell
      title="Recupera tu contraseña"
      subtitle="Te enviaremos un código a tu correo para crear una nueva."
      footer={
        <Link as={RouterLink} to="/login" state={{ email: email.trim() }} fontSize="sm" color="accent.fg" fontWeight={600}>
          <HStack as="span" spacing={1.5} display="inline-flex">
            <FiArrowLeft />
            <span>Volver a iniciar sesión</span>
          </HStack>
        </Link>
      }
    >
      <StepIndicator step={step} />

      <Stack spacing={5}>
        {error && (
          <Alert status="error" rounded="md" fontSize="sm">
            <AlertIcon />
            {error}
          </Alert>
        )}
        {notice && !error && (
          <Alert status="info" rounded="md" fontSize="sm">
            <AlertIcon />
            {notice}
          </Alert>
        )}

        {step === 0 && (
          <Stack as="form" spacing={5} onSubmit={sendCode} noValidate>
            <FormControl isRequired>
              <FormLabel>Correo</FormLabel>
              <Input
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="lg"
              />
            </FormControl>
            <Button type="submit" size="lg" isLoading={loading} loadingText="Enviando">
              Enviar código
            </Button>
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={5}>
            <FormControl>
              <FormLabel>Código de 6 dígitos</FormLabel>
              <HStack spacing={2}>
                <PinInput
                  otp
                  autoFocus
                  size="lg"
                  value={code}
                  onChange={setCode}
                  onComplete={verify}
                  isDisabled={loading}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <PinInputField key={i} />
                  ))}
                </PinInput>
              </HStack>
            </FormControl>
            <Button size="lg" onClick={() => verify()} isLoading={loading} loadingText="Verificando">
              Verificar código
            </Button>
            <HStack justify="space-between" fontSize="sm">
              <Link
                color="accent.fg"
                fontWeight={600}
                onClick={() => {
                  setStep(0);
                  setNotice("");
                  setError("");
                }}
              >
                Cambiar correo
              </Link>
              <Link color="accent.fg" fontWeight={600} onClick={() => sendCode()}>
                Reenviar código
              </Link>
            </HStack>
          </Stack>
        )}

        {step === 2 && (
          <Stack as="form" spacing={5} onSubmit={save} noValidate>
            <FormControl isRequired>
              <FormLabel>Nueva contraseña</FormLabel>
              <PasswordField autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} size="lg" />
              <PasswordChecklist value={password} />
            </FormControl>
            <FormControl isRequired isInvalid={confirm.length > 0 && confirm !== password}>
              <FormLabel>Repite la contraseña</FormLabel>
              <PasswordField autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} size="lg" />
              <FormErrorMessage>No coincide con la anterior.</FormErrorMessage>
            </FormControl>
            <Button type="submit" size="lg" isLoading={loading} loadingText="Guardando">
              Guardar y volver a entrar
            </Button>
          </Stack>
        )}
      </Stack>
    </AuthShell>
  );
}
