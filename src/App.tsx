import { useEffect, useState, useRef, useCallback } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: new (elementId: string, options: Record<string, unknown>) => void;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
        ENDED: number;
      };
    };
  }
}

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (suggestedRate: number) => void;
  loadVideoById: (videoId: string) => void;
}

interface PlayerState {
  isPlaying: boolean;
  playbackRate: number;
  cuePoints: (number | null)[];
  videoId: string;
  volume: number;
  isGateMode: boolean;
}

const INITIAL_VIDEO_ID = 'dQw4w9WgXcQ';
const HOT_CUE_KEYS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
];
const FLAT_KEYS = HOT_CUE_KEYS.flat();

const STORAGE_KEY = 'youtube_pro_player_data_v1';

function App() {
  const [player, setPlayer] = useState<YTPlayer | null>(null);

  // Initialize state from LocalStorage if available
  const [state, setState] = useState<PlayerState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          isPlaying: false, // Always start paused
          playbackRate: parsed.playbackRate || 1.0,
          volume: parsed.volume || 100,
          isGateMode: parsed.isGateMode || false,
        };
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }
    return {
      isPlaying: false,
      playbackRate: 1.0,
      cuePoints: Array(300).fill(null),
      videoId: INITIAL_VIDEO_ID,
      volume: 100,
      isGateMode: false,
    };
  });

  const [slot, setSlot] = useState(0); // 0 to 9
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
    // Auto-save to LocalStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      videoId: state.videoId,
      cuePoints: state.cuePoints,
      playbackRate: state.playbackRate,
      volume: state.volume,
      isGateMode: state.isGateMode
    }));
  }, [state]);

  const playerRef = useRef<YTPlayer | null>(null);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    document.title = "YouTube Pro Player";
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
        videoId: stateRef.current.videoId, // Use saved videoId
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: { target: YTPlayer }) => {
            setPlayer(event.target);
            event.target.setVolume(stateRef.current.volume);
          },
          onStateChange: (event: { data: number }) => {
            setState(s => ({ ...s, isPlaying: event.data === window.YT.PlayerState.PLAYING }));
          }
        },
      });
    }
  }, []);

  const handleHotCue = useCallback((index: number) => {
    const p = playerRef.current;
    if (!p) return;
    const currentState = stateRef.current;
    const currentCue = currentState.cuePoints[index];

    if (currentCue === null) {
      const currentTime = p.getCurrentTime();
      setState(s => {
        const newCues = [...s.cuePoints];
        newCues[index] = currentTime;
        return { ...s, cuePoints: newCues };
      });
    } else {
      p.seekTo(currentCue, true);
      p.playVideo();
    }
  }, []);

  const handleClearCue = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setState(s => {
      const newCues = [...s.cuePoints];
      newCues[index] = null;
      return { ...s, cuePoints: newCues };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;

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
        const globalIdx = slot * 30 + keyIndex;
        if (stateRef.current.isGateMode && stateRef.current.cuePoints[globalIdx] !== null) {
          setActiveKey(key);
        }
        handleHotCue(globalIdx);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (stateRef.current.isGateMode && key === activeKey) {
        const p = playerRef.current;
        if (p) {
          p.pauseVideo();
        }
        setActiveKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [slot, activeKey, handleHotCue]);

  const handlePlayPause = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (stateRef.current.isPlaying) {
      p.pauseVideo();
    } else {
      p.playVideo();
    }
  }, []);

  const handlePitchChange = useCallback((rate: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.setPlaybackRate(rate);
    setState(s => ({ ...s, playbackRate: rate }));
  }, []);

  const handleVolumeChange = useCallback((vol: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(vol);
    setState(s => ({ ...s, volume: vol }));
  }, []);

  const handleGateModeToggle = useCallback(() => {
    setState(s => ({ ...s, isGateMode: !s.isGateMode }));
  }, []);

  const extractVideoId = useCallback((url: string) => {
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/ \s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : (url.length === 11 ? url : null);
  }, []);

  const handleLoadVideo = useCallback((url: string) => {
    const p = playerRef.current;
    if (!p) return;
    const videoId = extractVideoId(url);
    if (videoId) {
      p.loadVideoById(videoId);
      setState(s => ({ ...s, videoId, isPlaying: false, cuePoints: Array(300).fill(null) }));
    }
  }, [extractVideoId]);

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

      <main className="w-full max-w-[1600px] flex flex-col gap-8">
        <Deck
          state={state}
          currentSlot={slot}
          onSlotChange={setSlot}
          onPlayPause={handlePlayPause}
          onHotCue={handleHotCue}
          onClearCue={handleClearCue}
          onPitchChange={handlePitchChange}
          onVolumeChange={handleVolumeChange}
          onGateModeToggle={handleGateModeToggle}
          onLoadUrl={handleLoadVideo}
          player={player}
        />
      </main>
    </div>
  );
}

interface DeckProps {
  state: PlayerState;
  currentSlot: number;
  onSlotChange: (slot: number) => void;
  onPlayPause: () => void;
  onHotCue: (idx: number) => void;
  onClearCue: (idx: number, e: React.MouseEvent) => void;
  onPitchChange: (val: number) => void;
  onVolumeChange: (val: number) => void;
  onGateModeToggle: () => void;
  onLoadUrl: (url: string) => void;
  player: YTPlayer | null;
}

function Deck({ state, currentSlot, onSlotChange, onPlayPause, onHotCue, onClearCue, onPitchChange, onVolumeChange, onGateModeToggle, onLoadUrl, player }: DeckProps) {
  const [url, setUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastSeekTime = useRef(0);

  // Sync current time from player
  useEffect(() => {
    if (!player || isDragging) return;
    const interval = setInterval(() => {
      // Don't sync for 1 second after a seek to prevent snap-back
      if (Date.now() - lastSeekTime.current < 1000) return;

      const time = player.getCurrentTime() || 0;
      setCurrentTime(time);
      setDuration(player.getDuration() || 0);
    }, 100);
    return () => clearInterval(interval);
  }, [player, isDragging]);

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const handleSeekEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (player) {
      const time = parseFloat(e.target.value);
      player.seekTo(time, true);
      setCurrentTime(time); // Optimistically set time
    }
    lastSeekTime.current = Date.now(); // Mark the seek time
    setIsDragging(false);
    e.currentTarget.blur();
  };

  const preventFocus = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / Math.max(1, 60));
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cueColor = 'bg-indigo-900/80 text-indigo-200 border-indigo-700';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-8 items-start">
      {/* LEFT COLUMN: Video & Timeline */}
      <div className="flex flex-col gap-6 sticky top-8">
        {/* Load Section */}
        <div className="bg-neutral-900 rounded-[2rem] border border-neutral-800 p-6 flex flex-col gap-4 shadow-xl">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] italic px-2">Video Source</label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter YouTube URL or ID..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-neutral-800 border border-neutral-700/50 rounded-2xl px-6 py-4 text-base focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-neutral-600 font-medium"
            />
            <button
              onMouseDown={preventFocus}
              onClick={() => onLoadUrl(url)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-sm font-black transition-all border-b-4 border-indigo-800 shadow-lg active:translate-y-1 active:border-b-0"
            >
              LOAD
            </button>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-[2.5rem] overflow-hidden border border-neutral-800 shadow-2xl p-4 md:p-8 flex flex-col gap-8 relative">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div id="player" className="w-full h-full"></div>
            {/* Focus Protection Layer */}
            <div className="absolute inset-0 z-20 cursor-default" onMouseDown={preventFocus}></div>
          </div>

          <div className="flex flex-col gap-4 px-2">
            <div className="flex justify-between text-xs font-mono font-black text-neutral-400 tracking-widest uppercase">
              <div className="flex items-center gap-3">
                <span className="bg-neutral-800 px-3 py-1 rounded-full text-blue-400 border border-white/5">CURRENT</span>
                <span className="text-lg text-neutral-200">{formatTime(currentTime)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg text-neutral-500">{formatTime(duration)}</span>
                <span className="bg-neutral-800 px-3 py-1 rounded-full border border-white/5">TOTAL</span>
              </div>
            </div>
            <div className="relative group/seek h-8 flex items-center">
              <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover/seek:bg-blue-500/10 transition-all rounded-full pointer-events-none"></div>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={currentTime}
                onMouseDown={handleSeekStart}
                onInput={handleSeekChange}
                onChange={handleSeekEnd}
                className="w-full h-2 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-blue-500 relative z-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Professional Control Surface */}
      <div className="flex flex-col gap-8">
        {/* Top Control Bar: Play, Tempo, Volume */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-4">
          <div className="flex flex-col gap-4 min-w-[300px]">
            <button
              onMouseDown={preventFocus}
              onClick={onPlayPause}
              className={`h-24 rounded-[2rem] font-black text-3xl shadow-2xl active:scale-95 transition-all border-b-[8px] border-black/30 flex items-center justify-center gap-6 ${state.isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
              {state.isPlaying ? (
                <><span className="text-3xl text-white/90">❙❙</span><span className="tracking-[0.2em] translate-y-0.5">STOP</span></>
              ) : (
                <><span className="text-3xl text-white/90">▶</span><span className="tracking-[0.2em] translate-y-0.5">START</span></>
              )}
            </button>
            <button
              onMouseDown={preventFocus}
              onClick={onGateModeToggle}
              className={`h-16 rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95 transition-all border-b-[4px] border-black/30 flex items-center justify-center gap-4 ${state.isGateMode ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-500 border-neutral-700'}`}
            >
              <div className={`w-3 h-3 rounded-full animate-pulse ${state.isGateMode ? 'bg-emerald-300' : 'bg-neutral-600'}`}></div>
              <span className="tracking-[0.2em]">GATE MODE: {state.isGateMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Compact Tempo */}
          <div className="bg-neutral-900 rounded-[2rem] border border-neutral-800 p-6 flex flex-col justify-between w-40 shadow-xl">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest italic mb-1">Tempo</span>
              <span className="text-2xl font-black text-blue-400 font-mono italic">{state.playbackRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="2.0"
              step="0.05"
              value={state.playbackRate}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              onMouseUp={(e) => e.currentTarget.blur()}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Volume Vertical */}
          <div className="bg-neutral-900 rounded-[2rem] border border-neutral-800 p-6 flex flex-col items-center gap-4 w-32 shadow-xl relative">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest italic">Gain</span>
            <div className="flex-1 w-full flex items-center justify-center relative min-h-[120px]">
              <input
                type="range"
                min="0"
                max="100"
                value={state.volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                onMouseUp={(e) => e.currentTarget.blur()}
                className="w-24 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-200 -rotate-90 origin-center absolute"
              />
            </div>
            <span className="text-lg font-black text-neutral-400 font-mono">{Math.round(state.volume)}%</span>
          </div>
        </div>

        {/* Slot Selection */}
        <div className="bg-neutral-900 rounded-[2rem] border border-neutral-800 p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4 px-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] italic">Workspace Slots</label>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active: {currentSlot === 9 ? 0 : currentSlot + 1}</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num, i) => (
              <button
                key={num}
                onMouseDown={preventFocus}
                onClick={() => onSlotChange(i)}
                className={`
                  h-14 rounded-2xl text-lg font-black transition-all border-2
                  ${currentSlot === i
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-105 z-10'
                    : 'bg-neutral-800 border-neutral-700/50 text-neutral-500 hover:text-neutral-300 hover:border-neutral-500'}
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Hot Cue Large Grid */}
        <div className="bg-neutral-900 rounded-[2.5rem] border border-neutral-800 p-8 shadow-2xl flex flex-col gap-6">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] italic px-2">Cue Command Center</label>
          <div className="flex flex-col gap-3">
            {HOT_CUE_KEYS.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-10 gap-3">
                {row.map((key) => {
                  const flatIdx = FLAT_KEYS.indexOf(key);
                  const globalIdx = currentSlot * 30 + flatIdx;
                  const cp = state.cuePoints[globalIdx];
                  return (
                    <button
                      key={key}
                      onMouseDown={preventFocus}
                      onClick={() => onHotCue(globalIdx)}
                      className={`
                        relative h-20 rounded-2xl border-2 text-2xl font-black transition-all duration-200 active:scale-95
                        flex items-center justify-center group/cue overflow-hidden
                        ${cp !== null ? `${cueColor} border-opacity-100 shadow-xl scale-[1.02] z-10` : 'bg-neutral-800/50 border-neutral-700/30 text-neutral-600 border-dashed hover:border-neutral-500 hover:bg-neutral-800'}
                      `}
                    >
                      <span className="uppercase relative z-10">{key}</span>
                      {cp !== null && (
                        <>
                          <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
                          <span
                            onMouseDown={preventFocus}
                            onClick={(e) => onClearCue(globalIdx, e)}
                            className="absolute top-1 right-1 w-6 h-6 bg-white text-black text-[12px] rounded-full flex items-center justify-center opacity-0 group-hover/cue:opacity-100 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 cursor-pointer shadow-2xl z-20"
                          >
                            ×
                          </span>
                          <div className="absolute bottom-2 text-[10px] font-mono font-black text-indigo-300/80 tracking-tighter">
                            {formatTime(cp)}
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
