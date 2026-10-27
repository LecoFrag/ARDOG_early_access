class Sfx {
    ctx;
    get c() { try {
        this.ctx ??= new AudioContext();
        void this.ctx.resume();
        return this.ctx;
    }
    catch {
        return undefined;
    } }
    noise(duration, from, to, volume, type = 'lowpass') {
        const c = this.c;
        if (!c)
            return;
        const now = c.currentTime;
        const buf = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++)
            d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const s = c.createBufferSource();
        s.buffer = buf;
        const f = c.createBiquadFilter();
        f.type = type;
        f.frequency.setValueAtTime(from, now);
        f.frequency.exponentialRampToValueAtTime(to, now + duration);
        const g = c.createGain();
        g.gain.setValueAtTime(volume, now);
        g.gain.exponentialRampToValueAtTime(.001, now + duration);
        s.connect(f);
        f.connect(g);
        g.connect(c.destination);
        s.start(now);
    }
    tone(freqs, type, step, volume, glide = 1) {
        const c = this.c;
        if (!c)
            return;
        const now = c.currentTime;
        freqs.forEach((f, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = type;
            o.frequency.setValueAtTime(f, now + i * step);
            o.frequency.exponentialRampToValueAtTime(f * glide, now + i * step + step * 1.6);
            g.gain.setValueAtTime(volume, now + i * step);
            g.gain.exponentialRampToValueAtTime(.001, now + i * step + step * 1.8);
            o.connect(g);
            g.connect(c.destination);
            o.start(now + i * step);
            o.stop(now + i * step + step * 2);
        });
    }
    // Recorded sounds (sons.json) when loaded; the synthesized ones stay as a fallback.
    rec(id, volume = 1, delay = 0, rate = 1) { if (!voz.has(id))
        return false; voz.play(id, { volume, delay, rate }); return true; }
    boom() { if (this.rec('fogo-explosao', 1.3))
        this.rec('fogo-impacto', .9);
    else {
        this.noise(1.6, 900, 60, .5);
        this.tone([70, 55], 'sine', .5, .3, .6);
    } this.rec('trovao', .7, .15); }
    screams() { [0, 260, 520].forEach((t, i) => window.setTimeout(() => this.tone([620 + i * 90], 'sawtooth', .55, .035, .55), t)); }
    door() { if (!this.rec('porta-abrir', .7))
        this.noise(.4, 1200, 300, .08, 'bandpass'); }
    select() { if (!this.rec('ui-carta'))
        this.tone([660, 880], 'triangle', .06, .04); }
    portal() { this.tone([1047, 1319, 1568, 2093], 'triangle', .09, .05); this.noise(.8, 3000, 400, .08, 'highpass'); }
    locked() { this.tone([196, 185], 'square', .08, .04); }
    hit() { if (!this.rec('acerto-corte', .8))
        this.noise(.18, 2400, 500, .12, 'bandpass'); }
    encounter() { this.tone([220, 233, 207, 196, 185], 'sawtooth', .06, .05); }
    /** The temple's alarm bell: the recorded little bell of the prologue, slowed down into a big bronze one. */
    bell(volume = 1) { if (!this.rec('sininho', volume, 0, .32)) {
        this.tone([196, 392, 588], 'sine', .02, .09 * volume, .995);
    } }
}

// Placeholder suspense score for the prologue (docs/jogo/PROLOGO.md), synthesised with Web Audio until a real
// track exists: a low, slowly breathing drone (two detuned tones through a moving low-pass filter),
// a cold wind of filtered noise and, now and then, a high glassy note that fades away.
class TrilhaSuspense {
    ctx;
    destination;
    nodes = [];
    out;
    timer;
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.destination = destination;
    }
    start(volume = .32, fade = 4) {
        const c = this.ctx, now = c.currentTime;
        this.out = c.createGain();
        this.out.gain.setValueAtTime(0, now);
        this.out.gain.linearRampToValueAtTime(volume, now + fade);
        this.out.connect(this.destination);
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 320;
        filter.Q.value = 3;
        filter.connect(this.out);
        const lfo = c.createOscillator(), lfoGain = c.createGain();
        lfo.frequency.value = .07;
        lfoGain.gain.value = 160;
        lfo.connect(lfoGain).connect(filter.frequency);
        lfo.start();
        for (const [freq, type, level] of [[55, 'sawtooth', .22], [55.4, 'sawtooth', .2], [82.4, 'triangle', .25], [41.2, 'sine', .5]]) {
            const o = c.createOscillator(), g = c.createGain();
            o.type = type;
            o.frequency.value = freq;
            g.gain.value = level;
            o.connect(g).connect(filter);
            o.start();
            this.nodes.push(o, g);
        }
        // Wind: noise through a slowly sweeping band-pass.
        const buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), d = buffer.getChannelData(0);
        for (let i = 0; i < d.length; i++)
            d[i] = Math.random() * 2 - 1;
        const noise = c.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const band = c.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 700;
        band.Q.value = .8;
        const windGain = c.createGain();
        windGain.gain.value = .05;
        const windLfo = c.createOscillator(), windDepth = c.createGain();
        windLfo.frequency.value = .05;
        windDepth.gain.value = 400;
        windLfo.connect(windDepth).connect(band.frequency);
        windLfo.start();
        noise.connect(band).connect(windGain).connect(this.out);
        noise.start();
        this.nodes.push(filter, lfo, lfoGain, noise, band, windGain, windLfo, windDepth);
        const glass = () => {
            if (!this.out)
                return;
            const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
            o.type = 'sine';
            o.frequency.value = [659.3, 698.5, 783.99, 987.8, 1046.5][Math.floor(Math.random() * 5)];
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(.035, t + 1.5);
            g.gain.exponentialRampToValueAtTime(.0005, t + 7);
            o.connect(g).connect(this.out);
            o.start(t);
            o.stop(t + 7.2);
            this.timer = window.setTimeout(glass, 5000 + Math.random() * 6000);
        };
        this.timer = window.setTimeout(glass, 3000);
    }
    /** Swells or dims the score (e.g. tension when someone knocks). */
    level(volume, seconds = 1.5) { if (this.out) {
        const t = this.ctx.currentTime;
        this.out.gain.cancelScheduledValues(t);
        this.out.gain.setValueAtTime(this.out.gain.value, t);
        this.out.gain.linearRampToValueAtTime(volume, t + seconds);
    } }
    stop(fade = 2) {
        window.clearTimeout(this.timer);
        const out = this.out;
        if (!out)
            return;
        this.out = undefined;
        const t = this.ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0, t + fade);
        window.setTimeout(() => { for (const n of this.nodes) {
            try {
                n.stop?.();
            }
            catch { /* already stopped */ }
            n.disconnect();
        } this.nodes = []; out.disconnect(); }, (fade + .2) * 1000);
    }
}

// Original synthesized cues: no external audio or copyrighted samples.
class BattleAudio {
    enabled = false;
    context;
    unlock() {
        this.context ??= new AudioContext();
        void this.context.resume().catch(() => { });
    }
    toggle() { this.enabled = !this.enabled; if (this.enabled)
        this.unlock(); return this.enabled; }
    play(kind) {
        if (!this.enabled)
            return;
        this.unlock();
        const ctx = this.context;
        const now = ctx.currentTime;
        if (kind === 'swing' || kind === 'metal' || kind === 'fire' || kind === 'boom') {
            // fire: low roaring whoosh; boom: dark burst under the impact tone.
            const duration = { swing: .18, metal: .26, fire: .55, boom: .7 }[kind];
            const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
            const samples = buffer.getChannelData(0);
            for (let i = 0; i < samples.length; i++)
                samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length);
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = kind === 'fire' || kind === 'boom' ? 'lowpass' : 'bandpass';
            filter.frequency.setValueAtTime({ swing: 3400, metal: 2200, fire: 700, boom: 1400 }[kind], now);
            filter.frequency.exponentialRampToValueAtTime({ swing: 650, metal: 650, fire: 2600, boom: 120 }[kind], now + duration);
            filter.Q.value = .8;
            const envelope = ctx.createGain();
            envelope.gain.setValueAtTime(kind === 'boom' ? .22 : kind === 'fire' ? .12 : .09, now);
            envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
            noise.connect(filter);
            filter.connect(envelope);
            envelope.connect(ctx.destination);
            noise.start(now);
        }
        const settings = { select: [680, 420, .09], swing: [600, 140, .16], hit: [115, 38, .2], holy: [440, 880, .5], fall: [130, 25, .4], metal: [1800, 750, .23], charge: [130, 620, .43], beam: [220, 110, .9], fire: [160, 320, .5], boom: [95, 30, .65] }[kind];
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = ['holy', 'select', 'charge'].includes(kind) ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(settings[0], now);
        oscillator.frequency.exponentialRampToValueAtTime(settings[1], now + settings[2]);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(.11, now + .01);
        gain.gain.exponentialRampToValueAtTime(.001, now + settings[2]);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + settings[2]);
    }
}

window.previaSintese = async id => { if(id==='prologo'){const c=new AudioContext(); await c.resume(); const t=new TrilhaSuspense(c,c.destination); t.start(.3,1); return ()=>{t.stop(0);setTimeout(()=>c.close(),300);};} if(id.startsWith('battle-')){const b=new BattleAudio(); b.enabled=true;b.play(id.slice(7)); return ()=>b.context?.close();} const s=new Sfx(); s[id](); return ()=>s.ctx?.close(); };