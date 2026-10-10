// Valida skills.json. Termina con código 1 si hay errores.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const aquí = dirname(fileURLToPath(import.meta.url));
export const RUTA_SKILLS = resolve(aquí, '..', 'skills.json');

const RE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RE_COLOR = /^#[0-9a-fA-F]{6}$/;
const RE_URL = /^https?:\/\/\S+$/;

/** Devuelve la lista de errores (vacía si todo es válido). */
export function validar(datos) {
  const errores = [];
  const err = (ruta, msg) => errores.push(`${ruta}: ${msg}`);
  const esTexto = (v) => typeof v === 'string' && v.trim() !== '';

  if (!datos || typeof datos !== 'object') return ['raíz: debe ser un objeto'];
  if (!Array.isArray(datos.categories) || datos.categories.length === 0) {
    return ['categories: debe ser un arreglo no vacío'];
  }
  if (datos.meta !== undefined) {
    if (!esTexto(datos.meta?.user)) err('meta.user', 'texto requerido');
    if (!RE_URL.test(datos.meta?.siteUrl ?? '')) err('meta.siteUrl', 'URL http(s) requerida');
  }

  const ids = new Set();
  datos.categories.forEach((c, i) => {
    const r = `categories[${i}]`;
    if (!RE_ID.test(c.id ?? '')) err(`${r}.id`, 'debe ser kebab-case en minúsculas');
    else if (ids.has(c.id)) err(`${r}.id`, `duplicado "${c.id}"`);
    else ids.add(c.id);
    if (!esTexto(c.name)) err(`${r}.name`, 'texto requerido');
    if (!RE_COLOR.test(c.color ?? '')) err(`${r}.color`, 'debe ser un color #rrggbb');

    if (!Array.isArray(c.skills) || c.skills.length === 0) err(`${r}.skills`, 'arreglo no vacío requerido');
    (c.skills ?? []).forEach((s, j) => {
      if (!esTexto(s.name)) err(`${r}.skills[${j}].name`, 'texto requerido');
      if (!Number.isInteger(s.level) || s.level < 0 || s.level > 100) {
        err(`${r}.skills[${j}].level`, 'entero entre 0 y 100');
      }
    });

    if (!Array.isArray(c.projects)) err(`${r}.projects`, 'debe ser un arreglo (puede estar vacío)');
    (c.projects ?? []).forEach((p, j) => {
      if (!esTexto(p.name)) err(`${r}.projects[${j}].name`, 'texto requerido');
      if (typeof p.url !== 'string' || (p.url !== '' && !RE_URL.test(p.url))) {
        err(`${r}.projects[${j}].url`, 'vacío o URL http(s)');
      }
      if (typeof p.description !== 'string') err(`${r}.projects[${j}].description`, 'texto requerido (puede ser vacío)');
    });
  });
  return errores;
}

/** Lee y valida el archivo; lanza Error si es inválido. */
export function cargarSkills(ruta = RUTA_SKILLS) {
  let datos;
  try {
    datos = JSON.parse(readFileSync(ruta, 'utf8'));
  } catch (e) {
    throw new Error(`No se pudo leer/parsear ${ruta}: ${e.message}`);
  }
  const errores = validar(datos);
  if (errores.length) throw new Error('skills.json inválido:\n - ' + errores.join('\n - '));
  return datos;
}

// Ejecución directa: node scripts/validate.js
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const d = cargarSkills();
    const n = d.categories.reduce((a, c) => a + c.skills.length, 0);
    console.log(`✔ skills.json válido: ${d.categories.length} categorías, ${n} skills`);
  } catch (e) {
    console.error('✖ ' + e.message);
    process.exit(1);
  }
}
