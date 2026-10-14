// All music is synthesized locally. Nothing is fetched or played before a gesture.
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const bell = (at, midi, duration = .6, volume = .1) => ({ type: 'bell', at, midi, duration, volume });
const pad = (at, notes, duration, volume = .026) => notes.map(midi => ({ type: 'pad', at, midi, duration, volume }));
const tone = (type, at, midi, duration, volume) => ({ type, at, midi, duration, volume });
const noise = (type, at, duration, volume, fromFrequency, toFrequency = fromFrequency) => ({ type, at, duration, volume, fromFrequency, toFrequency });
export const MUSIC_LOOP_SECONDS = 24;

// A fresh, inspectable score also lets offline listening use the exact same notes.
export function getSoundScore(kind = 'correct') {
  if (kind === 'chest') return getSoundScore('treasure');
  if (kind === 'retry') return [bell(0, 64, .3, .11), bell(.18, 60, .42, .085)];
  if(kind==='victory')return [
    ...[72,76,79,84].map((midi,i)=>tone('horn',i*.28,midi,i===3?1.1:.36,.065)),
    ...pad(.84,[60,64,67,72],2.3,.023),noise('shimmer',1.3,.6,.02,2400),
    ...[84,88,91,88,86,84,79,84].map((midi,i)=>bell(2.2+i*.32,midi,.65,.055)),
    ...pad(4.4,[60,64,67],1,.015)
  ];
  if(kind==='chest-glint')return [bell(0,76,.4,.065),bell(.15,79,.55,.06),bell(.3,84,.8,.05),noise('shimmer',.45,.7,.02,2300)];
  if(kind==='dance'){
    // Original 120 BPM miniature, 1.5s unveiling plus exactly 30s of dance.
    // Three four-bar phrases vary the tune; the last six seconds form a cadence.
    const tune=[76,79,84,79,81,79,76,72,74,77,81,77,79,76,74,72];
    const chords=[[60,64,67],[57,60,64],[53,57,60],[55,59,62]];
    const opening=getSoundScore('chest-glint');
    const beat=Array.from({length:60},(_,i)=>{
      const at=1.5+i*.5,bar=Math.floor(i/4),chord=chords[Math.floor(i/4)%4],phrase=Math.floor(i/16);
      const midi=i>=56?[79,76,74,72][i-56]:tune[i%16]+(phrase===1&&i%4===2?12:phrase===2&&i%4===3?-5:0);
      return [tone('pluck',at,midi,.43,i>=56?.063:.058),tone('bass',at,chord[i%2===0?0:2]-12,.3,.032),
       ...(i%4===0?pad(at,chord,1.85,.012):[]),
       {type:'kick',at,duration:.13,volume:i%4===0?.048:.025,fromFrequency:85,toFrequency:48},
       ...(i%2===1?[noise('clap',at,.085,.016,1300)]:[]),noise('shaker',at+.25,.06,.009,3400),
       ...(i%8===6?[bell(at+.125,midi+12,.34,.029)]:[])
      ];
    }).flat();
    return [...opening,...beat];
  }
  if (kind === 'music' || kind === 'background') {
    // Original 80 BPM eight-bar miniature: soft felt notes and warm held triads.
    const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62], [60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    const melody = [[64, 67], [69, 64], [65, 69], [67, 62], [72, 71], [69, 67], [65, 64], [62, 67]];
    return chords.flatMap((chord, index) => [
      ...pad(index * 3, chord, 3.6, .028),
      tone('felt', index * 3 + .4, melody[index][0], 1.4, .073),
      tone('felt', index * 3 + 1.85, melody[index][1], 1.1, .057)
    ]);
  }
  if (kind === 'correct') return [bell(0, 72, .42, .13), bell(.12, 76, .44, .1), bell(.28, 79, .62, .09)];
  if (kind === 'reward') return [
    // D-major fanfare: two short calls, a lift, and a held victory chord.
    tone('horn', 0, 62, .22, .105), tone('horn', .28, 62, .22, .085),
    tone('horn', .58, 69, .42, .11), tone('horn', 1.06, 74, 1.48, .105), tone('horn', 1.06, 66, 1.48, .04),
    ...pad(1.06, [50, 62, 66, 69], 1.94, .019), noise('shimmer', 1.08, .85, .028, 2400),
    bell(1.45, 86, .62, .068), bell(1.67, 90, .64, .058), bell(1.89, 93, .65, .048), bell(2.16, 86, .84, .06)
  ];
  if (kind === 'treasure') {
    // An opening glint gives way to a G-major 120 BPM toy-percussion dance.
    const beat = Array.from({ length: 16 }, (_, i) => 2 + i * .5);
    const bass = [55, 62, 59, 62, 60, 64, 60, 64, 62, 66, 62, 66, 55, 62, 59, 55];
    const melody = [79, 83, 86, 83, 81, 83, 79, 74, 79, 81, 83, 86, 83, 81, 79, 79];
    return [
      ...[67, 71, 74, 79, 83, 86].map((note, i) => bell(i * .16, note, .6, .075)),
      noise('shimmer', .85, 1.15, .025, 2200),
      ...[2, 4, 6, 8].flatMap((at, i) => pad(at, [[55, 59, 62], [60, 64, 67], [62, 66, 69], [55, 59, 62]][i], 2, .014)),
      ...beat.flatMap((at, i) => [
        { type: 'kick', at, duration: .16, volume: i % 4 === 0 ? .105 : .078, fromFrequency: 94, toFrequency: 48 },
        tone('bass', at, bass[i], .3, .04),
        tone('pluck', at + (i === 5 || i === 9 ? .125 : 0), melody[i], i === 15 ? .5 : .32, .075),
        noise('shaker', at + .25, .075, .014, 3400),
        ...(i % 2 ? [noise('clap', at, .12, .032, 1500)] : [])
      ])
    ];
  }
  if (kind !== 'magic') return getSoundScore('correct');
  // No dance beat or horn: wind gathers, a quartz glide charges, then releases.
  return [noise('wind', 0, 5.5, .068, 280, 1800),
    ...pad(0, [52, 59], 2.5, .013), bell(.55, 76, 1.4, .045), bell(1.5, 83, 1.65, .043),
    ...pad(2.6, [64, 67, 71], 2.9, .018),
    { ...tone('riser', 2.5, 64, 3, .026), toMidi: 88 }, bell(3.15, 78, 1.25, .042), bell(4.2, 83, 1.3, .045),
    noise('release', 5.5, .75, .043, 2300, 380), ...pad(5.5, [52, 64, 68, 71, 76], 3.8, .021),
    ...[76, 80, 83, 88].map((note, i) => bell(5.55 + i * .18, note, 1.25, .077)),
    bell(7.1, 83, 1.3, .054), bell(8.05, 80, 1.45, .047), bell(9.3, 76, 1.65, .041), bell(10.15, 71, 1.85, .035),
    ...pad(8.8, [64, 68, 71], 3.2, .018)
  ];
}

export function createSoundPlayer({ enabled = false, onUnavailable = () => {} } = {}) {
  const browser = globalThis.window || globalThis, doc = globalThis.document;
  const preference = typeof enabled === 'function' ? enabled : () => true;
  const EFFECT_VOLUME = .38, MUSIC_VOLUME = .20;
  let allowed = typeof enabled === 'function' ? true : Boolean(enabled);
  let paused = false, disposed = false, failed = false, reported = false;
  let context, master, effectsGain, musicGain, noiseBuffer, pendingUnlock, pendingInTurn = false;
  let revision = 0, effectRevision = 0, activated = false, outputMuted = true, lastError = null;
  let musicWanted = false, musicActive = false, musicTimer = null, musicPhase = 0, musicAnchor = 0, nextMusicAt = 0;
  let musicLevel = 1, duckUntil = 0;
  let playbackSession, previousSessionType;
  function usePlaybackSession() {
    const session = browser.navigator?.audioSession;
    if (!session) return;
    try {
      if (!playbackSession) previousSessionType = session.type;
      session.type = 'playback'; playbackSession = session;
    } catch { /* Older Safari can reject the optional Audio Session API. */ }
  }
  function releasePlaybackSession() {
    if (!playbackSession) return;
    try { if (playbackSession.type === 'playback') playbackSession.type = previousSessionType || 'auto'; } catch { /* Optional API. */ }
    playbackSession = undefined;
  }
  const voices = new Map();
  const wantsAudio = () => allowed && Boolean(preference());
  const canPlay = () => wantsAudio() && !paused && !disposed && !failed && !doc?.hidden;

  function getStatus() {
    const state = context?.state || 'uninitialized';
    const supported = Boolean(browser.AudioContext || browser.webkitAudioContext);
    return {
      supported, enabled: wantsAudio(), contextState: state, unlocked: activated && state === 'running',
      musicRequested: musicWanted, musicPlaying: musicActive && canPlay() && state === 'running' && !outputMuted,
      paused, hidden: Boolean(doc?.hidden), disposed,
      needsGesture: supported && wantsAudio() && !paused && !disposed && !failed && !doc?.hidden && (state !== 'running' || !activated),
      lastError, musicLevel,
      activeEffectVoices: [...voices.values()].filter(voice => voice.group === 'effects').length,
      activeMusicVoices: [...voices.values()].filter(voice => voice.group === 'music').length
    };
  }
  function detach(source, voice, stopSource = true) {
    source.onended = null;
    if (stopSource) try { source.stop(); } catch { /* Scheduled or completed source. */ }
    voice.nodes.forEach(node => { try { node.disconnect(); } catch { /* Optional node. */ } });
    voices.delete(source);
  }
  function stopGroup(group) {
    for (const [source, voice] of voices) if (!group || voice.group === group) detach(source, voice);
  }
  function register(source, nodes, group, end) {
    const voice = {nodes, group, end};
    voices.set(source, voice);
    source.onended = () => { if (voices.has(source)) detach(source, voice, false); };
  }
  function clearMusicTimer() {
    if (musicTimer !== null) { clearTimeout(musicTimer); musicTimer = null; }
  }
  function freezeMusic(keepRequest = true) {
    if (musicActive && context) musicPhase = (musicPhase + Math.max(0, context.currentTime - musicAnchor)) % MUSIC_LOOP_SECONDS;
    musicActive = false; clearMusicTimer(); stopGroup('music');
    if (musicGain && context) {
      musicGain.gain.cancelScheduledValues(context.currentTime);
      musicGain.gain.setValueAtTime(0, context.currentTime);
    }
    if (!keepRequest) musicWanted = false;
  }
  function setBedGain() {
    if (!musicGain || !context) return;
    const at = context.currentTime, parameter = musicGain.gain;
    const level = musicActive && canPlay() ? MUSIC_VOLUME * musicLevel : 0;
    parameter.cancelScheduledValues(at);
    parameter.setValueAtTime(Math.max(0, parameter.value || 0), at);
    if (duckUntil > at && level) {
      parameter.linearRampToValueAtTime(level * .35, at + .06);
      parameter.setValueAtTime(level * .35, duckUntil);
      parameter.linearRampToValueAtTime(level, duckUntil + .3);
    } else parameter.linearRampToValueAtTime(level, at + .24);
  }
  function stopEffects() {
    effectRevision += 1; stopGroup('effects'); duckUntil = 0; setBedGain();
  }
  function silence(keepMusic = true) {
    revision += 1; freezeMusic(keepMusic); stopEffects(); stopGroup('warmup');
    if (master && context) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(0, context.currentTime);
    }
    outputMuted = true;
  }
  function stop() { silence(false); }
  function suspend() {
    releasePlaybackSession();
    if (context && ['running', 'interrupted'].includes(context.state)) {
      try { return Promise.resolve(context.suspend()).catch(() => false); } catch { /* Keep mute state. */ }
    }
    return Promise.resolve(false);
  }
  function unavailable(reason) {
    silence(true); failed = true; lastError = reason;
    if (!reported && !disposed) {
      reported = true;
      try { onUnavailable({reason}); } catch { /* Audio failure never interrupts gameplay. */ }
    }
  }
  function blocked(error) {
    return ['NotAllowedError', 'InvalidStateError'].includes(error?.name) || ['suspended', 'interrupted'].includes(context?.state);
  }
  function onContextState() {
    if (disposed || !context || context.state === 'running') return;
    if (context.state === 'suspended' && pendingUnlock && !activated) return;
    if (['suspended', 'interrupted', 'closed'].includes(context.state)) {
      freezeMusic(true);
      if ([...voices.values()].some(voice => voice.group === 'effects')) stopEffects();
      else { duckUntil = 0; setBedGain(); }
      stopGroup('warmup'); activated = false; outputMuted = true;
      lastError = context.state;
    }
  }
  function removeContextListener() {
    if (!context) return;
    if (context.removeEventListener) context.removeEventListener('statechange', onContextState);
    else if (context.onstatechange === onContextState) context.onstatechange = null;
  }
  function ensureContext() {
    if (context?.state === 'closed') {
      silence(true); removeContextListener();
      for (const node of [master, effectsGain, musicGain]) try { node?.disconnect(); } catch { /* Closed graph. */ }
      context = master = effectsGain = musicGain = noiseBuffer = undefined;
      activated = false; pendingUnlock = null;
    }
    if (context) return true;
    const Audio = browser.AudioContext || browser.webkitAudioContext;
    if (!Audio) { unavailable('unsupported'); return false; }
    context = new Audio();
    master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
    effectsGain = context.createGain(); effectsGain.gain.value = EFFECT_VOLUME; effectsGain.connect(master);
    musicGain = context.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    if (context.addEventListener) context.addEventListener('statechange', onContextState);
    else context.onstatechange = onContextState;
    return true;
  }
  function primeInGesture() {
    stopGroup('warmup');
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, context.sampleRate);
    source.connect(master);
    const end = context.currentTime + 1 / context.sampleRate;
    register(source, [source], 'warmup', end);
    source.start(context.currentTime); source.stop(end);
  }
  function openOutput() {
    if (!outputMuted) return;
    const at = context.currentTime;
    master.gain.cancelScheduledValues(at); master.gain.setValueAtTime(0, at);
    master.gain.linearRampToValueAtTime(1, at + .04); outputMuted = false;
  }
  function unlock() {
    if (!canPlay()) return Promise.resolve(false);
    try {
      usePlaybackSession();
      if (!ensureContext()) { releasePlaybackSession(); return Promise.resolve(false); }
      if (activated && context.state === 'running') {
        openOutput(); if (musicWanted) startTimeline(); return Promise.resolve(true);
      }
      // Coalesce calls in one click, but let a later real click retry a resume
      // promise that a mobile browser left pending behind its autoplay gate.
      if (pendingUnlock && pendingInTurn) return pendingUnlock;
      const ticket = revision, activeContext = context;
      // Both the native resume and the tiny silent start occur before any await.
      // Call unlock/startMusic directly in the original trusted click handler.
      if (!activated || context.state !== 'running') primeInGesture();
      lastError = context.state === 'interrupted' ? 'interrupted' : 'awaiting-gesture';
      const resumed = context.state === 'running' ? undefined : context.resume();
      const pending = Promise.resolve(resumed).then(() => {
        if (!canPlay() || ticket !== revision || activeContext !== context) {
          if (!disposed && (!wantsAudio() || paused || doc?.hidden)) void suspend();
          return false;
        }
        if (context.state !== 'running') { lastError = context.state === 'interrupted' ? 'interrupted' : 'awaiting-gesture'; return false; }
        activated = true; lastError = null; openOutput();
        if (musicWanted) startTimeline();
        return true;
      }).catch(error => {
        if (activeContext !== context || disposed) return false;
        if (blocked(error)) lastError = context.state === 'interrupted' ? 'interrupted' : 'autoplay-blocked';
        else unavailable('initialization-failed');
        return false;
      }).finally(() => {
        if (pendingUnlock === pending) pendingUnlock = null;
        if (activeContext === context) stopGroup('warmup');
      });
      pendingUnlock = pending;
      pendingInTurn = true;
      Promise.resolve().then(() => { pendingInTurn = false; });
      return pending;
    } catch (error) {
      if (blocked(error)) { lastError = context?.state === 'interrupted' ? 'interrupted' : 'autoplay-blocked'; stopGroup('warmup'); }
      else unavailable('initialization-failed');
      return Promise.resolve(false);
    }
  }

  function envelope(gain, at, duration, volume, type = 'bell') {
    const soft = type === 'pad';
    const attack = Math.min(type === 'horn' ? .045 : type === 'felt' ? .07 : soft ? .3 : .012, duration * .18);
    gain.gain.setValueAtTime(.0001, at);
    if (type === 'wind' || type === 'riser') {
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume * .18), at + duration * .12);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0003, volume), at + duration * .85);
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration); return;
    }
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), at + attack);
    if (type === 'horn') {
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume * .7), at + duration * .32);
      gain.gain.setValueAtTime(Math.max(.0002, volume * .7), at + duration * .65);
    } else if (soft) gain.gain.setValueAtTime(volume, at + duration * .48);
    else gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume * .28), at + Math.min(.18, duration * .3));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
  }
  function oscillator(event, base, group, overtone = false) {
    const source = context.createOscillator(), gain = context.createGain();
    source.type = event.type === 'horn' ? overtone ? 'sawtooth' : 'triangle' : ['pad', 'bass'].includes(event.type) ? 'triangle' : 'sine';
    const multiplier = overtone ? event.type === 'horn' ? 1 : event.type === 'pluck' ? 3.005 : 2.005 : 1;
    source.frequency.setValueAtTime((event.type === 'kick' ? event.fromFrequency : frequency(event.midi)) * multiplier, base + event.at);
    if (event.type === 'kick' || event.type === 'riser') source.frequency.exponentialRampToValueAtTime(event.type === 'kick' ? event.toFrequency : frequency(event.toMidi), base + event.at + event.duration);
    envelope(gain, base + event.at, event.duration, event.volume * (overtone ? event.type === 'horn' ? .22 : event.type === 'pluck' ? .12 : .16 : 1), event.type);
    const nodes = [source, gain];
    if (event.type === 'horn' || event.type === 'felt' || group === 'music') {
      const filter = context.createBiquadFilter(); filter.type = 'lowpass';
      filter.frequency.value = event.type === 'horn' ? 1850 : 1600; filter.Q.value = .5;
      source.connect(filter); filter.connect(gain); nodes.push(filter);
    } else source.connect(gain);
    gain.connect(group === 'music' ? musicGain : effectsGain);
    const end = base + event.at + event.duration;
    register(source, nodes, group, end); source.start(base + event.at); source.stop(end);
  }
  function wind(event, base, group) {
    if (!noiseBuffer) {
      noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 2), context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
    source.buffer = noiseBuffer; source.loop = true;
    filter.type = event.type === 'clap' ? 'bandpass' : ['shimmer', 'shaker'].includes(event.type) ? 'highpass' : 'lowpass';
    filter.frequency.setValueAtTime(event.fromFrequency, base + event.at); filter.Q.value = .45;
    if (event.toFrequency !== event.fromFrequency) filter.frequency.exponentialRampToValueAtTime(event.toFrequency, base + event.at + event.duration);
    envelope(gain, base + event.at, event.duration, event.volume, event.type);
    source.connect(filter); filter.connect(gain); gain.connect(group === 'music' ? musicGain : effectsGain);
    const end = base + event.at + event.duration;
    register(source, [source, filter, gain], group, end); source.start(base + event.at); source.stop(end);
  }
  function remainingScore(score, offset = 0) {
    const elapsed = Math.max(0, Number.isFinite(offset) ? offset : 0);
    return score.filter(event => event.at + event.duration - Math.max(event.at, elapsed) >= .025).map(event => {
      const used = Math.max(0, elapsed - event.at), progress = used / event.duration;
      return {...event, at: Math.max(0, event.at - elapsed), duration: event.duration - used,
        midi: event.type === 'riser' ? event.midi + (event.toMidi - event.midi) * progress : event.midi,
        fromFrequency: event.fromFrequency ? event.fromFrequency * (event.toFrequency / event.fromFrequency) ** progress : undefined,
        volume: event.volume * (['bell', 'felt', 'pluck', 'kick', 'clap', 'shaker', 'release', 'shimmer'].includes(event.type) ? Math.exp(-3.2 * progress) : 1)};
    });
  }
  function schedule(score, base, group) {
    for (const event of score) {
      if (['wind', 'release', 'shimmer', 'clap', 'shaker'].includes(event.type)) wind(event, base, group);
      else { oscillator(event, base, group); if (['bell', 'horn', 'pluck'].includes(event.type)) oscillator(event, base, group, true); }
    }
  }
  function musicTick() {
    musicTimer = null;
    if (!musicActive || !canPlay() || context?.state !== 'running') { freezeMusic(true); return; }
    const now = context.currentTime;
    for (const [source, voice] of voices) if (voice.end <= now) detach(source, voice, false);
    if (now - nextMusicAt > MUSIC_LOOP_SECONDS) nextMusicAt += Math.floor((now - nextMusicAt) / MUSIC_LOOP_SECONDS) * MUSIC_LOOP_SECONDS;
    try {
      // At most two cycles per tick; clock stalls never create a catch-up burst.
      for (let cycles = 0; cycles < 2 && nextMusicAt <= now + 1; cycles += 1) {
        const offset = Math.max(0, now + .025 - nextMusicAt);
        schedule(remainingScore(getSoundScore('background'), offset), nextMusicAt + offset, 'music');
        nextMusicAt += MUSIC_LOOP_SECONDS;
      }
      musicTimer = setTimeout(musicTick, 250);
      musicTimer?.unref?.();
    } catch { unavailable('synthesis-failed'); }
  }
  function startTimeline() {
    if (musicActive || !musicWanted || !canPlay() || context?.state !== 'running') return;
    musicActive = true; musicAnchor = context.currentTime + .035;
    try {
      schedule(remainingScore(getSoundScore('background'), musicPhase), musicAnchor, 'music');
      nextMusicAt = musicAnchor + MUSIC_LOOP_SECONDS - musicPhase; setBedGain();
      clearMusicTimer(); musicTimer = setTimeout(musicTick, 250); musicTimer?.unref?.();
    } catch { unavailable('synthesis-failed'); }
  }
  function startMusic({unlock: requestUnlock = true} = {}) {
    if (disposed) return Promise.resolve(false);
    musicWanted = true;
    if (musicActive && canPlay() && context?.state === 'running') return Promise.resolve(true);
    if (!requestUnlock) {
      if (activated && canPlay() && context?.state === 'running') { openOutput(); startTimeline(); }
      return Promise.resolve(Boolean(musicActive));
    }
    return unlock().then(ok => Boolean(ok && musicActive));
  }
  function stopMusic() { freezeMusic(false); }
  function setMusicLevel(value = 1) {
    const next = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
    if (next !== musicLevel) { musicLevel = next; setBedGain(); }
    return musicLevel;
  }
  function play(kind = 'correct', {offset = 0} = {}) {
    if (kind === 'background' || kind === 'music') return startMusic();
    if (!canPlay()) return Promise.resolve(false);
    stopEffects(); const ticket = effectRevision;
    // unlock invokes the native resume immediately, before this promise chain.
    return unlock().then(ok => {
      if (!ok || !canPlay() || ticket !== effectRevision) return false;
      try {
        const score = remainingScore(getSoundScore(kind), offset);
        if (!score.length) return false;
        const base = context.currentTime + .015;
        duckUntil = base + Math.max(...score.map(event => event.at + event.duration)); setBedGain();
        schedule(score, base, 'effects'); return true;
      } catch (error) {
        if (blocked(error)) { lastError = 'interrupted'; stopEffects(); freezeMusic(true); }
        else unavailable('synthesis-failed');
        return false;
      }
    });
  }
  function pause() { paused = true; silence(true); return suspend(); }
  function resume({unlock: requestUnlock = true} = {}) {
    if (disposed || doc?.hidden) return Promise.resolve(false);
    paused = false;
    if (!requestUnlock) return musicWanted ? startMusic({unlock: false}) : Promise.resolve(canPlay());
    return musicWanted || context ? unlock() : Promise.resolve(canPlay());
  }
  function setEnabled(value, {unlock: requestUnlock = true} = {}) {
    allowed = Boolean(value);
    if (!allowed) { silence(true); return suspend().then(() => false); }
    if (!requestUnlock) return Promise.resolve(canPlay() && context?.state === 'running');
    failed = false;
    return unlock();
  }
  function onHidden() { if (doc?.hidden) void pause(); }
  function onPageHide() { void pause(); }
  function destroy() {
    if (disposed) return;
    disposed = true; stop(); releasePlaybackSession(); removeContextListener();
    doc?.removeEventListener('visibilitychange', onHidden);
    browser.removeEventListener?.('pagehide', onPageHide);
    if (context) { try { void Promise.resolve(context.close()).catch(() => {}); } catch { /* Already closed. */ } }
  }
  doc?.addEventListener('visibilitychange', onHidden);
  browser.addEventListener?.('pagehide', onPageHide);
  return {play, stop, pause, resume, setEnabled, destroy, unlock, startMusic, stopEffects, stopMusic, setMusicLevel, getStatus};
}
