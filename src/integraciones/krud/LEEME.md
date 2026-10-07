# KRUD en DeploymentHub

KRUD es el asistente transversal. Su kit se carga por URL desde el servidor de KRUD; no se copia en este proyecto. Responde dudas con los artículos del catálogo y guía paso a paso por los recorridos.

## Piezas

| Pieza | Dónde | Qué hace |
|---|---|---|
| `recorridos.json` | aquí | **Fuente** de pantallas, artículos y recorridos, con sus selectores (`objetivo`) y su evento de fin |
| `scripts/generar-catalogo-krud.mjs` | frontend | Genera `public/velo-assistant/velo-deploymenthub.support.v1.json` antes de `dev` y `build`. Valida las reglas que harían a KRUD rechazar el catálogo. **No se edita a mano.** |
| `KrudAsistente.jsx` | aquí | Monta KRUD cuando hay sesión (`App.jsx` › `KrudConSesion`) |
| `eventos.js` | aquí | `confirmarKrud(operacion)`: cierra como completada la guía cuyo `fin.evento` coincide |
| `GET /api/krud/asercion` | backend | Firma al usuario de la sesión (ES256, 60 s, `jti` de un solo uso). Sin `Krud:PrivateJwk` responde 404 y KRUD no arranca |

Los controles que señalan los recorridos llevan `data-guia="<pantalla>.<control>"`. Si cambias un control, conserva su `data-guia`.

| Recorrido | Pantalla | Termina con |
|---|---|---|
| `crear-solicitud` | Nueva solicitud | `solicitud-enviada` |
| `registrar-resultado` | Solicitudes › detalle | `resultado-registrado` |
| `actualizar-desactualizados` | Estado de clientes → Nueva solicitud | `solicitud-enviada` |
| `crear-paquete` | Paquetes | `paquete-creado` |

## Configuración

- **Frontend:** `VITE_KRUD_ORIGEN` (ver `.env.example`). Vacía = no se monta nada. En desarrollo, `.env.development.local` (ignorado por git) con `VITE_KRUD_ORIGEN=http://127.0.0.1:4310`.
- **Backend:** `Krud:Issuer` y `Krud:PrivateJwk` en user-secrets (desarrollo) o en el gestor de secretos (producción).

## Puesta en marcha en desarrollo (ya hecha en este equipo)

Desde `KRUD_TRANSVERSAL`, con su servidor en 4310:

```bash
node --env-file=.env scripts/registrar-anfitrion-firmado.mjs velo-deploymenthub --origen http://localhost:5173 --publica-en http://localhost:5173
```

Copia la clave privada generada (`.krud-dev/velo-deploymenthub.private.jwk.json`, sin `emisor` ni `tenantId`) a los user-secrets del backend como `Krud:PrivateJwk`, y el emisor (`velo-deploymenthub-dev`) como `Krud:Issuer`. No hace falta el firmador de desarrollo de KRUD: firma el backend con el usuario real.

Cada usuario recibe su membresía en KRUD con su primer ticket. Para que las guías señalen los controles, concede el permiso después de ese primer uso:

```bash
node --env-file=.env --import tsx scripts/conceder-guia.mjs velo-deploymenthub
```

Abre siempre la aplicación como `http://localhost:5173`: con `127.0.0.1:5173` el origen no coincide con el registrado y KRUD niega el ticket.

## Producción

1. Generar un par ES256 propio. La privada va al gestor de secretos del backend (`Krud__PrivateJwk`, `Krud__Issuer`). Nunca al repositorio.
2. El operador de KRUD registra `velo-deploymenthub` en `dbo.VeloApplications` con:
   - el origen del frontend;
   - `PublishesAt` = URL pública del frontend;
   - identidad `firmada` con la clave **pública**.
3. Compilar el frontend con `VITE_KRUD_ORIGEN=<URL de KRUD>`. El catálogo se publica en `<frontend>/velo-assistant/velo-deploymenthub.support.v1.json` y el servidor de KRUD debe poder descargarlo.
4. Si el frontend tiene CSP, permitir el origen de KRUD en `script-src`, `style-src`, `frame-src` y `connect-src`.
