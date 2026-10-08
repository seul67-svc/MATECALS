const $ = s => document.querySelector(s);
const input = $('#expr'), preview = $('#preview'), histEl = $('#hist'), modeBtn = $('#mode');
let deg = true, ans = 0, fresh = false, history = [];
try { history = JSON.parse(localStorage.getItem('sc-history')) || []; } catch {}

/* ---------- Matemáticas ---------- */
const toRad = x => deg ? x * Math.PI / 180 : x;
const fromRad = x => deg ? x * 180 / Math.PI : x;
const FN = {
  sin: x => Math.sin(toRad(x)), cos: x => Math.cos(toRad(x)), tan: x => Math.tan(toRad(x)),
  asin: x => fromRad(Math.asin(x)), acos: x => fromRad(Math.acos(x)), atan: x => fromRad(Math.atan(x)),
  sqrt: Math.sqrt, ln: Math.log, log: Math.log10, abs: Math.abs
};
const CONST = { pi: Math.PI, e: Math.E };
const fact = n => {
  if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
};

// Parser propio (sin eval): suma, resta, *, /, ^, %, !, funciones, paréntesis y multiplicación implícita
function evaluate(src) {
  const open = (src.match(/\(/g) || []).length - (src.match(/\)/g) || []).length;
  const tk = (src + ')'.repeat(Math.max(open, 0)))
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt')
    .toLowerCase().match(/\d+\.?\d*|\.\d+|[a-z]+|\S/g) || [];
  let i = 0;
  const peek = () => tk[i], next = () => tk[i++];
  const fail = () => { throw new Error('Expresión no válida'); };

  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') v = next() === '+' ? v + term() : v - term();
    return v;
  }
  function term() {
    let v = unary();
    for (;;) {
      const t = peek();
      if (t === '*' || t === '/') { next(); const r = unary(); v = t === '*' ? v * r : v / r; }
      else if (t === '(' || /^[a-z]/.test(t || '')) v *= power();
      else return v;
    }
  }
  function unary() {
    if (peek() === '-') { next(); return -unary(); }
    if (peek() === '+') { next(); return unary(); }
    return power();
  }
  function power() {
    const b = postfix();
    if (peek() === '^') { next(); return Math.pow(b, unary()); }
    return b;
  }
  function postfix() {
    let v = primary();
    for (;;) {
      if (peek() === '!') { next(); v = fact(v); }
      else if (peek() === '%') { next(); v /= 100; }
      else return v;
    }
  }
  function primary() {
    const t = next();
    if (t === undefined) fail();
    if (/^[\d.]/.test(t)) return parseFloat(t);
    if (t === '(') { const v = expr(); if (next() !== ')') fail(); return v; }
    if (t === 'ans') return ans;
    if (Object.hasOwn(CONST, t)) return CONST[t];
    if (Object.hasOwn(FN, t)) {
      if (next() !== '(') fail();
      const v = expr(); if (next() !== ')') fail();
      return FN[t](v);
    }
    fail();
  }
  const result = expr();
  if (i < tk.length) fail();
  return result;
}

function fmt(n) {
  if (!Number.isFinite(n)) throw new Error('Resultado no válido');
  if (Math.abs(n) < 1e-12) n = 0;
  return String(parseFloat(n.toPrecision(12)));
}

/* ---------- Interfaz ---------- */
const SCI = ['sin|sin(', 'cos|cos(', 'tan|tan(', 'ln|ln(', 'log|log(',
  'asin|asin(', 'acos|acos(', 'atan|atan(', '√|√(', '^',
  '(', ')', 'π', 'e', '!'];
const MAIN = ['AC|AC|fn', '⌫|BK|fn', '%|%|fn', '÷|÷|op',
  '7', '8', '9', '×|×|op', '4', '5', '6', '−|-|op',
  '1', '2', '3', '+|+|op', '0', '.', 'Ans|ans|fn', '=|EQ|eq'];

function build(sel, list) {
  list.forEach(spec => {
    const [label, val = label, cls = ''] = spec.split('|');
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.dataset.v = val; b.className = cls;
    $(sel).append(b);
  });
}
build('#sci', SCI);
build('#main', MAIN);

function show(text, isErr = false) {
  preview.textContent = text;
  preview.classList.toggle('err', isErr);
}

function update() {
  const src = input.value.trim();
  if (!src) return show('');
  try {
    const s = fmt(evaluate(src));
    show(s === src ? '' : '= ' + s);
  } catch { show(''); }
}

function equals() {
  const src = input.value.trim();
  if (!src) return;
  try {
    const s = fmt(evaluate(src));
    ans = parseFloat(s);
    history = [{ e: src, r: s }, ...history].slice(0, 30);
    save(); renderHist();
    input.value = s; show(''); fresh = true;
  } catch (err) { show(err.message, true); }
}

function press(v) {
  input.focus();
  if (v === 'EQ') return equals();
  if (v === 'AC') input.value = '';
  else if (v === 'BK') {
    const s = input.selectionStart, e = input.selectionEnd;
    if (s !== e) input.setRangeText('', s, e, 'end');
    else if (s > 0) input.setRangeText('', s - 1, s, 'end');
  } else {
    if (fresh && !/^[-+×÷^%!)]/.test(v)) input.value = '';
    input.setRangeText(v, input.selectionStart, input.selectionEnd, 'end');
  }
  fresh = false; update();
}

function save() { try { localStorage.setItem('sc-history', JSON.stringify(history)); } catch {} }

function renderHist() {
  histEl.replaceChildren();
  if (!history.length) {
    const li = document.createElement('li');
    li.className = 'empty'; li.textContent = 'Tus cálculos aparecerán aquí.';
    return histEl.append(li);
  }
  history.forEach(h => {
    const li = document.createElement('li'), b = document.createElement('button');
    const small = document.createElement('small'), strong = document.createElement('strong');
    small.textContent = h.e; strong.textContent = '= ' + h.r;
    b.type = 'button'; b.dataset.r = h.r; b.title = 'Usar este resultado';
    b.append(small, strong); li.append(b); histEl.append(li);
  });
}

/* ---------- Eventos ---------- */
$('.calc').addEventListener('click', e => {
  const b = e.target.closest('.keys [data-v]');
  if (b) press(b.dataset.v);
});
histEl.addEventListener('click', e => {
  const b = e.target.closest('[data-r]');
  if (b) press(b.dataset.r);
});
$('#clearHist').addEventListener('click', () => { history = []; save(); renderHist(); });
modeBtn.addEventListener('click', () => {
  deg = !deg; modeBtn.textContent = deg ? 'DEG' : 'RAD'; update();
});
input.addEventListener('input', () => { fresh = false; update(); });
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); equals(); }
  if (e.key === 'Escape') press('AC');
});

renderHist();
input.focus();
