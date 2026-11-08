import React, { useEffect, useRef, useState } from 'react';

let audioContext;

export function primeTimerAudio() {
  const AudioContextApi = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextApi) return false;
  try {
    audioContext ||= new AudioContextApi();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

function playChime() {
  if (!audioContext || audioContext.state !== 'running') return;
  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, audioContext.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.7);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.72);
  } catch {
    // The visual completion state remains available if browser audio is unavailable.
  }
}

function clockText(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export default function FocusTimer({ taskName, totalMinutes, onClose }) {
  const rootRef = useRef(null);
  const durationSeconds = Math.max(1, totalMinutes) * 60;
  const [remaining, setRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(true);
  const [deadline, setDeadline] = useState(() => Date.now() + durationSeconds * 1000);
  const [muted, setMuted] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(Boolean(audioContext?.state === 'running'));
  const [deviceFullscreen, setDeviceFullscreen] = useState(false);
  const [notice, setNotice] = useState('');
  const completed = remaining <= 0;
  const progress = Math.min(100, Math.max(0, (1 - remaining / durationSeconds) * 100));

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const syncFullscreen = () => setDeviceFullscreen(document.fullscreenElement === rootRef.current);
    const handleKey = (event) => {
      if (event.key !== 'Escape') return;
      if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
      else onClose();
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocumentOverflow;
      if (document.fullscreenElement === rootRef.current) document.exitFullscreen?.().catch?.(() => {});
    };
  }, [onClose]);

  useEffect(() => {
    if (!running || !deadline) return undefined;
    const tick = () => {
      setAudioAvailable(Boolean(audioContext?.state === 'running'));
      const secondsLeft = (deadline - Date.now()) / 1000;
      if (secondsLeft <= 0) {
        if (!muted) playChime();
        setRemaining(0);
        setRunning(false);
        setDeadline(null);
      } else {
        setRemaining(secondsLeft);
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [running, deadline, muted]);

  useEffect(() => {
    let wakeLock;
    let disposed = false;
    async function updateWakeLock() {
      if (!running || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) {
        await wakeLock?.release?.().catch?.(() => {});
        wakeLock = null;
        return;
      }
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        if (disposed) await wakeLock.release();
      } catch {
        // Wake Lock is optional and may be unavailable or denied.
      }
    }
    const onVisibility = () => updateWakeLock();
    updateWakeLock();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLock?.release?.().catch?.(() => {});
    };
  }, [running]);

  async function enterDeviceFullscreen() {
    if (!rootRef.current?.requestFullscreen) {
      setNotice('Device Fullscreen is not available in this browser. The timer will stay in the page viewport.');
      return;
    }
    try {
      await rootRef.current.requestFullscreen();
      setNotice('');
    } catch {
      setNotice('The browser did not allow Device Fullscreen. You can keep using the page viewport mode.');
    }
  }

  function togglePause() {
    if (running) {
      setRemaining(Math.max(0, (deadline - Date.now()) / 1000));
      setDeadline(null);
      setRunning(false);
    } else if (!completed) {
      setDeadline(Date.now() + remaining * 1000);
      setRunning(true);
    }
  }

  function reset() {
    setRemaining(durationSeconds);
    setDeadline(null);
    setRunning(false);
    setNotice('Timer reset. Press Resume to start again.');
  }

  function close() {
    if (document.fullscreenElement === rootRef.current) document.exitFullscreen?.().catch?.(() => {});
    onClose();
  }

  return <div ref={rootRef} className={`focus-timer-screen ${deviceFullscreen ? 'device-fullscreen' : ''}`} role="dialog" aria-modal="true" aria-label="Focus timer">
    <div className="focus-timer-glow focus-timer-glow-a"/><div className="focus-timer-glow focus-timer-glow-b"/>
    <header className="timer-topline"><div className="timer-brand"><span className="timer-brand-mark">✳</span><span>MYPLANNER <i/> FOCUS</span></div><button className="timer-control timer-exit" onClick={close}>Exit timer</button></header>
    <main className="timer-center">
      <div className="timer-context">{taskName ? 'FOCUSING ON' : 'FOCUS SESSION'}</div>
      <h1>{taskName || 'A little focus time'}</h1>
      <div className="timer-clock" role="timer" aria-live="off">{clockText(remaining)}</div>
      <div className="timer-phase"><span/>{completed ? 'Complete' : 'Countdown'}</div>
      <div className="timer-progress"><span style={{ width: `${progress}%` }}/></div>
      <p className="timer-duration-note">{totalMinutes} min countdown</p>
      {completed && <p className="timer-complete-note" role="status">Session complete. Your planner task is unchanged.</p>}
      <div className="timer-main-controls">
        <button className="timer-control timer-secondary" onClick={reset}>Reset</button>
        {!completed && <button className="timer-control timer-primary" onClick={togglePause}>{running ? 'Pause' : 'Resume'}</button>}
        <button className={`timer-control timer-secondary ${muted ? 'is-muted' : ''}`} onClick={() => setMuted((value) => !value)} aria-pressed={muted}>{muted ? 'Sound off' : 'Mute sound'}</button>
      </div>
      {notice && <p className="timer-notice" role="status">{notice}</p>}
      {!audioAvailable && <p className="timer-audio-note" role="status">Browser audio is unavailable or blocked. The timer will show completion on screen.</p>}
    </main>
    <footer className="timer-bottomline">
      <div className="timer-display-options"><span>DISPLAY</span><button className={!deviceFullscreen ? 'selected' : ''} onClick={() => { if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {}); setNotice(''); }}>Browser viewport</button><button className={deviceFullscreen ? 'selected' : ''} onClick={enterDeviceFullscreen}>Device Fullscreen</button></div>
      <div className="timer-footer-hint">{deviceFullscreen ? 'Press Esc or Exit timer to leave fullscreen' : 'Browser tabs stay visible in viewport mode'}</div>
    </footer>
  </div>;
}
