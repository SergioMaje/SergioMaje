// Genera assets/galaxy.svg y assets/planet-<id>.svg a partir de skills.json.
// Solo CSS + SMIL (sin JavaScript). Modo claro/oscuro con prefers-color-scheme.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarSkills } from './validate.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = resolve(RAIZ, 'assets');

const W = 800, H = 450;       // lienzo
const CX = 400, CY = 200;     // centro del sistema (el sol)
const INCLINACION = 0.46;     // ry = rx * INCLINACION (vista en perspectiva)

// ---------- utilidades ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v) => +v.toFixed(1); // redondea para reducir peso

/** PRNG determinista: el SVG sale igual en cada ejecución (diffs limpios). */
function mulberry32(semilla) {
  return () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mezclar(hex, destino, t) {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(destino.slice(i, i + 2), 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const aclarar = (c, t) => mezclar(c, '#ffffff', t);
const oscurecer = (c, t) => mezclar(c, '#000000', t);

const promedio = (cat) => cat.skills.reduce((a, s) => a + s.level, 0) / cat.skills.length;
const radioPlaneta = (cat) => 9 + (promedio(cat) / 100) * 6;

/** Degradado esférico + bandas que se desplazan (simula rotación). */
function defsPlaneta(cat) {
  const c = cat.color;
  return `<radialGradient id="g-${cat.id}" cx=".35" cy=".3" r=".85">` +
    `<stop offset="0" stop-color="${aclarar(c, 0.55)}"/><stop offset=".55" stop-color="${c}"/>` +
    `<stop offset="1" stop-color="${oscurecer(c, 0.6)}"/></radialGradient>`;
}

function cuerpoPlaneta(cat, r, idClip, durRot) {
  const periodo = r * 0.9;
  let bandas = '';
  for (let x = -2 * r - periodo; x < 2 * r; x += periodo) {
    bandas += `<rect x="${n(x)}" y="${n(-r)}" width="${n(periodo * 0.38)}" height="${n(2 * r)}" transform="skewX(-14)"/>`;
  }
  return `<clipPath id="${idClip}"><circle r="${n(r)}"/></clipPath>` +
    `<circle r="${n(r)}" fill="url(#g-${cat.id})"/>` +
    `<g clip-path="url(#${idClip})"><g fill="#000" fill-opacity=".16">${bandas}` +
    `<animateTransform attributeName="transform" type="translate" from="0 0" to="${n(periodo)} 0" dur="${durRot}s" repeatCount="indefinite"/>` +
    `</g></g>` +
    `<circle r="${n(r)}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width=".6"/>`;
}

// ---------- escena principal ----------
function generarGalaxia(datos) {
  const cats = datos.categories;
  const aleatorio = mulberry32(2024);

  // Estrellas titilantes (3 duraciones × 3 retardos = 9 clases CSS)
  let estrellas = '';
  for (let i = 0; i < 90; i++) {
    const x = n(aleatorio() * W), y = n(aleatorio() * H), r = n(0.4 + aleatorio() * 1.0);
    estrellas += `<circle class="st t${i % 3} d${(i >> 1) % 3}" cx="${x}" cy="${y}" r="${r}"/>`;
  }

  const rxMin = 85, rxMax = 360;
  const paso = cats.length > 1 ? (rxMax - rxMin) / (cats.length - 1) : 0;

  let defs = '', orbitas = '', planetas = '', leyenda = '';
  cats.forEach((cat, i) => {
    const rx = cats.length > 1 ? rxMin + paso * i : 200;
    const ry = rx * INCLINACION;
    const pr = radioPlaneta(cat);
    const durOrbita = 22 + i * 16;
    const trayectoria = `M${n(CX + rx)} ${CY}A${n(rx)} ${n(ry)} 0 1 1 ${n(CX - rx)} ${CY}A${n(rx)} ${n(ry)} 0 1 1 ${n(CX + rx)} ${CY}`;
    defs += defsPlaneta(cat);
    orbitas += `<ellipse class="or" cx="${CX}" cy="${CY}" rx="${n(rx)}" ry="${n(ry)}"/>`;

    // Lunas: una por skill, órbita circular alrededor del planeta
    let lunas = '';
    cat.skills.forEach((sk, k) => {
      const mr = pr + 8 + k * 6.5;
      const tam = 1.6 + (sk.level / 100) * 1.6;
      const dur = 4 + k * 2.3 + i * 0.4;
      const ini = n((k * 360) / cat.skills.length + i * 40);
      lunas += `<circle class="or mo" r="${n(mr)}"/>` +
        `<g><circle cx="${n(mr)}" r="${n(tam)}" fill="${aclarar(cat.color, 0.25)}"/>` +
        `<animateTransform attributeName="transform" type="rotate" from="${ini} 0 0" to="${ini + 360} 0 0" dur="${n(dur)}s" repeatCount="indefinite"/></g>`;
    });

    planetas += `<g><g>${lunas}${cuerpoPlaneta(cat, pr, `c-${cat.id}`, 9 + i * 2)}</g>` +
      `<animateMotion path="${trayectoria}" dur="${durOrbita}s" begin="-${n(durOrbita * ((i * 0.37) % 1))}s" repeatCount="indefinite"/></g>`;
  });

  // Leyenda inferior centrada
  const anchos = cats.map((c) => c.name.length * 6.9 + 34);
  let x = CX - anchos.reduce((a, b) => a + b, 0) / 2;
  cats.forEach((cat, i) => {
    leyenda += `<circle cx="${n(x + 5)}" cy="428" r="4.5" fill="${cat.color}"/>` +
      `<text class="lb" x="${n(x + 15)}" y="432">${esc(cat.name)}</text>`;
    x += anchos[i];
  });

  const resumen = cats.map((c) => `${c.name}: ${c.skills.map((s) => s.name).join(', ')}`).join('. ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">` +
    `<title id="t">Sistema solar de skills de ${esc(datos.meta?.user ?? 'portfolio')}</title>` +
    `<desc id="d">Animación de un sistema solar: cada planeta es una categoría y cada luna una skill. ${esc(resumen)}.</desc>` +
    `<style>` +
    `.bg{fill:#060a18}.n0{stop-color:#2a3a8f}.st{fill:#fff}.or{fill:none;stroke:#9fb4ff;stroke-opacity:.16;stroke-width:1}` +
    `.mo{stroke-opacity:.22;stroke-dasharray:1.5 2.5}.lb{fill:#c9d8ff;font:12px -apple-system,'Segoe UI',Helvetica,Arial,sans-serif}` +
    `.st{animation:tw 3s ease-in-out infinite}.t1{animation-duration:4.1s}.t2{animation-duration:5.3s}` +
    `.d0{animation-delay:-.4s}.d1{animation-delay:-1.7s}.d2{animation-delay:-2.9s}` +
    `.sun{animation:pu 5s ease-in-out infinite}` +
    `@keyframes tw{0%,100%{opacity:.15}50%{opacity:.95}}@keyframes pu{0%,100%{opacity:.55}50%{opacity:.95}}` +
    `@media (prefers-color-scheme:light){.bg{fill:#f4f7fd}.n0{stop-color:#b9c9ff}.st{fill:#3b4a7a}.or{stroke:#1b2a55;stroke-opacity:.2}.lb{fill:#1b2a55}}` +
    `@media (prefers-reduced-motion:reduce){.st,.sun{animation:none}}` +
    `</style>` +
    `<defs>${defs}` +
    `<radialGradient id="neb" cx=".5" cy=".45" r=".6"><stop class="n0" offset="0" stop-opacity=".6"/><stop class="n0" offset="1" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="sol" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#ffc83d"/><stop offset="1" stop-color="#ff7a18"/></radialGradient>` +
    `<radialGradient id="glow"><stop offset="0" stop-color="#ffb347" stop-opacity=".85"/><stop offset="1" stop-color="#ff7a18" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect class="bg" width="${W}" height="${H}"/><rect fill="url(#neb)" width="${W}" height="${H}"/>` +
    `${estrellas}${orbitas}` +
    `<circle class="sun" cx="${CX}" cy="${CY}" r="52" fill="url(#glow)"/><circle cx="${CX}" cy="${CY}" r="21" fill="url(#sol)"/>` +
    `${planetas}${leyenda}</svg>\n`;
}

// ---------- icono pequeño por planeta (fila del README) ----------
function generarIcono(cat) {
  const r = 20;
  const lunas = cat.skills.slice(0, 3).map((sk, k) => {
    const mr = r + 6 + k * 3;
    const ini = k * 120;
    return `<g><circle cx="${mr}" r="1.8" fill="${aclarar(cat.color, 0.25)}"/>` +
      `<animateTransform attributeName="transform" type="rotate" from="${ini} 0 0" to="${ini + 360} 0 0" dur="${5 + k * 2}s" repeatCount="indefinite"/></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-36 -36 72 72" width="64" height="64" role="img" aria-labelledby="t">` +
    `<title id="t">Planeta ${esc(cat.name)}</title>` +
    `<defs>${defsPlaneta(cat)}</defs>` +
    `<g>${cuerpoPlaneta(cat, r, 'c', 8)}${lunas}</g></svg>\n`;
}

// ---------- ejecución ----------
const datos = cargarSkills();
mkdirSync(SALIDA, { recursive: true });
const galaxia = generarGalaxia(datos);
writeFileSync(resolve(SALIDA, 'galaxy.svg'), galaxia);
for (const cat of datos.categories) writeFileSync(resolve(SALIDA, `planet-${cat.id}.svg`), generarIcono(cat));

const kb = (Buffer.byteLength(galaxia) / 1024).toFixed(1);
console.log(`✔ assets/galaxy.svg (${kb} KB) + ${datos.categories.length} iconos de planeta`);
if (Buffer.byteLength(galaxia) > 200 * 1024) {
  console.error('✖ galaxy.svg supera 200 KB');
  process.exit(1);
}
