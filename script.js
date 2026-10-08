const $ = s => document.querySelector(s);
const P = Math.PI, sq = Math.sqrt;
const need = (ok, msg) => { if (!ok) throw new Error(msg); };

function fmt(v) {
  if (typeof v !== 'number') return v;
  if (!Number.isFinite(v)) return 'No definido';
  if (Math.abs(v) < 1e-12) v = 0;
  return String(parseFloat(v.toPrecision(10)));
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
      calc: ({ p, r }) => [['Monto del impuesto', p * r / 100], ['Precio total', p + p * r / 100]] }] }
];

/* ---------- Interfaz ---------- */
const nav = $('#nav'), modesEl = $('#modes'), form = $('#form'), out = $('#out'), fig = $('#fig');
let mi = 0, ki = 0;
const mode = () => MODULES[mi].modes[ki];

function btn(text, onclick) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = text; b.onclick = onclick; return b;
}

function renderNav() {
  nav.replaceChildren(...MODULES.map((m, i) => {
    const b = btn(m.name, () => { mi = i; ki = 0; render(); });
    b.setAttribute('aria-current', i === mi); return b;
  }));
}

function render() {
  renderNav();
  $('#title').textContent = MODULES[mi].name;
  const modes = MODULES[mi].modes;
  modesEl.replaceChildren(...(modes.length > 1 ? modes.map((m, i) => {
    const b = btn(m.name, () => { ki = i; render(); });
    b.setAttribute('aria-pressed', i === ki); return b;
  }) : []));
  form.replaceChildren(...mode().fields.map(([k, label, type]) => {
    const l = document.createElement('label'), inp = document.createElement('input');
    l.append(label, inp); inp.name = k;
    if (type === 'list') inp.inputMode = 'decimal';
    else { inp.type = 'number'; inp.step = 'any'; }
    return l;
  }));
  update();
  animateIn();
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
    } else { vals[k] = Number(v); if (Number.isNaN(vals[k])) ok = false; }
  });
  out.replaceChildren(); fig.replaceChildren();
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
  const d = DRAW[MODULES[mi].name], f = Array.isArray(d) ? d[ki] : d;
  try { fig.innerHTML = f ? f(vals) : ''; } catch { fig.replaceChildren(); }
}

form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
render();
