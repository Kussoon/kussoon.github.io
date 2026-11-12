(() => {
  'use strict';
  let context, voices = [], stopTimer, generation = 0, onStopped = () => {};
  const stopAudio = () => {
    generation++;
    clearTimeout(stopTimer);
    for (const {osc, gain} of voices) {
      try {
        const t = context.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0, t, 0.005);
        osc.stop(t + 0.04);
      } catch (_) { /* An oscillator may already have ended. */ }
    }
    voices = [];
    onStopped();
    onStopped = () => {};
  };
  async function play(frequencies, volume, duration, finished) {
    stopAudio();
    const request = generation;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('このブラウザでは音声を再生できません。');
    if (!context) context = new Audio();
    if (context.state !== 'running') await context.resume();
    if (request !== generation) return false;
    if (context.state !== 'running') throw new Error('再生ボタンをもう一度押してください。');
    const t = context.currentTime + 0.015;
    voices = frequencies.map(frequency => {
      const osc = context.createOscillator(), gain = context.createGain();
      osc.type = 'sine'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume / frequencies.length, t + 0.02);
      gain.gain.setValueAtTime(volume / frequencies.length, t + duration - 0.03);
      gain.gain.linearRampToValueAtTime(0, t + duration);
      osc.connect(gain); gain.connect(context.destination);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      osc.start(t); osc.stop(t + duration + 0.01);
      return {osc, gain};
    });
    onStopped = finished;
    stopTimer = setTimeout(stopAudio, duration * 1000 + 30);
    return true;
  }
  const reportError = (status, error) => { status.textContent = error.message || '音声を再生できませんでした。'; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
  window.addEventListener('pagehide', stopAudio);

  const action = document.querySelector('[data-action]');
  if (action) {
    const press = action.querySelector('[data-action-press]');
    const release = action.querySelector('[data-action-release]');
    const status = action.querySelector('[data-action-status]');
    let timers = [];
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      action.classList.remove('pressed', 'struck', 'sounding');
      press.disabled = false; release.disabled = true;
      status.textContent = 'ダンパーが弦に触れ、音を止めています。';
    }
    press.addEventListener('click', () => {
      press.disabled = true; release.disabled = false;
      action.classList.add('pressed');
      status.textContent = '鍵盤が動き、ダンパーが弦から離れます。ハンマーが弦に向かいます。';
      timers.push(setTimeout(() => {
        action.classList.add('struck');
        status.textContent = 'ハンマーが弦を打ちます。';
      }, 400));
      timers.push(setTimeout(() => {
        action.classList.remove('struck'); action.classList.add('sounding');
        status.textContent = 'ハンマーは弦から離れました。ダンパーは上がったまま、弦の振動が続きます。';
      }, 650));
    });
    release.addEventListener('click', reset);
    document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  }

  const keys = document.querySelector('[data-keyboard]');
  if (keys) {
    const board = keys.querySelector('.keyboard');
    const status = keys.querySelector('[data-key-status]');
    const sound = keys.querySelector('[data-key-sound]');
    const names = ['ド', 'ド♯／レ♭', 'レ', 'レ♯／ミ♭', 'ミ', 'ファ', 'ファ♯／ソ♭', 'ソ', 'ソ♯／ラ♭', 'ラ', 'ラ♯／シ♭', 'シ'];
    const letters = ['C','C♯/D♭','D','D♯/E♭','E','F','F♯/G♭','G','G♯/A♭','A','A♯/B♭','B'];
    const black = new Set([1, 3, 6, 8, 10]);
    let whiteIndex = 0, selected;
    for (let midi = 21; midi <= 108; midi++) {
      const pitch = midi % 12, octave = Math.floor(midi / 12) - 1;
      const isBlack = black.has(pitch), key = document.createElement('button');
      const frequency = 440 * 2 ** ((midi - 69) / 12);
      key.type = 'button'; key.className = 'piano-key ' + (isBlack ? 'black-key' : 'white-key');
      key.dataset.midi = midi;
      key.style.left = (isBlack ? whiteIndex * 38 - 11 : whiteIndex * 38) + 'px';
      if (!isBlack) whiteIndex++;
      key.setAttribute('aria-label', `${letters[pitch]}${octave}、${names[pitch]}、${frequency.toFixed(2)}ヘルツ`);
      key.setAttribute('aria-pressed', 'false');
      const label = document.createElement('span'); label.textContent = letters[pitch] + octave; key.append(label);
      key.addEventListener('click', async () => {
        if (selected) { selected.classList.remove('selected'); selected.setAttribute('aria-pressed', 'false'); }
        selected = key; key.classList.add('selected'); key.setAttribute('aria-pressed', 'true');
        const text = `${names[pitch]}（${letters[pitch]}${octave}）・${frequency.toFixed(2)} Hz・左から${midi - 20}番目`;
        status.textContent = text;
        if (sound.checked) {
          try { await play([frequency], 0.045, 1.2, () => {}); }
          catch (e) { status.textContent = text + '。' + e.message; }
        }
      });
      key.addEventListener('keydown', event => {
        const offset = {ArrowRight: 1, ArrowLeft: -1, Home: 21-midi, End: 108-midi}[event.key];
        if (offset === undefined) return;
        event.preventDefault();
        board.querySelector(`[data-midi="${Math.min(108, Math.max(21, midi + offset))}"]`).focus();
      });
      board.append(key);
    }
    keys.querySelector('[data-key-colors]').addEventListener('change', event => {
      board.classList.toggle('reversed', event.target.checked);
    });
    sound.addEventListener('change', () => { if (!sound.checked) stopAudio(); });
    keys.querySelector('[data-key-stop]').addEventListener('click', stopAudio);
    keys.querySelector('[data-key-center]').addEventListener('click', () => {
      const key = board.querySelector('[data-midi="60"]');
      key.focus(); key.scrollIntoView({block: 'nearest', inline: 'center'}); key.click();
    });
  }

  const pitch = document.querySelector('[data-pitch]');
  if (pitch) {
    const status = pitch.querySelector('[data-pitch-status]');
    const buttons = [...pitch.querySelectorAll('[data-pitch-mode]')];
    const cursor = pitch.querySelector('[data-beat-cursor]');
    const volume = pitch.querySelector('[data-pitch-volume]');
    let frame, began = 0;
    const wave = [], envelope = [];
    // 8 samples per carrier cycle; render in an SVG so zoom remains sharp.
    for (let i = 0; i <= 3600; i++) {
      const t = i / 3600, x = 20 + 560 * t;
      const y = 75 - 27 * (Math.sin(2*Math.PI*440*t) + Math.sin(2*Math.PI*442*t));
      wave.push(`${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`);
    }
    for (const sign of [-1, 1]) {
      for (let i = 0; i <= 560; i++) {
        const t = i / 560;
        envelope.push(`${i ? 'L' : 'M'}${20+i},${(75 + sign*54*Math.abs(Math.cos(2*Math.PI*t))).toFixed(2)}`);
      }
    }
    pitch.querySelector('[data-beat-wave]').setAttribute('d', wave.join(' '));
    pitch.querySelector('[data-beat-envelope]').setAttribute('d', envelope.join(' '));
    function reset() {
      cancelAnimationFrame(frame);
      buttons.forEach(button => button.setAttribute('aria-pressed', 'false'));
      cursor.setAttribute('transform', 'translate(0 0)');
      status.textContent = '停止中。再生は10秒で自動的に止まります。';
    }
    function animate() {
      if (context && context.state !== 'running') { stopAudio(); return; }
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cursor.setAttribute('transform', `translate(${Math.max(0, context.currentTime-began)%1*560} 0)`);
      }
      frame = requestAnimationFrame(animate);
    }
    buttons.forEach(button => button.addEventListener('click', async () => {
      reset();
      const mode = button.dataset.pitchMode;
      try {
        const ok = await play(mode === 'both' ? [440, 442] : [Number(mode)], Number(volume.value), 10, reset);
        if (!ok) return;
        button.setAttribute('aria-pressed', 'true');
        status.textContent = mode === 'both' ? '440 Hz＋442 Hzを再生中。うなりは1秒に2回です。' : `${mode} Hzを再生中。図は同時再生の場合を示しています。`;
        began = context.currentTime + 0.015;
        animate();
      } catch (e) { reset(); reportError(status, e); }
    }));
    pitch.querySelector('[data-pitch-stop]').addEventListener('click', () => { stopAudio(); reset(); });
    volume.addEventListener('input', () => {
      if (!context) return;
      voices.forEach(({gain}) => {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(Number(volume.value) / voices.length, now, 0.015);
        const end = began + 10;
        if (end > now + 0.04) {
          gain.gain.setValueAtTime(Number(volume.value) / voices.length, end-0.03);
          gain.gain.linearRampToValueAtTime(0, end);
        }
      });
    });
  }
})();
