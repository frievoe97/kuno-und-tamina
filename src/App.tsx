import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import WaveSurfer from "wavesurfer.js";
import {
  ArrowDownToLine,
  AudioLines,
  ChevronDown,
  Heart,
  MailOpen,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";

const SONG_URL = "/Kumina.mp3";
const EQUALIZER_BARS = 32;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function App() {
  const waveformRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<HTMLCanvasElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLetterOpen, setIsLetterOpen] = useState(false);
  const [hasLiveVisualizer, setHasLiveVisualizer] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!waveformRef.current) return;

    const waveSurfer = WaveSurfer.create({
      container: waveformRef.current,
      url: SONG_URL,
      height: 76,
      waveColor: "#d7b8b6",
      progressColor: "#9b3e51",
      cursorColor: "#783044",
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      normalize: true,
      dragToSeek: true,
      hideScrollbar: true,
    });

    waveSurferRef.current = waveSurfer;
    waveSurfer.on("ready", () => setDuration(waveSurfer.getDuration()));
    waveSurfer.on("timeupdate", (time) => setCurrentTime(time));
    waveSurfer.on("play", () => setIsPlaying(true));
    waveSurfer.on("pause", () => setIsPlaying(false));
    waveSurfer.on("finish", () => setIsPlaying(false));
    waveSurfer.on("error", () => setAudioError(true));

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      waveSurfer.destroy();
      waveSurferRef.current = null;
      analyserRef.current?.disconnect();
      audioContextRef.current?.close();
      analyserRef.current = null;
      audioContextRef.current = null;
      frequencyDataRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = visualizerRef.current;
    const analyser = analyserRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const pixelRatio = window.devicePixelRatio || 1;
      const pixelWidth = Math.round(bounds.width * pixelRatio);
      const pixelHeight = Math.round(bounds.height * pixelRatio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);

      const frequencyData = frequencyDataRef.current;
      if (isPlaying && analyser && frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
      }

      const barGap = 4;
      const barWidth = Math.max(2, (bounds.width - barGap * (EQUALIZER_BARS - 1)) / EQUALIZER_BARS);
      const centerY = bounds.height / 2;
      const maxHeight = bounds.height * 0.82;
      const gradient = context.createLinearGradient(0, 0, bounds.width, 0);
      gradient.addColorStop(0, "#bd7c82");
      gradient.addColorStop(0.5, "#9b3e51");
      gradient.addColorStop(1, "#d6aaa2");
      context.fillStyle = gradient;

      for (let index = 0; index < EQUALIZER_BARS; index += 1) {
        const dataIndex = frequencyData
          ? Math.min(frequencyData.length - 1, Math.floor((index / EQUALIZER_BARS) * frequencyData.length * 0.72))
          : -1;
        const liveValue = dataIndex >= 0 && frequencyData ? frequencyData[dataIndex] / 255 : 0;
        const restingValue = 0.11 + Math.abs(Math.sin(index * 0.83)) * 0.12;
        const level = isPlaying && analyser ? liveValue : restingValue;
        const barHeight = Math.max(3, level * maxHeight);
        const x = index * (barWidth + barGap);
        context.beginPath();
        context.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, barWidth / 2);
        context.fill();
      }
    };

    draw();
    if (isPlaying && analyser) {
      const animate = () => {
        draw();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
  }, [isPlaying]);

  async function startVisualizer() {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      setHasLiveVisualizer(false);
      return;
    }

    try {
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      const mediaElement = waveSurferRef.current?.getMediaElement();
      if (!mediaElement) {
        await audioContext.close();
        setHasLiveVisualizer(false);
        return;
      }

      const source = audioContext.createMediaElementSource(mediaElement);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      frequencyDataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      await audioContext.resume();
    } catch {
      setHasLiveVisualizer(false);
    }
  }

  async function togglePlayback() {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer) return;

    if (waveSurfer.isPlaying()) {
      waveSurfer.pause();
      return;
    }

    if (!audioContextRef.current && hasLiveVisualizer) {
      await startVisualizer();
    } else if (audioContextRef.current?.state === "suspended") {
      await audioContextRef.current.resume();
    }

    try {
      await waveSurfer.play();
    } catch {
      setAudioError(true);
    }
  }

  function seekWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer || !duration) return;

    let nextTime: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") nextTime = currentTime + 5;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") nextTime = currentTime - 5;
    if (event.key === "Home") nextTime = 0;
    if (event.key === "End") nextTime = duration;
    if (nextTime === undefined) return;

    event.preventDefault();
    waveSurfer.setTime(Math.max(0, Math.min(duration, nextTime)));
  }

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-5 py-12 text-ink">
      <div className="paper-grain pointer-events-none absolute inset-0 -z-10" />
      <div className="orb orb-one pointer-events-none absolute -left-32 -top-36 -z-10 size-96 rounded-full" />
      <div className="orb orb-two pointer-events-none absolute -bottom-48 -right-32 -z-10 size-[32rem] rounded-full" />

      <Sparkles className="confetti absolute left-[10%] top-[15%] size-7 text-wine/35" aria-hidden="true" />
      <Sparkles className="confetti absolute bottom-[17%] right-[11%] size-5 text-wine/25" aria-hidden="true" />

      <motion.article
        className="gift-card relative w-full max-w-[650px] rounded-[5px] border border-white/80 px-6 py-9 text-center shadow-2xl shadow-[#573a2e]/10 sm:px-14 sm:py-11"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="mb-8 flex items-center justify-center gap-3 text-[10px] font-bold tracking-[0.19em] text-wine uppercase">
          <span className="h-px w-7 bg-[#d8b6b3]" />
          Ein Hochzeitsgeschenk von Herzen
          <span className="h-px w-7 bg-[#d8b6b3]" />
        </div>

        <div className="heart-seal mx-auto mb-4 grid size-12 place-items-center rounded-full text-wine">
          <Heart className="size-6 fill-current" strokeWidth={1.4} aria-hidden="true" />
        </div>
        <p className="mb-2 text-xs tracking-[0.09em] text-muted">Für euren gemeinsamen Weg</p>
        <h1 className="names mb-4 text-[clamp(3.3rem,10vw,4.6rem)] leading-[0.98] tracking-[-0.05em]">
          Kuno <span className="ampersand">&amp;</span>
          <br />
          Tamina
        </h1>
        <p className="mx-auto max-w-[390px] text-[15px] leading-7 text-[#655b55]">
          Für euren großen Tag haben wir ein Lied aufgenommen — mit einer eigenen
          Version, ganz persönlich für euch.
        </p>

        <section className="song-panel mt-8 rounded-[5px] border border-[#eadfd6] p-4 text-left sm:p-5" aria-labelledby="song-title">
          <div className="mb-4 flex items-center gap-3.5">
            <div className={`record-disc grid size-11 shrink-0 place-items-center rounded-full border border-[#e8ced0] bg-[#f3e5e2] ${isPlaying ? "is-spinning" : ""}`} aria-hidden="true">
              <span className="grid size-3.5 place-items-center rounded-full border-[4px] border-[#fffaf6] bg-wine shadow-[0_0_0_1px_#d8b6b3]" />
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 text-[9px] font-bold tracking-[0.16em] text-wine uppercase">Euer Hochzeitslied</p>
              <h2 id="song-title" className="song-title text-lg leading-tight sm:text-[21px]">Ist das noch Punkrock?</h2>
              <p className="mt-1 text-[11px] text-muted">Unsere Version · Original von Die Ärzte</p>
            </div>
            <AudioLines className="ml-auto hidden size-5 shrink-0 text-wine/70 sm:block" aria-hidden="true" />
          </div>

          <div
            ref={waveformRef}
            className="waveform-shell w-full overflow-hidden rounded-md px-1"
            role="slider"
            aria-label="Song-Wellenform"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            aria-valuetext={`${formatTime(currentTime)} von ${formatTime(duration)}`}
            aria-description="Mit Links und Rechts in Fünf-Sekunden-Schritten springen; Pos1 und Ende bewegen zum Anfang oder Ende."
            tabIndex={duration ? 0 : -1}
            onKeyDown={seekWithKeyboard}
          />
          {audioError && <p className="mt-2 text-xs text-wine" role="status">Der Song konnte nicht geladen werden. Bitte lade die Seite erneut.</p>}

          <div className="mt-1 flex items-center justify-between px-1 text-[10px] tabular-nums text-muted" aria-hidden="true">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="visualizer-wrap mt-3 flex items-center gap-2 rounded-md px-3 py-2">
            <AudioLines className="size-4 shrink-0 text-wine/65" aria-hidden="true" />
            <canvas
              ref={visualizerRef}
              className="h-9 min-w-0 flex-1"
              aria-hidden="true"
            />
          </div>
          {!hasLiveVisualizer && (
            <p className="mt-1 text-right text-[10px] text-muted" role="status">Live-Visualisierung auf diesem Gerät nicht verfügbar</p>
          )}

          <div className="mt-3 flex items-center gap-3">
            <motion.button
              type="button"
              onClick={togglePlayback}
              className="play-button grid size-11 shrink-0 place-items-center rounded-full bg-wine text-white shadow-md shadow-wine/20 transition hover:-translate-y-0.5 hover:bg-wine-dark focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-wine"
              aria-label={isPlaying ? "Song pausieren" : "Song abspielen"}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            >
              {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="translate-x-px" />}
            </motion.button>

            <div className="min-w-0 flex-1 text-[11px] text-muted">
              <span>{isPlaying ? "Spielt für euch" : "Zum Anhören auf Play drücken"}</span>
            </div>
          </div>

          <a
            className="download-link mt-4 flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-wine px-4 text-[13px] font-bold text-wine-dark transition hover:bg-wine-dark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-wine"
            href={SONG_URL}
            download="Kumina.mp3"
          >
            <ArrowDownToLine size={17} strokeWidth={1.8} aria-hidden="true" />
            Song herunterladen
          </a>
        </section>

        <section className="letter-section mt-5 overflow-hidden rounded-[5px] border border-[#eadfd6] bg-[#fffaf6] text-left">
          <button
            type="button"
            className="flex min-h-[62px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#fcf2ed] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-wine sm:px-5"
            aria-expanded={isLetterOpen}
            aria-controls="letter-content"
            onClick={() => setIsLetterOpen((open) => !open)}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f3e5e2] text-wine">
              <MailOpen size={17} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold tracking-[0.15em] text-wine uppercase">Noch eine kleine Nachricht</span>
              <span className="mt-0.5 block font-display text-[15px] text-ink">Ein Brief für euch</span>
            </span>
            <motion.span
              animate={{ rotate: isLetterOpen ? 180 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
              className="text-muted"
              aria-hidden="true"
            >
              <ChevronDown size={18} />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {isLetterOpen && (
              <motion.div
                id="letter-content"
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="letter-paper mx-4 mb-4 rounded-[3px] px-5 py-5 sm:mx-5 sm:px-7">
                  <p className="font-display text-sm italic leading-7 text-[#655b55] sm:text-[15px]">
                    Hier kommt eure persönliche Widmung hinein. Ersetzt diesen Platzhalter vor dem Verschenken durch eure eigenen Worte.
                  </p>
                  <p className="mt-4 font-display text-sm text-wine">Mit ganz viel Liebe ♡</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="mt-7 flex items-center justify-center gap-2.5 text-[#766a63]">
          <span className="text-[11px] text-[#bd7c82]" aria-hidden="true">✦</span>
          <p className="dedication-text text-sm italic">Auf euch, auf die Liebe und auf alles, was noch kommt.</p>
          <span className="text-[11px] text-[#bd7c82]" aria-hidden="true">✦</span>
        </div>
      </motion.article>

      <p className="absolute bottom-5 px-4 text-center text-[10px] tracking-[0.08em] text-[#786d67] uppercase">
        Mit Liebe aufgenommen · Für immer auf Repeat
      </p>
    </main>
  );
}
