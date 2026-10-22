/**
 * Gerador pseudoaleatório reproduzível (sfc32) com estado serializável.
 * O estado vive dentro do WorldState: mesmo estado + mesmas ações + mesma
 * versão do motor => mesmo resultado (spec §4.7). A interface nunca sorteia.
 */
export interface RngState {
  a: number;
  b: number;
  c: number;
  d: number;
  draws: number;
}

/** Hash de string para 4 sementes de 32 bits (cyrb128). */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function seedRng(seed: string): RngState {
  const [a, b, c, d] = cyrb128(seed);
  const s: RngState = { a, b, c, d, draws: 0 };
  const r = new Rng(s);
  for (let i = 0; i < 15; i++) r.next(); // aquecimento
  s.draws = 0;
  return s;
}

export class Rng {
  constructor(private s: RngState) {}

  /** Uniforme em [0, 1). */
  next(): number {
    let { a, b, c, d } = this.s;
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    this.s.a = a;
    this.s.b = b;
    this.s.c = c;
    this.s.d = d;
    this.s.draws++;
    return (t >>> 0) / 4294967296;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Normal via Box–Muller (consome dois sorteios). */
  normal(mean = 0, sd = 1): number {
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Binomial por soma de Bernoullis (n pequeno: bancadas). */
  binomial(n: number, p: number): number {
    let k = 0;
    for (let i = 0; i < n; i++) if (this.next() < p) k++;
    return k;
  }

  pickWeighted<T>(items: { item: T; weight: number }[]): T | undefined {
    const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const i of items) {
      r -= Math.max(0, i.weight);
      if (r < 0) return i.item;
    }
    return items[items.length - 1]?.item;
  }
}
