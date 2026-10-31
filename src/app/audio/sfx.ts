/**
 * Synthesized sound effects (Web Audio; no audio files). A port of v1's SFX with two changes: every
 * sound goes through one master gain node (one place for volume, ducking or a limiter later), and
 * `enabled` is read from whichever settings are current, so the title-screen mute works (v1 ignored
 * it until a game existed).
 *
 * Browsers only allow audio after a user gesture: call `unlock()` from the first pointerdown.
 * Math.random here only shapes noise buffers (cosmetic), which ESLint allows in app/audio.
 */

/** A tiny synth. Construct once per app. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private supported = true;

  /** @param enabled reads the current sound setting. */
  constructor(private readonly enabled: () => boolean) {}

  /** Create or resume the audio context. Call from a user gesture. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC =
      globalThis.AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      this.supported = false;
      return;
    }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
  }

  private on(): boolean {
    return this.supported && !!this.ctx && this.enabled();
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'sine',
    vol = 0.12,
    when?: number,
    slide?: number,
  ) {
    if (!this.on()) return;
    const c = this.ctx!;
    const t = when ?? c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.15) {
    if (!this.on()) return;
    const c = this.ctx!;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = vol;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    src.connect(f);
    f.connect(g);
    g.connect(this.master!);
    src.start();
  }

  /** The class's battle-start stab. */
  stab(cls: string): void {
    if (cls === 'snare') return this.noise(0.12, 0.2);
    if (cls === 'bassdrum') return this.tone(110, 0.25, 'sine', 0.3, undefined, 45);
    const m: Record<string, [number, OscillatorType, number, number?]> = {
      trumpet: [523, 'sawtooth', 0.09],
      trombone: [196, 'sawtooth', 0.1, 233],
      sousaphone: [87, 'triangle', 0.16],
      saxophone: [311, 'square', 0.06],
      clarinet: [587, 'triangle', 0.1],
    };
    const s = m[cls];
    if (s) this.tone(s[0], 0.22, s[1], s[2], undefined, s[3]);
  }

  /** A hit in a tone. */
  hit(tone: string): void {
    const f =
      ({ HOT: 660, LOW: 110, BLUE: 392, FUNK: 294, SWEET: 784 } as Record<string, number>)[tone] ?? 440;
    this.tone(f, 0.09, tone === 'LOW' ? 'sine' : 'square', 0.07, undefined, f * 0.7);
  }

  /** A critical hit. */
  crit(): void {
    this.noise(0.08, 0.2);
    this.tone(880, 0.14, 'sawtooth', 0.1, undefined, 440);
  }

  /** Coins. */
  coin(): void {
    this.tone(1200, 0.08, 'sine', 0.08);
    this.tone(1800, 0.12, 'sine', 0.06, this.ctx ? this.ctx.currentTime + 0.07 : undefined);
  }

  /** The timing-bar tap result. */
  tap(result: string): void {
    const f = ({ one: 1047, pocket: 784, loose: 523, clams: 196 } as Record<string, number>)[result] ?? 440;
    const clams = result === 'clams';
    this.tone(f, clams ? 0.25 : 0.1, clams ? 'sawtooth' : 'sine', 0.1, undefined, clams ? 140 : undefined);
  }

  /** A sustained note (Blue Notes, Blues pads). */
  note(freq: number, dur = 0.4): void {
    this.tone(freq, dur, 'triangle', 0.14);
    this.tone(freq * 2, dur * 0.8, 'sine', 0.04);
  }

  /** The level-up arpeggio (the blues scale, up). */
  levelUp(): void {
    if (!this.on()) return;
    const t0 = this.ctx!.currentTime;
    [261.63, 311.13, 349.23, 369.99, 392, 466.16, 523.25].forEach((f, i) =>
      this.tone(f, 0.16, 'triangle', 0.12, t0 + i * 0.11),
    );
  }
}
