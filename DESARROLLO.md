# Documentación técnica

Este repo es el **README de perfil** de GitHub. El `README.md` visible se **genera**; no lo edites a mano.

## Flujo

```
skills.json ──► scripts/validate.js        (falla si el JSON es inválido)
            ├─► scripts/generate-svg.js    → assets/galaxy.svg + assets/planet-<id>.svg
            ├─► scripts/generate-readme.js → README.md (desde README.template.md)
            └─► scripts/sync-skills.js     → ../space-portfolio/public/skills.json (copia local de la web)
```

```bash
npm run validate   # solo validar
npm run build      # validar + SVG + README
npm run sync       # copiar skills.json a la copia local de ../space-portfolio
```

**Para actualizar todo, edita solo `skills.json` y haz push**: el workflow regenera el SVG y el README, y la web lee el JSON directamente desde este repo.

## `skills.json`

| Campo | Tipo | Notas |
| --- | --- | --- |
| `meta.user`, `meta.siteUrl`, `meta.title` | texto | Opcional. `siteUrl` es la URL de la web (con barra final). `title` se usa como título del README. |
| `categories[].id` | kebab-case | Único. Se usa en `?planet=<id>`. |
| `categories[].name`, `.color` | texto, `#rrggbb` | |
| `categories[].skills[]` | `{ name, level }` | `level` es un entero de 0 a 100. Una luna por skill. |
| `categories[].projects[]` | `{ name, url, description }` | `url` puede estar vacío. Una estación por proyecto. |

> Los datos actuales son **de ejemplo** (ver `_aviso` y los `TODO`). Reemplázalos por los tuyos.

## SVG animado (`assets/galaxy.svg`)

- Solo CSS + SMIL, sin JavaScript. Pesa ~16 KB (el script falla si supera 200 KB).
- Estrellas: animación CSS de opacidad. Planetas: `animateMotion` sobre una elipse (vista inclinada); lunas: `animateTransform` rotando; bandas del planeta: `animateTransform` trasladando dentro de un `clipPath`.
- Modo claro/oscuro con `@media (prefers-color-scheme: light)`. Incluye `<title>` y `<desc>` (con el listado de skills).
- **Limitación:** `prefers-reduced-motion` detiene el titileo y el pulso del sol (CSS), pero **no** el movimiento SMIL de planetas/lunas, porque SMIL no se puede desactivar con CSS. Se acepta por ser una imagen decorativa que acompaña a la lista en texto.
- Determinista: el generador usa un PRNG con semilla fija, así los commits automáticos solo cambian cuando cambian los datos.

## README

`README.template.md` contiene el texto fijo (presentación, contacto: **rellena los `TODO`**) y marcadores `{{...}}` que `generate-readme.js` sustituye: fila de planetas (enlazados a `?planet=<id>`), bloques `<details>` con badges de shields.io, telemetría opcional y la lista en texto plano de respaldo.

## Automatización (`.github/workflows/build.yml`)

- **Push** a `skills.json`, `README.template.md`, `scripts/**` o el propio workflow → valida, regenera y hace commit automático (con `[skip ci]`).
- **Telemetría (opcional, desactivada):** crea la variable de repositorio `ENABLE_TELEMETRY=true` (Settings → Secrets and variables → Actions → Variables). Entonces `scripts/telemetry.js` consulta la API de GitHub (lenguajes más usados y commits de los últimos 30 días) y el workflow semanal (lunes) la mantiene al día. Sin la variable no se consulta nada.
- Los permisos necesarios (`contents: write`) ya están declarados en el workflow; revisa que Settings → Actions → General permita *Read and write permissions* si el push falla.
