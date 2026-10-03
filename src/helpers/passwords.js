// Las mismas reglas que valida la API (PasswordRules.StrongPassword).
export const PASSWORD_RULES = [
  { label: "8 caracteres o más", test: (v) => v.length >= 8 },
  { label: "Al menos una letra", test: (v) => /[A-Za-z]/.test(v) },
  { label: "Al menos un número", test: (v) => /[0-9]/.test(v) },
];

export const isStrongPassword = (value) => PASSWORD_RULES.every((rule) => rule.test(value));
