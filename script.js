const $ = s => document.querySelector(s);
let P = Math.PI;   // se puede cambiar en Ajustes
const sq = Math.sqrt;
const need = (ok, msg) => { if (!ok) throw new Error(msg); };
const AB = [['a', 'a'], ['b', 'b']];
// Ajustes del usuario (se guardan en el navegador)
const CFG = { dec: 'auto', pi: 'exact', step: '1' };
try { Object.assign(CFG, JSON.parse(localStorage.getItem('sc-cfg'))); } catch {}
// Polinomio desde sus coeficientes (de mayor a menor grado): [1, -3, 2] -> x² − 3x + 2
const px = c => { const n = c.length - 1;
  const t = c.map((v, i) => { const e = n - i, k = fmt(Math.abs(v)); if (k === '0') return '';
    return (v < 0 ? ' − ' : ' + ') + (k !== '1' || e === 0 ? k : '') + (e ? 'x' + (e > 1 ? sup(e) : '') : ''); })
    .join('').replace(/^ \+ /, '').replace(/^ − /, '−');
  return t || '0'; };
// Raíces reales de ax³ + bx² + cx + d (Cardano / método trigonométrico)
const cubicRoots = (a, b, c, d) => {
  const B = b / a, C = c / a, D = d / a, p = C - B * B / 3, q = 2 * B ** 3 / 27 - B * C / 3 + D, sh = -B / 3;
  const del = (q / 2) ** 2 + (p / 3) ** 3, eps = 1e-9 * Math.max(1, (q / 2) ** 2, Math.abs((p / 3) ** 3));
  let r;
  if (del > eps) { const w = Math.sqrt(del); r = [Math.cbrt(-q / 2 + w) + Math.cbrt(-q / 2 - w) + sh]; }
  else if (del >= -eps) { const u = Math.cbrt(-q / 2); r = [2 * u + sh, -u + sh, -u + sh]; }
  else { const m = 2 * Math.sqrt(-p / 3), f = Math.acos(Math.max(-1, Math.min(1, 3 * q / (p * m))));
    r = [0, 1, 2].map(k => m * Math.cos((f - 2 * Math.PI * k) / 3) + sh); }
  return { r: r.sort((x, y) => x - y), B, C };
};
const isInt = (...n) => n.every(Number.isInteger);
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const fact = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const comb = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
const sup = n => String(n).replace(/[0-9]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
// k-ésimo término de (a ± b)ⁿ, en símbolos: 3a²b, ab², b³...
const term = (n, k) => (comb(n, k) > 1 ? comb(n, k) : '') + (n - k ? 'a' + (n - k > 1 ? sup(n - k) : '') : '') + (k ? 'b' + (k > 1 ? sup(k) : '') : '') || '1';
const poly = (n, s) => Array.from({ length: n + 1 }, (_, k) => (k ? (s < 0 && k % 2 ? ' − ' : ' + ') : '') + term(n, k)).join('');

function fmt(v) {
  if (typeof v !== 'number') return v;
  if (!Number.isFinite(v)) return 'No definido';
  if (Math.abs(v) < 1e-12) v = 0;
  return String(CFG.dec === 'auto' ? parseFloat(v.toPrecision(10)) : +v.toFixed(+CFG.dec));
}

/* Cada módulo tiene "modes"; cada mode tiene sus campos y una función calc
   que devuelve filas [etiqueta, valor]. Para agregar un módulo nuevo, solo
   añade un objeto a esta lista. */
const MODULES = [
  { name: 'Operaciones básicas', modes: [{
    fields: [['a', 'Primer número'], ['b', 'Segundo número']],
    calc: ({ a, b }) => [['Suma', a + b], ['Resta', a - b], ['Multiplicación', a * b],
      ['División', b === 0 ? 'No se puede dividir entre cero' : a / b]] }] },

  { name: 'Círculo', modes: [
    { name: 'Tengo el radio', fields: [['r', 'Radio']],
      calc: ({ r }) => { need(r >= 0, 'El radio no puede ser negativo');
        return [['Diámetro', 2 * r], ['Área', P * r * r], ['Perímetro', 2 * P * r]]; } },
    { name: 'Tengo el área', fields: [['A', 'Área']],
      calc: ({ A }) => { need(A >= 0, 'El área no puede ser negativa'); const r = sq(A / P);
        return [['Radio', r], ['Diámetro', 2 * r], ['Perímetro', 2 * P * r]]; } },
    { name: 'Tengo el perímetro', fields: [['p', 'Perímetro']],
      calc: ({ p }) => { need(p >= 0, 'El perímetro no puede ser negativo'); const r = p / (2 * P);
        return [['Radio', r], ['Diámetro', 2 * r], ['Área', P * r * r]]; } }] },

  { name: 'Distancia entre puntos', modes: [{
    fields: [['x1', 'x₁'], ['y1', 'y₁'], ['x2', 'x₂'], ['y2', 'y₂']],
    calc: ({ x1, y1, x2, y2 }) => [['Distancia', Math.hypot(x2 - x1, y2 - y1)]] }] },

  { name: 'Punto medio', modes: [{
    fields: [['x1', 'x₁'], ['y1', 'y₁'], ['x2', 'x₂'], ['y2', 'y₂']],
    calc: ({ x1, y1, x2, y2 }) => [['Punto medio', `(${fmt((x1 + x2) / 2)}, ${fmt((y1 + y2) / 2)})`]] }] },

  { name: 'Ecuación lineal', modes: [{
    fields: [['a', 'a'], ['b', 'b']],
    calc: ({ a, b }) => { need(a !== 0, "'a' no puede ser 0"); return [['x', -b / a]]; } }] },

  { name: 'Fórmula general', modes: [{
    fields: [['a', 'a'], ['b', 'b'], ['c', 'c']],
    calc: ({ a, b, c }) => {
      need(a !== 0, "No es cuadrática: 'a' no puede ser 0");
      const d = b * b - 4 * a * c, rows = [['Discriminante', d]];
      if (d > 0) rows.push(['x₁', (-b + sq(d)) / (2 * a)], ['x₂', (-b - sq(d)) / (2 * a)]);
      else if (d === 0) rows.push(['x (única)', -b / (2 * a)]);
      else { const re = fmt(-b / (2 * a)), im = fmt(sq(-d) / (2 * Math.abs(a)));
        rows.push(['x₁', `${re} + ${im}i`], ['x₂', `${re} − ${im}i`]); }
      return rows; } }] },

  { name: 'Teorema de Pitágoras', modes: [
    { name: 'Hallar la hipotenusa', fields: [['a', 'Cateto a'], ['b', 'Cateto b']],
      calc: ({ a, b }) => [['Hipotenusa (c)', Math.hypot(a, b)]] },
    { name: 'Hallar un cateto', fields: [['c', 'Hipotenusa c'], ['a', 'Cateto a']],
      calc: ({ c, a }) => { need(c > a && a >= 0, 'La hipotenusa debe ser mayor que el cateto');
        return [['Cateto (b)', sq(c * c - a * a)]]; } }] },

  { name: 'Geometría 3D', modes: [
    { name: 'Esfera', fields: [['r', 'Radio']],
      calc: ({ r }) => [['Volumen', 4 / 3 * P * r ** 3], ['Área superficial', 4 * P * r * r]] },
    { name: 'Cilindro', fields: [['r', 'Radio de la base'], ['h', 'Altura']],
      calc: ({ r, h }) => [['Volumen', P * r * r * h], ['Área total', 2 * P * r * h + 2 * P * r * r]] },
    { name: 'Cubo', fields: [['a', 'Arista']],
      calc: ({ a }) => [['Volumen', a ** 3], ['Área total', 6 * a * a]] }] },

  { name: 'Trigonometría', modes: [
    { name: 'Seno, coseno, tangente', fields: [['g', 'Ángulo (grados)']],
      calc: ({ g }) => { const r = g * P / 180, t = Math.tan(r);
        return [['Seno', Math.sin(r)], ['Coseno', Math.cos(r)], ['Tangente', Math.abs(t) > 1e12 ? 'No definida' : t]]; } },
    { name: 'Grados a radianes', fields: [['g', 'Ángulo (grados)']],
      calc: ({ g }) => [['Radianes', g * P / 180]] },
    { name: 'Ley de cosenos', fields: [['a', 'Lado a'], ['b', 'Lado b'], ['C', 'Ángulo C (grados)']],
      calc: ({ a, b, C }) => [['Lado c', sq(a * a + b * b - 2 * a * b * Math.cos(C * P / 180))]] }] },

  { name: 'Estadística', modes: [{
    fields: [['d', 'Datos (separados por coma o espacio)', 'list']],
    calc: ({ d }) => { const s = [...d].sort((x, y) => x - y), n = s.length, sum = s.reduce((x, y) => x + y, 0);
      const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
      return [['Cantidad', n], ['Suma', sum], ['Promedio', sum / n], ['Mediana', med], ['Mínimo', s[0]], ['Máximo', s[n - 1]]]; } }] },

  { name: 'Interés simple', modes: [{
    fields: [['c', 'Capital inicial ($)'], ['t', 'Tasa anual (%)'], ['y', 'Tiempo (años)']],
    calc: ({ c, t, y }) => { const i = c * t / 100 * y; return [['Interés generado', i], ['Monto total', c + i]]; } }] },

  { name: 'Descuento e IVA', modes: [
    { name: 'Aplicar descuento', fields: [['p', 'Precio base ($)'], ['r', 'Porcentaje (%)']],
      calc: ({ p, r }) => [['Monto descontado', p * r / 100], ['Precio final', p - p * r / 100]] },
    { name: 'Agregar IVA / impuesto', fields: [['p', 'Precio base ($)'], ['r', 'Porcentaje (%)']],
      calc: ({ p, r }) => [['Monto del impuesto', p * r / 100], ['Precio total', p + p * r / 100]] }] },

  { name: 'Binomios y polinomios', modes: [
    ...[[2, 1], [2, -1], [3, 1], [3, -1]].map(([n, s]) => ({
      name: `(a ${s > 0 ? '+' : '−'} b)${sup(n)}`, fields: AB,
      calc: ({ a, b }) => { const t = Array.from({ length: n + 1 }, (_, k) => comb(n, k) * a ** (n - k) * (s * b) ** k);
        return [['Desarrollo', poly(n, s)], ...t.map((v, k) => [term(n, k), v]), ['Resultado', t.reduce((x, y) => x + y, 0)]]; } })),
    { name: '(a + b)(a − b)', fields: AB,
      calc: ({ a, b }) => [['Desarrollo', 'a² − b²'], ['a²', a * a], ['b²', b * b], ['Resultado', a * a - b * b]] },
    ...[1, -1].map(s => ({ name: `a³ ${s > 0 ? '+' : '−'} b³`, fields: AB,
      calc: ({ a, b }) => [['Factorización', `(a ${s > 0 ? '+' : '−'} b)(a² ${s > 0 ? '−' : '+'} ab + b²)`],
        ['Factor 1', a + s * b], ['Factor 2', a * a - s * a * b + b * b], ['Resultado', a ** 3 + s * b ** 3]] })),
    { name: 'Binomio de Newton', fields: [['n', 'Exponente n (entero)'], ['a', 'a'], ['b', 'b']],
      calc: ({ n, a, b }) => { need(isInt(n) && n >= 0 && n <= 20, 'n debe ser un entero entre 0 y 20');
        return [['Desarrollo de (a + b)ⁿ', poly(n, 1)], ['Coeficientes', Array.from({ length: n + 1 }, (_, k) => comb(n, k)).join('  ')], ['Valor numérico', (a + b) ** n]]; } }] },

  { name: 'Trinomios y polinomios', modes: [
    { name: 'Cuadrado de un trinomio o más', fields: [['t', 'Términos (2 a 6, separados por coma o espacio)', 'list']],
      calc: ({ t }) => { need(t.length >= 2 && t.length <= 6, 'Escribe entre 2 y 6 términos');
        const L = [...'abcdef'].slice(0, t.length), cross = []; let dob = 0;
        for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) { cross.push('2' + L[i] + L[j]); dob += 2 * t[i] * t[j]; }
        const ss = t.reduce((x, y) => x + y * y, 0);
        return [['Fórmula', L.map(l => l + '²').concat(cross).join(' + ')], ['Suma de cuadrados', ss], ['Dobles productos', dob], ['Resultado', ss + dob]]; } },
    { name: 'Factorizar trinomio ax² + bx + c', fields: [['a', 'a'], ['b', 'b'], ['c', 'c']],
      calc: ({ a, b, c }) => { need(a !== 0, "'a' no puede ser 0");
        const d = b * b - 4 * a * c; if (d < 0) return [['Resultado', 'No se factoriza en los reales']];
        const r1 = (-b + sq(d)) / (2 * a), r2 = (-b - sq(d)) / (2 * a), f = r => r === 0 ? 'x' : `(x ${r < 0 ? '+' : '−'} ${fmt(Math.abs(r))})`;
        return [['Factorizada', (a === 1 ? '' : fmt(a) + ' ') + (d === 0 ? f(r1) + '²' : f(r1) + f(r2))], ['Raíces', `${fmt(r1)} y ${fmt(r2)}`], ...(d === 0 && a > 0 && c >= 0 ? [['Cuadrado perfecto', `(${fmt(sq(a))}x ${b < 0 ? '−' : '+'} ${fmt(sq(c))})²`]] : [])]; } },
    { name: 'Factorizar cuatrinomio ax³ + bx² + cx + d', fields: [['a', 'a'], ['b', 'b'], ['c', 'c'], ['d', 'd']],
      calc: ({ a, b, c, d }) => { need(a !== 0, "'a' no puede ser 0");
        const { r, B, C } = cubicRoots(a, b, c, d), lead = a === 1 ? '' : fmt(a) + ' ';
        const f = x => Math.abs(x) < 1e-9 ? 'x' : `(x ${x < 0 ? '+' : '−'} ${fmt(Math.abs(x))})`;
        if (r.length === 1) { const m = B + r[0], n = C + r[0] * m;
          return [['Factorizada', `${lead}${f(r[0])}(${px([1, m, n])})`], ['Raíz real', fmt(r[0])], ['Nota', 'El otro factor no tiene raíces reales']]; }
        const g = []; r.forEach(x => { const h = g.find(e => fmt(e.x) === fmt(x)); if (h) h.n++; else g.push({ x, n: 1 }); });
        return [['Factorizada', lead + g.map(({ x, n }) => f(x) + (n > 1 ? sup(n) : '')).join('')], ['Raíces', r.map(fmt).join(' ; ')]]; } },
    { name: 'Multiplicar polinomios', fields: [['p', 'Polinomio 1 (coeficientes de mayor a menor grado)', 'list'], ['q', 'Polinomio 2', 'list']],
      calc: ({ p, q }) => { need(p.length <= 7 && q.length <= 7, 'Máximo 7 coeficientes por polinomio');
        const r = Array(p.length + q.length - 1).fill(0); p.forEach((u, i) => q.forEach((v, j) => { r[i + j] += u * v; }));
        return [['P(x)', px(p)], ['Q(x)', px(q)], ['Producto', px(r)], ['Coeficientes', r.map(fmt).join('  ')]]; } }] },

  { name: 'Números', modes: [
    { name: 'MCD y MCM', fields: [['a', 'Número a'], ['b', 'Número b']],
      calc: ({ a, b }) => { need(isInt(a, b) && a > 0 && b > 0, 'Usa enteros positivos'); const g = gcd(a, b); return [['MCD', g], ['MCM', a / g * b]]; } },
    { name: 'Factores primos', fields: [['n', 'Número entero']],
      calc: ({ n }) => { need(isInt(n) && n > 1 && n <= 1e12, 'Usa un entero entre 2 y 10¹²');
        let m = n, k = 0, div = 1; const f = [];
        for (let p = 2; p * p <= m; p++) { let e = 0; while (m % p === 0) { m /= p; e++; } if (e) { f.push(p + (e > 1 ? sup(e) : '')); k += e; div *= e + 1; } }
        if (m > 1) { f.push(m); k++; div *= 2; }
        return [['Factorización', f.join(' × ')], ['¿Es primo?', k === 1 ? 'Sí' : 'No'], ['Cantidad de divisores', div]]; } },
    { name: 'Combinatoria', fields: [['n', 'n'], ['r', 'r']],
      calc: ({ n, r }) => { need(isInt(n, r) && r >= 0 && r <= n && n <= 170, 'Usa enteros con 0 ≤ r ≤ n ≤ 170');
        let p = 1; for (let i = 0; i < r; i++) p *= n - i;
        return [['n!', fact(n)], ['Permutaciones P(n, r)', p], ['Combinaciones C(n, r)', comb(n, r)]]; } },
    { name: 'Decimal a otras bases', fields: [['n', 'Número entero (decimal)']],
      calc: ({ n }) => { need(isInt(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER, 'Usa un entero mayor o igual que 0');
        return [['Binario', n.toString(2)], ['Octal', n.toString(8)], ['Hexadecimal', n.toString(16).toUpperCase()]]; } },
    { name: 'Otra base a decimal', fields: [['s', 'Número', 'text'], ['b', 'Base (2 a 36)']],
      calc: ({ s, b }) => { need(isInt(b) && b >= 2 && b <= 36, 'La base va de 2 a 36');
        const t = s.trim().toLowerCase(), n = parseInt(t, b);
        need(/^[0-9a-z]+$/.test(t) && n.toString(b) === t.replace(/^0+(?=.)/, ''), 'Esos dígitos no existen en esa base');
        return [['Decimal', n]]; } }] },

  { name: 'Fracciones', modes: [{
    fields: [['a', 'Numerador 1'], ['b', 'Denominador 1'], ['c', 'Numerador 2'], ['d', 'Denominador 2']],
    calc: ({ a, b, c, d }) => {
      need(isInt(a, b, c, d) && b !== 0 && d !== 0, 'Usa enteros y denominadores distintos de 0');
      const fr = (n, m) => { if (m === 0) return 'No definida'; const g = gcd(n, m), s = m < 0 ? -1 : 1; n = s * n / g; m = s * m / g; return m === 1 ? String(n) : `${n}/${m} ≈ ${fmt(n / m)}`; };
      return [['Suma', fr(a * d + c * b, b * d)], ['Resta', fr(a * d - c * b, b * d)], ['Producto', fr(a * c, b * d)], ['División', fr(a * d, b * c)]]; } }] },

  { name: 'Potencias y logaritmos', modes: [
    { name: 'Potencia', fields: [['a', 'Base'], ['n', 'Exponente']], calc: ({ a, n }) => [['aⁿ', a ** n]] },
    { name: 'Raíz n-ésima', fields: [['x', 'Número'], ['n', 'Índice n']],
      calc: ({ x, n }) => { need(n !== 0, 'El índice no puede ser 0'); need(x >= 0 || (Number.isInteger(n) && n % 2 !== 0), 'Raíz par de un número negativo');
        return [['Raíz', x < 0 ? -((-x) ** (1 / n)) : x ** (1 / n)]]; } },
    { name: 'Logaritmo', fields: [['b', 'Base'], ['x', 'Número']],
      calc: ({ b, x }) => { need(b > 0 && b !== 1, 'La base debe ser positiva y distinta de 1'); need(x > 0, 'El número debe ser positivo');
        return [['Log en base b', Math.log(x) / Math.log(b)], ['ln(x)', Math.log(x)], ['log₁₀(x)', Math.log10(x)]]; } }] },

  { name: 'Proporciones', modes: [
    { name: 'Regla de tres directa', fields: [['a', 'Si esto…'], ['b', '…equivale a esto'], ['c', 'entonces esto…']],
      calc: ({ a, b, c }) => { need(a !== 0, 'El primer valor no puede ser 0'); return [['…equivale a (x)', b * c / a]]; } },
    { name: 'Regla de tres inversa', fields: [['a', 'Si esto…'], ['b', '…equivale a esto'], ['c', 'entonces esto…']],
      calc: ({ a, b, c }) => { need(c !== 0, 'El tercer valor no puede ser 0'); return [['…equivale a (x)', a * b / c]]; } },
    { name: '¿Qué porcentaje es?', fields: [['a', 'Cantidad'], ['b', 'Total']],
      calc: ({ a, b }) => { need(b !== 0, 'El total no puede ser 0'); return [['Porcentaje', fmt(a / b * 100) + ' %']]; } },
    { name: 'Variación porcentual', fields: [['a', 'Valor inicial'], ['b', 'Valor final']],
      calc: ({ a, b }) => { need(a !== 0, 'El valor inicial no puede ser 0'); const v = (b - a) / a * 100;
        return [['Variación', fmt(v) + ' %'], ['Tipo', v > 0 ? 'Aumento' : v < 0 ? 'Disminución' : 'Sin cambio']]; } }] }
];

// Menú: los módulos de MODULES agrupados por tema.
// Cada entrada: [grupo, nombre, módulos de MODULES que se combinan en ella]
const MENU = [
  ['Números y datos', 'Operaciones básicas', ['Operaciones básicas']],
  ['Números y datos', 'Números', ['Números']],
  ['Números y datos', 'Fracciones', ['Fracciones']],
  ['Números y datos', 'Potencias y logaritmos', ['Potencias y logaritmos']],
  ['Números y datos', 'Proporciones', ['Proporciones']],
  ['Números y datos', 'Estadística', ['Estadística']],
  ['Números y datos', 'Finanzas', ['Interés simple', 'Descuento e IVA']],
  ['Álgebra', 'Ecuaciones', ['Ecuación lineal', 'Fórmula general']],
  ['Álgebra', 'Binomios', ['Binomios y polinomios']],
  ['Álgebra', 'Trinomios y más', ['Trinomios y polinomios']],
  ['Geometría', 'Círculo', ['Círculo']],
  ['Geometría', 'Puntos (x, y)', ['Distancia entre puntos', 'Punto medio']],
  ['Geometría', 'Pitágoras', ['Teorema de Pitágoras']],
  ['Geometría', 'Figuras 3D', ['Geometría 3D']],
  ['Geometría', 'Trigonometría', ['Trigonometría']]
];
// Cada modo recibe su función de dibujo (DRAW, en dibujos.js)
const MODS = MENU.map(([group, name, from]) => ({ group, name, modes: from.flatMap(n => {
  const mod = MODULES.find(m => m.name === n), d = DRAW[n];
  return mod.modes.map((k, i) => ({ ...k, name: k.name || n, draw: Array.isArray(d) ? d[i] : d }));
}) }));

/* ---------- Interfaz ---------- */
const nav = $('#nav'), modesEl = $('#modes'), form = $('#form'), out = $('#out'), fig = $('#fig'), wrap = $('#figwrap');
let mi = 0, ki = 0;
const mode = () => MODS[mi].modes[ki];

function btn(text, onclick) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = text; b.onclick = onclick; return b;
}

// Botones − / + que cambian el valor según el "paso" de Ajustes
function stepper(inp, dir, text) {
  const b = btn(text, () => { inp.value = +((Number(inp.value) || 0) + dir * Number(CFG.step)).toFixed(10); update(); });
  b.className = 'stp'; b.setAttribute('aria-label', dir > 0 ? 'Aumentar' : 'Disminuir'); return b;
}

function renderNav() {
  const items = []; let last;
  MODS.forEach((m, i) => {
    if (m.group !== last) { const h = document.createElement('p'); h.className = 'grp'; h.textContent = last = m.group; items.push(h); }
    const b = btn(m.name, () => { mi = i; ki = 0; render(); });
    b.setAttribute('aria-current', i === mi); items.push(b);
  });
  nav.replaceChildren(...items);
}

function render() {
  renderNav();
  $('#title').textContent = MODS[mi].name;
  const modes = MODS[mi].modes;
  modesEl.replaceChildren(...(modes.length > 1 ? modes.map((m, i) => {
    const b = btn(m.name, () => { ki = i; render(); });
    b.setAttribute('aria-pressed', i === ki); return b;
  }) : []));
  form.replaceChildren(...mode().fields.map(([k, label, type]) => {
    const l = document.createElement('label'), inp = document.createElement('input'), box = document.createElement('div');
    inp.name = k; box.className = 'num'; box.append(inp);
    if (type === 'list') inp.inputMode = 'decimal';
    else if (type !== 'text') {
      inp.type = 'number'; inp.step = CFG.step;
      box.prepend(stepper(inp, -1, '−')); box.append(stepper(inp, 1, '+'));
    }
    l.append(label, box); return l;
  }));
  update();
  animateIn();
  if (matchMedia('(hover: hover)').matches) form.elements[0]?.focus({ preventScroll: true });
}

// Al cambiar de módulo el panel "se materializa": opacidad + escala, con curva de resorte sin rebote.
// Con movimiento reducido solo hace un fundido.
const calm = matchMedia('(prefers-reduced-motion: reduce)');
function animateIn() {
  $('.panel').animate(
    calm.matches ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }],
    { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1)' });
}

function hint(text, err) {
  const p = document.createElement('p');
  p.className = 'hint' + (err ? ' err' : ''); p.textContent = text; out.append(p);
}

function update() {
  const vals = {}; let ok = true;
  mode().fields.forEach(([k, , type]) => {
    const v = form.elements[k].value.trim();
    if (!v) return (ok = false);
    if (type === 'list') {
      const a = v.split(/[\s,;]+/).filter(Boolean).map(Number);
      if (!a.length || a.some(Number.isNaN)) ok = false;
      vals[k] = a;
    } else if (type === 'text') vals[k] = v;
    else { vals[k] = Number(v); if (Number.isNaN(vals[k])) ok = false; }
  });
  out.replaceChildren(); fig.replaceChildren(); wrap.hidden = true;
  if (!ok) return hint('Completa los datos para ver el resultado.');
  try {
    mode().calc(vals).forEach(([label, value]) => {
      const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      row.className = 'row'; dt.textContent = label; dd.textContent = fmt(value);
      row.append(dt, dd); out.append(row);
    });
    drawFig(vals);
  } catch (e) { hint(e.message, true); }
}

function drawFig(vals) {
  const f = mode().draw;
  try { fig.innerHTML = f ? f(vals) : ''; } catch { fig.replaceChildren(); }
  wrap.hidden = !fig.firstChild;
}

// Dibujo en pantalla completa: <dialog> modal (Esc o tocar fuera para cerrar)
const dlg = $('#dlg');
$('#zoom').onclick = () => { $('#big').innerHTML = fig.innerHTML; dlg.showModal(); };
$('#close').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

$('#copy').onclick = async e => {
  const b = e.currentTarget, text = [...out.querySelectorAll('.row')].map(r => r.firstChild.textContent + ': ' + r.lastChild.textContent).join('\n');
  if (!text) return;
  try { await navigator.clipboard.writeText(text); } catch { return; }
  b.textContent = 'Copiado'; setTimeout(() => { b.textContent = 'Copiar resultados'; }, 1500);
};
$('#clear').onclick = () => { form.reset(); update(); form.elements[0]?.focus(); };

// ---------- Ajustes ----------
const cfgDlg = $('#cfg'), CTRL = [['#cDec', 'dec'], ['#cPi', 'pi'], ['#cStep', 'step']];
function applyCfg() {
  P = CFG.pi === 'exact' ? Math.PI : CFG.pi === '22/7' ? 22 / 7 : +CFG.pi;
  document.querySelectorAll('input[type=number]').forEach(i => { i.step = CFG.step; });
  try { localStorage.setItem('sc-cfg', JSON.stringify(CFG)); } catch {}
}
const syncCtrl = () => CTRL.forEach(([sel, k]) => { $(sel).value = CFG[k]; });
CTRL.forEach(([sel, k]) => { $(sel).onchange = e => { CFG[k] = e.target.value; applyCfg(); update(); }; });
$('#cfgBtn').onclick = () => { syncCtrl(); cfgDlg.showModal(); };
$('#cReset').onclick = () => { Object.assign(CFG, { dec: 'auto', pi: 'exact', step: '1' }); syncCtrl(); applyCfg(); update(); };
$('#cClose').onclick = () => cfgDlg.close();
cfgDlg.addEventListener('click', e => { if (e.target === cfgDlg) cfgDlg.close(); });

form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
applyCfg();
render();
