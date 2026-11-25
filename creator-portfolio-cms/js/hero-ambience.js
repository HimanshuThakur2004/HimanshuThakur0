/**
 * Procedural Web Audio Ambience & Footage-Synced SFX Engine for the Hero Video.
 * Tailored specifically to the mountain-valley, sunlit foliage, sky-tilt, and soaring bird-flock footage:
 *  - Layer 1: Warm mountain valley wind & breeze (pink noise + slow sweeping resonant filters)
 *  - Layer 2: Sunlit foliage rustle (soft high-air shimmer, stronger during 0s-4.5s hillside/tree pan)
 *  - Layer 3: Emotional documentary sub-pad (D suspended drone with warm lowpass & breathing LFO)
 *  - Layer 4: Distant mountain birds & valley echo + sky-tilt air swell (intensifies >= 4.5s during bird flock)
 *  - Layer 5: Slow felt piano (D minor/Dorian reflective arpeggio) & expressive slow solo violin swells
 */
(function (global) {
  let ctx = null;
  let masterGain = null;
  let foliageGain = null;
  let windFilter = null;
  let echoInput = null;
  let musicBus = null;
  let isEnabledByUser = true;
  let isHeroVisible = true;
  let isRunning = false;
  let birdTimer = null;
  let pianoTimer = null;
  let violinTimer = null;
  let pianoStep = 0;
  let violinStep = 0;
  let syncRaf = null;
  let lastVideoTime = 0;
  let whooshTriggeredForLoop = false;

  // Reflective D minor / Dorian progression for slow felt piano
  const PIANO_NOTES = [
    146.83, 220.00, 329.63, 349.23, // Dm9 (D3 A3 E4 F4)
    116.54, 174.61, 261.63, 293.66, // Bbmaj7 (Bb2 F3 C4 D4)
    130.81, 196.00, 293.66, 329.63, // Csus2 (C3 G3 D4 E4)
    146.83, 220.00, 261.63, 349.23  // Dm7 (D3 A3 C4 F4)
  ];

  // Expressive slow solo violin melody notes
  const VIOLIN_PHRASES = [
    { freq: 440.00, dur: 4.6 }, // A4
    { freq: 392.00, dur: 4.2 }, // G4
    { freq: 349.23, dur: 5.0 }, // F4
    { freq: 329.63, dur: 4.4 }, // E4
    { freq: 523.25, dur: 4.8 }, // C5
    { freq: 293.66, dur: 5.4 }  // D4
  ];

  function createPinkNoiseBuffer(audioCtx, seconds = 5) {
    const length = Math.floor(audioCtx.sampleRate * seconds);
    const buffer = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      }
      // Crossfade loop seam for click-free looping
      const fadeSamples = Math.floor(audioCtx.sampleRate * 0.15);
      for (let i = 0; i < fadeSamples; i++) {
        const t = i / fadeSamples;
        data[i] *= t;
        data[length - 1 - i] *= t;
      }
    }
    return buffer;
  }

  function buildGraph() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    const noiseBuffer = createPinkNoiseBuffer(ctx, 5);

    // 1. Mountain Valley Wind
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noiseBuffer;
    windSrc.loop = true;

    windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 280;
    windFilter.Q.value = 1.6;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.42;

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.11;
    const windLfoDepth = ctx.createGain();
    windLfoDepth.gain.value = 130;
    windLfo.connect(windLfoDepth);
    windLfoDepth.connect(windFilter.frequency);
    windLfo.start();

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);
    windSrc.start();

    // 2. Tree Foliage Breeze Shimmer (stronger during hillside/tree pan)
    const leafSrc = ctx.createBufferSource();
    leafSrc.buffer = noiseBuffer;
    leafSrc.loop = true;

    const leafFilter = ctx.createBiquadFilter();
    leafFilter.type = "bandpass";
    leafFilter.frequency.value = 2100;
    leafFilter.Q.value = 0.9;

    foliageGain = ctx.createGain();
    foliageGain.gain.value = 0.08;

    leafSrc.connect(leafFilter);
    leafFilter.connect(foliageGain);
    foliageGain.connect(masterGain);
    leafSrc.start();

    // 3. Emotional Documentary Warm Sub-Pad (D suspended: D2, A2, E3, F#3)
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 340;

    const padGain = ctx.createGain();
    padGain.gain.value = 0.085;
    padFilter.connect(padGain);
    padGain.connect(masterGain);

    [73.42, 110.0, 164.81, 185.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i < 2 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = i < 2 ? 0.35 : 0.14;
      osc.connect(voiceGain);
      voiceGain.connect(padFilter);
      osc.start();
    });

    // 4. Valley Echo Bus for Bird Chirps & Air Swells
    echoInput = ctx.createGain();
    echoInput.gain.value = 0.9;

    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.32;
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = "lowpass";
    echoFilter.frequency.value = 2200;
    const echoFeedback = ctx.createGain();
    echoFeedback.gain.value = 0.28;

    echoInput.connect(masterGain);
    echoInput.connect(delay);
    delay.connect(echoFilter);
    echoFilter.connect(masterGain);
    echoFilter.connect(echoFeedback);
    echoFeedback.connect(delay);

    // 5. Lush Cinema Hall Reverb/Echo Bus for Slow Piano & Violin
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.85;

    const hallDelayL = ctx.createDelay(1.0);
    hallDelayL.delayTime.value = 0.24;
    const hallDelayR = ctx.createDelay(1.0);
    hallDelayR.delayTime.value = 0.39;

    const hallFilter = ctx.createBiquadFilter();
    hallFilter.type = "lowpass";
    hallFilter.frequency.value = 1850;

    const hallFb = ctx.createGain();
    hallFb.gain.value = 0.36;

    musicBus.connect(masterGain);
    musicBus.connect(hallDelayL);
    musicBus.connect(hallDelayR);
    hallDelayL.connect(hallFilter);
    hallDelayR.connect(hallFilter);
    hallFilter.connect(masterGain);
    hallFilter.connect(hallFb);
    hallFb.connect(hallDelayL);
  }

  function triggerPianoNote(freq) {
    if (!ctx || !musicBus || ctx.state !== "running" || !isHeroVisible || !isEnabledByUser) return;
    const now = ctx.currentTime;

    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = "sine";
    bodyOsc.frequency.setValueAtTime(freq, now);

    const warmOsc = ctx.createOscillator();
    warmOsc.type = "triangle";
    warmOsc.frequency.setValueAtTime(freq * 2, now);

    const warmMix = ctx.createGain();
    warmMix.gain.value = 0.16;

    const feltFilter = ctx.createBiquadFilter();
    feltFilter.type = "lowpass";
    feltFilter.frequency.setValueAtTime(980, now);
    feltFilter.frequency.exponentialRampToValueAtTime(320, now + 2.6);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.14, now + 0.025);
    env.gain.exponentialRampToValueAtTime(0.035, now + 1.2);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);

    bodyOsc.connect(feltFilter);
    warmOsc.connect(warmMix);
    warmMix.connect(feltFilter);
    feltFilter.connect(env);
    env.connect(musicBus);

    bodyOsc.start(now);
    warmOsc.start(now);
    bodyOsc.stop(now + 3.7);
    warmOsc.stop(now + 3.7);
  }

  function triggerViolinNote(freq, dur = 4.5) {
    if (!ctx || !musicBus || ctx.state !== "running" || !isHeroVisible || !isEnabledByUser) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const bodyOsc = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    bodyOsc.type = "triangle";

    // Gentle upward slide into note like a live bow stroke
    osc1.frequency.setValueAtTime(freq * 0.985, now);
    osc1.frequency.linearRampToValueAtTime(freq, now + 0.35);
    osc2.frequency.setValueAtTime(freq * 0.988, now);
    osc2.frequency.linearRampToValueAtTime(freq * 1.002, now + 0.35);
    bodyOsc.frequency.setValueAtTime(freq, now);

    // Delayed natural bow vibrato
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.1;
    const vibDepth = ctx.createGain();
    vibDepth.gain.setValueAtTime(0, now);
    vibDepth.gain.linearRampToValueAtTime(0.5, now + 0.8);
    vibDepth.gain.linearRampToValueAtTime(3.2, now + 1.7);
    vib.connect(vibDepth);
    vibDepth.connect(osc1.frequency);
    vibDepth.connect(osc2.frequency);

    // Wooden violin body formant filtering
    const bodyPeak = ctx.createBiquadFilter();
    bodyPeak.type = "peaking";
    bodyPeak.frequency.value = 480;
    bodyPeak.gain.value = 4.5;

    const bowFilter = ctx.createBiquadFilter();
    bowFilter.type = "lowpass";
    bowFilter.frequency.setValueAtTime(750, now);
    bowFilter.frequency.linearRampToValueAtTime(1650, now + 1.3);
    bowFilter.frequency.linearRampToValueAtTime(900, now + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.055, now + 1.25);
    env.gain.setValueAtTime(0.055, now + Math.max(1.4, dur - 1.6));
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = -0.18;
      env.connect(panner);
      panner.connect(musicBus);
    } else {
      env.connect(musicBus);
    }

    osc1.connect(bodyPeak);
    osc2.connect(bodyPeak);
    bodyOsc.connect(bodyPeak);
    bodyPeak.connect(bowFilter);
    bowFilter.connect(env);

    osc1.start(now);
    osc2.start(now);
    bodyOsc.start(now);
    vib.start(now);

    osc1.stop(now + dur + 0.1);
    osc2.stop(now + dur + 0.1);
    bodyOsc.stop(now + dur + 0.1);
    vib.stop(now + dur + 0.1);
  }

  function scheduleNextPiano() {
    clearTimeout(pianoTimer);
    if (!isRunning) return;
    if (ctx && ctx.state === "running" && isHeroVisible && isEnabledByUser) {
      const freq = PIANO_NOTES[pianoStep % PIANO_NOTES.length];
      pianoStep++;
      triggerPianoNote(freq);
    }
    const nextMs = pianoStep % 4 === 0 ? 2250 : 1550;
    pianoTimer = setTimeout(scheduleNextPiano, nextMs);
  }

  function scheduleNextViolin() {
    clearTimeout(violinTimer);
    if (!isRunning) return;
    const phrase = VIOLIN_PHRASES[violinStep % VIOLIN_PHRASES.length];
    if (ctx && ctx.state === "running" && isHeroVisible && isEnabledByUser) {
      violinStep++;
      triggerViolinNote(phrase.freq, phrase.dur);
    }
    const restMs = (phrase.dur * 1000) + 1400;
    violinTimer = setTimeout(scheduleNextViolin, restMs);
  }

  function triggerBirdChirp(intense = false) {
    if (!ctx || !echoInput || ctx.state !== "running" || !isHeroVisible || !isEnabledByUser) return;
    const now = ctx.currentTime;
    const notes = intense ? (Math.random() > 0.4 ? 3 : 2) : (Math.random() > 0.6 ? 2 : 1);
    const pan = (Math.random() * 1.4) - 0.5; // slight bias toward center-right where birds fly

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      panner.connect(echoInput);
    }
    const dest = panner || echoInput;

    for (let i = 0; i < notes; i++) {
      const t0 = now + i * (0.11 + Math.random() * 0.06);
      const dur = 0.08 + Math.random() * 0.07;
      const baseFreq = 2200 + Math.random() * 1450;

      const osc = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const env = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, t0);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * (1.18 + Math.random() * 0.16), t0 + dur * 0.45);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, t0 + dur);

      mod.frequency.value = 28 + Math.random() * 20;
      modGain.gain.value = 95;
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(intense ? 0.042 : 0.025, t0 + 0.018);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(env);
      env.connect(dest);

      osc.start(t0);
      mod.start(t0);
      osc.stop(t0 + dur + 0.02);
      mod.stop(t0 + dur + 0.02);
    }
  }

  function triggerSkyTiltSwell() {
    if (!ctx || !windFilter || ctx.state !== "running" || !isHeroVisible || !isEnabledByUser) return;
    const now = ctx.currentTime;
    windFilter.frequency.cancelScheduledValues(now);
    windFilter.frequency.setValueAtTime(windFilter.frequency.value, now);
    windFilter.frequency.linearRampToValueAtTime(560, now + 1.1);
    windFilter.frequency.linearRampToValueAtTime(290, now + 3.0);
  }

  function scheduleNextBird(videoEl) {
    clearTimeout(birdTimer);
    if (!isRunning) return;
    const t = videoEl ? videoEl.currentTime || 0 : 0;
    const inSkyFlock = t >= 4.2;
    if (ctx && ctx.state === "running" && isHeroVisible && isEnabledByUser) {
      triggerBirdChirp(inSkyFlock);
    }
    const delayMs = inSkyFlock ? (650 + Math.random() * 900) : (1800 + Math.random() * 2000);
    birdTimer = setTimeout(() => scheduleNextBird(videoEl), delayMs);
  }

  function init(videoEl, heroSectionEl, toggleBtnEl) {
    if (!videoEl || !toggleBtnEl) return;

    const syncButton = () => {
      const active = Boolean(ctx && ctx.state === "running" && isEnabledByUser && isHeroVisible);
      toggleBtnEl.classList.toggle("is-sound-on", active);
      toggleBtnEl.setAttribute("aria-pressed", String(active));
      toggleBtnEl.setAttribute("aria-label", active ? "Mute hero ambience" : "Unmute hero ambience");
      toggleBtnEl.title = active ? "Ambience On — Click to Mute" : "Muted — Click to Enable Ambience";
    };

    const updateMasterVolume = () => {
      if (!ctx || !masterGain) {
        syncButton();
        return;
      }
      const target = isEnabledByUser && isHeroVisible && ctx.state === "running" ? 0.85 : 0;
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(target, now, 0.25);
      syncButton();
    };

    const startAudio = async () => {
      buildGraph();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          return;
        }
      }
      if (!isRunning) {
        isRunning = true;
        scheduleNextBird(videoEl);
        scheduleNextPiano();
        violinTimer = setTimeout(scheduleNextViolin, 1800);
        const monitorVideoSync = () => {
          if (ctx && ctx.state === "running" && foliageGain && videoEl) {
            const t = videoEl.currentTime || 0;
            if (t < lastVideoTime) whooshTriggeredForLoop = false;
            lastVideoTime = t;

            // Swell foliage breeze during hillside/tree pan (0-4.5s), trigger air swell on upward sky tilt (~4.2s)
            const targetLeaf = t < 4.4 ? 0.11 : 0.045;
            foliageGain.gain.setTargetAtTime(targetLeaf, ctx.currentTime, 0.3);
            if (t >= 4.2 && t <= 4.7 && !whooshTriggeredForLoop) {
              whooshTriggeredForLoop = true;
              triggerSkyTiltSwell();
            }
          }
          syncRaf = requestAnimationFrame(monitorVideoSync);
        };
        syncRaf = requestAnimationFrame(monitorVideoSync);
      }
      updateMasterVolume();
    };

    toggleBtnEl.addEventListener("click", async () => {
      if (!ctx || ctx.state !== "running") {
        isEnabledByUser = true;
        await startAudio();
      } else {
        isEnabledByUser = !isEnabledByUser;
        updateMasterVolume();
      }
    });

    if (heroSectionEl && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          isHeroVisible = entries[0]?.isIntersecting ?? false;
          updateMasterVolume();
        },
        { threshold: 0.25 }
      );
      obs.observe(heroSectionEl);
    }

    // Unlock smoothly on first user interaction anywhere on the page (except the toggle button itself,
    // which handles its own click so the first click directly turns ambience ON without double-toggling).
    const unlockOnce = async (e) => {
      if (e && e.target && toggleBtnEl.contains(e.target)) {
        window.removeEventListener("pointerdown", unlockOnce);
        window.removeEventListener("keydown", unlockOnce);
        return;
      }
      if (isEnabledByUser && isHeroVisible) {
        await startAudio();
      }
      window.removeEventListener("pointerdown", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
    };
    window.addEventListener("pointerdown", unlockOnce, { passive: true });
    window.addEventListener("keydown", unlockOnce, { passive: true });

    syncButton();
  }

  global.HeroAmbience = { init };
})(window);
