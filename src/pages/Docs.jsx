// Manual de usuario: página pública (sin sesión) que muestra el HTML autónomo de /public.
export default function Docs() {
  return (
    <iframe
      src="/manual-de-usuario.html"
      title="Manual de usuario de DeploymentHub"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0 }}
    />
  );
}
