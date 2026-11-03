// Slow liquid gold on black, drawn in WebGL so it stays sharp on any screen with no photo to stretch.
// If WebGL is missing, the CSS gradient behind the canvas (.hero__media) shows instead.
const VERTEX = `attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAGMENT = `
precision highp float;
uniform vec2 res;
uniform float t;
uniform vec2 pointer;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = r * p * 2.02; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
  vec2 p = uv * 1.5 + pointer * 0.06;
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)), fbm(p + vec2(5.2, 1.3) - t * 0.04));
  vec2 w = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.03), fbm(p + 3.0 * q + vec2(8.3, 2.8)));
  vec2 warp = 3.6 * w;
  float e = 0.012;
  float h = fbm(p + warp);
  float hx = fbm(p + warp + vec2(e, 0.0));
  float hy = fbm(p + warp + vec2(0.0, e));
  vec3 n = normalize(vec3((h - hx) / e * 0.55, (h - hy) / e * 0.55, 1.0));
  vec3 light = normalize(vec3(0.45 + pointer.x * 0.25, 0.65 + pointer.y * 0.25, 0.8));
  float diff = max(dot(n, light), 0.0);
  float spec = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 26.0);

  float body = smoothstep(0.34, 0.62, h);
  vec3 black = vec3(0.035, 0.03, 0.022);
  vec3 bronze = vec3(0.30, 0.205, 0.075);
  vec3 gold = vec3(0.84, 0.66, 0.34);
  vec3 col = mix(black, bronze, body * diff);
  col = mix(col, gold, smoothstep(0.46, 0.70, h) * pow(diff, 2.0));
  col += vec3(1.0, 0.9, 0.66) * spec * body * 1.15;

  // darker toward the left and bottom, where the headline sits
  float keep = smoothstep(-0.95, 0.55, uv.x * 0.8 + uv.y * 0.55);
  col *= mix(0.42, 1.0, keep);
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export function initLiquid(canvas, { reduceMotion = false } = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { canvas.style.display = 'none'; return undefined; }
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) { canvas.style.display = 'none'; return undefined; }
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.style.display = 'none'; return undefined; }
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(program, 'res');
  const uT = gl.getUniformLocation(program, 't');
  const uPointer = gl.getUniformLocation(program, 'pointer');

  // rendered small and scaled up by CSS: the look is soft anyway, and phones keep their battery
  const small = window.innerWidth < 700;
  const resize = () => {
    const scale = small ? 0.5 : 0.6;
    const w = Math.round(canvas.clientWidth * scale);
    const h = Math.round(canvas.clientHeight * scale);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  };

  const target = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };
  const draw = (seconds) => {
    pointer.x += (target.x - pointer.x) * 0.04;
    pointer.y += (target.y - pointer.y) * 0.04;
    gl.uniform1f(uT, seconds);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  resize();
  const onResize = () => { resize(); if (reduceMotion) draw(20); };
  window.addEventListener('resize', onResize);
  if (reduceMotion) { draw(20); return () => window.removeEventListener('resize', onResize); }

  const onPointer = (e) => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = 1 - (e.clientY / window.innerHeight) * 2;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  let visible = true;
  let raf = 0;
  let last = 0;
  const frameGap = small ? 1000 / 30 : 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (now - last < frameGap) return;
    last = now;
    draw(now / 1000 + 20);
  };
  const sync = () => {
    cancelAnimationFrame(raf);
    if (visible && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  observer.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  sync();

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', sync);
  };
}
