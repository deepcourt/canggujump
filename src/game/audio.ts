/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

interface ExtendedWindow extends Window {
    webkitAudioContext?: typeof AudioContext;
}

// --- AUDIO SYNTHESIS ---

export const SoundSynth = {
    ctx: null as AudioContext | null,
    bufferCache: {} as Record<string, AudioBuffer>,
    immunityInterval: null as any,
    muted: false,
    musicElement: null as HTMLAudioElement | null,
    barkElement: null as HTMLAudioElement | null,
    musicVolume: 0.3,
    
    init: () => {
        if (SoundSynth.ctx) return;
        const Win = window as ExtendedWindow;
        SoundSynth.ctx = new (window.AudioContext || Win.webkitAudioContext)();
        
        // Task 4.1 & 4.2: Pre-cache all sounds
        SoundSynth.cacheSound('step', SoundSynth.createStepBuffer());
        SoundSynth.cacheSound('jump', SoundSynth.createJumpBuffer());
        SoundSynth.cacheSound('hit', SoundSynth.createHitBuffer());
        SoundSynth.cacheSound('powerup', SoundSynth.createPowerupBuffer());
        SoundSynth.cacheSound('click', SoundSynth.createClickBuffer());
        SoundSynth.cacheSound('boing', SoundSynth.createBoingBuffer());
        SoundSynth.cacheSound('roar', SoundSynth.createNoiseBuffer(0.8));

        // Load background music
        if (!SoundSynth.musicElement) {
            SoundSynth.musicElement = new Audio('audio/background-music.mp3');
            SoundSynth.musicElement.loop = true;
            SoundSynth.musicElement.volume = SoundSynth.musicVolume;
            // "Unlock" the audio element by playing and pausing it on the first user interaction.
            const promise = SoundSynth.musicElement.play();
            if (promise !== undefined) {
                promise.then(() => {
                    SoundSynth.musicElement?.pause();
                }).catch(error => {
                    // Autoplay was prevented. This is fine, we'll try again on game start.
                    console.log("Audio unlock failed, will retry on game start:", error);
                });
            }
        }

        if (!SoundSynth.barkElement) {
            SoundSynth.barkElement = new Audio('audio/dog_barking_mono.wav');
            SoundSynth.barkElement.volume = 0.5;
            const promise = SoundSynth.barkElement.play();
            if (promise !== undefined) {
                promise.then(() => {
                    SoundSynth.barkElement?.pause();
                    SoundSynth.barkElement!.currentTime = 0;
                }).catch(error => {
                    console.log("Bark audio unlock failed:", error);
                });
            }
        }
    },

    cacheSound: (name: string, buffer: AudioBuffer) => {
        SoundSynth.bufferCache[name] = buffer;
    },

    play: (name: string, volume: number = 0.1) => {
        if (SoundSynth.muted) return;
        const ctx = SoundSynth.ctx;
        if (!ctx || !SoundSynth.bufferCache[name]) return;
        
        if (ctx.state === 'suspended') ctx.resume();
        
        const source = ctx.createBufferSource();
        source.buffer = SoundSynth.bufferCache[name];
        const gain = ctx.createGain();
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
    },

    createNoiseBuffer: (duration: number): AudioBuffer => {
        const ctx = SoundSynth.ctx!;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    },

    createStepBuffer: () => {
        const ctx = SoundSynth.ctx!;
        const duration = 0.05;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / ctx.sampleRate;
            data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 100);
        }
        return buffer;
    },

    createJumpBuffer: () => {
        const ctx = SoundSynth.ctx!;
        const duration = 0.15;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / ctx.sampleRate;
            const freq = 150 + (600 - 150) * (t / duration);
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 10) * 0.5;
        }
        return buffer;
    },

    createHitBuffer: () => {
        const ctx = SoundSynth.ctx!;
        const duration = 0.3;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / ctx.sampleRate;
            const noise = Math.random() * 2 - 1;
            const freq = 100 * Math.exp(-t * 5);
            data[i] = (noise + Math.sin(2 * Math.PI * freq * t)) * Math.exp(-t * 8) * 0.5;
        }
        return buffer;
    },

    createPowerupBuffer: () => {
        const ctx = SoundSynth.ctx!;
        const duration = 0.4;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / ctx.sampleRate;
            const freq = 440 * Math.pow(2, Math.floor(t * 10) / 12); // Arpeggio
            data[i] = (t % 0.05 < 0.025 ? 1 : -1) * Math.exp(-t * 3) * 0.3;
        }
        return buffer;
    },

    createClickBuffer: () => {
        const ctx = SoundSynth.ctx!;
        const duration = 0.05;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / ctx.sampleRate;
            data[i] = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-t * 200);
        }
        return buffer;
    },

    createBoingBuffer: () => {
        const ctx = SoundSynth.ctx!;
        const duration = 0.3;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const t = i / ctx.sampleRate;
            const freq = 600 * Math.exp(-t * 20); // Fast descending pitch
            data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 10) * 0.7;
        }
        return buffer;
    },

    playJump: () => SoundSynth.play('jump', 0.15),
    playStep: () => SoundSynth.play('step', 0.05),
    playHit: () => SoundSynth.play('hit', 0.2),
    playPowerup: () => SoundSynth.play('powerup', 0.2),
    playClick: () => SoundSynth.play('click', 0.1),
    playBoing: () => SoundSynth.play('boing', 0.4),

    setMuted: (isMuted: boolean) => {
        SoundSynth.muted = isMuted;
        if (SoundSynth.musicElement) {
            SoundSynth.musicElement.muted = isMuted;
        }
        if (isMuted) {
            SoundSynth.stopImmunityMusic(); // Also stop jingles
        }
    },

    playMusic: () => {
        if (SoundSynth.muted || !SoundSynth.musicElement) return;
        SoundSynth.musicElement.play().catch(e => console.error("Music play failed:", e));
    },

    stopMusic: () => {
        if (!SoundSynth.musicElement) return;
        SoundSynth.musicElement.pause();
        SoundSynth.musicElement.currentTime = 0;
    },

    playHonk: () => {
        if (SoundSynth.muted) return;
        const ctx = SoundSynth.ctx;
        if (!ctx) return;
        const t = ctx.currentTime;
        
        const playBeep = (start: number, duration: number) => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = 'triangle';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(440, start);
            osc2.frequency.setValueAtTime(445, start);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
            gain.gain.linearRampToValueAtTime(0.1, start + duration - 0.02);
            gain.gain.linearRampToValueAtTime(0, start + duration);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.start(start);
            osc2.start(start);
            osc1.stop(start + duration);
            osc2.stop(start + duration);
        };

        playBeep(t, 0.1); // beep
        playBeep(t + 0.15, 0.1); // beep
        playBeep(t + 0.3, 0.5); // beeeeeeep
    },

    playBark: () => {
        if (SoundSynth.muted || !SoundSynth.barkElement) return;
        SoundSynth.barkElement.currentTime = 0;
        SoundSynth.barkElement.play().catch(e => console.error("Bark sound play failed:", e));
    },

    playPadelWhoosh: () => {
        if (SoundSynth.muted) return;
        const ctx = SoundSynth.ctx;
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
    },

    playTruckEngine: () => {
        const ctx = SoundSynth.ctx;
        if (!ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        // Drone hum modulation
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 30;
        lfoGain.gain.value = 20;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        lfo.start(t);
        osc.start(t);
        return { osc, gain, lfo };
    },

    startImmunityMusic: () => {
        if (SoundSynth.muted) return;
        const ctx = SoundSynth.ctx;
        if (!ctx || SoundSynth.immunityInterval) return;

        if (SoundSynth.musicElement) {
            SoundSynth.musicElement.volume = SoundSynth.musicVolume * 0.3;
        }
        
        const playNote = (freq: number, start: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.05, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + duration);
        };

        const melody = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        let index = 0;
        
        SoundSynth.immunityInterval = setInterval(() => {
            const t = ctx.currentTime;
            playNote(melody[index % melody.length], t, 0.1);
            index++;
        }, 120);
    },

    stopImmunityMusic: () => {
        if (SoundSynth.immunityInterval) {
            clearInterval(SoundSynth.immunityInterval);
            SoundSynth.immunityInterval = null;
        }
        if (SoundSynth.musicElement) {
            SoundSynth.musicElement.volume = SoundSynth.musicVolume;
        }
    },

    playRoar: () => {
        if (SoundSynth.muted) return;
        const ctx = SoundSynth.ctx;
        if (!ctx) return;
        const t = ctx.currentTime;
        
        const playNote = (freq: number, start: number, duration: number, slide: boolean = false) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, start);
            if (slide) {
                osc.frequency.exponentialRampToValueAtTime(freq * 0.5, start + duration);
            }
            gain.gain.setValueAtTime(0.1, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + duration);
        };

        // Mario-style Game Over descending melody
        playNote(392.00, t, 0.15); // G4
        playNote(329.63, t + 0.2, 0.15); // E4
        playNote(261.63, t + 0.4, 0.15); // C4
        playNote(196.00, t + 0.6, 0.4, true); // G3 with slide
    }
};
