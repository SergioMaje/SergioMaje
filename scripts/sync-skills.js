// Copia skills.json a ../space-portfolio/public/skills.json (fallback local de la web).
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cargarSkills, RUTA_SKILLS } from './validate.js';

cargarSkills(); // no sincroniza datos inválidos
const destino = resolve(process.argv[2] ?? resolve(RUTA_SKILLS, '..', '..', 'space-portfolio', 'public', 'skills.json'));
if (!existsSync(resolve(destino, '..'))) {
  console.error(`✖ No existe la carpeta de destino: ${resolve(destino, '..')}`);
  process.exit(1);
}
copyFileSync(RUTA_SKILLS, destino);
console.log(`✔ Copiado a ${destino}`);
