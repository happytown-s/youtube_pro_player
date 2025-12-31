import { useEffect, useState, useRef } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface PlayerState {
  isPlaying: boolean;
  playbackRate: number;
  cuePoints: (number | null)[];
  videoId: string;
  volume: number;
}

const INITIAL_VIDEO_ID = 'dQw4w9WgXcQ';
const HOT_CUE_KEYS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
];
const FLAT_KEYS = HOT_CUE_KEYS.flat();

function App() {
  const [player, setPlayer] = useState<any>(null);
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    playbackRate: 1.0,
    cuePoints: Array(300).fill(null), // 10 slots * 30 keys = 300
    videoId: INITIAL_VIDEO_ID,
    volume: 100,
  });

  const [slot, setSlot] = useState(0); // 0 to 9

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    function initPlayer() {
      new window.YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: INITIAL_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            event.target.setVolume(stateRef.current.volume);
          },
          onStateChange: (event: any) => {
            setState(s => ({ ...s, isPlaying: event.data === window.YT.PlayerState.PLAYING }));
          }
        },
      });
    }
  }, []);

  const handleHotCue = (index: number) => {
    if (!player) return;
    const currentState = stateRef.current;
    const currentCue = currentState.cuePoints[index];

    if (currentCue === null) {
      const currentTime = player.getCurrentTime();
      setState(s => {
        const newCues = [...s.cuePoints];
        newCues[index] = currentTime;
        return { ...s, cuePoints: newCues };
      });
    } else {
      player.seekTo(currentCue, true);
      if (!currentState.isPlaying) {
        player.playVideo();
      }
    }
  };

  const handleClearCue = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setState(s => {
      const newCues = [...s.cuePoints];
      newCues[index] = null;
      return { ...s, cuePoints: newCues };
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();

      // Slot Selection (1-0 keys)
      const slotKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
      const slotIndex = slotKeys.indexOf(key);
      if (slotIndex !== -1) {
        setSlot(slotIndex);
        return;
      }

      // Hot Cues
      const keyIndex = FLAT_KEYS.indexOf(key);
      if (keyIndex !== -1) {
        handleHotCue(slot * 30 + keyIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, slot]);

  const handlePlayPause = () => {
    if (!player) return;
    if (state.isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handlePitchChange = (rate: number) => {
    if (!player) return;
    player.setPlaybackRate(rate);
    setState(s => ({ ...s, playbackRate: rate }));
  };

  const handleVolumeChange = (vol: number) => {
    if (!player) return;
    player.setVolume(vol);
    setState(s => ({ ...s, volume: vol }));
  };

  const handleLoadVideo = (url: string) => {
    if (!player) return;
    const videoId = extractVideoId(url);
    if (videoId) {
      player.loadVideoById(videoId);
      setState(s => ({ ...s, videoId, isPlaying: false, cuePoints: Array(300).fill(null) }));
    }
  };

  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : (url.length === 11 ? url : null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-4 md:p-8 flex flex-col items-center">
      <header className="mb-12 flex flex-row items-center justify-center gap-6">
        <div className="relative w-16 h-16 md:w-20 md:h-20 group">
          <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl animate-pulse group-hover:bg-blue-500/40 transition-all"></div>
          <img
            src="/logo.png"
            alt="PRO PLAYER LOGO"
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)] border border-white/20 rounded-full bg-black/40 backdrop-blur-sm"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-red-400 italic">
            YOUTUBE PRO PLAYER
          </h1>
          <p className="text-neutral-500 text-[9px] md:text-xs uppercase tracking-[0.4em] font-bold translate-y-[-4px]">Unified Professional Workspace</p>
        </div>
      </header>

      <main className="w-full max-w-6xl flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
          <Deck
            player={player}
            state={state}
            currentSlot={slot}
            onSlotChange={setSlot}
            onPlayPause={handlePlayPause}
            onHotCue={(idx) => handleHotCue(idx)}
            onClearCue={(idx, e) => handleClearCue(idx, e)}
            onPitchChange={handlePitchChange}
            onVolumeChange={handleVolumeChange}
            onLoadUrl={handleLoadVideo}
          />
        </div>
      </main>
    </div>
  );
}

interface DeckProps {
  player: any;
  state: PlayerState;
  currentSlot: number;
  onSlotChange: (slot: number) => void;
  onPlayPause: () => void;
  onHotCue: (idx: number) => void;
  onClearCue: (idx: number, e: React.MouseEvent) => void;
  onPitchChange: (val: number) => void;
  onVolumeChange: (val: number) => void;
  onLoadUrl: (url: string) => void;
}

function Deck({ player, state, currentSlot, onSlotChange, onPlayPause, onHotCue, onClearCue, onPitchChange, onVolumeChange, onLoadUrl }: DeckProps) {
  const [url, setUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      setCurrentTime(player.getCurrentTime() || 0);
      setDuration(player.getDuration() || 0);
    }, 100);
    return () => clearInterval(interval);
  }, [player]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!player) return;
    const time = parseFloat(e.target.value);
    player.seekTo(time, true);
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / Math.max(1, 60));
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cueColor = 'bg-indigo-900/80 text-indigo-200 border-indigo-700';

  return (
    <div className="flex flex-col gap-8">
      {/* Video & Seek */}
      <div className="bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl p-6 flex flex-col gap-6">
        <div className="aspect-video bg-black rounded-xl overflow-hidden relative group">
          <div id="player" className="w-full h-full"></div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[11px] font-mono font-black text-neutral-500 tracking-tighter">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={duration}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* Left Side: Cues and Controls */}
        <div className="flex flex-col gap-8">
          {/* Slot Selection */}
          <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 flex flex-col gap-3">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] italic px-1">Cue Slots</label>
            <div className="grid grid-cols-10 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num, i) => (
                <button
                  key={num}
                  onClick={() => onSlotChange(i)}
                  className={`
                    h-12 rounded-xl text-sm font-black transition-all border
                    ${currentSlot === i
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] scale-105'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:text-neutral-300 hover:border-neutral-500'}
                  `}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Hot Cue Grid */}
          <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-8 shadow-2xl">
            <div className="flex flex-col gap-3 mb-6">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] italic px-1">Hot Cue Keys</label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {HOT_CUE_KEYS.map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-10 gap-2">
                  {row.map((key) => {
                    const flatIdx = FLAT_KEYS.indexOf(key);
                    const globalIdx = currentSlot * 30 + flatIdx;
                    const cp = state.cuePoints[globalIdx];
                    return (
                      <button
                        key={key}
                        onClick={() => onHotCue(globalIdx)}
                        className={`
                          relative h-16 rounded-xl border text-xl font-black transition-all duration-200 active:scale-95
                          flex items-center justify-center group/cue
                          ${cp !== null ? `${cueColor} border-opacity-100 shadow-xl` : 'bg-neutral-800 border-neutral-700 text-neutral-600 border-dashed hover:border-neutral-500'}
                        `}
                      >
                        <span className="uppercase">{key}</span>
                        {cp !== null && (
                          <span
                            onClick={(e) => onClearCue(globalIdx, e)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-white text-black text-[10px] rounded-full flex items-center justify-center opacity-0 group-hover/cue:opacity-100 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 cursor-pointer shadow-xl z-20"
                          >
                            ×
                          </span>
                        )}
                        {cp !== null && (
                          <div className="absolute bottom-1.5 text-[8px] font-mono font-bold opacity-60">
                            {formatTime(cp)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Playback Controls & Load */}
        <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-8 flex flex-col gap-8 shadow-2xl">
          {/* Main Playback */}
          <button
            onClick={onPlayPause}
            className={`w-full h-24 rounded-3xl font-black text-2xl shadow-xl active:scale-95 transition-all border-b-8 border-black/30 flex items-center justify-center gap-4 ${state.isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {state.isPlaying ? (
              <>
                <span className="text-3xl">❙❙</span>
                <span className="tracking-[0.2em]">PAUSE</span>
              </>
            ) : (
              <>
                <span className="text-3xl ml-2">▶</span>
                <span className="tracking-[0.2em]">PLAY</span>
              </>
            )}
          </button>

          {/* Volume Vertical Fader */}
          <div className="flex-1 bg-neutral-800/50 rounded-3xl p-6 flex flex-col items-center gap-4 border border-white/5">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest italic">Volume</label>
            <div className="flex-1 w-full flex flex-col items-center justify-center gap-4 relative">
              <input
                type="range"
                min="0"
                max="100"
                value={state.volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-48 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neutral-200 -rotate-90 origin-center absolute"
              />
              <div className="mt-48 text-xl font-black text-neutral-400 font-mono tracking-tighter">
                {Math.round(state.volume)}%
              </div>
            </div>
          </div>

          {/* Tempo Controls */}
          <div className="bg-neutral-800/50 rounded-2xl p-4 flex flex-col gap-3 border border-white/5">
            <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase tracking-widest italic">
              <span>Tempo</span>
              <span className="text-blue-400 font-black">{state.playbackRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="2.0"
              step="0.05"
              value={state.playbackRate}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neutral-300"
            />
          </div>

          {/* Load URL */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] italic px-1">Source URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="YouTube URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-neutral-600"
              />
              <button
                onClick={() => onLoadUrl(url)}
                className="bg-neutral-700 hover:bg-neutral-600 text-white px-6 py-3 rounded-xl text-xs font-black transition-all border border-neutral-600"
              >
                LOAD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
