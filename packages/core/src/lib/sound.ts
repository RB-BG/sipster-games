// Copyright © 2026 Sipster. PolyForm Noncommercial License 1.0.0 (see LICENSE).

/**
 * Gesynthetiseerde geluidjes via WebAudio: geen assets, geen laadtijd.
 * Alles faalt stil; geluid is nooit kritiek. De app kiest via configureSound
 * de mute-opslagsleutel (zodat mexxen en bussen hun eigen namespace houden).
 */
let ctx: AudioContext | null = null
let muteKey = 'sipster.muted'
let muted = false

function readMuted(): boolean {
  try {
    return localStorage.getItem(muteKey) === '1'
  } catch {
    return false
  }
}

/** Stel de opslagsleutel in en lees de bewaarde mute-stand. App roept dit bij init. */
export function configureSound(key: string): void {
  muteKey = key
  muted = readMuted()
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  try {
    localStorage.setItem(muteKey, value ? '1' : '0')
  } catch {
    // Opslag geweigerd; alleen deze sessie stil.
  }
}

function audio(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Kort geratel (dobbelsteen-worp of kaart delen/omdraaien). */
export function playRattle(): void {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.07
    const bufferSize = Math.floor(ac.sampleRate * 0.04)
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let j = 0; j < bufferSize; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize)
    const src = ac.createBufferSource()
    src.buffer = buffer
    const filter = ac.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1800 + i * 400
    const gain = ac.createGain()
    gain.gain.value = 0.25
    src.connect(filter).connect(gain).connect(ac.destination)
    src.start(t)
  }
}

/** Fanfaretje bij een topmoment (mex of goede uitkomst / uitgereden bus). */
export function playFanfare(): void {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const gain = ac.createGain()
    const t = now + i * 0.11
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.3)
  })
}

/** Korte hoorn (ridderslag of call bluff). */
export function playHorn(): void {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const notes = [196, 261.63]
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const gain = ac.createGain()
    const t = now + i * 0.18
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34)
    osc.connect(filter).connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.36)
  })
}

/** Kort blupje als een drink-shot inslaat op een speler. */
export function playDrink(): void {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const osc = ac.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(340, now)
  osc.frequency.exponentialRampToValueAtTime(170, now + 0.12)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.22, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
  osc.connect(gain).connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.15)
}

/** Doffe klap (afslaan of call bluff-inslag). */
export function playSlap(): void {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const osc = ac.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(140, now)
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.15)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.6, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  osc.connect(gain).connect(ac.destination)
  osc.start(now)
  osc.stop(now + 0.22)
}
