import { useId } from "react";
import { Box, HStack, Text, useColorModeValue } from "@chakra-ui/react";

/*
  Identidad «Paralaje».

  Dos cuadrados iguales: el sólido es lo que el cliente tiene instalado; el de contorno, la última
  versión publicada. Donde se cruzan está lo que ya coincide. El desfase es la brecha que
  DeploymentHub mide y ayuda a cerrar; por eso el mismo símbolo sirve de estado:
  desfase completo = desactualizado, a la mitad = desplegando, sin desfase = al día.

  Retícula de 4 × 4 módulos de 26 u: cuadrados de 3 módulos y desfase de 1.
*/

const COLORES = {
  claro: { instalado: "#0d4351", publicado: "#1f8ea8", coincide: "#45a9bf" },
  oscuro: { instalado: "#e7f4f7", publicado: "#45a9bf", coincide: "#45a9bf" },
};

/** Desplazamiento del cuadrado instalado respecto del publicado, por estado. */
const DESFASE = { desactualizado: 0, desplegando: 13, "al-dia": 26 };

/**
 * Isotipo. `size` en px. `estado` cambia el desfase (el logotipo usa «desactualizado»:
 * el instante antes de ponerse al día). `tono` fuerza claro u oscuro; por omisión sigue el tema.
 */
export function LogoMark({ size = 28, estado = "desactualizado", tono, title }) {
  const id = useId().replace(/:/g, "");
  const delTema = useColorModeValue("claro", "oscuro");
  const c = COLORES[tono ?? delTema];
  // A tamaños pequeños el contorno se engrosa para que no desaparezca.
  const trazo = size <= 20 ? 12 : size <= 36 ? 10 : 8;
  const mitad = trazo / 2;
  const d = DESFASE[estado] ?? 0;

  return (
    <svg width={size} height={size} viewBox="0 0 104 104" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <clipPath id={`cruce-${id}`}>
          <rect x={d} y={26 - d} width="78" height="78" rx="16" />
        </clipPath>
      </defs>
      {estado === "al-dia" ? (
        <rect x="26" y="0" width="78" height="78" rx="16" fill={c.coincide} />
      ) : (
        <>
          <rect x={26 + mitad} y={mitad} width={78 - trazo} height={78 - trazo} rx={16 - mitad} fill="none" stroke={c.publicado} strokeWidth={trazo} />
          <rect x={d} y={26 - d} width="78" height="78" rx="16" fill={c.instalado} />
          <rect x="26" y="0" width="78" height="78" rx="16" fill={c.coincide} clipPath={`url(#cruce-${id})`} />
        </>
      )}
      {estado === "al-dia" && (
        <rect x={26 + mitad} y={mitad} width={78 - trazo} height={78 - trazo} rx={16 - mitad} fill="none" stroke={c.publicado} strokeWidth={trazo} />
      )}
    </svg>
  );
}

/** «Deployment» en negrita y «Hub» ligero, en el color de acento (`acento` sobre fondos oscuros). */
export function Wordmark({ fontSize = "md", color, acento }) {
  return (
    <Text as="span" fontSize={fontSize} letterSpacing="-0.035em" lineHeight={1} whiteSpace="nowrap" color={color}>
      <Box as="span" fontWeight={800}>
        Deployment
      </Box>
      <Box as="span" fontWeight={400} color={acento ?? color ?? "accent.fg"}>
        Hub
      </Box>
    </Text>
  );
}

/** Logotipo completo: isotipo + nombre. */
export default function Logo({ size = 28, fontSize = "md", tono, color, spacing = 2.5 }) {
  return (
    <HStack spacing={spacing} align="center">
      <LogoMark size={size} tono={tono} title="DeploymentHub" />
      <Wordmark fontSize={fontSize} color={color} />
    </HStack>
  );
}
