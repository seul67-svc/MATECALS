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
const sumA = a => a.reduce((x, y) => x + y, 0), horner = (p, x) => p.reduce((r, v) => r * x + v, 0);
const dpoly = p => p.slice(0, -1).map((v, i) => v * (p.length - 1 - i)), ipoly = p => [...p.map((v, i) => v / (p.length - i)), 0];
const det3 = m => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
const erf = x => { const t = 1 / (1 + .3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const cx = (re, im) => `${fmt(re)} ${im < 0 ? '−' : '+'} ${fmt(Math.abs(im))}i`;
const ineq = (a, b, c, lt) => {
  if (a === 0) return [(lt ? b < c : b > c) ? 'Siempre se cumple' : 'Nunca se cumple'];
  const r = fmt((c - b) / a), op = lt === (a > 0) ? '<' : '>'; return [`x ${op} ${r}`, `x ${op === '<' ? '≤' : '≥'} ${r}`];
};
// Estadística extra: moda, rango, varianza, desviaciones y cuartiles (s ya viene ordenado)
const statExtra = s => {
  const n = s.length, m = sumA(s) / n, vp = sumA(s.map(v => (v - m) ** 2)) / n, cnt = {};
  s.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; });
  const top = Math.max(...Object.values(cnt)), md = Object.keys(cnt).filter(k => cnt[k] === top), h = Math.floor(n / 2);
  const med = a => a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
  return [['Moda', top === 1 && n > 1 ? 'No hay' : md.join(', ')], ['Rango', s[n - 1] - s[0]], ['Varianza (población)', vp],
    ['Desviación estándar (población)', Math.sqrt(vp)], ...(n > 1 ? [['Desviación estándar (muestra)', Math.sqrt(vp * n / (n - 1))]] : []),
    ['Q1', med(s.slice(0, h))], ['Q3', med(s.slice(n - h))]];
};
// Recta que pasa por dos puntos: pendiente, ecuaciones y ángulo
const recta = (x1, y1, x2, y2) => {
  need(x1 !== x2 || y1 !== y2, 'Los dos puntos deben ser distintos');
  const A = y2 - y1, B = x1 - x2, C = -(A * x1 + B * y1), ang = ((Math.atan2(A, -B) * 180 / Math.PI) % 180 + 180) % 180;
  const gen = `${fmt(A)}x ${B < 0 ? '−' : '+'} ${fmt(Math.abs(B))}y ${C < 0 ? '−' : '+'} ${fmt(Math.abs(C))} = 0`;
  if (B === 0) return [['Ecuación', 'x = ' + fmt(x1)], ['Pendiente', 'No definida (recta vertical)'], ['Forma general', gen], ['Ángulo de inclinación', 90]];
  const m = -A / B, b = -C / B;
  return [['Pendiente m', m], ['Ordenada b', b], ['Ecuación', 'y = ' + px([m, b])], ['Forma general', gen], ['Ángulo de inclinación', ang]];
};
// Evaluador de expresiones (sin eval): + − * / ^ ! % ( ), funciones, constantes y variables (vars)
function evalExpr(src, vars = {}, deg = false) {
  const open = (src.match(/\(/g) || []).length - (src.match(/\)/g) || []).length;
  const tk = (src + ')'.repeat(Math.max(open, 0))).replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt')
    .toLowerCase().match(/\d+\.?\d*|\.\d+|[a-z]+|\S/g) || [];
  let i = 0; const peek = () => tk[i], next = () => tk[i++], bad = () => { throw new Error('Expresión no válida'); };
  const R = x => deg ? x * Math.PI / 180 : x, U = x => deg ? x * 180 / Math.PI : x;
  const F = { sin: x => Math.sin(R(x)), cos: x => Math.cos(R(x)), tan: x => Math.tan(R(x)), asin: x => U(Math.asin(x)), acos: x => U(Math.acos(x)), atan: x => U(Math.atan(x)),
    sqrt: Math.sqrt, cbrt: Math.cbrt, ln: Math.log, log: Math.log10, abs: Math.abs, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round };
  const K = { pi: Math.PI, e: Math.E, ...vars };
  const expr = () => { let v = term(); while (peek() === '+' || peek() === '-') v = next() === '+' ? v + term() : v - term(); return v; };
  const term = () => { let v = unary(); for (;;) { const t = peek();
    if (t === '*' || t === '/') { next(); const r = unary(); v = t === '*' ? v * r : v / r; } else if (t === '(' || /^[a-z]/.test(t || '')) v *= power(); else return v; } };
  const unary = () => { if (peek() === '-') { next(); return -unary(); } if (peek() === '+') { next(); return unary(); } return power(); };
  const power = () => { const b = postfix(); if (peek() === '^') { next(); return Math.pow(b, unary()); } return b; };
  const postfix = () => { let v = primary(); for (;;) { if (peek() === '!') { next(); v = fact(v); } else if (peek() === '%') { next(); v /= 100; } else return v; } };
  const primary = () => { const t = next(); if (t === undefined) bad();
    if (/^[\d.]/.test(t)) return parseFloat(t);
    if (t === '(') { const v = expr(); if (next() !== ')') bad(); return v; }
    if (Object.hasOwn(K, t)) return K[t];
    if (Object.hasOwn(F, t)) { if (next() !== '(') bad(); const v = expr(); if (next() !== ')') bad(); return F[t](v); }
    return bad(); };
  const r = expr(); if (i < tk.length) bad(); return r;
}
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
const sup = n => String(n).replace(/[0-9-]/g, d => d === '-' ? '⁻' : '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
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
      calc: ({ a }) => [['Volumen', a ** 3], ['Área total', 6 * a * a]] },
    { name: 'Cono', fields: [['r', 'Radio'], ['h', 'Altura']], calc: ({ r, h }) => { const g = Math.hypot(r, h); return [['Volumen', P * r * r * h / 3], ['Generatriz', g], ['Área lateral', P * r * g], ['Área total', P * r * (r + g)]]; } },
    { name: 'Pirámide cuadrada', fields: [['a', 'Lado de la base'], ['h', 'Altura']], calc: ({ a, h }) => { const ap = Math.hypot(h, a / 2); return [['Volumen', a * a * h / 3], ['Apotema', ap], ['Área lateral', 2 * a * ap], ['Área total', a * a + 2 * a * ap]]; } },
    { name: 'Prisma rectangular', fields: [['a', 'Largo'], ['b', 'Ancho'], ['c', 'Alto']], calc: ({ a, b, c }) => [['Volumen', a * b * c], ['Área total', 2 * (a * b + b * c + a * c)], ['Diagonal', Math.hypot(a, b, c)]] }] },

  { name: 'Trigonometría', modes: [
    { name: 'Seno, coseno, tangente', fields: [['g', 'Ángulo (grados)']],
      calc: ({ g }) => { const r = g * P / 180, t = Math.tan(r);
        return [['Seno', Math.sin(r)], ['Coseno', Math.cos(r)], ['Tangente', Math.abs(t) > 1e12 ? 'No definida' : t]]; } },
    { name: 'Grados a radianes', fields: [['g', 'Ángulo (grados)']],
      calc: ({ g }) => [['Radianes', g * P / 180]] },
    { name: 'Ley de cosenos', fields: [['a', 'Lado a'], ['b', 'Lado b'], ['C', 'Ángulo C (grados)']],
      calc: ({ a, b, C }) => [['Lado c', sq(a * a + b * b - 2 * a * b * Math.cos(C * P / 180))]] },
    { name: 'Ley de senos', fields: [['a', 'Lado a'], ['A', 'Ángulo A (grados)'], ['B', 'Ángulo B (grados)']],
      calc: ({ a, A, B }) => { need(a > 0 && A > 0 && B > 0 && A + B < 180, 'Usa a > 0 y A + B menor que 180°'); const C = 180 - A - B, k = a / Math.sin(A * P / 180);
        return [['Ángulo C', C], ['Lado b', k * Math.sin(B * P / 180)], ['Lado c', k * Math.sin(C * P / 180)]]; } }] },

  { name: 'Estadística', modes: [{
    fields: [['d', 'Datos (separados por coma o espacio)', 'list']],
    calc: ({ d }) => { const s = [...d].sort((x, y) => x - y), n = s.length, sum = s.reduce((x, y) => x + y, 0);
      const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
      return [['Cantidad', n], ['Suma', sum], ['Promedio', sum / n], ['Mediana', med], ['Mínimo', s[0]], ['Máximo', s[n - 1]], ...statExtra(s)]; } }] },

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
    { name: 'Dividir polinomios', fields: [['p', 'Dividendo (coeficientes)', 'list'], ['q', 'Divisor (coeficientes)', 'list']],
      calc: ({ p, q }) => { need(q[0] !== 0 && q.length <= p.length, 'El divisor debe tener grado menor o igual y empezar con un coeficiente distinto de 0');
        const r = [...p], out = [];
        for (let i = 0; i <= p.length - q.length; i++) { const k = r[i] / q[0]; out.push(k); q.forEach((v, j) => { r[i + j] -= k * v; }); }
        return [['Cociente', px(out)], ['Residuo', px(r.slice(p.length - q.length + 1))]]; } },
    { name: 'Multiplicar polinomios', fields: [['p', 'Polinomio 1 (coeficientes de mayor a menor grado)', 'list'], ['q', 'Polinomio 2', 'list']],
      calc: ({ p, q }) => { need(p.length <= 7 && q.length <= 7, 'Máximo 7 coeficientes por polinomio');
        const r = Array(p.length + q.length - 1).fill(0); p.forEach((u, i) => q.forEach((v, j) => { r[i + j] += u * v; }));
        return [['P(x)', px(p)], ['Q(x)', px(q)], ['Producto', px(r)], ['Coeficientes', r.map(fmt).join('  ')]]; } }] },

  { name: 'Calculadora libre', modes: ['Grados', 'Radianes'].map((n, i) => ({ name: n, fields: [['e', 'Expresión (ej. sin(30) + 2^3)', 'text']],
    calc: ({ e }) => [['Resultado', evalExpr(e, {}, i === 0)]] })) },

  { name: 'Graficador f(x)', modes: [
    { name: 'Gráfica y ceros', fields: [['f', 'f(x) = (ej. x^2 − 3x + 1)', 'text']],
      calc: ({ f }) => { const g = x => evalExpr(f, { x }), zs = []; let x0 = -10, y0 = g(-10);
        for (let i = 1; i <= 400; i++) { const x = -10 + i * .05, y = g(x);
          if (Number.isFinite(y0) && Number.isFinite(y) && y0 * y <= 0 && Math.abs(y - y0) < 50) {
            let lo = x0, hi = x; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (g(lo) * g(mid) <= 0) hi = mid; else lo = mid; } zs.push(fmt((lo + hi) / 2)); }
          x0 = x; y0 = y; }
        return [['f(0)', g(0)], ['Ceros en [−10, 10]', zs.length ? [...new Set(zs)].slice(0, 8).join(' ; ') : 'Ninguno']]; } },
    { name: 'Valor en un punto', fields: [['f', 'f(x) =', 'text'], ['x', 'x']], calc: ({ f, x }) => [['f(x)', evalExpr(f, { x })]] },
    { name: 'Límite', fields: [['f', 'f(x) =', 'text'], ['a', 'x tiende a']],
      calc: ({ f, a }) => { const l = evalExpr(f, { x: a - 1e-7 }), r = evalExpr(f, { x: a + 1e-7 });
        return [['Por la izquierda', l], ['Por la derecha', r], ['Límite', Math.abs(l - r) < 1e-4 * Math.max(1, Math.abs(l)) ? (l + r) / 2 : 'No existe']]; } }] },

  { name: 'Sistemas de ecuaciones', modes: [
    { name: '2×2', fields: [['a', 'a₁ (de a₁x + b₁y = c₁)'], ['b', 'b₁'], ['c', 'c₁'], ['d', 'a₂ (de a₂x + b₂y = c₂)'], ['e', 'b₂'], ['f', 'c₂']],
      calc: ({ a, b, c, d, e, f }) => { const D = a * e - b * d;
        if (Math.abs(D) < 1e-12) return [['Resultado', a * f - c * d === 0 && b * f - c * e === 0 ? 'Infinitas soluciones (rectas iguales)' : 'Sin solución (rectas paralelas)']];
        return [['x', (c * e - b * f) / D], ['y', (a * f - c * d) / D], ['Determinante', D]]; } },
    { name: '3×3 (Cramer)', fields: [['m', 'Coeficientes por fila: a b c d (12 números)', 'list']],
      calc: ({ m }) => { need(m.length === 12, 'Escribe 12 números: a b c d de cada ecuación');
        const A = [0, 1, 2].flatMap(i => [0, 1, 2].map(k => m[i * 4 + k])), col = j => A.map((v, n) => n % 3 === j ? m[Math.floor(n / 3) * 4 + 3] : v), D = det3(A);
        need(Math.abs(D) > 1e-12, 'Sin solución única (determinante 0)');
        return [['x', det3(col(0)) / D], ['y', det3(col(1)) / D], ['z', det3(col(2)) / D], ['Determinante', D]]; } }] },

  { name: 'Desigualdades', modes: [
    ...[['ax + b < c', true], ['ax + b > c', false]].map(([name, lt]) => ({ name, fields: [['a', 'a'], ['b', 'b'], ['c', 'c']],
      calc: ({ a, b, c }) => { const t = ineq(a, b, c, lt); return [['Solución', t[0]], ...(t[1] ? [[lt ? 'Con igualdad (≤)' : 'Con igualdad (≥)', t[1]]] : [])]; } })),
    ...[['|ax + b| = c', 0], ['|ax + b| < c', 1], ['|ax + b| > c', 2]].map(([name, t]) => ({ name, fields: [['a', 'a'], ['b', 'b'], ['c', 'c']],
      calc: ({ a, b, c }) => { need(a !== 0, "'a' no puede ser 0"); const r1 = (-c - b) / a, r2 = (c - b) / a, lo = fmt(Math.min(r1, r2)), hi = fmt(Math.max(r1, r2));
        if (t === 0) return [['Solución', c < 0 ? 'Sin solución' : c === 0 ? `x = ${lo}` : `x = ${lo}  o  x = ${hi}`]];
        if (t === 1) return [['Solución', c <= 0 ? 'Sin solución' : `${lo} < x < ${hi}`]];
        return [['Solución', c < 0 ? 'Todos los reales' : `x < ${lo}  o  x > ${hi}`]]; } }))] },

  { name: 'Matrices', modes: [
    { name: 'Determinante', fields: [['m', 'Elementos por filas (4 para 2×2, 9 para 3×3)', 'list']],
      calc: ({ m }) => { need(m.length === 4 || m.length === 9, 'Escribe 4 números (2×2) o 9 (3×3)'); return [['Determinante', m.length === 4 ? m[0] * m[3] - m[1] * m[2] : det3(m)]]; } },
    { name: 'Inversa 2×2', fields: [['m', 'Elementos por filas (4 números)', 'list']],
      calc: ({ m }) => { need(m.length === 4, 'Escribe 4 números'); const D = m[0] * m[3] - m[1] * m[2]; need(D !== 0, 'No tiene inversa (determinante 0)');
        const r = [m[3], -m[1], -m[2], m[0]].map(v => fmt(v / D)); return [['Determinante', D], ['Inversa', `[${r[0]}  ${r[1]}]  [${r[2]}  ${r[3]}]`]]; } },
    { name: 'Multiplicar 2×2', fields: [['p', 'Matriz A (4 números)', 'list'], ['q', 'Matriz B (4 números)', 'list']],
      calc: ({ p, q }) => { need(p.length === 4 && q.length === 4, 'Cada matriz lleva 4 números');
        const r = [p[0] * q[0] + p[1] * q[2], p[0] * q[1] + p[1] * q[3], p[2] * q[0] + p[3] * q[2], p[2] * q[1] + p[3] * q[3]].map(fmt);
        return [['A × B', `[${r[0]}  ${r[1]}]  [${r[2]}  ${r[3]}]`]]; } }] },

  { name: 'Números complejos', modes: [
    { name: 'Operaciones', fields: [['a', 'a (de a + bi)'], ['b', 'b'], ['c', 'c (de c + di)'], ['d', 'd']],
      calc: ({ a, b, c, d }) => { const q = c * c + d * d;
        return [['Suma', cx(a + c, b + d)], ['Resta', cx(a - c, b - d)], ['Producto', cx(a * c - b * d, a * d + b * c)], ['División', q ? cx((a * c + b * d) / q, (b * c - a * d) / q) : 'No definida']]; } },
    { name: 'Forma polar', fields: [['a', 'a (de a + bi)'], ['b', 'b']],
      calc: ({ a, b }) => { const r = Math.hypot(a, b), t = Math.atan2(b, a) * 180 / Math.PI;
        return [['Módulo', r], ['Ángulo (grados)', t], ['Polar', `${fmt(r)}(cos ${fmt(t)}° + i sen ${fmt(t)}°)`], ['Conjugado', cx(a, -b)]]; } }] },

  { name: 'Progresiones', modes: [
    { name: 'Aritmética', fields: [['a', 'Primer término a₁'], ['d', 'Diferencia d'], ['n', 'Número de términos n']],
      calc: ({ a, d, n }) => { need(isInt(n) && n >= 1, 'n debe ser un entero positivo'); return [['Último término aₙ', a + (n - 1) * d], ['Suma Sₙ', n * (2 * a + (n - 1) * d) / 2]]; } },
    { name: 'Geométrica', fields: [['a', 'Primer término a₁'], ['r', 'Razón r'], ['n', 'Número de términos n']],
      calc: ({ a, r, n }) => { need(isInt(n) && n >= 1, 'n debe ser un entero positivo');
        return [['Último término aₙ', a * r ** (n - 1)], ['Suma Sₙ', r === 1 ? n * a : a * (r ** n - 1) / (r - 1)], ['Suma infinita', Math.abs(r) < 1 ? a / (1 - r) : 'No converge']]; } }] },

  { name: 'Derivadas e integrales', modes: [
    { name: 'Derivada', fields: [['p', 'Polinomio (coeficientes de mayor a menor grado)', 'list']], calc: ({ p }) => [['f(x)', px(p)], ['f′(x)', px(dpoly(p))], ['f″(x)', px(dpoly(dpoly(p)))]] },
    { name: 'Integral indefinida', fields: [['p', 'Polinomio (coeficientes de mayor a menor grado)', 'list']], calc: ({ p }) => [['f(x)', px(p)], ['∫ f(x) dx', px(ipoly(p)) + ' + C']] },
    { name: 'Integral definida', fields: [['p', 'Polinomio (coeficientes)', 'list'], ['a', 'Límite inferior a'], ['b', 'Límite superior b']],
      calc: ({ p, a, b }) => { const F = ipoly(p); return [['F(x)', px(F)], ['Integral de a a b', horner(F, b) - horner(F, a)]]; } }] },

  { name: 'Recta', modes: [
    { name: 'Por dos puntos', fields: [['x1', 'x₁'], ['y1', 'y₁'], ['x2', 'x₂'], ['y2', 'y₂']], calc: v => recta(v.x1, v.y1, v.x2, v.y2) },
    { name: 'Punto y pendiente', fields: [['x1', 'x₁'], ['y1', 'y₁'], ['m', 'Pendiente m']], calc: v => recta(v.x1, v.y1, v.x1 + 1, v.y1 + v.m) },
    { name: 'Distancia punto a recta', fields: [['A', 'A (de Ax + By + C = 0)'], ['B', 'B'], ['C', 'C'], ['x', 'x del punto'], ['y', 'y del punto']],
      calc: ({ A, B, C, x, y }) => { need(A !== 0 || B !== 0, 'A y B no pueden ser ambos 0'); return [['Distancia', Math.abs(A * x + B * y + C) / Math.hypot(A, B)]]; } }] },

  { name: 'Áreas planas', modes: [
    { name: 'Triángulo', fields: [['b', 'Base'], ['h', 'Altura']], calc: ({ b, h }) => [['Área', b * h / 2]] },
    { name: 'Triángulo (Herón)', fields: [['a', 'Lado a'], ['b', 'Lado b'], ['c', 'Lado c']],
      calc: ({ a, b, c }) => { need(a > 0 && b > 0 && c > 0 && a + b > c && a + c > b && b + c > a, 'Esos lados no forman un triángulo'); const s = (a + b + c) / 2; return [['Perímetro', 2 * s], ['Área', sq(s * (s - a) * (s - b) * (s - c))]]; } },
    { name: 'Trapecio', fields: [['B', 'Base mayor'], ['b', 'Base menor'], ['h', 'Altura']], calc: ({ B, b, h }) => [['Área', (B + b) * h / 2]] },
    { name: 'Polígono regular', fields: [['n', 'Número de lados'], ['l', 'Lado']],
      calc: ({ n, l }) => { need(isInt(n) && n >= 3 && l > 0, 'Usa n entero ≥ 3 y un lado positivo'); const ap = l / (2 * Math.tan(P / n)); return [['Perímetro', n * l], ['Apotema', ap], ['Área', n * l * ap / 2]]; } }] },

  { name: 'Vectores', modes: [{ fields: [['u', 'Vector u (2 o 3 componentes)', 'list'], ['v', 'Vector v (mismas componentes)', 'list']],
    calc: ({ u, v }) => { need((u.length === 2 || u.length === 3) && u.length === v.length, 'Escribe 2 o 3 componentes en cada vector');
      const dot = sumA(u.map((x, i) => x * v[i])), nu = Math.hypot(...u), nv = Math.hypot(...v), t = a => '(' + a.map(fmt).join(', ') + ')';
      const cr = u.length === 3 ? [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] : null;
      return [['u + v', t(u.map((x, i) => x + v[i]))], ['u − v', t(u.map((x, i) => x - v[i]))], ['Producto punto', dot], ['|u|', nu], ['|v|', nv],
        ['Ángulo (grados)', nu && nv ? Math.acos(Math.max(-1, Math.min(1, dot / (nu * nv)))) * 180 / Math.PI : 'No definido'], ...(cr ? [['Producto cruz', t(cr)]] : [])]; } }] },

  { name: 'Cónicas', modes: [
    { name: 'Circunferencia', fields: [['h', 'Centro h'], ['k', 'Centro k'], ['r', 'Radio r']],
      calc: ({ h, k, r }) => { need(r > 0, 'El radio debe ser positivo'); const t = z => `${z < 0 ? '+' : '−'} ${fmt(Math.abs(z))}`, g = (v, s) => ` ${v < 0 ? '−' : '+'} ${fmt(Math.abs(v))}${s}`;
        return [['Ecuación', `(x ${t(h)})² + (y ${t(k)})² = ${fmt(r * r)}`], ['Forma general', `x² + y²${g(-2 * h, 'x')}${g(-2 * k, 'y')}${g(h * h + k * k - r * r, '')} = 0`], ['Área', P * r * r], ['Perímetro', 2 * P * r]]; } },
    { name: 'Elipse', fields: [['a', 'Semieje a'], ['b', 'Semieje b']],
      calc: ({ a, b }) => { need(a > 0 && b > 0, 'Los semiejes deben ser positivos'); const c = sq(Math.abs(a * a - b * b));
        return [['Distancia focal c', c], ['Excentricidad', c / Math.max(a, b)], ['Área', P * a * b], ['Perímetro (aprox.)', P * (3 * (a + b) - sq((3 * a + b) * (a + 3 * b)))]]; } },
    { name: 'Parábola y = ax² + bx + c', fields: [['a', 'a'], ['b', 'b'], ['c', 'c']],
      calc: ({ a, b, c }) => { need(a !== 0, "'a' no puede ser 0"); const xv = -b / (2 * a), yv = c - b * b / (4 * a);
        return [['Vértice', `(${fmt(xv)}, ${fmt(yv)})`], ['Foco', `(${fmt(xv)}, ${fmt(yv + 1 / (4 * a))})`], ['Directriz', 'y = ' + fmt(yv - 1 / (4 * a))], ['Eje de simetría', 'x = ' + fmt(xv)]]; } }] },

  { name: 'Probabilidad', modes: [
    { name: 'Regresión lineal', fields: [['x', 'Valores de x', 'list'], ['y', 'Valores de y', 'list']],
      calc: ({ x, y }) => { need(x.length === y.length && x.length >= 2, 'x e y deben tener la misma cantidad (mínimo 2)');
        const n = x.length, mx = sumA(x) / n, my = sumA(y) / n, sxy = sumA(x.map((v, i) => (v - mx) * (y[i] - my))), sxx = sumA(x.map(v => (v - mx) ** 2)), syy = sumA(y.map(v => (v - my) ** 2));
        need(sxx > 0, 'Los valores de x no pueden ser todos iguales'); const m = sxy / sxx, b = my - m * mx, r = syy ? sxy / sq(sxx * syy) : 1;
        return [['Recta', 'y = ' + px([m, b])], ['Pendiente m', m], ['Ordenada b', b], ['Correlación r', r], ['R²', r * r]]; } },
    { name: 'Binomial', fields: [['n', 'Ensayos n'], ['p', 'Probabilidad de éxito p (0 a 1)'], ['k', 'Éxitos k']],
      calc: ({ n, p, k }) => { need(isInt(n, k) && n >= 0 && n <= 170 && k >= 0 && k <= n && p >= 0 && p <= 1, 'Usa n y k enteros (0 ≤ k ≤ n ≤ 170) y p entre 0 y 1');
        const f = j => comb(n, j) * p ** j * (1 - p) ** (n - j); let lo = 0; for (let j = 0; j <= k; j++) lo += f(j);
        return [['P(X = k)', f(k)], ['P(X ≤ k)', lo], ['P(X ≥ k)', 1 - lo + f(k)], ['Media', n * p], ['Desviación estándar', sq(n * p * (1 - p))]]; } },
    { name: 'Normal', fields: [['m', 'Media μ'], ['s', 'Desviación σ'], ['x', 'Valor x']],
      calc: ({ m, s, x }) => { need(s > 0, 'σ debe ser positiva'); const z = (x - m) / s, c = (1 + erf(z / Math.SQRT2)) / 2; return [['z', z], ['P(X ≤ x)', c], ['P(X ≥ x)', 1 - c]]; } }] },

  { name: 'Interés compuesto y préstamos', modes: [
    { name: 'Interés compuesto', fields: [['c', 'Capital inicial ($)'], ['t', 'Tasa anual (%)'], ['y', 'Tiempo (años)'], ['n', 'Capitalizaciones por año']],
      calc: ({ c, t, y, n }) => { need(n > 0, 'Las capitalizaciones por año deben ser mayores que 0'); const m = c * (1 + t / 100 / n) ** (n * y); return [['Monto final', m], ['Interés ganado', m - c]]; } },
    { name: 'Pago de un préstamo', fields: [['c', 'Monto del préstamo ($)'], ['t', 'Tasa anual (%)'], ['m', 'Plazo (meses)']],
      calc: ({ c, t, m }) => { need(isInt(m) && m > 0, 'El plazo debe ser un número entero de meses'); const i = t / 1200, q = i === 0 ? c / m : c * i / (1 - (1 + i) ** -m);
        return [['Cuota mensual', q], ['Total pagado', q * m], ['Intereses', q * m - c]]; } }] },

  { name: 'Conversor de unidades', modes: [
    { name: 'Temperatura desde °C', fields: [['v', 'Grados °C']], calc: ({ v }) => [['°F', v * 9 / 5 + 32], ['K', v + 273.15]] },
    { name: 'Temperatura desde °F', fields: [['v', 'Grados °F']], calc: ({ v }) => [['°C', (v - 32) * 5 / 9], ['K', (v - 32) * 5 / 9 + 273.15]] },
    { name: 'Longitud desde metros', fields: [['v', 'Metros']], calc: ({ v }) => [['km', v / 1000], ['cm', v * 100], ['mm', v * 1000], ['pulgadas', v / .0254], ['pies', v / .3048], ['yardas', v / .9144], ['millas', v / 1609.344]] },
    { name: 'Masa desde kg', fields: [['v', 'Kilogramos']], calc: ({ v }) => [['g', v * 1000], ['mg', v * 1e6], ['libras', v / .45359237], ['onzas', v / .028349523125]] },
    { name: 'Notación científica', fields: [['v', 'Número']],
      calc: ({ v }) => { need(v !== 0, 'Usa un número distinto de 0'); const [m, e] = v.toExponential(6).split('e'); return [['Notación científica', `${fmt(+m)} × 10${sup(+e)}`]]; } }] },

  { name: 'Otros números', modes: [
    { name: 'Decimal a fracción', fields: [['v', 'Número decimal']],
      calc: ({ v }) => { const sg = v < 0 ? -1 : 1, w = Math.abs(v); let h0 = 1, h1 = Math.trunc(w), k0 = 0, k1 = 1, x = w - Math.trunc(w), i = 0;
        while (Math.abs(w - h1 / k1) > 1e-9 && x && i++ < 20) { x = 1 / x; const a = Math.floor(x); [h0, h1] = [h1, a * h1 + h0]; [k0, k1] = [k1, a * k1 + k0]; x -= a; }
        return [['Fracción', k1 === 1 ? String(sg * h1) : `${sg * h1}/${k1}`]]; } },
    { name: 'Decimal a romano', fields: [['n', 'Número (1 a 3999)']],
      calc: ({ n }) => { need(isInt(n) && n >= 1 && n <= 3999, 'Usa un entero de 1 a 3999'); let r = '', m = n;
        [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].forEach(([v, t]) => { while (m >= v) { r += t; m -= v; } });
        return [['Romano', r]]; } },
    { name: 'Romano a decimal', fields: [['s', 'Número romano', 'text']],
      calc: ({ s }) => { const t = s.trim().toUpperCase(), val = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; need(/^[IVXLCDM]+$/.test(t), 'Usa solo I, V, X, L, C, D, M');
        return [['Decimal', [...t].reduce((a, ch, i, arr) => a + (val[ch] < (val[arr[i + 1]] || 0) ? -val[ch] : val[ch]), 0)]]; } },
    { name: 'Fibonacci', fields: [['n', 'Posición n (0 a 70)']],
      calc: ({ n }) => { need(isInt(n) && n >= 0 && n <= 70, 'Usa un entero de 0 a 70'); const f = [0, 1]; for (let i = 2; i <= Math.max(n, 14); i++) f.push(f[i - 1] + f[i - 2]);
        return [['F(n)', f[n]], ['Primeros términos', f.slice(0, 15).join(', ')]]; } }] },

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
  ['Números y datos', 'Calculadora libre', ['Calculadora libre']],
  ['Números y datos', 'Operaciones básicas', ['Operaciones básicas']],
  ['Números y datos', 'Números', ['Números']],
  ['Números y datos', 'Fracciones', ['Fracciones']],
  ['Números y datos', 'Potencias y logaritmos', ['Potencias y logaritmos']],
  ['Números y datos', 'Proporciones', ['Proporciones']],
  ['Números y datos', 'Estadística', ['Estadística']],
  ['Números y datos', 'Probabilidad', ['Probabilidad']],
  ['Números y datos', 'Finanzas', ['Interés simple', 'Interés compuesto y préstamos', 'Descuento e IVA']],
  ['Números y datos', 'Conversor', ['Conversor de unidades']],
  ['Números y datos', 'Otros números', ['Otros números']],
  ['Álgebra y cálculo', 'Ecuaciones', ['Ecuación lineal', 'Fórmula general']],
  ['Álgebra y cálculo', 'Sistemas', ['Sistemas de ecuaciones']],
  ['Álgebra y cálculo', 'Desigualdades', ['Desigualdades']],
  ['Álgebra y cálculo', 'Binomios', ['Binomios y polinomios']],
  ['Álgebra y cálculo', 'Trinomios y más', ['Trinomios y polinomios']],
  ['Álgebra y cálculo', 'Matrices', ['Matrices']],
  ['Álgebra y cálculo', 'Complejos', ['Números complejos']],
  ['Álgebra y cálculo', 'Progresiones', ['Progresiones']],
  ['Álgebra y cálculo', 'Derivadas e integrales', ['Derivadas e integrales']],
  ['Álgebra y cálculo', 'Graficador f(x)', ['Graficador f(x)']],
  ['Geometría', 'Círculo', ['Círculo']],
  ['Geometría', 'Puntos (x, y)', ['Distancia entre puntos', 'Punto medio']],
  ['Geometría', 'Recta', ['Recta']],
  ['Geometría', 'Pitágoras', ['Teorema de Pitágoras']],
  ['Geometría', 'Áreas planas', ['Áreas planas']],
  ['Geometría', 'Figuras 3D', ['Geometría 3D']],
  ['Geometría', 'Trigonometría', ['Trigonometría']],
  ['Geometría', 'Vectores', ['Vectores']],
  ['Geometría', 'Cónicas', ['Cónicas']]
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

// Menú: en computadora, lista lateral con todos los módulos (.side);
// en celular, 3 categorías que se despliegan para elegir módulo (.two)
let openCat = null;
const GROUPS = [...new Set(MODS.map(m => m.group))];
function navBtn(m, i) {
  const b = btn(m.name, () => { mi = i; ki = 0; openCat = null; render(); });
  b.setAttribute('aria-current', i === mi); return b;
}
function renderNav() {
  const side = document.createElement('div'); side.className = 'side';
  let last;
  MODS.forEach((m, i) => {
    if (m.group !== last) { const h = document.createElement('p'); h.className = 'grp'; h.textContent = last = m.group; side.append(h); }
    side.append(navBtn(m, i));
  });
  const two = document.createElement('div'), cats = document.createElement('div'), drawer = document.createElement('div');
  two.className = 'two'; cats.className = 'cats'; drawer.className = 'drawer'; drawer.hidden = openCat === null;
  GROUPS.forEach(g => {
    const b = btn(g, () => { openCat = openCat === g ? null : g; renderNav(); });
    b.setAttribute('aria-expanded', openCat === g);
    if (MODS[mi].group === g) b.dataset.here = 'true';
    cats.append(b);
  });
  MODS.forEach((m, i) => { if (m.group === openCat) drawer.append(navBtn(m, i)); });
  two.append(cats, drawer);
  nav.replaceChildren(side, two);
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

let lastVals;
function drawFig(vals) {
  lastVals = vals;
  const f = mode().draw;
  try { fig.innerHTML = f ? f(vals) : ''; } catch { fig.replaceChildren(); }
  wrap.hidden = !fig.firstChild;
}

// Dibujo en pantalla completa: <dialog> modal (Esc o tocar fuera para cerrar)
const dlg = $('#dlg');
$('#zoom').onclick = () => {
  dlg.showModal();
  const box = $('#big'), r = box.getBoundingClientRect(), f = mode().draw;
  box.innerHTML = f ? renderAt(f, lastVals, r.width, r.height) : fig.innerHTML;
  enableZoom(box);
};

// Pellizcar o rueda para acercar, arrastrar para mover, doble toque para restablecer
function enableZoom(box) {
  const svg = box.firstElementChild; if (!svg) return;
  let sc = 1, tx = 0, ty = 0, tapT = 0, down = [0, 0]; const pts = new Map();
  const apply = () => {
    const mx = box.clientWidth * sc / 2, my = box.clientHeight * sc / 2;
    tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
    svg.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
  };
  const zoomAt = (cx, cy, k) => {
    const s2 = Math.min(8, Math.max(1, sc * k)); k = s2 / sc;
    tx = cx - k * (cx - tx); ty = cy - k * (cy - ty); sc = s2;
    if (sc === 1) tx = ty = 0;
    apply();
  };
  const rel = (x, y) => { const r = box.getBoundingClientRect(); return [x - r.left - r.width / 2, y - r.top - r.height / 2]; };
  box.onpointerdown = e => { box.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); down = [e.clientX, e.clientY]; };
  box.onpointermove = e => {
    const prev = pts.get(e.pointerId); if (!prev) return;
    const cur = [e.clientX, e.clientY];
    if (pts.size === 1 && sc > 1) { tx += cur[0] - prev[0]; ty += cur[1] - prev[1]; apply(); }
    else if (pts.size === 2) {
      const other = [...pts].find(([id]) => id !== e.pointerId)[1];
      const d0 = Math.hypot(prev[0] - other[0], prev[1] - other[1]), d1 = Math.hypot(cur[0] - other[0], cur[1] - other[1]);
      const [mx, my] = rel((cur[0] + other[0]) / 2, (cur[1] + other[1]) / 2);
      if (d0) zoomAt(mx, my, d1 / d0);
      if (sc > 1) { tx += (cur[0] - prev[0]) / 2; ty += (cur[1] - prev[1]) / 2; apply(); }
    }
    pts.set(e.pointerId, cur);
  };
  box.onpointerup = box.onpointercancel = e => {
    pts.delete(e.pointerId);
    if (pts.size || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
    if (e.timeStamp - tapT < 320) { tapT = 0; if (sc > 1) { sc = 1; tx = ty = 0; apply(); } else zoomAt(...rel(e.clientX, e.clientY), 2.5); }
    else tapT = e.timeStamp;
  };
  box.onwheel = e => { e.preventDefault(); zoomAt(...rel(e.clientX, e.clientY), Math.exp(-e.deltaY * .002)); };
}
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

document.addEventListener('gesturestart', e => e.preventDefault());   // sin zoom de página: el zoom vive en "Ampliar"
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
applyCfg();
render();
