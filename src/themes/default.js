import { extendTheme } from "@chakra-ui/react";

// Consola de operaciones: superficies neutras, un solo color de marca (azul petróleo)
// y los colores semánticos (verde/rojo/ámbar) reservados para estados.
const defaultTheme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
  },
  fonts: {
    heading: `"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif`,
    body: `"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif`,
    mono: `"JetBrains Mono", ui-monospace, "Cascadia Code", Consolas, monospace`,
  },
  colors: {
    brand: {
      50: "#e7f4f7",
      100: "#c4e4eb",
      200: "#9bd1dd",
      300: "#6ebccd",
      400: "#45a9bf",
      500: "#1f8ea8",
      600: "#17728a",
      700: "#125a6d",
      800: "#0d4351",
      900: "#072b35",
    },
  },
  semanticTokens: {
    colors: {
      "bg.canvas": { default: "#f5f7f8", _dark: "#0f1619" },
      "bg.surface": { default: "white", _dark: "#172126" },
      "bg.subtle": { default: "#f0f3f4", _dark: "#1d2a30" },
      "bg.hover": { default: "#eaf3f5", _dark: "#21323a" },
      "border.subtle": { default: "#e2e8ea", _dark: "#2a3a41" },
      "text.muted": { default: "#5b6b72", _dark: "#9db0b8" },
      "accent.fg": { default: "brand.600", _dark: "brand.300" },
      "accent.subtle": { default: "brand.50", _dark: "rgba(69,169,191,0.14)" },
    },
  },
  styles: {
    global: {
      body: {
        bg: "bg.canvas",
        color: "gray.800",
        _dark: { color: "gray.100" },
      },
    },
  },
  components: {
    Button: {
      defaultProps: { colorScheme: "brand" },
      baseStyle: { fontWeight: 600, borderRadius: "md" },
    },
    Badge: {
      baseStyle: {
        textTransform: "none",
        fontWeight: 600,
        borderRadius: "md",
        px: 2,
        py: 0.5,
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: "bg.surface",
          borderWidth: "1px",
          borderColor: "border.subtle",
          boxShadow: "none",
          borderRadius: "lg",
        },
      },
    },
    Table: {
      defaultProps: { size: "sm" },
      baseStyle: {
        th: {
          textTransform: "none",
          letterSpacing: "0.02em",
          fontWeight: 700,
          color: "text.muted",
        },
      },
    },
    Tabs: {
      defaultProps: { colorScheme: "brand" },
    },
    Checkbox: {
      defaultProps: { colorScheme: "brand" },
    },
    Switch: {
      defaultProps: { colorScheme: "brand" },
    },
    Input: {
      defaultProps: { focusBorderColor: "brand.500" },
    },
    Select: {
      defaultProps: { focusBorderColor: "brand.500" },
    },
    Textarea: {
      defaultProps: { focusBorderColor: "brand.500" },
    },
    Toast: {
      defaultProps: {
        position: "top-right",
        duration: 3000,
        isClosable: true,
      },
    },
  },
});

export default defaultTheme;
