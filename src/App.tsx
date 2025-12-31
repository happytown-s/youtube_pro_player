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

const INITIAL_VIDEO_ID_A = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up
const INITIAL_VIDEO_ID_B = 'L_jWHffIx5E'; // Smash Mouth - All Star

function App() {
  const [playerA, setPlayerA] = useState<any>(null);
  const [playerB, setPlayerB] = useState<any>(null);
  const [crossfader, setCrossfader] = useState<number>(0); // -1 to 1

  const [stateA, setStateA] = useState<PlayerState>({
    isPlaying: false,
    playbackRate: 1.0,
    cuePoints: Array(45).fill(null),
    videoId: INITIAL_VIDEO_ID_A,
    volume: 100,
  });

  const [stateB, setStateB] = useState<PlayerState>({
    isPlaying: false,
    playbackRate: 1.0,
    cuePoints: Array(45).fill(null),
    videoId: INITIAL_VIDEO_ID_B,
    volume: 100,
  });

  // スロット選択状態 (0, 1, 2)
  const [slotA, setSlotA] = useState(0);
  const [slotB, setSlotB] = useState(0);

  // Refs to access latest state in event handlers without stale closures or side-effects in setState
  const stateARef = useRef(stateA);
  const stateBRef = useRef(stateB);

  useEffect(() => {
    stateARef.current = stateA;
  }, [stateA]);

  useEffect(() => {
    stateBRef.current = stateB;
  }, [stateB]);

  useEffect(() => {
    // Load YouTube API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayers();
      };
    } else {
      initPlayers();
    }

    function initPlayers() {
      new window.YT.Player('player-a', {
        height: '100%',
        width: '100%',
        videoId: INITIAL_VIDEO_ID_A,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => setPlayerA(event.target),
          onStateChange: (event: any) => {
            setStateA(s => ({ ...s, isPlaying: event.data === window.YT.PlayerState.PLAYING }));
          }
        },
      });

      new window.YT.Player('player-b', {
        height: '100%',
        width: '100%',
        videoId: INITIAL_VIDEO_ID_B,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => setPlayerB(event.target),
          onStateChange: (event: any) => {
            setStateB(s => ({ ...s, isPlaying: event.data === window.YT.PlayerState.PLAYING }));
          }
        },
      });
    }
  }, []);

  // Update Volumes based on Crossfader
  useEffect(() => {
    if (playerA) {
      const volA = crossfader > 0 ? (1 - crossfader) * 100 : 100;
      playerA.setVolume(volA);
      setStateA(s => ({ ...s, volume: volA }));
    }
    if (playerB) {
      const volB = crossfader < 0 ? (1 + crossfader) * 100 : 100;
      playerB.setVolume(volB);
      setStateB(s => ({ ...s, volume: volB }));
    }
  }, [crossfader, playerA, playerB]);

  const handleHotCue = (deck: 'A' | 'B', index: number) => {
    const setState = deck === 'A' ? setStateA : setStateB;
    const player = deck === 'A' ? playerA : playerB;
    // Use ref to get the latest state without relying on setState functional update for side effects
    const currentState = deck === 'A' ? stateARef.current : stateBRef.current;

    if (!player) return;

    const currentCue = currentState.cuePoints[index];

    if (currentCue === null) {
      // Set Cue Point (Current Time)
      const currentTime = player.getCurrentTime();
      setState(s => {
        const newCues = [...s.cuePoints];
        newCues[index] = currentTime;
        return { ...s, cuePoints: newCues };
      });
    } else {
      // Jump and Play
      player.seekTo(currentCue, true);
      if (!currentState.isPlaying) {
        player.playVideo();
      }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();

      // Slot Selection
      if (key === '1') setSlotA(0);
      if (key === '2') setSlotA(1);
      if (key === '3') setSlotA(2);
      if (key === '7') setSlotB(0);
      if (key === '8') setSlotB(1);
      if (key === '9') setSlotB(2);

      // Deck A (Left Side): 3 rows of 5
      const deckAKeys = [
        'q', 'w', 'e', 'r', 't', // Top row (0-4)
        'a', 's', 'd', 'f', 'g', // Mid row (5-9)
        'z', 'x', 'c', 'v', 'b'  // Bot row (10-14)
      ];
      const indexA = deckAKeys.indexOf(key);
      if (indexA !== -1) {
        // スロットオフセットを追加
        handleHotCue('A', slotA * 15 + indexA);
      }

      // Deck B (Right Side): 3 rows of 5
      const deckBKeys = [
        'y', 'u', 'i', 'o', 'p', // Top row (0-4)
        'h', 'j', 'k', 'l', ';', // Mid row (5-9)
        'n', 'm', ',', '.', '/'  // Bot row (10-14)
      ];
      const indexB = deckBKeys.indexOf(key);
      if (indexB !== -1) {
        // スロットオフセットを追加
        handleHotCue('B', slotB * 15 + indexB);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerA, playerB, slotA, slotB]);

  const handlePlayPause = (deck: 'A' | 'B') => {
    const player = deck === 'A' ? playerA : playerB;
    const state = deck === 'A' ? stateA : stateB;
    if (!player) return;

    if (state.isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleClearCue = (deck: 'A' | 'B', index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const setState = deck === 'A' ? setStateA : setStateB;
    const state = deck === 'A' ? stateA : stateB;
    const newCues = [...state.cuePoints];
    newCues[index] = null;
    setState(s => ({ ...s, cuePoints: newCues }));
  };

  const handlePitchChange = (deck: 'A' | 'B', rate: number) => {
    const player = deck === 'A' ? playerA : playerB;
    const setState = deck === 'A' ? setStateA : setStateB;
    if (!player) return;

    player.setPlaybackRate(rate);
    setState(s => ({ ...s, playbackRate: rate }));
  };

  const handleLoadUrl = (deck: 'A' | 'B', url: string) => {
    const player = deck === 'A' ? playerA : playerB;
    const setState = deck === 'A' ? setStateA : setStateB;
    if (!player) return;

    const videoId = extractVideoId(url);
    if (videoId) {
      player.loadVideoById(videoId);
      setState(s => ({ ...s, videoId, isPlaying: false, cuePoints: Array(45).fill(null) }));
    }
  };

  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
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
            alt="PRO DJ LOGO"
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)] border border-white/20 rounded-full bg-black/40 backdrop-blur-sm"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-red-400 italic">
            YOUTUBE DJ PRO
          </h1>
          <p className="text-neutral-500 text-[9px] md:text-xs uppercase tracking-[0.4em] font-bold translate-y-[-4px]">Professional Mixing Interface</p>
        </div>
      </header>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* DECK A */}
        <Deck
          name="DECK A"
          color="blue"
          playerId="player-a"
          state={stateA}
          currentSlot={slotA}
          onSlotChange={setSlotA}
          onPlayPause={() => handlePlayPause('A')}
          onHotCue={(idx) => handleHotCue('A', slotA * 15 + idx)}
          onClearCue={(idx, e) => handleClearCue('A', slotA * 15 + idx, e)}
          onPitchChange={(val) => handlePitchChange('A', val)}
          onLoadUrl={(url) => handleLoadUrl('A', url)}
        />

        {/* DECK B */}
        <Deck
          name="DECK B"
          color="red"
          playerId="player-b"
          state={stateB}
          currentSlot={slotB}
          onSlotChange={setSlotB}
          onPlayPause={() => handlePlayPause('B')}
          onHotCue={(idx) => handleHotCue('B', slotB * 15 + idx)}
          onClearCue={(idx, e) => handleClearCue('B', slotB * 15 + idx, e)}
          onPitchChange={(val) => handlePitchChange('B', val)}
          onLoadUrl={(url) => handleLoadUrl('B', url)}
        />
      </div>

      {/* MIXER SECTION */}
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <label className="text-xs font-bold tracking-widest text-neutral-500 uppercase italic">Crossfader</label>
          <div className="w-full flex items-center gap-4">
            <span className="text-xs text-blue-500 font-black">A</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={crossfader}
              onChange={(e) => setCrossfader(parseFloat(e.target.value))}
              className="flex-1 h-3 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-200"
            />
            <span className="text-xs text-red-500 font-black">B</span>
          </div>
          <div className="flex justify-between w-full px-2 text-[10px] text-neutral-600 font-mono">
            <span>FULL DECK A</span>
            <span>BALANCE</span>
            <span>FULL DECK B</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeckProps {
  name: string;
  color: 'blue' | 'red';
  playerId: string;
  state: PlayerState;
  currentSlot: number;
  onSlotChange: (slot: number) => void;
  onPlayPause: () => void;
  onHotCue: (idx: number) => void;
  onClearCue: (idx: number, e: React.MouseEvent) => void;
  onPitchChange: (val: number) => void;
  onLoadUrl: (url: string) => void;
}

function Deck({ name, color, playerId, state, currentSlot, onSlotChange, onPlayPause, onHotCue, onClearCue, onPitchChange, onLoadUrl }: DeckProps) {
  const [url, setUrl] = useState('');
  const borderColor = color === 'blue' ? 'border-blue-900/50' : 'border-red-900/50';
  const glowColor = color === 'blue' ? 'shadow-blue-500/10' : 'shadow-red-500/10';
  const accentColor = color === 'blue' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500';
  const textColor = color === 'blue' ? 'text-blue-500' : 'text-red-500';
  const cueColor = color === 'blue' ? 'bg-blue-900/80 text-blue-200 border-blue-700' : 'bg-red-900/80 text-red-200 border-red-700';

  return (
    <div className={`bg-neutral-900 rounded-3xl overflow-hidden border ${borderColor} shadow-2xl ${glowColor} flex flex-col`}>
      {/* Player Display */}
      <div className="aspect-video bg-black relative group">
        <div id={playerId} className="w-full h-full"></div>
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          <span className={`text-[10px] font-black tracking-widest ${textColor}`}>{name}</span>
        </div>
      </div>

      {/* Deck Controls */}
      <div className="p-6 flex flex-col gap-6">
        {/* Hot Cues */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest italic">Hot Cues</label>
            <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
              {['A', 'B', 'C'].map((slotName, i) => (
                <button
                  key={slotName}
                  onClick={() => onSlotChange(i)}
                  className={`
                    px-2 py-0.5 text-[9px] font-black rounded-md transition-all
                    ${currentSlot === i
                      ? (color === 'blue' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-red-600 text-white shadow-lg shadow-red-500/20')
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}
                  `}
                >
                  SLOT {slotName}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {state.cuePoints.slice(currentSlot * 15, (currentSlot + 1) * 15).map((cp, i) => (
              <button
                key={i}
                onClick={() => onHotCue(i)}
                className={`
                    relative h-11 rounded-lg border text-[13px] font-black transition-all duration-200 active:scale-90
                    hover:brightness-110 group/cue
                    ${cp !== null ? `${cueColor} border-opacity-100 shadow-[0_0_10px_rgba(0,0,0,0.3)]` : 'bg-neutral-800 border-neutral-700 text-neutral-600 border-dashed hover:border-neutral-500'}
                  `}
              >
                <span className="relative z-10">{i + 1 + currentSlot * 15}</span>
                {cp !== null && (
                  <span
                    onClick={(e) => onClearCue(i, e)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-neutral-100 text-black text-[9px] rounded-full flex items-center justify-center opacity-0 group-hover/cue:opacity-100 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 cursor-pointer shadow-lg z-20"
                  >
                    ×
                  </span>
                )}
                {cp !== null && (
                  <div className="absolute bottom-1 left-0 right-0 text-[7px] opacity-70 font-mono tracking-tighter leading-none">
                    {cp.toFixed(1)}s
                  </div>
                )}
                {/* Visual feedback glow for set state */}
                {cp !== null && (
                  <div className={`absolute inset-0 rounded-lg opacity-10 group-hover/cue:opacity-30 transition-opacity ${color === 'blue' ? 'bg-blue-400' : 'bg-red-400'}`}></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* URL Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste YouTube ID or URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-neutral-500 transition-colors placeholder:text-neutral-600"
          />
          <button
            onClick={() => onLoadUrl(url)}
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2 rounded-xl text-xs font-black transition-all border border-neutral-700"
          >
            LOAD
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Main Controls */}
          <div className="flex gap-3">
            <button
              onClick={onPlayPause}
              className={`${accentColor} text-white flex-1 rounded-2xl h-16 font-black text-xl shadow-lg active:scale-95 transition-all border-b-4 border-black/20 flex items-center justify-center gap-3`}
            >
              {state.isPlaying ? (
                <>
                  <span className="text-2xl">❙❙</span>
                  <span className="text-sm tracking-widest">PAUSE</span>
                </>
              ) : (
                <>
                  <span className="text-2xl ml-1">▶</span>
                  <span className="text-sm tracking-widest">PLAY</span>
                </>
              )}
            </button>
          </div>

          {/* Pitch Control */}
          <div className="bg-neutral-800/50 rounded-2xl p-4 flex flex-col justify-center gap-2 border border-neutral-700/50">
            <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase tracking-widest italic">
              <span>Tempo</span>
              <span className={textColor}>{state.playbackRate.toFixed(2)}x</span>
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
        </div>

        {/* Status Bar */}
        <div className="flex justify-between items-center bg-black/40 rounded-xl px-4 py-3 border border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${state.isPlaying ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'}`}></div>
            <span className="text-[9px] font-black font-mono text-neutral-400 uppercase tracking-wider">{state.isPlaying ? 'ON DECK' : 'STANDBY'}</span>
          </div>
          <div className="flex gap-4 text-[9px] font-mono font-bold text-neutral-500">
            <span>GAIN: <span className="text-neutral-300">{Math.round(state.volume)}%</span></span>
            <span>VIDEO: <span className="text-neutral-300">{state.videoId}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
