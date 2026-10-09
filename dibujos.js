/* Dibujos en SVG. Cada función recibe los valores del formulario y devuelve
   un <svg> (o '' si no hay nada que dibujar). DRAW los asocia a cada módulo. */
let W = 400, H = 300;   // H cambia al ampliar (ver renderAt)
const svg = b => `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dibujo del resultado">${b}</svg>`;
const T = (x, y, s, a = 'middle') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${a}">${s}</text>`;
const L = (x1, y1, x2, y2, c = 'ln') => `<line class="${c}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
const dot = (x, y, c = 'pt') => `<circle class="${c}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`;
const f3 = x => String(+x.toFixed(3));

// Escala los puntos (en coordenadas matemáticas) para que quepan en el dibujo
function view(pts, pad = 40) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const dx = x1 - x0 || 1, dy = y1 - y0 || 1;
  const s = Math.min((W - 2 * pad) / dx, (H - 2 * pad) / dy);
  const ox = (W - s * dx) / 2 - s * x0, oy = (H - s * dy) / 2 + s * y1;
  return { X: x => ox + s * x, Y: y => oy - s * y, xmin: -ox / s, xmax: (W - ox) / s };
}
const plane = (pts, fn) => {
  const g = view([[0, 0], ...pts]);
  return svg(L(0, g.Y(0), W, g.Y(0), 'ax') + L(g.X(0), 0, g.X(0), H, 'ax') + fn(g));
};
const curve = (g, f, cls = 'ln') => {
  const p = [];
  for (let i = 0; i <= 120; i++) {
    const x = g.xmin + (g.xmax - g.xmin) * i / 120, y = g.Y(f(x));
    if (y > -H && y < 2 * H) p.push(g.X(x).toFixed(1) + ',' + y.toFixed(1));
  }
  return `<polyline class="${cls}" fill="none" points="${p.join(' ')}"/>`;
};
const pt = (g, x, y, name, c = 'pt', dy = -10) =>
  dot(g.X(x), g.Y(y), c) + T(g.X(x), g.Y(y) + dy, `${name}(${fmt(x)}, ${fmt(y)})`);

// Triángulo con etiquetas en cada lado (AB, BC, CA)
function tri(A, B, C, l1, l2, l3, extra) {
  const g = view([A, B, C]), S = [A, B, C].map(p => [g.X(p[0]), g.Y(p[1])]);
  const cx = (S[0][0] + S[1][0] + S[2][0]) / 3, cy = (S[0][1] + S[1][1] + S[2][1]) / 3;
  const lab = (p, q, t) => {
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, vx = mx - cx, vy = my - cy, d = Math.hypot(vx, vy) || 1;
    return T(mx + vx / d * 18, my + vy / d * 18 + 4, t);
  };
  return svg(`<polygon class="sh" points="${S.map(p => p.join(',')).join(' ')}"/>`
    + lab(S[0], S[1], l1) + lab(S[1], S[2], l2) + lab(S[2], S[0], l3) + extra(g));
}

const seg = (v, mid) => {
  const { x1, y1, x2, y2 } = v, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return plane([[x1, y1], [x2, y2]], g =>
    `<polyline class="gd" points="${g.X(x1)},${g.Y(y1)} ${g.X(x2)},${g.Y(y1)} ${g.X(x2)},${g.Y(y2)}"/>`
    + L(g.X(x1), g.Y(y1), g.X(x2), g.Y(y2)) + pt(g, x1, y1, 'P₁') + pt(g, x2, y2, 'P₂', 'pt', 18)
    + (mid ? pt(g, mx, my, 'M', 'hl', 18) : T(g.X(mx), g.Y(my) - 8, 'd = ' + fmt(Math.hypot(x2 - x1, y2 - y1)))));
};

const linea = ({ a, b }) => {
  const xr = -b / a;
  return plane([[xr, 0], [0, b], [xr - 2, 0], [xr + 2, 0]], g =>
    curve(g, x => a * x + b) + pt(g, xr, 0, 'x', 'hl', 18) + (b ? pt(g, 0, b, '', 'pt') : ''));
};

const parab = ({ a, b, c }) => {
  const d = b * b - 4 * a * c, xv = -b / (2 * a), yv = c - b * b / (4 * a);
  const rs = d > 0 ? [(-b + sq(d)) / (2 * a), (-b - sq(d)) / (2 * a)] : d === 0 ? [xv] : [];
  return plane([[xv, yv], [0, c], [xv - 2, 0], [xv + 2, 0], ...rs.map(r => [r, 0])], g =>
    curve(g, x => a * x * x + b * x + c)
    + rs.map((r, i) => pt(g, r, 0, rs.length > 1 ? 'x' + (i + 1) : 'x', 'hl', 18)).join('')
    + pt(g, xv, yv, 'V'));
};

const circulo = r => {
  if (!(r > 0)) return '';
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 3, ex = cx + R * .819, ey = cy - R * .574;
  return svg(`<circle class="sh" cx="${cx}" cy="${cy}" r="${R}"/>` + L(cx - R, cy, cx + R, cy, 'gd')
    + L(cx, cy, ex, ey) + dot(cx, cy) + T(cx + R * .41 + 8, cy - R * .287 - 8, 'r = ' + fmt(r), 'start')
    + T(cx, cy + 20, 'd = ' + fmt(2 * r)));
};

const esfera = r => !(r > 0) ? '' : svg(`<circle class="sh" cx="200" cy="150" r="100"/><ellipse class="gd" cx="200" cy="150" rx="100" ry="30"/>`
  + L(200, 150, 300, 150) + dot(200, 150) + T(250, 140, 'r = ' + fmt(r)));

const cilindro = (r, h) => {
  if (!(r > 0 && h > 0)) return '';
  const k = Math.min(110 / r, 200 / h), rx = r * k, hh = h * k, ry = Math.max(rx * .3, 6), cx = 170, t = (H - hh) / 2, b = t + hh;
  return svg(`<path class="sh" d="M${cx - rx},${t} L${cx - rx},${b} A${rx},${ry} 0 0 0 ${cx + rx},${b} L${cx + rx},${t} Z"/>`
    + `<ellipse class="sh" cx="${cx}" cy="${t}" rx="${rx}" ry="${ry}"/>` + L(cx, t, cx + rx, t) + dot(cx, t)
    + T(cx + rx / 2, t - 8, 'r = ' + fmt(r)) + T(cx + rx + 10, (t + b) / 2 + 4, 'h = ' + fmt(h), 'start'));
};

const cubo = a => !(a > 0) ? '' : svg(
  `<polygon class="sh" points="100,120 145,80 275,80 230,120"/><polygon class="sh" points="230,120 275,80 275,210 230,250"/>`
  + `<rect class="sh" x="100" y="120" width="130" height="130"/>` + T(165, 275, 'a = ' + fmt(a)));

const rectangulo = (a, b, c) => !(a > 0 && b > 0) ? '' :
  tri([0, 0], [a, 0], [0, b], 'a = ' + fmt(a), 'c = ' + fmt(c), 'b = ' + fmt(b), g => {
    const x = g.X(0), y = g.Y(0);
    return `<polyline class="gd" points="${x + 14},${y} ${x + 14},${y - 14} ${x},${y - 14}"/>`;
  });

const coseno = ({ a, b, C }) => {
  if (!(a > 0 && b > 0 && C > 0 && C < 180)) return '';
  const r = C * P / 180, c = sq(a * a + b * b - 2 * a * b * Math.cos(r));
  return tri([0, 0], [b, 0], [a * Math.cos(r), a * Math.sin(r)], 'b = ' + fmt(b), 'c = ' + fmt(c), 'a = ' + fmt(a), g => {
    const x = g.X(0), y = g.Y(0), m = r / 2;
    return `<path class="gd" d="M${x + 26},${y} A26,26 0 0 0 ${x + 26 * Math.cos(r)},${y - 26 * Math.sin(r)}"/>`
      + T(x + 34 * Math.cos(m), y - 34 * Math.sin(m) + 4, 'C = ' + fmt(C) + '°', 'start');
  });
};

// Círculo unitario con el seno (rojo) y el coseno (verde)
const unidad = (g, name) => {
  const cx = 200, cy = 150, R = 105, t = (((g % 360) + 360) % 360) * P / 180;
  const px = cx + R * Math.cos(t), py = cy - R * Math.sin(t), right = px >= cx;
  return svg(`<circle class="sh" cx="${cx}" cy="${cy}" r="${R}"/>` + L(cx - R - 12, cy, cx + R + 12, cy, 'ax') + L(cx, cy - R - 12, cx, cy + R + 12, 'ax')
    + L(cx, cy, px, cy) + L(px, cy, px, py, 'sn') + L(cx, cy, px, py, 'gd') + dot(px, py, 'hl')
    + (t > 0 ? `<path class="gd" d="M${cx + 24},${cy} A24,24 0 ${t > P ? 1 : 0} 0 ${cx + 24 * Math.cos(t)},${cy - 24 * Math.sin(t)}"/>` : '')
    + T(px + (right ? 8 : -8), (py + cy) / 2, 'sen = ' + f3(Math.sin(t)), right ? 'start' : 'end')
    + T((cx + px) / 2, cy + (py < cy ? 18 : -8), 'cos = ' + f3(Math.cos(t))) + T(10, 22, name, 'start'));
};

const barras = d => {
  const n = d.length, mean = d.reduce((x, y) => x + y, 0) / n, lo = Math.min(0, ...d), hi = Math.max(0, ...d);
  const k = 190 / (hi - lo || 1), base = 45 + hi * k, bw = Math.min(40, 340 / n), x0 = (W - bw * n) / 2, my = base - mean * k;
  return svg(L(20, base, W - 20, base, 'ax') + d.map((v, i) => {
    const h = Math.max(Math.abs(v) * k, 1), y = v >= 0 ? base - h : base, x = x0 + i * bw;
    return `<rect class="sh" x="${x + 2}" y="${y}" width="${bw - 4}" height="${h}"/>`
      + (n <= 12 ? T(x + bw / 2, v >= 0 ? y - 5 : y + h + 13, fmt(v)) : '');
  }).join('') + L(20, my, W - 20, my, 'gd') + T(W - 20, my - 6, 'prom = ' + fmt(mean), 'end'));
};

// Recta Ax + By = C
const lineABC = (g, a, b, c, cls = 'ln') => b !== 0 ? curve(g, x => (c - a * x) / b, cls) : L(g.X(c / a), 0, g.X(c / a), H, cls);
const sist2 = ({ a, b, c, d, e, f }) => {
  const D = a * e - b * d, p = D ? [(c * e - b * f) / D, (a * f - c * d) / D] : [0, 0];
  return plane([p, [p[0] - 2, p[1]], [p[0] + 2, p[1]]], g => lineABC(g, a, b, c) + lineABC(g, d, e, f, 'sn') + (D ? pt(g, p[0], p[1], 'P', 'hl', 18) : ''));
};
const rectaDraw = (x1, y1, x2, y2) => {
  if (x1 === x2 && y1 === y2) return '';
  const A = y2 - y1, B = x1 - x2, C = A * x1 + B * y1;
  return plane([[x1, y1], [x2, y2]], g => lineABC(g, A, B, C) + pt(g, x1, y1, 'P₁') + pt(g, x2, y2, 'P₂', 'pt', 18));
};
const vecDraw = ({ u, v }) => {
  if (u.length !== 2 || v.length !== 2) return '';
  const s = [u[0] + v[0], u[1] + v[1]];
  return plane([u, v, s], g => L(g.X(0), g.Y(0), g.X(u[0]), g.Y(u[1])) + L(g.X(0), g.Y(0), g.X(v[0]), g.Y(v[1]), 'sn') + L(g.X(0), g.Y(0), g.X(s[0]), g.Y(s[1]), 'gd')
    + pt(g, u[0], u[1], 'u') + pt(g, v[0], v[1], 'v', 'hl', 18) + pt(g, s[0], s[1], 'u+v', 'pt', 18));
};
const regDraw = ({ x, y }) => {
  const n = x.length; if (n < 2 || y.length !== n) return '';
  const mx = sumA(x) / n, my = sumA(y) / n, sxx = sumA(x.map(v => (v - mx) ** 2)); if (!sxx) return '';
  const m = sumA(x.map((v, i) => (v - mx) * (y[i] - my))) / sxx, b = my - m * mx;
  return plane(x.map((v, i) => [v, y[i]]), g => curve(g, t => m * t + b) + x.map((v, i) => dot(g.X(v), g.Y(y[i]), 'hl')).join(''));
};
// Gráfica de una o más funciones en [xmin, xmax] con escala propia en cada eje
const graf = (fns, xmin = -10, xmax = 10) => {
  const ys = [];
  fns.forEach(f => { for (let i = 0; i <= 200; i++) { const y = f(xmin + (xmax - xmin) * i / 200); if (Number.isFinite(y)) ys.push(y); } });
  if (ys.length < 2) return '';
  ys.sort((a, b) => a - b);
  let lo = ys[Math.floor(ys.length * .03)], hi = ys[Math.floor(ys.length * .97)];
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * .1; lo = Math.min(lo - pad, 0); hi = Math.max(hi + pad, 0);
  const X = x => 24 + (x - xmin) / (xmax - xmin) * (W - 48), Y = y => H - 24 - (y - lo) / (hi - lo) * (H - 48);
  let out = L(24, Y(0), W - 24, Y(0), 'ax') + L(X(0), 24, X(0), H - 24, 'ax') + T(24, H - 6, fmt(xmin), 'start') + T(W - 24, H - 6, fmt(xmax), 'end');
  fns.forEach((f, k) => {
    const cls = k ? 'sn' : 'ln'; let seg = [];
    const flush = () => { if (seg.length > 1) out += `<polyline class="${cls}" fill="none" points="${seg.join(' ')}"/>`; seg = []; };
    for (let i = 0; i <= 400; i++) { const x = xmin + (xmax - xmin) * i / 400, y = f(x), py = Y(y);
      if (Number.isFinite(y) && py > -H && py < 2 * H) seg.push(X(x).toFixed(1) + ',' + py.toFixed(1)); else flush(); }
    flush();
  });
  return svg(out);
};

// Gráfica de ax³ + bx² + cx + d con sus raíces reales
const cubica = ({ a, b, c, d }) => {
  const { r } = cubicRoots(a, b, c, d), f = x => ((a * x + b) * x + c) * x + d;
  return plane([[0, d], ...r.flatMap(x => [[x - 1, 0], [x, 0], [x + 1, 0]])], g =>
    curve(g, f) + r.map((x, i) => pt(g, x, 0, 'x' + (i + 1), 'hl', 18)).join(''));
};

// Modelo de áreas de (a + b)²: un cuadrado de lado a + b dividido en a², ab, ab y b²
const areaBinomio = (a, b) => {
  if (!(a > 0 && b > 0)) return '';
  const S = 220, x0 = (W - S) / 2, y0 = 24, A = S * a / (a + b), B = S - A;
  const cell = (x, y, w, h, t) => `<rect class="sh" x="${x}" y="${y}" width="${w}" height="${h}"/>` + (Math.min(w, h) > 34 ? T(x + w / 2, y + h / 2 + 4, t) : '');
  return svg(cell(x0, y0, A, A, 'a²') + cell(x0 + A, y0, B, A, 'ab') + cell(x0, y0 + A, A, B, 'ab') + cell(x0 + A, y0 + A, B, B, 'b²')
    + T(x0 + A / 2, y0 - 6, 'a') + T(x0 + A + B / 2, y0 - 6, 'b') + T(W / 2, y0 + S + 24, '(a + b)² = ' + fmt((a + b) ** 2)));
};

const DRAW = {
  'Binomios y polinomios': [v => areaBinomio(v.a, v.b)],
  'Trinomios y polinomios': [, parab, cubica],
  'Graficador f(x)': [v => graf([x => evalExpr(v.f, { x })])],
  'Derivadas e integrales': [v => graf([x => horner(v.p, x), x => horner(dpoly(v.p), x)]), v => graf([x => horner(v.p, x), x => horner(ipoly(v.p), x)]), v => graf([x => horner(v.p, x)])],
  'Sistemas de ecuaciones': [sist2],
  'Recta': [v => rectaDraw(v.x1, v.y1, v.x2, v.y2), v => rectaDraw(v.x1, v.y1, v.x1 + 1, v.y1 + v.m)],
  'Vectores': vecDraw,
  'Probabilidad': [regDraw],
  'Círculo': [v => circulo(v.r), v => circulo(sq(v.A / P)), v => circulo(v.p / (2 * P))],
  'Distancia entre puntos': v => seg(v, false),
  'Punto medio': v => seg(v, true),
  'Ecuación lineal': linea,
  'Fórmula general': parab,
  'Teorema de Pitágoras': [v => rectangulo(v.a, v.b, Math.hypot(v.a, v.b)), v => rectangulo(v.a, sq(v.c * v.c - v.a * v.a), v.c)],
  'Geometría 3D': [v => esfera(v.r), v => cilindro(v.r, v.h), v => cubo(v.a)],
  'Trigonometría': [v => unidad(v.g, `θ = ${fmt(v.g)}°`), v => unidad(v.g, `${fmt(v.g)}° = ${fmt(v.g * P / 180)} rad`), coseno],
  'Estadística': v => barras(v.d)
};

// Dibujos que se adaptan a la proporción de la pantalla cuando se amplían
['Distancia entre puntos', 'Punto medio', 'Ecuación lineal', 'Fórmula general', 'Trinomios y polinomios', 'Teorema de Pitágoras', 'Círculo',
  'Graficador f(x)', 'Derivadas e integrales', 'Sistemas de ecuaciones', 'Recta', 'Vectores', 'Probabilidad']
  .forEach(n => [].concat(DRAW[n]).filter(Boolean).forEach(f => { f.flex = true; }));
DRAW['Trigonometría'][2].flex = true;

// Dibuja f con el alto de la pantalla (ancho fijo de 400) si es flexible; si no, con el tamaño normal
function renderAt(f, vals, w, h) {
  if (!f.flex) return f(vals);
  const h0 = H; H = Math.round(400 * h / w);
  try { return f(vals); } finally { H = h0; }
}
