// Telemetría OPCIONAL (bandera ENABLE_TELEMETRY): lenguajes más usados y commits recientes.
// Escribe assets/telemetry.json, que generate-readme.js incluye si existe.
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarSkills } from './validate.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usuario = cargarSkills().meta?.user;
const cabeceras = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'galaxy-telemetry',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};
const api = async (ruta) => {
  const r = await fetch(`https://api.github.com${ruta}`, { headers: cabeceras });
  if (!r.ok) throw new Error(`GitHub API ${r.status} en ${ruta}`);
  return r.json();
};

// Lenguajes: suma de bytes en repos propios no-fork (máx. 30 repos)
const repos = (await api(`/users/${usuario}/repos?per_page=100&type=owner`)).filter((r) => !r.fork).slice(0, 30);
const bytes = {};
for (const r of repos) {
  const langs = await api(`/repos/${usuario}/${r.name}/languages`);
  for (const [l, b] of Object.entries(langs)) bytes[l] = (bytes[l] ?? 0) + b;
}
const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
const lenguajes = Object.entries(bytes)
  .sort((a, b) => b[1] - a[1]).slice(0, 5)
  .map(([nombre, b]) => ({ nombre, porcentaje: Math.round((b / total) * 100) }));

// Commits recientes: eventos Push públicos de los últimos 30 días
const desde = Date.now() - 30 * 24 * 3600 * 1000;
const eventos = await api(`/users/${usuario}/events/public?per_page=100`);
const commits30d = eventos
  .filter((e) => e.type === 'PushEvent' && new Date(e.created_at).getTime() >= desde)
  .reduce((a, e) => a + (e.payload?.size ?? 0), 0);

mkdirSync(resolve(RAIZ, 'assets'), { recursive: true });
writeFileSync(resolve(RAIZ, 'assets', 'telemetry.json'), JSON.stringify({ lenguajes, commits30d }, null, 2) + '\n');
console.log('✔ telemetría:', lenguajes.map((l) => `${l.nombre} ${l.porcentaje}%`).join(', '), `· ${commits30d} commits (30 d)`);
