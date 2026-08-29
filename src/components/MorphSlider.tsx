import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode, Ref } from 'react';
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl';
import { gsap } from 'gsap';
import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * MorphSlider — one image dissolving into the next through a GPU displacement
 * field. Ported from React Bits (the JavaScript + CSS variant) to TypeScript.
 *
 * Four characters of morph, chosen with `transition`: `melt` warps both frames
 * along a five-octave fBm noise field, `ripple` pushes a ring outward from the
 * pointer, `shear` slides fourteen horizontal bands past each other, `swirl`
 * counter-rotates the two frames about the centre. The RGB channels split apart
 * at mid-transition and resolve to zero by the end, and a soft vignette tinted
 * with `overlayColor` sits over the result.
 *
 * Deliberate departures from the published source, all of them load-bearing:
 *
 *  - **Textures load on demand, not all at once.** The original loads every
 *    slide in the constructor. The live restaurant gallery is nineteen photos,
 *    and nineteen 1200px textures is ~80MB of GPU memory charged up front for a
 *    visitor who usually looks at two. Each slide is fetched the first time it
 *    is needed, with its immediate neighbours prefetched.
 *  - **Idle drift is gated on reduced motion.** In the original the two drift
 *    lines run *above* the `if (uReduce < 0.5)` block, so a reader who asked
 *    the OS for no animation still got a breathing image.
 *  - **The render loop stops when there is nothing to draw** — off-screen, on a
 *    hidden tab, or idle with drift at zero.
 *  - **A slide whose image fails to load is skipped** and reported through
 *    `onItemUnavailable`. A fraction of Google photo links are blocked by
 *    Chrome's opaque-response blocking; the original paints those as a flat 4×4
 *    dark texture with no way for the caller to find out.
 *  - **`jumpTo(index)` morphs straight to a slide.** The original's indicator
 *    dots call `goTo(±1)`, which advances one slide however far the dot is —
 *    with a thumbnail rail that is a bug you can see.
 *  - **`items` is required**; the four Unsplash defaults were demo data.
 */

export type MorphTransition = 'melt' | 'ripple' | 'shear' | 'swirl';

export interface MorphItem {
  /** Fully-resolved image URL. Must be served with permissive CORS headers. */
  image: string;
  caption?: string;
}

/** Imperative handle, so a caller's own rail can drive the deck. */
export interface MorphSliderHandle {
  next: () => void;
  prev: () => void;
  /** Morph directly to `index`, however far away it is. */
  jumpTo: (index: number) => void;
}

const TRANSITIONS: Record<MorphTransition, number> = { melt: 0, ripple: 1, shear: 2, swirl: 3 };

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform sampler2D tCurrent;
uniform sampler2D tNext;
uniform vec2 uResolution;
uniform vec2 uCurrentSize;
uniform vec2 uNextSize;
uniform float uProgress;
uniform float uDir;
uniform int uMode;
uniform float uIntensity;
uniform float uScale;
uniform float uAberration;
uniform float uDrift;
uniform float uTime;
uniform float uReduce;
uniform vec2 uPointer;
uniform vec3 uOverlay;

varying vec2 vUv;

const float PI = 3.14159265359;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

vec2 coverUV(vec2 uv, vec2 res, vec2 img) {
  float rA = res.x / max(res.y, 1.0);
  float iA = img.x / max(img.y, 1.0);
  vec2 s = vec2(1.0);
  float ratio = rA / max(iA, 0.0001);
  if (ratio > 1.0) {
    s.y = 1.0 / ratio;
  } else {
    s.x = ratio;
  }
  return (uv - 0.5) * s + 0.5;
}

void main() {
  float p = clamp(uProgress, 0.0, 1.0);
  float env = sin(p * PI);

  vec2 uv = vUv;

  // Idle breathing. Multiplied through uReduce rather than sitting above the
  // reduced-motion branch as it does upstream: drift is the one part of this
  // shader that runs when nothing has been asked of it, so it is exactly the
  // part a reader who turned animation off does not want.
  float driftAmt = uDrift * (1.0 - uReduce);
  uv += vec2(sin(uTime * 0.25 + uv.y * 4.0), cos(uTime * 0.22 + uv.x * 4.0)) * driftAmt * 0.008;
  uv = (uv - 0.5) * (1.0 - driftAmt * 0.02 * sin(uTime * 0.4)) + 0.5;

  vec2 uvC = uv;
  vec2 uvN = uv;
  float m = smoothstep(0.0, 1.0, p);

  if (uReduce < 0.5) {
    if (uMode == 3) {
      vec2 c = uv - 0.5;
      float r = length(c);
      float ang = env * uIntensity * 3.5 * (1.0 - r);
      uvC = rot(ang) * c + 0.5;
      uvN = rot(-ang) * c + 0.5;
      m = smoothstep(0.0, 1.0, p);
    } else if (uMode == 1) {
      float d = distance(uv, uPointer);
      float ring = p * 1.6;
      float wave = sin((d - ring) * 30.0) * env;
      vec2 dir = normalize(uv - uPointer + 1e-4);
      vec2 disp = dir * wave * uIntensity * 0.25;
      uvC = uv + disp;
      uvN = uv + disp * 0.6;
      m = 1.0 - smoothstep(ring - 0.03, ring + 0.03, d);
    } else if (uMode == 2) {
      float slices = 14.0;
      float row = floor(uv.y * slices);
      float rnd = hash11(row);
      vec2 disp = vec2((rnd - 0.5) * env * uIntensity * 0.6, 0.0);
      uvC = uv + disp;
      uvN = uv + disp;
      float localX = uDir > 0.0 ? uv.x : 1.0 - uv.x;
      float th = p * 1.5 - 0.25 + (rnd - 0.5) * 0.25;
      m = 1.0 - smoothstep(th - 0.06, th + 0.06, localX);
    } else {
      float nn = fbm(uv * uScale + uTime * 0.03);
      float warp = fbm(uv * uScale * 1.7 - uTime * 0.02);
      vec2 g = vec2(nn, warp) - 0.5;
      uvC = uv + g * uIntensity * 0.5 * p;
      uvN = uv - g * uIntensity * 0.5 * (1.0 - p);
      m = smoothstep(nn - 0.15, nn + 0.15, p);
    }
  }

  vec2 sC = coverUV(uvC, uResolution, uCurrentSize);
  vec2 sN = coverUV(uvN, uResolution, uNextSize);

  float ca = uReduce < 0.5 ? uAberration * env * 0.03 : 0.0;

  vec3 colC = vec3(
    texture2D(tCurrent, sC + vec2(ca, 0.0)).r,
    texture2D(tCurrent, sC).g,
    texture2D(tCurrent, sC - vec2(ca, 0.0)).b
  );
  vec3 colN = vec3(
    texture2D(tNext, sN + vec2(ca, 0.0)).r,
    texture2D(tNext, sN).g,
    texture2D(tNext, sN - vec2(ca, 0.0)).b
  );

  vec3 col = mix(colC, colN, m);

  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
  col = mix(col, uOverlay, (1.0 - vig) * 0.28);

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * How many times a slide's photo is requested before it is written off, and how
 * long to wait between attempts. Matches `lib/imageLoader`'s schedule, which the
 * rest of the product's photography already goes through: three attempts is
 * enough to ride out a throttled burst, and the delays are long enough that the
 * retry is not part of the same burst.
 */
const TEXTURE_ATTEMPTS = 3;
const TEXTURE_RETRY_MS = [700, 2000];

/**
 * The 4×4 tile a slide shows before its photo has decoded. Warm ink rather
 * than the upstream blue-grey `rgb(24,24,28)`: this product's darkest surface
 * is `--ink` (28,23,16), and a cool grey next to warm paper reads as a
 * different app's placeholder.
 */
function makeFallbackTexture(gl: Renderer['gl']): Texture {
  const size = 4;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = 28;
    data[i * 4 + 1] = 23;
    data[i * 4 + 2] = 16;
    data[i * 4 + 3] = 255;
  }
  return new Texture(gl, { image: data, width: size, height: size, generateMipmaps: false });
}

function hexToRgb(hex: string): [number, number, number] {
  let h = (hex || '#000000').replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** The props the engine re-reads every idle frame, so they stay live. */
interface EngineOptions {
  transition: MorphTransition;
  duration: number;
  ease: string;
  intensity: number;
  scale: number;
  aberration: number;
  drift: number;
  overlayColor: string;
  loop: boolean;
}

interface EngineInit {
  items: MorphItem[];
  startIndex: number;
  reducedMotion: boolean;
  dprCap: number;
  getOptions: () => EngineOptions;
  onIndexChange?: (index: number) => void;
  /** Fired once per slide whose image cannot be loaded (CORS, 404, ORB). */
  onItemUnavailable?: (index: number) => void;
  /** Fired the first time a real photo replaces the placeholder tile. */
  onFirstTexture?: () => void;
}

class MorphEngine {
  private container: HTMLElement;
  private items: MorphItem[];
  private getOptions: () => EngineOptions;
  private onIndexChange?: (index: number) => void;
  private onItemUnavailable?: (index: number) => void;
  private onFirstTexture?: () => void;
  private reducedMotion: boolean;

  current: number;
  private animating = false;
  private dragging = false;
  private dragDir = 0;
  private shownIndex: number;
  private tween: gsap.core.Tween | null = null;
  /** True when the next frame would differ from the one on screen. */
  private dirty = true;
  private running = false;
  private destroyed = false;
  private raf = 0;
  /** The slide a running morph is heading for, so a late texture can slot in. */
  private pendingTarget = -1;
  /**
   * One deferred navigation. A press that lands mid-morph cannot start a second
   * one — two displacement fields cross-fading at once is mud — but upstream
   * simply drops it, and a button that ignores three presses in a row reads as
   * broken rather than as busy. So the last one is remembered and run on commit.
   * Depth of one on purpose: holding a queue of five would let the deck keep
   * moving long after the reader stopped asking it to.
   */
  private queued: { kind: 'dir' | 'index'; value: number } | null = null;

  private renderer: Renderer;
  private gl: Renderer['gl'];
  private canvas: HTMLCanvasElement;
  private geometry: Triangle;
  private program: Program;
  private mesh: Mesh;
  private fallback: Texture;
  private textures: Texture[];
  private sizes: Array<[number, number]>;
  private loaded: boolean[];
  private pending: boolean[];
  private failed: boolean[];
  /**
   * Load attempts per slide. Google's photo CDN answers a burst of requests
   * with 429, and Chrome reports that to an `<img>` as a plain `error` — so one
   * unlucky slide used to be marked dead for the rest of the visit and vanish
   * from the thumbnail rail. Retried on the same schedule `lib/imageLoader`
   * uses for the rest of the product's photography.
   */
  private tries: number[];
  private sawFirstTexture = false;
  private resizeObserver: ResizeObserver;
  private boundContextLost: (e: Event) => void;
  private boundLoop: (t: number) => void;

  constructor(container: HTMLElement, init: EngineInit) {
    this.container = container;
    this.items = init.items;
    this.getOptions = init.getOptions;
    this.onIndexChange = init.onIndexChange;
    this.onItemUnavailable = init.onItemUnavailable;
    this.onFirstTexture = init.onFirstTexture;
    this.reducedMotion = init.reducedMotion;

    this.current = init.startIndex;
    this.shownIndex = init.startIndex;

    this.renderer = new Renderer({
      alpha: false,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, init.dprCap),
    });
    this.gl = this.renderer.gl;
    // Warm ink, matching the placeholder tile — see makeFallbackTexture.
    this.gl.clearColor(28 / 255, 23 / 255, 16 / 255, 1);

    this.canvas = this.gl.canvas;
    this.canvas.className = 'morph-slider-canvas';
    container.appendChild(this.canvas);

    this.geometry = new Triangle(this.gl);

    // One shared placeholder rather than one per slide: nineteen identical 4×4
    // textures is nineteen GL objects describing the same four pixels.
    this.fallback = makeFallbackTexture(this.gl);
    this.textures = this.items.map(() => this.fallback);
    this.sizes = this.items.map(() => [1, 1] as [number, number]);
    this.loaded = this.items.map(() => false);
    this.pending = this.items.map(() => false);
    this.failed = this.items.map(() => false);
    this.tries = this.items.map(() => 0);

    const opts = this.getOptions();
    this.program = new Program(this.gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        tCurrent: { value: this.textures[this.current] },
        tNext: { value: this.textures[this.current] },
        uResolution: { value: [1, 1] },
        uCurrentSize: { value: this.sizes[this.current] },
        uNextSize: { value: this.sizes[this.current] },
        uProgress: { value: 0 },
        uDir: { value: 1 },
        uMode: { value: TRANSITIONS[opts.transition] ?? 0 },
        uIntensity: { value: opts.intensity },
        uScale: { value: opts.scale },
        uAberration: { value: opts.aberration },
        uDrift: { value: opts.drift },
        uTime: { value: 0 },
        uReduce: { value: init.reducedMotion ? 1 : 0 },
        uPointer: { value: [0.5, 0.5] },
        uOverlay: { value: hexToRgb(opts.overlayColor) },
      },
    });

    this.mesh = new Mesh(this.gl, { geometry: this.geometry, program: this.program });

    this.boundContextLost = (e: Event) => this.onContextLost(e);
    this.canvas.addEventListener('webglcontextlost', this.boundContextLost, false);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.boundLoop = (t: number) => this.loop(t);
    this.ensureTexture(this.current);
    this.prefetchAround(this.current);
  }

  /**
   * Fetch one slide's photo and upload it as a texture. Idempotent, and safe to
   * call for a slide that is already loading — this is the whole of the loading
   * strategy, called from three places: the constructor (the opening slide),
   * `prefetchAround` (its neighbours) and `morphTo` (wherever the reader goes).
   */
  private ensureTexture(index: number): void {
    if (this.destroyed) return;
    const item = this.items[index];
    if (!item || this.loaded[index] || this.pending[index] || this.failed[index]) return;

    this.pending[index] = true;
    const img = new Image();
    // Required: the texture upload reads the pixels back, so the response has
    // to be CORS-clean. Both photo hosts in this product send
    // `Access-Control-Allow-Origin: *`.
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    img.onload = () => {
      this.pending[index] = false;
      if (this.destroyed) return;
      const texture = new Texture(this.gl, { generateMipmaps: false });
      texture.image = img;
      this.textures[index] = texture;
      this.sizes[index] = [img.naturalWidth || 1, img.naturalHeight || 1];
      this.loaded[index] = true;

      // The uniforms hold references, so a slide that finishes loading while it
      // is on screen — or while a morph is already heading for it — has to be
      // swapped in rather than waiting for the next transition.
      if (index === this.current) {
        this.program.uniforms.tCurrent.value = texture;
        this.program.uniforms.uCurrentSize.value = this.sizes[index];
      }
      if (index === this.pendingTarget) {
        this.program.uniforms.tNext.value = texture;
        this.program.uniforms.uNextSize.value = this.sizes[index];
      }
      if (!this.sawFirstTexture) {
        this.sawFirstTexture = true;
        this.onFirstTexture?.();
      }
      this.dirty = true;
    };

    img.onerror = () => {
      this.pending[index] = false;
      if (this.destroyed) return;
      this.tries[index] += 1;
      if (this.tries[index] < TEXTURE_ATTEMPTS) {
        // Almost always a throttled burst rather than a dead link, so the same
        // URL is asked for again after a pause instead of the slide being
        // written off. Nothing else changes: the slide keeps its placeholder
        // tile and stays reachable while the retry is pending.
        window.setTimeout(
          () => this.ensureTexture(index),
          TEXTURE_RETRY_MS[this.tries[index] - 1] ?? 2000,
        );
        return;
      }
      this.failed[index] = true;
      this.onItemUnavailable?.(index);
    };

    img.src = item.image;
  }

  private prefetchAround(index: number): void {
    const n = this.items.length;
    if (n < 2) return;
    this.ensureTexture((index + 1) % n);
    this.ensureTexture((index - 1 + n) % n);
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
    this.renderer.setSize(w, h);
    this.program.uniforms.uResolution.value = [this.gl.canvas.width, this.gl.canvas.height];
    this.dirty = true;
  }

  private syncOptions(): void {
    const opts = this.getOptions();
    this.program.uniforms.uMode.value = TRANSITIONS[opts.transition] ?? 0;
    this.program.uniforms.uIntensity.value = opts.intensity;
    this.program.uniforms.uScale.value = opts.scale;
    this.program.uniforms.uAberration.value = opts.aberration;
    this.program.uniforms.uDrift.value = opts.drift;
    this.program.uniforms.uOverlay.value = hexToRgb(opts.overlayColor);
  }

  /**
   * Start or stop the render loop. Off-screen and on a hidden tab a slider is
   * drawing sixty frames a second of something nobody can see; upstream runs
   * unconditionally from construction to teardown.
   */
  setRunning(running: boolean): void {
    if (this.destroyed || running === this.running) return;
    this.running = running;
    if (running) {
      this.dirty = true;
      this.raf = requestAnimationFrame(this.boundLoop);
    } else {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private loop(t: number): void {
    if (this.destroyed || !this.running) return;
    this.raf = requestAnimationFrame(this.boundLoop);
    if (!this.dragging && !this.animating) this.syncOptions();
    // Drift is the only thing that changes the picture while the deck is idle,
    // and reduced motion zeroes it — so with both off there is nothing to draw.
    const idleMotion = !this.reducedMotion && this.getOptions().drift > 0;
    if (!this.dirty && !this.animating && !this.dragging && !idleMotion) return;
    this.program.uniforms.uTime.value = t * 0.001;
    this.renderer.render({ scene: this.mesh });
    this.dirty = false;
  }

  /**
   * The next usable slide in `dir` from `from`, skipping any whose photo failed
   * to load, or `from` itself when there is nowhere to go.
   */
  private step(from: number, dir: number, loop: boolean): number {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      const raw = from + dir * k;
      if (!loop && (raw < 0 || raw > n - 1)) return from;
      const i = ((raw % n) + n) % n;
      if (i === from) return from;
      if (!this.failed[i]) return i;
    }
    return from;
  }

  private prepareTarget(target: number, dir: number): void {
    this.pendingTarget = target;
    this.program.uniforms.tCurrent.value = this.textures[this.current];
    this.program.uniforms.uCurrentSize.value = this.sizes[this.current];
    this.program.uniforms.tNext.value = this.textures[target];
    this.program.uniforms.uNextSize.value = this.sizes[target];
    this.program.uniforms.uDir.value = dir;
    this.dirty = true;
  }

  private morphTo(target: number, dir: number): void {
    if (this.animating || this.dragging || this.items.length < 2) return;
    if (target === this.current || this.failed[target]) return;

    this.ensureTexture(target);
    this.syncOptions();
    this.prepareTarget(target, dir);
    this.animating = true;
    this.announce(target);

    const opts = this.getOptions();
    const duration = this.reducedMotion ? Math.min(opts.duration, 0.4) : opts.duration;
    this.tween = gsap.fromTo(
      this.program.uniforms.uProgress,
      { value: 0 },
      {
        value: 1,
        duration,
        ease: opts.ease,
        onUpdate: () => {
          this.dirty = true;
        },
        onComplete: () => this.commit(target),
      },
    );
  }

  goTo(dir: number): void {
    if (this.animating) {
      this.queued = { kind: 'dir', value: dir };
      return;
    }
    const target = this.step(this.current, dir, this.getOptions().loop);
    if (target === this.current) return;
    this.morphTo(target, dir);
  }

  /** Morph straight to a slide, whatever the distance. */
  jumpTo(index: number): void {
    if (index < 0 || index >= this.items.length) return;
    if (this.animating) {
      this.queued = { kind: 'index', value: index };
      return;
    }
    if (index === this.current || this.failed[index]) return;
    this.morphTo(index, index > this.current ? 1 : -1);
  }

  next(): void {
    this.goTo(1);
  }

  prev(): void {
    this.goTo(-1);
  }

  private announce(index: number): void {
    if (index === this.shownIndex) return;
    this.shownIndex = index;
    this.onIndexChange?.(index);
  }

  private commit(target: number): void {
    this.current = target;
    this.pendingTarget = -1;
    this.program.uniforms.tCurrent.value = this.textures[target];
    this.program.uniforms.uCurrentSize.value = this.sizes[target];
    this.program.uniforms.uProgress.value = 0;
    this.animating = false;
    this.tween = null;
    this.dirty = true;
    this.announce(target);
    this.prefetchAround(target);

    const q = this.queued;
    this.queued = null;
    if (q) {
      // Deferred a frame rather than run here. `commit` is called from the
      // finishing tween's own `onComplete`, and starting a second tween on the
      // same `uProgress` object from inside that callback left both of them
      // writing it for a frame: measured as a double commit that skipped a
      // slide. One frame later gsap has let go of the property.
      requestAnimationFrame(() => {
        if (this.destroyed) return;
        if (q.kind === 'dir') this.goTo(q.value);
        else this.jumpTo(q.value);
      });
    }
  }

  setPointer(x: number, y: number): void {
    this.program.uniforms.uPointer.value = [x, y];
    this.dirty = true;
  }

  beginDrag(): boolean {
    if (this.animating || this.items.length < 2) return false;
    this.dragging = true;
    this.dragDir = 0;
    // A hand on the deck outranks anything a button asked for a moment ago.
    this.queued = null;
    this.syncOptions();
    return true;
  }

  drag(ndx: number): void {
    if (!this.dragging) return;
    const opts = this.getOptions();
    const dir = ndx < 0 ? 1 : -1;
    const target = this.step(this.current, dir, opts.loop);
    if (target === this.current) {
      // Nowhere to drag towards — the end of a non-looping deck, or every
      // remaining slide's photo failed. Rubber-band back rather than tear.
      this.program.uniforms.uProgress.value = 0;
      this.dirty = true;
      return;
    }
    if (dir !== this.dragDir) {
      this.dragDir = dir;
      this.ensureTexture(target);
      this.prepareTarget(target, dir);
    }
    const progress = Math.min(Math.abs(ndx), 1);
    this.program.uniforms.uProgress.value = progress;
    this.dirty = true;
    this.announce(progress > 0.5 ? target : this.current);
  }

  endDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.dragDir === 0) return;
    const p = this.program.uniforms.uProgress.value as number;
    const target = this.step(this.current, this.dragDir, this.getOptions().loop);
    if (target === this.current) return;
    const duration = this.reducedMotion ? 0.3 : 0.5;
    this.animating = true;
    const onUpdate = () => {
      this.dirty = true;
    };
    if (p > 0.4) {
      this.announce(target);
      this.tween = gsap.to(this.program.uniforms.uProgress, {
        value: 1,
        duration,
        ease: 'power2.out',
        onUpdate,
        onComplete: () => this.commit(target),
      });
    } else {
      this.announce(this.current);
      this.tween = gsap.to(this.program.uniforms.uProgress, {
        value: 0,
        duration,
        ease: 'power2.out',
        onUpdate,
        onComplete: () => {
          this.animating = false;
          this.pendingTarget = -1;
          this.tween = null;
        },
      });
    }
  }

  /**
   * Follow a live change of the OS setting. Set on the uniform rather than by
   * rebuilding the engine, so switching the preference does not cost a WebGL
   * context and a fresh round of texture uploads.
   */
  setReducedMotion(reduced: boolean): void {
    if (this.destroyed || reduced === this.reducedMotion) return;
    this.reducedMotion = reduced;
    this.program.uniforms.uReduce.value = reduced ? 1 : 0;
    this.dirty = true;
  }

  private onContextLost(e: Event): void {
    e.preventDefault();
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy(): void {
    this.destroyed = true;
    this.running = false;
    this.queued = null;
    cancelAnimationFrame(this.raf);
    this.tween?.kill();
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.boundContextLost);
    const seen = new Set<WebGLTexture>();
    for (const tex of [...this.textures, this.fallback]) {
      if (tex?.texture && !seen.has(tex.texture)) {
        seen.add(tex.texture);
        this.gl.deleteTexture(tex.texture);
      }
    }
    if (this.program?.program) this.gl.deleteProgram(this.program.program);
    const ext = this.gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    this.canvas.parentNode?.removeChild(this.canvas);
  }
}

/* ------------------------------------------------------------------ */

export interface MorphSliderProps {
  /** Slides to morph between, in order. */
  items: MorphItem[];
  startIndex?: number;
  transition?: MorphTransition;
  /** Length of a full transition, in seconds. */
  duration?: number;
  /** GSAP easing curve driving transition progress. */
  ease?: string;
  /** Strength of the displacement — how far the images warp mid-morph. */
  intensity?: number;
  /** Frequency of the procedural noise field. Affects `melt` most. */
  scale?: number;
  /** RGB split, peaking mid-transition and resolving to zero. */
  aberration?: number;
  /** Idle drift, so the current image is never quite static. */
  drift?: number;
  /** Advance automatically. Pauses on hover, and never runs under reduced motion. */
  autoplay?: boolean;
  autoplayDelay?: number;
  loop?: boolean;
  /** Corner radius in px. */
  radius?: number;
  /** Tint of the edge vignette over the images. */
  overlayColor?: string;
  showCaptions?: boolean;
  showControls?: boolean;
  showIndicators?: boolean;
  className?: string;
  ref?: Ref<MorphSliderHandle>;
  /** Accessible name for the stage. */
  ariaLabel?: string;
  /** Called whenever the visible slide changes, including mid-drag. */
  onIndexChange?: (index: number) => void;
  /** A tap or Enter/Space on the stage — a click, as distinct from a drag. */
  onActivate?: (index: number) => void;
  /** A slide whose photo could not be loaded. Fired at most once per slide. */
  onItemUnavailable?: (index: number) => void;
  /**
   * Rendered underneath the canvas: what a reader sees before the first texture
   * decodes, and what they keep if WebGL is unavailable. Also the whole of the
   * prerendered markup, since effects never run server-side.
   */
  poster?: ReactNode;
}

/** Movement in px below which a pointer press counts as a tap, not a drag. */
const TAP_SLOP = 6;

export default function MorphSlider({
  items,
  startIndex = 0,
  transition = 'melt',
  duration = 1.1,
  ease = 'power2.inOut',
  intensity = 0.55,
  scale = 2.4,
  aberration = 0.35,
  drift = 0.4,
  autoplay = false,
  autoplayDelay = 4,
  loop = true,
  radius = 16,
  overlayColor = '#000000',
  showCaptions = true,
  showControls = true,
  showIndicators = true,
  className = '',
  ref,
  ariaLabel = 'Image morph slider',
  onIndexChange,
  onActivate,
  onItemUnavailable,
  poster,
}: MorphSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MorphEngine | null>(null);
  const [index, setIndex] = useState(startIndex);
  const [hovering, setHovering] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Options and callbacks are read through refs so that a parent re-render
  // never tears down a live WebGL context: the engine is rebuilt only when the
  // slides themselves change.
  const optsRef = useRef<EngineOptions>({
    transition,
    duration,
    ease,
    intensity,
    scale,
    aberration,
    drift,
    overlayColor,
    loop,
  });
  optsRef.current = { transition, duration, ease, intensity, scale, aberration, drift, overlayColor, loop };

  const cbRef = useRef({ onIndexChange, onActivate, onItemUnavailable });
  cbRef.current = { onIndexChange, onActivate, onItemUnavailable };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    let engine: MorphEngine;
    try {
      engine = new MorphEngine(el, {
        items,
        startIndex,
        reducedMotion:
          typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        dprCap: 2,
        getOptions: () => optsRef.current,
        onIndexChange: (i) => {
          setIndex(i);
          cbRef.current.onIndexChange?.(i);
        },
        onItemUnavailable: (i) => cbRef.current.onItemUnavailable?.(i),
        onFirstTexture: () => setReady(true),
      });
    } catch {
      // No WebGL, or the context could not be created. The poster is the whole
      // of the experience from here, which is why one is worth passing.
      setFailed(true);
      return undefined;
    }

    engineRef.current = engine;
    setFailed(false);
    setReady(false);
    setIndex(startIndex);
    // Started here rather than waiting on the observer below, so a rebuilt
    // engine is never left frozen until the next intersection change.
    engine.setRunning(true);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [items, startIndex]);

  useEffect(() => {
    engineRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // Draw only what someone could actually see.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    let onScreen = true;
    const sync = () => engineRef.current?.setRunning(onScreen && !document.hidden);
    const observer = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: '120px 0px' },
    );
    observer.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      engineRef.current?.setRunning(false);
    };
  }, []);

  const handleNext = useCallback(() => engineRef.current?.next(), []);
  const handlePrev = useCallback(() => engineRef.current?.prev(), []);

  useImperativeHandle(
    ref,
    () => ({
      next: () => engineRef.current?.next(),
      prev: () => engineRef.current?.prev(),
      jumpTo: (i: number) => engineRef.current?.jumpTo(i),
    }),
    [],
  );

  // Autoplay. Held while the pointer is over the deck, and never started at all
  // under reduced motion — an image that changes on its own is the definition
  // of the animation that setting is asking us not to run.
  useEffect(() => {
    if (!autoplay || hovering || reducedMotion || items.length < 2) return undefined;
    const id = window.setTimeout(() => engineRef.current?.next(), Math.max(autoplayDelay, 1) * 1000);
    return () => window.clearTimeout(id);
  }, [autoplay, autoplayDelay, hovering, index, reducedMotion, items.length]);

  // Pointer handling. Upstream treats every press as a drag; a press that never
  // moves is a click, and on a photo a click means "show me this bigger", so the
  // two are separated here by a slop threshold.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    let startX = 0;
    let startY = 0;
    let width = 1;
    let pressed = false;
    let dragging = false;
    let captured = false;
    let moved = 0;

    const onDown = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      width = rect.width || 1;
      startX = e.clientX;
      startY = e.clientY;
      moved = 0;
      pressed = true;
      engineRef.current?.setPointer(
        (e.clientX - rect.left) / rect.width,
        1 - (e.clientY - rect.top) / rect.height,
      );
      dragging = engineRef.current?.beginDrag() ?? false;
      if (dragging) {
        try {
          el.setPointerCapture(e.pointerId);
          captured = true;
        } catch {
          captured = false;
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pressed) return;
      moved = Math.max(moved, Math.abs(e.clientX - startX), Math.abs(e.clientY - startY));
      if (!dragging) return;
      engineRef.current?.drag((e.clientX - startX) / width);
    };

    const onUp = (e: PointerEvent) => {
      if (!pressed) return;
      pressed = false;
      if (captured) {
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          captured = false;
        }
        captured = false;
      }
      if (dragging) {
        dragging = false;
        engineRef.current?.endDrag();
      }
      if (e.type === 'pointerup' && moved <= TAP_SLOP) {
        cbRef.current.onActivate?.(engineRef.current?.current ?? startIndex);
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [startIndex]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (!cbRef.current.onActivate) return;
        e.preventDefault();
        cbRef.current.onActivate(engineRef.current?.current ?? 0);
      }
    },
    [handleNext, handlePrev],
  );

  const hasCaptions = items.some((item) => item.caption);
  const live = !failed;

  return (
    <div
      className={`morph-slider ${ready ? 'is-ready' : ''} ${className}`.replace(/\s+/g, ' ').trim()}
      style={
        {
          borderRadius: `${radius}px`,
          '--ms-swap': `${(duration * 0.66).toFixed(3)}s`,
          '--ms-dot': `${(duration * 0.45).toFixed(3)}s`,
        } as CSSProperties
      }
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {poster && (
        <div className="morph-slider-poster" aria-hidden={ready ? true : undefined}>
          {poster}
        </div>
      )}

      <div
        ref={containerRef}
        className="morph-slider-stage"
        role="group"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
      />

      {showCaptions && hasCaptions && (
        <div className="morph-slider-caption" aria-live="polite">
          {items.map((item, i) =>
            item.caption ? (
              <span
                key={item.image || i}
                aria-hidden={i === index ? undefined : true}
                className={`morph-slider-caption-text ${i === index ? 'is-active' : ''}`}
              >
                {item.caption}
              </span>
            ) : null,
          )}
        </div>
      )}

      {showControls && live && items.length > 1 && (
        <div className="morph-slider-controls">
          <button
            type="button"
            className="morph-slider-btn"
            aria-label="Previous photo"
            onClick={handlePrev}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className="morph-slider-btn" aria-label="Next photo" onClick={handleNext}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      {showIndicators && live && items.length > 1 && (
        <div className="morph-slider-indicators">
          {items.map((item, i) => (
            <button
              key={item.image || i}
              type="button"
              aria-current={i === index}
              aria-label={`Go to photo ${i + 1}`}
              className={`morph-slider-dot ${i === index ? 'is-active' : ''}`}
              onClick={() => engineRef.current?.jumpTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

