// Genera README.md a partir de README.template.md + skills.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarSkills } from './validate.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const datos = cargarSkills();
const sitio = (datos.meta?.siteUrl ?? '').replace(/\/?$/, '/');

/** Escapa texto para la etiqueta de un badge de shields.io. */
const etiqueta = (t) => encodeURIComponent(t.replace(/-/g, '--').replace(/_/g, '__').replace(/ /g, '_'));
const hex = (c) => c.replace('#', '');
const urlPlaneta = (id) => `${sitio}?planet=${encodeURIComponent(id)}`;

// Fila de planetas enlazados a la web (simula la selección)
const fila = datos.categories.map((c) =>
  `<a href="${urlPlaneta(c.id)}" title="${c.name}"><img src="assets/planet-${c.id}.svg" alt="Planeta ${c.name}" width="64" height="64"></a>`
).join('&nbsp;&nbsp;&nbsp;');
const nombres = datos.categories.map((c) => `<a href="${urlPlaneta(c.id)}">${c.name}</a>`).join(' · ');

// Un <details> por categoría con badges
const detalles = datos.categories.map((c) => {
  const badges = c.skills.map((s) =>
    `![${s.name}](https://img.shields.io/badge/${etiqueta(s.name)}-${s.level}%25-${hex(c.color)}?style=flat-square&labelColor=0d1117)`
  ).join(' ');
  const proyectos = c.projects.length
    ? '\n\n**Proyectos:**\n' + c.projects.map((p) => {
        const nombre = p.url ? `[${p.name}](${p.url})` : `**${p.name}**`;
        return `- ${nombre}${p.description ? ` — ${p.description}` : ''}`;
      }).join('\n')
    : '';
  return `<details>\n<summary><b>${c.name}</b></summary>\n\n${badges}${proyectos}\n\n[Ver ${c.name} en 3D →](${urlPlaneta(c.id)})\n\n</details>`;
}).join('\n\n');

// Lista en texto plano (respaldo accesible)
const texto = datos.categories.map((c) =>
  `- **${c.name}:** ${c.skills.map((s) => `${s.name} (${s.level}%)`).join(', ')}` +
  (c.projects.length ? `. Proyectos: ${c.projects.map((p) => p.name).join(', ')}.` : '')
).join('\n');

const plantilla = readFileSync(resolve(RAIZ, 'README.template.md'), 'utf8');
const salida = plantilla
  .replaceAll('{{TITULO}}', datos.meta?.title ?? datos.meta?.user ?? 'Portfolio')
  .replaceAll('{{SITE_URL}}', sitio)
  .replaceAll('{{FILA_PLANETAS}}', `${fila}\n\n<sub>${nombres}</sub>`)
  .replaceAll('{{DETALLES}}', detalles)
  .replaceAll('{{LISTA_TEXTO}}', texto);

writeFileSync(resolve(RAIZ, 'README.md'), salida);
console.log('✔ README.md generado');
