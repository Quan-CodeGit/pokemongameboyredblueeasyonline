import React, { useState, useEffect, useRef } from 'react';

const PokemonGame = () => {
  const [gameState, setGameState] = useState('intro');
  const [playerPokemon, setPlayerPokemon] = useState(null);
  const [wildPokemon, setWildPokemon] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [potionUsed, setPotionUsed] = useState(false);
  const [pokedex, setPokedex] = useState([]);
  const [battlesWon, setBattlesWon] = useState(0);
  const [availableTeam, setAvailableTeam] = useState([]);
  const [isEvolving, setIsEvolving] = useState(false);
  const [spriteCache, setSpriteCache] = useState({});
  const [isPoisoned, setIsPoisoned] = useState({ player: false, enemy: false });
  const [isSleeping, setIsSleeping] = useState({ player: 0, enemy: 0 }); // turns remaining
  const [introMusicPlaying, setIntroMusicPlaying] = useState(false);
  const [selectedStarterIndex, setSelectedStarterIndex] = useState(0);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(0);
  const [selectedActionIndex, setSelectedActionIndex] = useState(0); // 0-3: moves, 4: potion, 5: catch, 6: switch
  const [displayMode, setDisplayMode] = useState(() => {
    // Load from localStorage, or auto-detect from screen width
    const saved = localStorage.getItem('pokemonGameDisplayMode');
    if (saved) return saved;
    return window.innerWidth <= 768 ? 'mobile' : 'pc';
  });
  const [audioVolume, setAudioVolume] = useState(() => {
    // Load from localStorage or default to 'high'
    return localStorage.getItem('pokemonGameAudioVolume') || 'high';
  });
  const [debugMode, setDebugMode] = useState(() => {
    // Load from localStorage or default to false
    return localStorage.getItem('pokemonGameDebugMode') === 'true';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [quickMenuFocused, setQuickMenuFocused] = useState(false);
  const [quickMenuIndex, setQuickMenuIndex] = useState(0); // 0: Settings, 1: How to Play, 2: Debug
  const [settingsIndex, setSettingsIndex] = useState(0); // 0-1: Display, 2-4: Audio, 5-6: Debug, 7: Close
  const [difficulty, setDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'
  const [selectedDifficultyIndex, setSelectedDifficultyIndex] = useState(1); // 0: Easy, 1: Medium, 2: Hard

  const [rocketPhase, setRocketPhase] = useState(''); // '', 'intro', 'walking', 'grabbing', 'leaving', 'done'
  const [stolenPokemonIndex, setStolenPokemonIndex] = useState(-1);

  // Use ref to track Mewtwo spawn - bypasses React state timing issues
  const shouldSpawnMewtwo = useRef(false);
  const hasDefeatedMewtwo = useRef(false);
  const introMusicRef = useRef(null);
  const nextRocketBattle = useRef(Math.floor(Math.random() * 4) + 7); // first rocket at battle 7-10
  const totalBattles = useRef(0);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pokemonGameDisplayMode', displayMode);
  }, [displayMode]);

  useEffect(() => {
    localStorage.setItem('pokemonGameAudioVolume', audioVolume);
  }, [audioVolume]);

  useEffect(() => {
    localStorage.setItem('pokemonGameDebugMode', debugMode.toString());
  }, [debugMode]);

  // Play intro music on start screen only, stop when choosing starter
  useEffect(() => {
    if (gameState === 'start' && introMusicPlaying && audioVolume !== 'none') {
      // Pokemon Red/Blue intro theme
      if (!introMusicRef.current) {
        const introMusic = new Audio('https://www.myinstants.com/media/sounds/pokemon-red-blue-intro.mp3');
        introMusic.loop = true;
        introMusic.volume = audioVolume === 'low' ? 0.3 : 0.7;
        introMusic.play().catch(err => console.log('Intro music play failed:', err));
        introMusicRef.current = introMusic;
      }
    } else {
      // Stop music when leaving start screen
      if (introMusicRef.current) {
        introMusicRef.current.pause();
        introMusicRef.current = null;
      }
    }

    return () => {
      if (introMusicRef.current && gameState !== 'start') {
        introMusicRef.current.pause();
        introMusicRef.current = null;
      }
    };
  }, [gameState, introMusicPlaying, audioVolume]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default for arrow keys and enter to avoid page scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Space key - toggle quick menu focus (Settings/Debug buttons)
      if (e.key === ' ') {
        setQuickMenuFocused(prev => !prev);
        setQuickMenuIndex(0); // Reset to first option when opening
        return;
      }

      // Quick menu navigation when focused
      if (quickMenuFocused) {
        const maxIndex = debugMode ? 2 : 1; // 0: Settings, 1: How to Play, 2: Debug (if enabled)
        if (e.key === 'ArrowUp') {
          setQuickMenuIndex(prev => (prev - 1 + maxIndex + 1) % (maxIndex + 1));
        } else if (e.key === 'ArrowDown') {
          setQuickMenuIndex(prev => (prev + 1) % (maxIndex + 1));
        } else if (e.key === 'Enter') {
          if (quickMenuIndex === 0) {
            setShowSettings(true);
            setQuickMenuFocused(false);
          } else if (quickMenuIndex === 1) {
            setShowHowToPlay(true);
            setQuickMenuFocused(false);
          } else if (quickMenuIndex === 2 && debugMode) {
            // Trigger debug button
            const debugBtn = document.querySelector('[data-debug-button]');
            if (debugBtn) debugBtn.click();
            setQuickMenuFocused(false);
          }
        } else if (e.key === 'Escape') {
          setQuickMenuFocused(false);
        }
        return;
      }

      // Close How to Play modal with Enter or Escape
      if (showHowToPlay) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          setShowHowToPlay(false);
        }
        return;
      }

      // Settings modal navigation
      if (showSettings) {
        // Settings layout: Row 0: PC(0), Mobile(1) | Row 1: None(2), Low(3), High(4) | Row 2: Off(5), On(6) | Row 3: Close(7)
        if (e.key === 'ArrowUp') {
          setSettingsIndex(prev => {
            if (prev === 0 || prev === 1) return 7; // Display to Close
            if (prev === 2 || prev === 3 || prev === 4) return prev - 2; // Audio to Display
            if (prev === 5 || prev === 6) return prev - 2; // Debug to Audio
            if (prev === 7) return 5; // Close to Debug
            return prev;
          });
        } else if (e.key === 'ArrowDown') {
          setSettingsIndex(prev => {
            if (prev === 0 || prev === 1) return prev + 2; // Display to Audio
            if (prev === 2 || prev === 3 || prev === 4) return prev <= 3 ? 5 : 6; // Audio to Debug
            if (prev === 5 || prev === 6) return 7; // Debug to Close
            if (prev === 7) return 0; // Close to Display
            return prev;
          });
        } else if (e.key === 'ArrowLeft') {
          setSettingsIndex(prev => {
            if (prev === 1) return 0;
            if (prev === 3) return 2;
            if (prev === 4) return 3;
            if (prev === 6) return 5;
            return prev;
          });
        } else if (e.key === 'ArrowRight') {
          setSettingsIndex(prev => {
            if (prev === 0) return 1;
            if (prev === 2) return 3;
            if (prev === 3) return 4;
            if (prev === 5) return 6;
            return prev;
          });
        } else if (e.key === 'Enter') {
          // Trigger the selected setting
          if (settingsIndex === 0) setDisplayMode('pc');
          else if (settingsIndex === 1) setDisplayMode('mobile');
          else if (settingsIndex === 2) setAudioVolume('none');
          else if (settingsIndex === 3) setAudioVolume('low');
          else if (settingsIndex === 4) setAudioVolume('high');
          else if (settingsIndex === 5) setDebugMode(false);
          else if (settingsIndex === 6) setDebugMode(true);
          else if (settingsIndex === 7) setShowSettings(false);
        } else if (e.key === 'Escape') {
          setShowSettings(false);
        }
        return;
      }

      // Intro screen - Enter to start
      if (gameState === 'intro') {
        if (e.key === 'Enter') {
          setIntroMusicPlaying(true);
          setGameState('difficulty');
        }
        return;
      }

      // Difficulty selection screen
      if (gameState === 'difficulty') {
        if (e.key === 'ArrowLeft') {
          setSelectedDifficultyIndex(prev => (prev - 1 + 3) % 3);
        } else if (e.key === 'ArrowRight') {
          setSelectedDifficultyIndex(prev => (prev + 1) % 3);
        } else if (e.key === 'Enter') {
          const difficulties = ['easy', 'medium', 'hard'];
          setDifficulty(difficulties[selectedDifficultyIndex]);
          setGameState('start');
        }
        return;
      }

      // Starter selection screen
      if (gameState === 'start') {
        if (e.key === 'ArrowLeft') {
          setSelectedStarterIndex(prev => (prev - 1 + 3) % 3);
        } else if (e.key === 'ArrowRight') {
          setSelectedStarterIndex(prev => (prev + 1) % 3);
        } else if (e.key === 'Enter') {
          // Trigger starter selection - will be handled by the button click
          const starterButtons = document.querySelectorAll('[data-starter-index]');
          if (starterButtons[selectedStarterIndex]) {
            starterButtons[selectedStarterIndex].click();
          }
        }
        return;
      }

      // Battle screen
      if (gameState === 'battle' && isPlayerTurn && !isEvolving) {
        // Grid navigation: 0-3 moves (2x2), 4 potion, 5 catch, 6 switch
        if (e.key === 'ArrowUp') {
          setSelectedActionIndex(prev => {
            if (prev === 2 || prev === 3) return prev - 2; // Move up in moves grid
            if (prev === 4) return 0; // Potion to first move
            if (prev === 5) return 1; // Catch to second move
            if (prev === 6) return 3; // Switch to fourth move
            return prev;
          });
        } else if (e.key === 'ArrowDown') {
          setSelectedActionIndex(prev => {
            if (prev === 0 || prev === 1) return prev + 2; // Move down in moves grid
            if (prev === 2) return 4; // Third move to potion
            if (prev === 3) return 6; // Fourth move to switch
            return prev;
          });
        } else if (e.key === 'ArrowLeft') {
          setSelectedActionIndex(prev => {
            if (prev === 1) return 0;
            if (prev === 3) return 2;
            if (prev === 5) return 4;
            if (prev === 6) return 5;
            return prev;
          });
        } else if (e.key === 'ArrowRight') {
          setSelectedActionIndex(prev => {
            if (prev === 0) return 1;
            if (prev === 2) return 3;
            if (prev === 4) return 5;
            if (prev === 5) return 6;
            return prev;
          });
        } else if (e.key === 'Enter') {
          // Trigger the selected action
          const actionButtons = document.querySelectorAll('[data-action-index]');
          actionButtons.forEach(btn => {
            if (parseInt(btn.getAttribute('data-action-index')) === selectedActionIndex) {
              btn.click();
            }
          });
        }
        return;
      }

      // Victory/Defeat/Catch screens - Enter to continue
      if (['victory', 'defeat', 'catch'].includes(gameState)) {
        if (e.key === 'Enter') {
          const continueButton = document.querySelector('[data-continue-button]');
          if (continueButton) {
            continueButton.click();
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPlayerTurn, isEvolving, selectedStarterIndex, selectedActionIndex, showHowToPlay, showSettings, quickMenuFocused, quickMenuIndex, debugMode, settingsIndex]);

  // Get container size based on display mode
  // PC mode = bigger landscape, Mobile mode = smaller portrait
  const getContainerClass = () => {
    return displayMode === 'pc' ? 'max-w-2xl' : 'max-w-md';
  };

  // Get sprite size based on display mode
  const getSpriteSize = (baseSize) => {
    return displayMode === 'pc' ? baseSize : Math.floor(baseSize * 0.6);
  };

  // Settings button component
  const SettingsButton = () => (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(true)}
        className={`border-4 px-4 py-2 font-bold text-xs transition-all hover:scale-105 retro-text ${
          quickMenuFocused && quickMenuIndex === 0 ? 'border-yellow-400 ring-4 ring-yellow-400 scale-110' : 'border-black'
        }`}
        style={{
          backgroundColor: '#3b82f6',
          color: '#fff',
          boxShadow: quickMenuFocused && quickMenuIndex === 0 ? '4px 4px 0px #eab308' : '4px 4px 0px #000'
        }}
      >
        ⚙️ SETTINGS
      </button>

      {/* How to Play Button */}
      <button
        onClick={() => setShowHowToPlay(true)}
        className={`border-4 px-4 py-2 font-bold text-xs transition-all hover:scale-105 retro-text ${
          quickMenuFocused && quickMenuIndex === 1 ? 'border-yellow-400 ring-4 ring-yellow-400 scale-110' : 'border-black'
        }`}
        style={{
          backgroundColor: '#22c55e',
          color: '#fff',
          boxShadow: quickMenuFocused && quickMenuIndex === 1 ? '4px 4px 0px #eab308' : '4px 4px 0px #000'
        }}
      >
        ❓ HOW TO PLAY
      </button>

      {/* Pokedex Button */}
      <button
        onClick={() => setShowPokedex(true)}
        className={`border-4 px-4 py-2 font-bold text-xs transition-all hover:scale-105 retro-text border-black`}
        style={{
          backgroundColor: '#dc2626',
          color: '#fff',
          boxShadow: '4px 4px 0px #000'
        }}
      >
        📖 POKéDEX
      </button>

      {/* Debug Button - only show if debug mode is enabled */}
      {debugMode && (
        <button
          data-debug-button
          onClick={() => {
            if (playerPokemon) {
              setPlayerPokemon(prev => ({ ...prev, exp: 19 }));
              setAvailableTeam(prev => prev.map(p =>
                p.name === playerPokemon.name ? { ...p, exp: 19 } : p
              ));
              setBattleLog(prev => [...prev, 'DEBUG: EXP set to 19. Win one more battle for Mewtwo!']);
            }
          }}
          className={`border-4 px-4 py-2 font-bold text-xs transition-all hover:scale-105 retro-text ${
            quickMenuFocused && quickMenuIndex === 2 ? 'border-yellow-400 ring-4 ring-yellow-400 scale-110' : 'border-black'
          }`}
          style={{
            backgroundColor: '#dc2626',
            color: '#fff',
            boxShadow: quickMenuFocused && quickMenuIndex === 2 ? '4px 4px 0px #eab308' : '4px 4px 0px #000'
          }}
        >
          🐛 DEBUG: EXP→19
        </button>
      )}

      {/* Quick menu indicator */}
      {quickMenuFocused && (
        <div className="text-xs text-center mt-2 bg-yellow-400 border-2 border-black px-2 py-1 retro-text">
          ↑↓ Navigate | Enter Select | Space Close
        </div>
      )}
    </div>
  );

  // How to Play modal component
  const HowToPlayModal = () => {
    if (!showHowToPlay) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{backgroundColor: 'rgba(0,0,0,0.8)'}}>
        <div className="border-8 border-black bg-yellow-100 p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" style={{boxShadow: '12px 12px 0px #000'}}>
          <div className="border-4 border-black bg-green-600 p-3 mb-4">
            <h2 className="text-xl font-bold text-center retro-text text-white">❓ HOW TO PLAY</h2>
          </div>

          <div className="border-4 border-black bg-white p-4 mb-4">
            <p className="text-sm mb-4 retro-text" style={{color: '#000', lineHeight: '1.8'}}>
              Hello trainer! Welcome to the world of Pokemon. I'm Professor Pine and I will be your guide to become the Pokemon Master. Here's how to play:
            </p>

            <div className="mb-4">
              <h3 className="font-bold text-sm mb-2 retro-text" style={{color: '#dc2626'}}>🎮 CONTROLS:</h3>
              <ul className="text-xs retro-text space-y-1" style={{color: '#000'}}>
                <li>• <strong>Arrow Keys</strong> - Navigate menus</li>
                <li>• <strong>Enter</strong> - Confirm selection</li>
                <li>• <strong>Space</strong> - Quick access Settings/Debug</li>
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-sm mb-2 retro-text" style={{color: '#dc2626'}}>⚔️ BATTLE:</h3>
              <ul className="text-xs retro-text space-y-1" style={{color: '#000'}}>
                <li>• Choose from 4 moves to attack</li>
                <li>• Use <strong>POTION</strong> to heal (once per battle)</li>
                <li>• Use <strong>CATCH</strong> to capture wild Pokemon</li>
                <li>• <strong>SWITCH</strong> between your team Pokemon</li>
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-sm mb-2 retro-text" style={{color: '#dc2626'}}>📈 EVOLUTION:</h3>
              <ul className="text-xs retro-text space-y-1" style={{color: '#000'}}>
                <li>• Win battles to gain EXP</li>
                <li>• Every 3 EXP = Evolution (+15 all stats)</li>
                <li>• Max evolution = +5 all stats per 3 EXP</li>
              </ul>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-sm mb-2 retro-text" style={{color: '#dc2626'}}>🔮 MEWTWO CHALLENGE:</h3>
              <ul className="text-xs retro-text space-y-1" style={{color: '#000'}}>
                <li>• Reach 20 EXP to unlock Mewtwo battle</li>
                <li>• Defeat or catch Mewtwo to unlock final evolutions</li>
                <li>• Face Gengar, Alakazam, Dragonite & more!</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => setShowHowToPlay(false)}
            className="w-full border-4 border-black hover:scale-105 font-bold py-3 px-6 retro-text transition-all"
            style={{backgroundColor: '#fbbf24', color: '#000', boxShadow: '4px 4px 0px #000'}}
          >
            GOT IT!
          </button>
        </div>
      </div>
    );
  };

  // Settings modal component
  const SettingsModal = () => {
    if (!showSettings) return null;

    const getButtonClass = (index, isActive) => {
      const isSelected = settingsIndex === index;
      let baseClass = `flex-1 border-4 px-3 py-2 font-bold text-xs retro-text transition-all `;
      if (isSelected) {
        baseClass += 'border-yellow-400 ring-2 ring-yellow-400 scale-105 ';
      } else {
        baseClass += 'border-black ';
      }
      return baseClass;
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{backgroundColor: 'rgba(0,0,0,0.8)'}}>
        <div className="border-8 border-black bg-yellow-100 p-6 max-w-md w-full mx-4" style={{boxShadow: '12px 12px 0px #000'}}>
          <div className="border-4 border-black bg-red-600 p-3 mb-4">
            <h2 className="text-2xl font-bold text-center retro-text text-white">⚙️ SETTINGS</h2>
          </div>

          {/* Navigation hint */}
          <div className="text-xs text-center mb-3 bg-gray-200 border-2 border-black px-2 py-1 retro-text">
            ↑↓←→ Navigate | Enter Select | Esc Close
          </div>

          {/* Display Mode */}
          <div className="border-4 border-black bg-white p-4 mb-3">
            <h3 className="font-bold text-sm mb-2 retro-text">DISPLAY MODE:</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setDisplayMode('pc')}
                className={getButtonClass(0, displayMode === 'pc') + (displayMode === 'pc' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
              >
                PC MODE
              </button>
              <button
                onClick={() => setDisplayMode('mobile')}
                className={getButtonClass(1, displayMode === 'mobile') + (displayMode === 'mobile' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
              >
                MOBILE MODE
              </button>
            </div>
          </div>

          {/* Audio Volume */}
          <div className="border-4 border-black bg-white p-4 mb-3">
            <h3 className="font-bold text-sm mb-2 retro-text">AUDIO VOLUME:</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setAudioVolume('none')}
                className={getButtonClass(2, audioVolume === 'none') + (audioVolume === 'none' ? 'bg-red-500 text-white' : 'bg-gray-200')}
              >
                NONE
              </button>
              <button
                onClick={() => setAudioVolume('low')}
                className={getButtonClass(3, audioVolume === 'low') + (audioVolume === 'low' ? 'bg-green-500 text-white' : 'bg-gray-200')}
              >
                LOW
              </button>
              <button
                onClick={() => setAudioVolume('high')}
                className={getButtonClass(4, audioVolume === 'high') + (audioVolume === 'high' ? 'bg-green-500 text-white' : 'bg-gray-200')}
              >
                HIGH
              </button>
            </div>
          </div>

          {/* Debug Mode */}
          <div className="border-4 border-black bg-white p-4 mb-4">
            <h3 className="font-bold text-sm mb-2 retro-text">DEBUG MODE:</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setDebugMode(false)}
                className={getButtonClass(5, !debugMode) + (!debugMode ? 'bg-gray-500 text-white' : 'bg-gray-200')}
              >
                OFF
              </button>
              <button
                onClick={() => setDebugMode(true)}
                className={getButtonClass(6, debugMode) + (debugMode ? 'bg-purple-500 text-white' : 'bg-gray-200')}
              >
                ON
              </button>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowSettings(false)}
            className={`w-full border-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 retro-text transition-all ${
              settingsIndex === 7 ? 'border-yellow-400 ring-2 ring-yellow-400 scale-105' : 'border-black'
            }`}
            style={{boxShadow: '4px 4px 0px #000'}}
          >
            CLOSE
          </button>
        </div>
      </div>
    );
  };


  // Footer component - placed inside gameboy console
  const Footer = () => (
    <div className="text-center mt-4 py-2">
      <p className="text-sm font-bold retro-text" style={{color: '#9ca3af'}}>
        By Quan 2026
      </p>
    </div>
  );

  // Pokemon sound effects using real audio files
  const playSound = (type) => {
    try {
      // Check audio volume setting
      if (audioVolume === 'none') return;

      const soundUrls = {
        'mewtwo-warning': 'https://www.myinstants.com/media/sounds/mewtwo-pokemon-go-sound.mp3',
        'evolve': 'https://www.myinstants.com/media/sounds/pokemon-evolve.mp3',
        'sendout': 'https://www.myinstants.com/media/sounds/ichooseyou.mp3',
        'catch': 'https://www.myinstants.com/media/sounds/06-caught-a-pokemon.mp3',
        'levelup': 'https://www.myinstants.com/media/sounds/12_3.mp3'
      };

      const volumeLevels = {
        'low': 0.3,
        'high': 0.7
      };

      // If it's a real Pokemon sound, use Audio API
      if (soundUrls[type]) {
        const audio = new Audio(soundUrls[type]);
        audio.volume = volumeLevels[audioVolume] || 0.5;
        audio.play().catch(err => console.log('Sound play failed:', err));
        return;
      }

      // Fallback to Web Audio API for other sounds
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      switch(type) {
        case 'attack':
          oscillator.frequency.value = 400;
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
          break;
        case 'damage':
          oscillator.frequency.value = 200;
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
        case 'heal':
          oscillator.frequency.value = 600;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.4);
          break;
        case 'victory':
          // Victory jingle
          [523, 587, 659, 784].forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, audioContext.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.2);
            osc.start(audioContext.currentTime + i * 0.15);
            osc.stop(audioContext.currentTime + i * 0.15 + 0.2);
          });
          break;
      }
    } catch (e) {
      // Silently fail if audio not supported
    }
  };

  // Master list of all Pokemon available in this game, sorted by Pokedex number
  const allGamePokemon = [
    { id: 1, name: 'Bulbasaur' }, { id: 2, name: 'Ivysaur' }, { id: 3, name: 'Venusaur' },
    { id: 4, name: 'Charmander' }, { id: 5, name: 'Charmeleon' }, { id: 6, name: 'Charizard' },
    { id: 7, name: 'Squirtle' }, { id: 8, name: 'Wartortle' }, { id: 9, name: 'Blastoise' },
    { id: 10, name: 'Caterpie' }, { id: 11, name: 'Metapod' }, { id: 12, name: 'Butterfree' },
    { id: 13, name: 'Weedle' }, { id: 14, name: 'Kakuna' }, { id: 15, name: 'Beedrill' },
    { id: 16, name: 'Pidgey' }, { id: 17, name: 'Pidgeotto' }, { id: 18, name: 'Pidgeot' },
    { id: 19, name: 'Rattata' }, { id: 20, name: 'Raticate' },
    { id: 21, name: 'Spearow' }, { id: 22, name: 'Fearow' },
    { id: 23, name: 'Ekans' }, { id: 24, name: 'Arbok' },
    { id: 25, name: 'Pikachu' }, { id: 26, name: 'Raichu' },
    { id: 27, name: 'Sandshrew' }, { id: 28, name: 'Sandslash' },
    { id: 29, name: 'NidoranF' }, { id: 30, name: 'Nidorina' }, { id: 31, name: 'Nidoqueen' },
    { id: 32, name: 'NidoranM' }, { id: 33, name: 'Nidorino' }, { id: 34, name: 'Nidoking' },
    { id: 35, name: 'Clefairy' }, { id: 36, name: 'Clefable' },
    { id: 37, name: 'Vulpix' }, { id: 38, name: 'Ninetales' },
    { id: 39, name: 'Jigglypuff' }, { id: 40, name: 'Wigglytuff' },
    { id: 41, name: 'Zubat' }, { id: 42, name: 'Golbat' },
    { id: 43, name: 'Oddish' }, { id: 44, name: 'Gloom' }, { id: 45, name: 'Vileplume' },
    { id: 46, name: 'Paras' }, { id: 47, name: 'Parasect' },
    { id: 48, name: 'Venonat' }, { id: 49, name: 'Venomoth' },
    { id: 50, name: 'Diglett' }, { id: 51, name: 'Dugtrio' },
    { id: 52, name: 'Meowth' }, { id: 53, name: 'Persian' },
    { id: 54, name: 'Psyduck' }, { id: 55, name: 'Golduck' },
    { id: 56, name: 'Mankey' }, { id: 57, name: 'Primeape' },
    { id: 58, name: 'Growlithe' }, { id: 59, name: 'Arcanine' },
    { id: 60, name: 'Poliwag' }, { id: 61, name: 'Poliwhirl' }, { id: 62, name: 'Poliwrath' },
    { id: 63, name: 'Abra' }, { id: 64, name: 'Kadabra' }, { id: 65, name: 'Alakazam' },
    { id: 66, name: 'Machop' }, { id: 67, name: 'Machoke' }, { id: 68, name: 'Machamp' },
    { id: 69, name: 'Bellsprout' }, { id: 70, name: 'Weepinbell' }, { id: 71, name: 'Victreebel' },
    { id: 72, name: 'Tentacool' }, { id: 73, name: 'Tentacruel' },
    { id: 74, name: 'Geodude' }, { id: 75, name: 'Graveler' }, { id: 76, name: 'Golem' },
    { id: 77, name: 'Ponyta' }, { id: 78, name: 'Rapidash' },
    { id: 79, name: 'Slowpoke' }, { id: 80, name: 'Slowbro' },
    { id: 81, name: 'Magnemite' }, { id: 82, name: 'Magneton' },
    { id: 83, name: 'Farfetchd' },
    { id: 84, name: 'Doduo' }, { id: 85, name: 'Dodrio' },
    { id: 86, name: 'Seel' }, { id: 87, name: 'Dewgong' },
    { id: 88, name: 'Grimer' }, { id: 89, name: 'Muk' },
    { id: 90, name: 'Shellder' }, { id: 91, name: 'Cloyster' },
    { id: 92, name: 'Gastly' }, { id: 93, name: 'Haunter' }, { id: 94, name: 'Gengar' },
    { id: 95, name: 'Onix' },
    { id: 96, name: 'Drowzee' }, { id: 97, name: 'Hypno' },
    { id: 98, name: 'Krabby' }, { id: 99, name: 'Kingler' },
    { id: 100, name: 'Voltorb' }, { id: 101, name: 'Electrode' },
    { id: 102, name: 'Exeggcute' }, { id: 103, name: 'Exeggutor' },
    { id: 104, name: 'Cubone' }, { id: 105, name: 'Marowak' },
    { id: 106, name: 'Hitmonlee' }, { id: 107, name: 'Hitmonchan' },
    { id: 108, name: 'Lickitung' },
    { id: 109, name: 'Koffing' }, { id: 110, name: 'Weezing' },
    { id: 111, name: 'Rhyhorn' }, { id: 112, name: 'Rhydon' },
    { id: 113, name: 'Chansey' },
    { id: 114, name: 'Tangela' },
    { id: 115, name: 'Kangaskhan' },
    { id: 116, name: 'Horsea' }, { id: 117, name: 'Seadra' },
    { id: 118, name: 'Goldeen' }, { id: 119, name: 'Seaking' },
    { id: 120, name: 'Staryu' }, { id: 121, name: 'Starmie' },
    { id: 122, name: 'Mr. Mime' },
    { id: 123, name: 'Scyther' },
    { id: 124, name: 'Jynx' },
    { id: 125, name: 'Electabuzz' },
    { id: 126, name: 'Magmar' },
    { id: 127, name: 'Pinsir' },
    { id: 128, name: 'Tauros' },
    { id: 129, name: 'Magikarp' }, { id: 130, name: 'Gyarados' },
    { id: 131, name: 'Lapras' },
    { id: 132, name: 'Ditto' },
    { id: 133, name: 'Eevee' }, { id: 134, name: 'Vaporeon' }, { id: 135, name: 'Jolteon' }, { id: 136, name: 'Flareon' },
    { id: 137, name: 'Porygon' },
    { id: 138, name: 'Omanyte' }, { id: 139, name: 'Omastar' },
    { id: 140, name: 'Kabuto' }, { id: 141, name: 'Kabutops' },
    { id: 142, name: 'Aerodactyl' },
    { id: 143, name: 'Snorlax' },
    { id: 147, name: 'Dratini' }, { id: 148, name: 'Dragonair' }, { id: 149, name: 'Dragonite' },
    { id: 150, name: 'Mewtwo' },
    { id: 151, name: 'Mew' },
  ];

  // Pokedex modal component
  const PokedexModal = () => {
    if (!showPokedex) return null;

    const collectedNames = new Set(pokedex.map(p => p.name));
    const collectedCount = allGamePokemon.filter(p => collectedNames.has(p.name)).length;
    const isMobile = displayMode === 'mobile';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{backgroundColor: 'rgba(0,0,0,0.8)'}}>
        <div className="border-4 border-black w-full relative" style={{backgroundColor: '#fff', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
          {/* Header */}
          <div className="border-b-4 border-black p-3 flex items-center justify-between" style={{backgroundColor: '#dc2626'}}>
            <h2 className="text-lg font-bold retro-text" style={{color: '#fff'}}>
              📖 POKéDEX
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold retro-text" style={{color: '#fef3c7'}}>
                {collectedCount}/{allGamePokemon.length}
              </span>
              <button
                onClick={() => setShowPokedex(false)}
                className="border-2 border-white px-3 py-1 font-bold text-xs retro-text hover:scale-105 transition-all"
                style={{backgroundColor: '#000', color: '#fff'}}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Pokemon Grid - scrollable */}
          <div className="overflow-y-auto p-3" style={{flex: 1}}>
            <div className="grid gap-2" style={{gridTemplateColumns: `repeat(${isMobile ? 4 : 6}, 1fr)`}}>
              {allGamePokemon.map(pokemon => {
                const isCollected = collectedNames.has(pokemon.name);
                return (
                  <div
                    key={pokemon.id}
                    className="border-4 p-1 text-center transition-all"
                    style={{
                      borderColor: isCollected ? '#dc2626' : '#d1d5db',
                      backgroundColor: isCollected ? '#fef3c7' : '#f3f4f6',
                    }}
                  >
                    <div className="flex justify-center">
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                        alt={isCollected ? pokemon.name : '???'}
                        style={{
                          imageRendering: 'pixelated',
                          width: isMobile ? '40px' : '56px',
                          height: isMobile ? '40px' : '56px',
                          filter: isCollected ? 'none' : 'brightness(0)',
                          opacity: isCollected ? 1 : 0.3,
                        }}
                      />
                    </div>
                    <p className="text-xs font-bold retro-text truncate" style={{color: isCollected ? '#000' : '#9ca3af', fontSize: isMobile ? '8px' : '10px'}}>
                      #{String(pokemon.id).padStart(3, '0')}
                    </p>
                    <p className="text-xs font-bold retro-text truncate" style={{color: isCollected ? '#000' : '#9ca3af', fontSize: isMobile ? '8px' : '10px'}}>
                      {isCollected ? pokemon.name : '???'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to get Pokemon sprite from PokeAPI
  const getPokemonSprite = (pokemonName) => {
    const name = pokemonName.toLowerCase();
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokemonId(name)}.png`;
  };

  // Helper function to get Pokemon ID from name
  const getPokemonId = (name) => {
    const pokemonIds = {
      // Starters and evolutions
      'charmander': 4, 'charmeleon': 5, 'charizard': 6,
      'squirtle': 7, 'wartortle': 8, 'blastoise': 9,
      'bulbasaur': 1, 'ivysaur': 2, 'venusaur': 3,
      // Bug types
      'caterpie': 10, 'metapod': 11, 'butterfree': 12,
      'weedle': 13, 'kakuna': 14, 'beedrill': 15,
      'paras': 46, 'parasect': 47,
      'venonat': 48, 'venomoth': 49,
      'scyther': 123, 'pinsir': 127,
      'ekans': 23, 'arbok': 24,
      // Birds
      'pidgey': 16, 'pidgeotto': 17, 'pidgeot': 18,
      'spearow': 21, 'fearow': 22,
      // Normal types
      'rattata': 19, 'raticate': 20,
      'clefairy': 35, 'clefable': 36,
      'jigglypuff': 39, 'wigglytuff': 40,
      'farfetchd': 83,
      'kangaskhan': 115,
      'snorlax': 143, 'tauros': 128, 'ditto': 132,
      'eevee': 133, 'vaporeon': 134, 'jolteon': 135, 'flareon': 136,
      'porygon': 137, 'lickitung': 108, 'chansey': 113,
      // Psychic/Ice types
      'mr. mime': 122, 'jynx': 124,
      // Electric types
      'pikachu': 25, 'raichu': 26,
      'magnemite': 81, 'magneton': 82,
      'voltorb': 100, 'electrode': 101,
      'electabuzz': 125,
      // Ground types
      'sandshrew': 27, 'sandslash': 28,
      'diglett': 50, 'dugtrio': 51,
      'cubone': 104, 'marowak': 105,
      'rhyhorn': 111, 'rhydon': 112,
      // Poison/Grass types
      'oddish': 43, 'gloom': 44, 'vileplume': 45,
      'bellsprout': 69, 'weepinbell': 70, 'victreebel': 71,
      'tangela': 114, 'exeggcute': 102, 'exeggutor': 103,
      // Fire types
      'vulpix': 37, 'ninetales': 38,
      'growlithe': 58, 'arcanine': 59,
      'ponyta': 77, 'rapidash': 78,
      'magmar': 126,
      // Water types
      'psyduck': 54, 'golduck': 55,
      'poliwag': 60, 'poliwhirl': 61, 'poliwrath': 62,
      'tentacool': 72, 'tentacruel': 73,
      'slowpoke': 79, 'slowbro': 80,
      'shellder': 90, 'cloyster': 91,
      'krabby': 98, 'kingler': 99,
      'horsea': 116, 'seadra': 117,
      'goldeen': 118, 'seaking': 119,
      'staryu': 120, 'starmie': 121,
      'magikarp': 129, 'gyarados': 130,
      'lapras': 131,
      // Fighting types
      'mankey': 56, 'primeape': 57,
      'machop': 66, 'machoke': 67, 'machamp': 68,
      'hitmonlee': 106, 'hitmonchan': 107,
      // Psychic types
      'abra': 63, 'kadabra': 64, 'alakazam': 65,
      'drowzee': 96, 'hypno': 97,
      'mewtwo': 150,
      // Ghost types
      'gastly': 92, 'haunter': 93, 'gengar': 94,
      // Rock types
      'geodude': 74, 'graveler': 75, 'golem': 76,
      'onix': 95,
      'aerodactyl': 142,
      'omanyte': 138, 'omastar': 139,
      'kabuto': 140, 'kabutops': 141,
      // Flying types
      'zubat': 41, 'golbat': 42,
      // Cat types
      'meowth': 52, 'persian': 53,
      // Poison types
      'koffing': 109, 'weezing': 110,
      'grimer': 88, 'muk': 89,
      // Ice types
      'seel': 86, 'dewgong': 87,
      // Bird types
      'doduo': 84, 'dodrio': 85,
      // Nidoran family
      'nidoranf': 29, 'nidorina': 30, 'nidoqueen': 31,
      'nidoranm': 32, 'nidorino': 33, 'nidoking': 34,
      // Dragon types
      'dratini': 147, 'dragonair': 148, 'dragonite': 149,
      // Mythical
      'mew': 151
    };
    return pokemonIds[name] || 1;
  };

  const starters = [
    { name: 'Charmander', type: 'Fire', type2: null, hp: 39, maxHp: 39, attack: 52, spAtk: 60, def: 43, spDef: 50, color: '🔥', moves: ['Scratch', 'Ember', 'Growl', 'Flame Burst'], moveTypes: ['Normal', 'Fire', 'Normal', 'Fire'], exp: 0 },
    { name: 'Squirtle', type: 'Water', type2: null, hp: 44, maxHp: 44, attack: 48, spAtk: 50, def: 65, spDef: 64, color: '💧', moves: ['Tackle', 'Water Gun', 'Withdraw', 'Bubble Beam'], moveTypes: ['Normal', 'Water', 'Water', 'Water'], exp: 0 },
    { name: 'Bulbasaur', type: 'Grass', type2: 'Poison', hp: 45, maxHp: 45, attack: 49, spAtk: 65, def: 49, spDef: 65, color: '🌿', moves: ['Tackle', 'Vine Whip', 'Growl', 'Razor Leaf'], moveTypes: ['Normal', 'Grass', 'Normal', 'Grass'], exp: 0 }
  ];

  const wildPokemons = [
    // Very Common (attack 10-30) - High encounter rate
    { name: 'Magikarp', type: 'Water', type2: null, hp: 20, maxHp: 20, attack: 10, spAtk: 15, def: 55, spDef: 20, color: '🐟', moves: ['Splash', 'Tackle'], moveTypes: ['Normal', 'Normal'] },
    { name: 'Metapod', type: 'Bug', type2: null, hp: 25, maxHp: 25, attack: 15, spAtk: 25, def: 55, spDef: 25, color: '🥚', moves: ['Harden', 'Tackle'], moveTypes: ['Normal', 'Normal'] },
    { name: 'Kakuna', type: 'Bug', type2: null, hp: 25, maxHp: 25, attack: 15, spAtk: 25, def: 50, spDef: 25, color: '🐝', moves: ['Harden', 'Poison Sting'], moveTypes: ['Normal', 'Poison'] },
    { name: 'Caterpie', type: 'Bug', type2: null, hp: 45, maxHp: 45, attack: 30, spAtk: 20, def: 35, spDef: 20, color: '🐛', moves: ['Tackle', 'String Shot', 'Bug Bite'], moveTypes: ['Normal', 'Bug', 'Bug'] },
    { name: 'Weedle', type: 'Bug', type2: 'Poison', hp: 40, maxHp: 40, attack: 25, spAtk: 20, def: 30, spDef: 20, color: '🐝', moves: ['Poison Sting', 'String Shot', 'Bug Bite'], moveTypes: ['Poison', 'Bug', 'Bug'] },
    { name: 'Pidgey', type: 'Normal', type2: 'Flying', hp: 40, maxHp: 40, attack: 30, spAtk: 35, def: 40, spDef: 35, color: '🐦', moves: ['Peck', 'Gust', 'Sand Attack', 'Wing Attack'], moveTypes: ['Flying', 'Flying', 'Ground', 'Flying'] },
    { name: 'Rattata', type: 'Normal', type2: null, hp: 30, maxHp: 30, attack: 28, spAtk: 25, def: 35, spDef: 35, color: '🐀', moves: ['Tackle', 'Quick Attack', 'Bite', 'Hyper Fang'], moveTypes: ['Normal', 'Normal', 'Dark', 'Normal'] },
    { name: 'Snorlax', type: 'Normal', type2: null, hp: 160, maxHp: 160, attack: 110, spAtk: 65, def: 65, spDef: 110, color: '😴', moves: ['Body Slam', 'Rest', 'Crunch', 'Hyper Beam'], moveTypes: ['Normal', 'Psychic', 'Dark', 'Normal'] },

    // Common (attack 31-50) - Medium-high encounter rate
    { name: 'Clefairy', type: 'Normal', type2: null, hp: 70, maxHp: 70, attack: 45, spAtk: 60, def: 48, spDef: 65, color: '🌙', moves: ['Pound', 'Sing', 'Double Slap', 'Moonblast'], moveTypes: ['Normal', 'Normal', 'Normal', 'Normal'] },
    { name: 'Jigglypuff', type: 'Normal', type2: null, hp: 115, maxHp: 115, attack: 45, spAtk: 45, def: 20, spDef: 25, color: '🎤', moves: ['Pound', 'Sing', 'Double Slap', 'Body Slam'], moveTypes: ['Normal', 'Normal', 'Normal', 'Normal'] },
    { name: 'Seel', type: 'Water', type2: null, hp: 65, maxHp: 65, attack: 45, spAtk: 45, def: 55, spDef: 70, color: '🦭', moves: ['Headbutt', 'Icy Wind', 'Aqua Jet', 'Aurora Beam'], moveTypes: ['Normal', 'Ice', 'Water', 'Ice'] },
    { name: 'NidoranF', type: 'Poison', type2: null, hp: 55, maxHp: 55, attack: 47, spAtk: 40, def: 52, spDef: 40, color: '🐰', moves: ['Scratch', 'Poison Sting', 'Bite', 'Double Kick'], moveTypes: ['Normal', 'Poison', 'Dark', 'Fighting'] },
    { name: 'Gastly', type: 'Ghost', type2: 'Poison', hp: 30, maxHp: 30, attack: 35, spAtk: 100, def: 30, spDef: 35, color: '👻', moves: ['Lick', 'Hypnosis', 'Shadow Ball', 'Night Shade'], moveTypes: ['Ghost', 'Psychic', 'Ghost', 'Ghost'] },
    { name: 'Tentacool', type: 'Water', type2: 'Poison', hp: 40, maxHp: 40, attack: 40, spAtk: 50, def: 35, spDef: 100, color: '🪼', moves: ['Acid', 'Poison Sting', 'Water Gun', 'Wrap'], moveTypes: ['Poison', 'Poison', 'Water', 'Normal'] },
    { name: 'Vulpix', type: 'Fire', type2: null, hp: 38, maxHp: 38, attack: 41, spAtk: 50, def: 40, spDef: 65, color: '🦊', moves: ['Ember', 'Quick Attack', 'Flame Burst', 'Flamethrower'], moveTypes: ['Fire', 'Normal', 'Fire', 'Fire'] },
    { name: 'Meowth', type: 'Normal', type2: null, hp: 40, maxHp: 40, attack: 45, spAtk: 40, def: 35, spDef: 40, color: '🐱', moves: ['Scratch', 'Bite', 'Fury Swipes', 'Pay Day'], moveTypes: ['Normal', 'Dark', 'Normal', 'Normal'] },
    { name: 'Zubat', type: 'Poison', type2: 'Flying', hp: 40, maxHp: 40, attack: 45, spAtk: 30, def: 35, spDef: 40, color: '🦇', moves: ['Bite', 'Wing Attack', 'Air Slash', 'Poison Fang'], moveTypes: ['Dark', 'Flying', 'Flying', 'Poison'] },
    { name: 'Onix', type: 'Rock', type2: 'Ground', hp: 35, maxHp: 35, attack: 45, spAtk: 30, def: 160, spDef: 45, color: '🐍', moves: ['Rock Throw', 'Bind', 'Rock Slide', 'Dig'], moveTypes: ['Rock', 'Normal', 'Rock', 'Ground'] },
    { name: 'Oddish', type: 'Grass', type2: 'Poison', hp: 45, maxHp: 45, attack: 50, spAtk: 75, def: 55, spDef: 65, color: '🌱', moves: ['Absorb', 'Acid', 'Poison Powder', 'Mega Drain'], moveTypes: ['Grass', 'Poison', 'Poison', 'Grass'] },
    { name: 'Poliwag', type: 'Water', type2: null, hp: 40, maxHp: 40, attack: 50, spAtk: 40, def: 40, spDef: 40, color: '💧', moves: ['Water Gun', 'Bubble', 'Hypnosis', 'Bubble Beam'], moveTypes: ['Water', 'Water', 'Psychic', 'Water'] },
    { name: 'Paras', type: 'Bug', type2: 'Grass', hp: 35, maxHp: 35, attack: 45, spAtk: 45, def: 55, spDef: 55, color: '🍄', moves: ['Scratch', 'Stun Spore', 'Leech Life', 'Spore'], moveTypes: ['Normal', 'Grass', 'Bug', 'Grass'] },
    { name: 'Venonat', type: 'Bug', type2: 'Poison', hp: 60, maxHp: 60, attack: 45, spAtk: 40, def: 50, spDef: 55, color: '🔮', moves: ['Tackle', 'Confusion', 'Poison Powder', 'Psybeam'], moveTypes: ['Normal', 'Psychic', 'Poison', 'Psychic'] },
    { name: 'Krabby', type: 'Water', type2: null, hp: 30, maxHp: 30, attack: 50, spAtk: 25, def: 90, spDef: 25, color: '🦀', moves: ['Bubble', 'Vice Grip', 'Crabhammer', 'Stomp'], moveTypes: ['Water', 'Normal', 'Water', 'Normal'] },
    { name: 'Horsea', type: 'Water', type2: null, hp: 30, maxHp: 30, attack: 40, spAtk: 70, def: 70, spDef: 25, color: '🐴', moves: ['Bubble', 'Water Gun', 'Twister', 'Hydro Pump'], moveTypes: ['Water', 'Water', 'Dragon', 'Water'] },
    { name: 'Goldeen', type: 'Water', type2: null, hp: 45, maxHp: 45, attack: 48, spAtk: 35, def: 60, spDef: 50, color: '🐠', moves: ['Peck', 'Water Gun', 'Horn Attack', 'Waterfall'], moveTypes: ['Flying', 'Water', 'Normal', 'Water'] },
    { name: 'Staryu', type: 'Water', type2: null, hp: 30, maxHp: 30, attack: 45, spAtk: 70, def: 55, spDef: 55, color: '⭐', moves: ['Tackle', 'Water Gun', 'Swift', 'Hydro Pump'], moveTypes: ['Normal', 'Water', 'Normal', 'Water'] },

    // Uncommon (attack 51-70) - Medium encounter rate
    { name: 'Ekans', type: 'Poison', type2: null, hp: 35, maxHp: 35, attack: 60, spAtk: 40, def: 44, spDef: 54, color: '🐍', moves: ['Wrap', 'Poison Sting', 'Bite', 'Acid'], moveTypes: ['Normal', 'Poison', 'Dark', 'Poison'] },
    { name: 'NidoranM', type: 'Poison', type2: null, hp: 46, maxHp: 46, attack: 57, spAtk: 40, def: 40, spDef: 40, color: '🐰', moves: ['Peck', 'Poison Sting', 'Horn Attack', 'Double Kick'], moveTypes: ['Flying', 'Poison', 'Normal', 'Fighting'] },
    { name: 'Dratini', type: 'Dragon', type2: null, hp: 41, maxHp: 41, attack: 64, spAtk: 50, def: 45, spDef: 50, color: '🐉', moves: ['Wrap', 'Twister', 'Dragon Rage', 'Slam'], moveTypes: ['Normal', 'Dragon', 'Dragon', 'Normal'] },
    { name: 'Koffing', type: 'Poison', type2: null, hp: 40, maxHp: 40, attack: 65, spAtk: 60, def: 95, spDef: 45, color: '💨', moves: ['Tackle', 'Smog', 'Sludge', 'Self-Destruct'], moveTypes: ['Normal', 'Poison', 'Poison', 'Normal'] },
    { name: 'Psyduck', type: 'Water', type2: null, hp: 50, maxHp: 50, attack: 52, spAtk: 65, def: 48, spDef: 50, color: '🦆', moves: ['Scratch', 'Water Gun', 'Confusion', 'Aqua Tail'], moveTypes: ['Normal', 'Water', 'Psychic', 'Water'] },
    { name: 'Pikachu', type: 'Electric', type2: null, hp: 35, maxHp: 35, attack: 55, spAtk: 50, def: 40, spDef: 50, color: '⚡', moves: ['Thunder Shock', 'Quick Attack', 'Thunderbolt', 'Iron Tail'], moveTypes: ['Electric', 'Normal', 'Electric', 'Steel'] },
    { name: 'Diglett', type: 'Ground', type2: null, hp: 10, maxHp: 10, attack: 55, spAtk: 35, def: 25, spDef: 45, color: '🕳️', moves: ['Scratch', 'Dig', 'Mud Slap', 'Earthquake'], moveTypes: ['Normal', 'Ground', 'Ground', 'Ground'] },
    { name: 'Geodude', type: 'Rock', type2: 'Ground', hp: 40, maxHp: 40, attack: 55, spAtk: 30, def: 100, spDef: 30, color: '🪨', moves: ['Tackle', 'Rock Throw', 'Defense Curl', 'Rock Blast'], moveTypes: ['Normal', 'Rock', 'Normal', 'Rock'] },
    { name: 'Spearow', type: 'Normal', type2: 'Flying', hp: 40, maxHp: 40, attack: 60, spAtk: 31, def: 30, spDef: 31, color: '🐦', moves: ['Peck', 'Fury Attack', 'Aerial Ace', 'Drill Peck'], moveTypes: ['Flying', 'Normal', 'Flying', 'Flying'] },
    { name: 'Magnemite', type: 'Electric', type2: 'Steel', hp: 25, maxHp: 25, attack: 60, spAtk: 95, def: 70, spDef: 55, color: '🧲', moves: ['Thunder Shock', 'Sonic Boom', 'Spark', 'Thunderbolt'], moveTypes: ['Electric', 'Normal', 'Electric', 'Electric'] },
    { name: 'Cubone', type: 'Ground', type2: null, hp: 50, maxHp: 50, attack: 65, spAtk: 40, def: 95, spDef: 50, color: '💀', moves: ['Bone Club', 'Headbutt', 'Bonemerang', 'Earthquake'], moveTypes: ['Ground', 'Normal', 'Ground', 'Ground'] },
    { name: 'Drowzee', type: 'Psychic', type2: null, hp: 60, maxHp: 60, attack: 48, spAtk: 43, def: 45, spDef: 90, color: '😴', moves: ['Pound', 'Hypnosis', 'Confusion', 'Psychic'], moveTypes: ['Normal', 'Psychic', 'Psychic', 'Psychic'] },
    { name: 'Slowpoke', type: 'Water', type2: 'Psychic', hp: 90, maxHp: 90, attack: 65, spAtk: 40, def: 65, spDef: 40, color: '🐚', moves: ['Tackle', 'Water Gun', 'Confusion', 'Psychic'], moveTypes: ['Normal', 'Water', 'Psychic', 'Psychic'] },
    { name: 'Shellder', type: 'Water', type2: null, hp: 30, maxHp: 30, attack: 65, spAtk: 45, def: 100, spDef: 25, color: '🐚', moves: ['Tackle', 'Water Gun', 'Clamp', 'Ice Beam'], moveTypes: ['Normal', 'Water', 'Water', 'Ice'] },
    { name: 'Voltorb', type: 'Electric', type2: null, hp: 40, maxHp: 40, attack: 55, spAtk: 55, def: 50, spDef: 55, color: '🔴', moves: ['Tackle', 'Spark', 'Self-Destruct', 'Thunderbolt'], moveTypes: ['Normal', 'Electric', 'Normal', 'Electric'] },
    { name: 'Exeggcute', type: 'Grass', type2: 'Psychic', hp: 60, maxHp: 60, attack: 60, spAtk: 60, def: 80, spDef: 45, color: '🥚', moves: ['Barrage', 'Confusion', 'Leech Seed', 'Psychic'], moveTypes: ['Normal', 'Psychic', 'Grass', 'Psychic'] },
    { name: 'Omanyte', type: 'Rock', type2: 'Water', hp: 35, maxHp: 35, attack: 40, spAtk: 90, def: 100, spDef: 55, color: '🐚', moves: ['Water Gun', 'Bite', 'Ancient Power', 'Hydro Pump'], moveTypes: ['Water', 'Dark', 'Rock', 'Water'] },

    // Rare (attack 71-85) - Low encounter rate
    { name: 'Farfetchd', type: 'Normal', type2: 'Flying', hp: 52, maxHp: 52, attack: 90, spAtk: 58, def: 55, spDef: 62, color: '🦆', moves: ['Peck', 'Slash', 'Aerial Ace', 'Leaf Blade'], moveTypes: ['Flying', 'Normal', 'Flying', 'Grass'] },
    { name: 'Grimer', type: 'Poison', type2: null, hp: 80, maxHp: 80, attack: 80, spAtk: 40, def: 50, spDef: 50, color: '🟣', moves: ['Pound', 'Sludge', 'Mud Slap', 'Sludge Bomb'], moveTypes: ['Normal', 'Poison', 'Ground', 'Poison'] },
    { name: 'Doduo', type: 'Normal', type2: 'Flying', hp: 35, maxHp: 35, attack: 85, spAtk: 35, def: 45, spDef: 35, color: '🐦', moves: ['Peck', 'Fury Attack', 'Drill Peck', 'Tri Attack'], moveTypes: ['Flying', 'Normal', 'Flying', 'Normal'] },
    { name: 'Growlithe', type: 'Fire', type2: null, hp: 55, maxHp: 55, attack: 70, spAtk: 70, def: 45, spDef: 50, color: '🐕', moves: ['Ember', 'Bite', 'Flame Wheel', 'Fire Fang'], moveTypes: ['Fire', 'Dark', 'Fire', 'Fire'] },
    { name: 'Bellsprout', type: 'Grass', type2: 'Poison', hp: 50, maxHp: 50, attack: 75, spAtk: 70, def: 35, spDef: 30, color: '🌿', moves: ['Vine Whip', 'Acid', 'Wrap', 'Razor Leaf'], moveTypes: ['Grass', 'Poison', 'Normal', 'Grass'] },
    { name: 'Sandshrew', type: 'Ground', type2: null, hp: 50, maxHp: 50, attack: 75, spAtk: 20, def: 85, spDef: 30, color: '🦔', moves: ['Scratch', 'Sand Attack', 'Dig', 'Earthquake'], moveTypes: ['Normal', 'Ground', 'Ground', 'Ground'] },
    { name: 'Machop', type: 'Fighting', type2: null, hp: 70, maxHp: 70, attack: 80, spAtk: 35, def: 50, spDef: 35, color: '💪', moves: ['Karate Chop', 'Low Kick', 'Focus Energy', 'Seismic Toss'], moveTypes: ['Fighting', 'Fighting', 'Normal', 'Fighting'] },
    { name: 'Mankey', type: 'Fighting', type2: null, hp: 40, maxHp: 40, attack: 80, spAtk: 35, def: 35, spDef: 45, color: '🐵', moves: ['Scratch', 'Karate Chop', 'Fury Swipes', 'Cross Chop'], moveTypes: ['Normal', 'Fighting', 'Normal', 'Fighting'] },
    { name: 'Ponyta', type: 'Fire', type2: null, hp: 50, maxHp: 50, attack: 85, spAtk: 65, def: 55, spDef: 65, color: '🐴', moves: ['Ember', 'Stomp', 'Flame Charge', 'Fire Blast'], moveTypes: ['Fire', 'Normal', 'Fire', 'Fire'] },
    { name: 'Rhyhorn', type: 'Ground', type2: 'Rock', hp: 80, maxHp: 80, attack: 85, spAtk: 30, def: 95, spDef: 30, color: '🦏', moves: ['Horn Attack', 'Stomp', 'Rock Blast', 'Earthquake'], moveTypes: ['Normal', 'Normal', 'Rock', 'Ground'] },
    { name: 'Tangela', type: 'Grass', type2: null, hp: 65, maxHp: 65, attack: 75, spAtk: 100, def: 115, spDef: 40, color: '🌿', moves: ['Vine Whip', 'Bind', 'Mega Drain', 'Power Whip'], moveTypes: ['Grass', 'Normal', 'Grass', 'Grass'] },
    { name: 'Lickitung', type: 'Normal', type2: null, hp: 90, maxHp: 90, attack: 75, spAtk: 60, def: 75, spDef: 75, color: '👅', moves: ['Lick', 'Stomp', 'Slam', 'Power Whip'], moveTypes: ['Ghost', 'Normal', 'Normal', 'Grass'] },
    { name: 'Chansey', type: 'Normal', type2: null, hp: 250, maxHp: 250, attack: 15, spAtk: 35, def: 5, spDef: 105, color: '🥚', moves: ['Pound', 'Double Slap', 'Egg Bomb', 'Softboiled'], moveTypes: ['Normal', 'Normal', 'Normal', 'Normal'] },
    { name: 'Dragonair', type: 'Dragon', type2: null, hp: 61, maxHp: 61, attack: 84, spAtk: 70, def: 65, spDef: 70, color: '🐉', moves: ['Twister', 'Slam', 'Dragon Rage', 'Dragon Pulse'], moveTypes: ['Dragon', 'Normal', 'Dragon', 'Dragon'] },
    { name: 'Weepinbell', type: 'Grass', type2: 'Poison', hp: 65, maxHp: 65, attack: 90, spAtk: 85, def: 50, spDef: 45, color: '🌿', moves: ['Vine Whip', 'Acid', 'Razor Leaf', 'Slam'], moveTypes: ['Grass', 'Poison', 'Grass', 'Normal'] },
    { name: 'Kabuto', type: 'Rock', type2: 'Water', hp: 30, maxHp: 30, attack: 80, spAtk: 55, def: 90, spDef: 45, color: '🦀', moves: ['Scratch', 'Aqua Jet', 'Ancient Power', 'Mud Shot'], moveTypes: ['Normal', 'Water', 'Rock', 'Ground'] },

    // Very Rare (attack 86-100) - Very low encounter rate
    { name: 'Kangaskhan', type: 'Normal', type2: null, hp: 105, maxHp: 105, attack: 95, spAtk: 40, def: 80, spDef: 80, color: '🦘', moves: ['Mega Punch', 'Bite', 'Dizzy Punch', 'Outrage'], moveTypes: ['Normal', 'Dark', 'Normal', 'Dragon'] },
    { name: 'Mr. Mime', type: 'Psychic', type2: null, hp: 40, maxHp: 40, attack: 45, spAtk: 100, def: 65, spDef: 120, color: '🤡', moves: ['Confusion', 'Psybeam', 'Psychic', 'Dazzling Gleam'], moveTypes: ['Psychic', 'Psychic', 'Psychic', 'Normal'] },
    { name: 'Jynx', type: 'Ice', type2: 'Psychic', hp: 65, maxHp: 65, attack: 50, spAtk: 115, def: 35, spDef: 95, color: '💋', moves: ['Pound', 'Ice Punch', 'Psychic', 'Blizzard'], moveTypes: ['Normal', 'Ice', 'Psychic', 'Ice'] },
    { name: 'Abra', type: 'Psychic', type2: null, hp: 25, maxHp: 25, attack: 20, spAtk: 105, def: 15, spDef: 55, color: '🔮', moves: ['Teleport', 'Confusion', 'Psybeam', 'Psychic'], moveTypes: ['Psychic', 'Psychic', 'Psychic', 'Psychic'] },
    { name: 'Electabuzz', type: 'Electric', type2: null, hp: 65, maxHp: 65, attack: 83, spAtk: 95, def: 57, spDef: 85, color: '⚡', moves: ['Thunder Punch', 'Spark', 'Thunderbolt', 'Thunder'], moveTypes: ['Electric', 'Electric', 'Electric', 'Electric'] },
    { name: 'Magmar', type: 'Fire', type2: null, hp: 65, maxHp: 65, attack: 95, spAtk: 100, def: 57, spDef: 85, color: '🔥', moves: ['Fire Punch', 'Ember', 'Flamethrower', 'Fire Blast'], moveTypes: ['Fire', 'Fire', 'Fire', 'Fire'] },
    { name: 'Pinsir', type: 'Bug', type2: null, hp: 65, maxHp: 65, attack: 125, spAtk: 55, def: 100, spDef: 70, color: '🪲', moves: ['Vice Grip', 'X-Scissor', 'Guillotine', 'Superpower'], moveTypes: ['Normal', 'Bug', 'Normal', 'Fighting'] },
    { name: 'Tauros', type: 'Normal', type2: null, hp: 75, maxHp: 75, attack: 100, spAtk: 40, def: 95, spDef: 70, color: '🐂', moves: ['Tackle', 'Horn Attack', 'Thrash', 'Giga Impact'], moveTypes: ['Normal', 'Normal', 'Normal', 'Normal'] },
    { name: 'Scyther', type: 'Bug', type2: 'Flying', hp: 70, maxHp: 70, attack: 110, spAtk: 55, def: 80, spDef: 80, color: '🦗', moves: ['Quick Attack', 'Fury Cutter', 'Slash', 'X-Scissor'], moveTypes: ['Normal', 'Bug', 'Normal', 'Bug'] },
    { name: 'Ditto', type: 'Normal', type2: null, hp: 48, maxHp: 48, attack: 48, spAtk: 48, def: 48, spDef: 48, color: '🟣', moves: ['Transform', 'Struggle'], moveTypes: ['Normal', 'Normal'] },
    { name: 'Eevee', type: 'Normal', type2: null, hp: 55, maxHp: 55, attack: 55, spAtk: 45, def: 50, spDef: 65, color: '🦊', moves: ['Tackle', 'Quick Attack', 'Bite', 'Take Down'], moveTypes: ['Normal', 'Normal', 'Dark', 'Normal'] },
    { name: 'Porygon', type: 'Normal', type2: null, hp: 65, maxHp: 65, attack: 60, spAtk: 85, def: 70, spDef: 75, color: '🤖', moves: ['Tackle', 'Psybeam', 'Tri Attack', 'Hyper Beam'], moveTypes: ['Normal', 'Psychic', 'Normal', 'Normal'] },
    { name: 'Lapras', type: 'Water', type2: 'Ice', hp: 130, maxHp: 130, attack: 85, spAtk: 85, def: 80, spDef: 95, color: '🐋', moves: ['Water Gun', 'Ice Beam', 'Body Slam', 'Hydro Pump'], moveTypes: ['Water', 'Ice', 'Normal', 'Water'] },
    { name: 'Aerodactyl', type: 'Rock', type2: 'Flying', hp: 80, maxHp: 80, attack: 105, spAtk: 60, def: 65, spDef: 75, color: '🦖', moves: ['Wing Attack', 'Bite', 'Rock Slide', 'Hyper Beam'], moveTypes: ['Flying', 'Dark', 'Rock', 'Normal'] },
    { name: 'Beedrill', type: 'Bug', type2: 'Poison', hp: 65, maxHp: 65, attack: 90, spAtk: 45, def: 40, spDef: 80, color: '🐝', moves: ['Twineedle', 'Poison Jab', 'X-Scissor', 'Pin Missile'], moveTypes: ['Bug', 'Poison', 'Bug', 'Bug'] },
    { name: 'Butterfree', type: 'Bug', type2: 'Flying', hp: 60, maxHp: 60, attack: 45, spAtk: 90, def: 50, spDef: 80, color: '🦋', moves: ['Confusion', 'Stun Spore', 'Psybeam', 'Bug Buzz'], moveTypes: ['Psychic', 'Grass', 'Psychic', 'Bug'] },
    { name: 'Hitmonlee', type: 'Fighting', type2: null, hp: 50, maxHp: 50, attack: 120, spAtk: 35, def: 53, spDef: 110, color: '🦵', moves: ['Double Kick', 'High Jump Kick', 'Mega Kick', 'Blaze Kick'], moveTypes: ['Fighting', 'Fighting', 'Normal', 'Fire'] },
    { name: 'Hitmonchan', type: 'Fighting', type2: null, hp: 50, maxHp: 50, attack: 105, spAtk: 35, def: 79, spDef: 110, color: '🥊', moves: ['Mach Punch', 'Fire Punch', 'Ice Punch', 'Thunder Punch'], moveTypes: ['Fighting', 'Fire', 'Ice', 'Electric'] }
  ];

  // Function to get weighted random Pokemon based on attack power
  // Difficulty-based encounter rates
  const getEncounterRates = () => {
    switch (difficulty) {
      case 'easy':
        return { veryCommon: 40, common: 30, uncommon: 22.5, rare: 5, veryRare: 2.5 };
      case 'hard':
        return { veryCommon: 20, common: 25, uncommon: 25, rare: 15, veryRare: 15 };
      default: // medium
        return { veryCommon: 35, common: 30, uncommon: 20, rare: 10, veryRare: 5 };
    }
  };

  // Difficulty-based catch rate multiplier
  const getCatchRateMultiplier = () => {
    switch (difficulty) {
      case 'easy': return 1.75;  // 175% of base
      case 'hard': return 0.9;   // 90% of base
      default: return 1.0;       // 100% (medium)
    }
  };

  // Difficulty-based enemy attack power multiplier
  const getEnemyAttackMultiplier = () => {
    switch (difficulty) {
      case 'easy': return 0.8;   // 80% of base
      case 'hard': return 1.1;   // 110% of base
      default: return 1.0;       // 100% (medium)
    }
  };

  const getWeightedRandomPokemon = (pokemonList) => {
    // Group Pokemon by rarity based on attack power
    const maxAttack = Math.max(...pokemonList.map(p => p.attack));

    const veryCommon = pokemonList.filter(p => p.attack / maxAttack <= 0.3);   // attack 10-30
    const common = pokemonList.filter(p => p.attack / maxAttack > 0.3 && p.attack / maxAttack <= 0.5);  // attack 31-50
    const uncommon = pokemonList.filter(p => p.attack / maxAttack > 0.5 && p.attack / maxAttack <= 0.7); // attack 51-70
    const rare = pokemonList.filter(p => p.attack / maxAttack > 0.7 && p.attack / maxAttack <= 0.85);    // attack 71-85
    const veryRare = pokemonList.filter(p => p.attack / maxAttack > 0.85);     // attack 86+

    // Get difficulty-based encounter rates
    const rates = getEncounterRates();
    const roll = Math.random() * 100;
    let selectedTier;

    if (roll < rates.veryCommon) {
      selectedTier = veryCommon.length > 0 ? veryCommon : common;
    } else if (roll < rates.veryCommon + rates.common) {
      selectedTier = common.length > 0 ? common : veryCommon;
    } else if (roll < rates.veryCommon + rates.common + rates.uncommon) {
      selectedTier = uncommon.length > 0 ? uncommon : common;
    } else if (roll < rates.veryCommon + rates.common + rates.uncommon + rates.rare) {
      selectedTier = rare.length > 0 ? rare : uncommon;
    } else {
      selectedTier = veryRare.length > 0 ? veryRare : rare;
    }

    // Pick random Pokemon from the selected tier
    if (selectedTier.length === 0) {
      selectedTier = pokemonList; // Fallback to all Pokemon
    }

    return { ...selectedTier[Math.floor(Math.random() * selectedTier.length)] };
  };

  const typeChart = {
    Normal: { Rock: 0.5, Steel: 0.5, Ghost: 0 },
    Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
    Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
    Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
    Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
    Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
    Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
    Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Rock: 2, Steel: 2 },
    Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Steel: 0, Ghost: 0.5 },
    Fighting: { Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Ghost: 0 },
    Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
    Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Dark: 2, Steel: 0.5, Ghost: 0.5 },
    Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
    Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5 },
    Dragon: { Dragon: 2, Steel: 0.5 },
    Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 },
    Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 }
  };

  const getTypeEffectiveness = (attackType, defenseType, defenseType2) => {
    if (!attackType || !defenseType) return 1;
    
    const effectiveness1 = typeChart[attackType]?.[defenseType];
    const eff1 = effectiveness1 !== undefined ? effectiveness1 : 1;
    
    if (defenseType2) {
      const effectiveness2 = typeChart[attackType]?.[defenseType2];
      const eff2 = effectiveness2 !== undefined ? effectiveness2 : 1;
      return eff1 * eff2;
    }
    
    return eff1;
  };

  const chooseStarter = (starter) => {
    playSound('sendout');
    const newPokemon = { ...starter };
    setPlayerPokemon(newPokemon);
    setAvailableTeam([newPokemon]);
    setPokedex([newPokemon]); // Add starter to pokedex
    encounterWildPokemon();
    setGameState('battle');
    setBattleLog([`You chose ${starter.name}!`]);
  };

  // Mew - mythical Pokemon, 1% encounter rate
  const mewData = { name: 'Mew', type: 'Psychic', type2: null, hp: 100, maxHp: 100, attack: 100, spAtk: 100, def: 100, spDef: 100, color: '🩷', moves: ['Psychic', 'Ancient Power', 'Aura Sphere', 'Shadow Ball'], moveTypes: ['Psychic', 'Rock', 'Fighting', 'Ghost'] };

  const encounterWildPokemon = () => {
    // 1% chance to encounter Mew
    if (Math.random() < 0.01) {
      const wild = { ...mewData };
      setWildPokemon(wild);
      setBattleLog([`A wild Mew appeared!`]);
      return;
    }
    // STAGE 1: Normal wild Pokemon encounters (used only on game start)
    // Uses weighted random: weaker Pokemon appear more often, stronger Pokemon are rare
    const wild = getWeightedRandomPokemon(wildPokemons);
    setWildPokemon(wild);
    setBattleLog([`A wild ${wild.name} appeared!`]);
  };

  const addLog = (message) => {
    setBattleLog(prev => [...prev.slice(-4), message]);
  };

  const checkEvolution = async (pokemon) => {
    const newExp = (pokemon.exp || 0) + 1;
    
    // Check if should evolve (every 3 exp)
    if (newExp % 3 === 0) {
      playSound('evolve');
      addLog(`${pokemon.name} is evolving!`);
      setIsEvolving(true);
      
      const evolutionMap = {
        'charmander': { name: 'Charmeleon', type2: null },
        'charmeleon': { name: 'Charizard', type2: 'Flying' },
        'squirtle': { name: 'Wartortle', type2: null },
        'wartortle': { name: 'Blastoise', type2: null },
        'bulbasaur': { name: 'Ivysaur', type2: 'Poison' },
        'ivysaur': { name: 'Venusaur', type2: 'Poison' },
        'rattata': { name: 'Raticate', type2: null },
        'pidgey': { name: 'Pidgeotto', type2: 'Flying' },
        'pidgeotto': { name: 'Pidgeot', type2: 'Flying' },
        'caterpie': { name: 'Metapod', type2: null },
        'metapod': { name: 'Butterfree', type2: 'Flying' },
        'weedle': { name: 'Kakuna', type2: 'Poison' },
        'kakuna': { name: 'Beedrill', type2: 'Poison' },
        // magikarp has special evolution handling below
        'geodude': { name: 'Graveler', type2: 'Ground' },
        'graveler': { name: 'Golem', type2: 'Ground' },
        'zubat': { name: 'Golbat', type2: 'Flying' },
        'oddish': { name: 'Gloom', type2: 'Poison' },
        'gloom': { name: 'Vileplume', type2: 'Poison' },
        'bellsprout': { name: 'Weepinbell', type2: 'Poison' },
        'weepinbell': { name: 'Victreebel', type2: 'Poison' },
        'machop': { name: 'Machoke', type2: null },
        'machoke': { name: 'Machamp', type2: null },
        'mankey': { name: 'Primeape', type2: null },
        'gastly': { name: 'Haunter', type2: 'Poison' },
        'haunter': { name: 'Gengar', type2: 'Poison' },
        'dratini': { name: 'Dragonair', type2: null },
        'dragonair': { name: 'Dragonite', type2: 'Flying' },
        'growlithe': { name: 'Arcanine', type2: null },
        'vulpix': { name: 'Ninetales', type2: null },
        'ponyta': { name: 'Rapidash', type2: null },
        'sandshrew': { name: 'Sandslash', type2: null },
        'diglett': { name: 'Dugtrio', type2: null },
        'meowth': { name: 'Persian', type2: null },
        'psyduck': { name: 'Golduck', type2: null },
        'poliwag': { name: 'Poliwhirl', type2: null },
        'poliwhirl': { name: 'Poliwrath', type2: 'Fighting' },
        'tentacool': { name: 'Tentacruel', type2: 'Poison' },
        'magnemite': { name: 'Magneton', type2: 'Steel' },
        'spearow': { name: 'Fearow', type2: 'Flying' },
        'rhyhorn': { name: 'Rhydon', type2: 'Rock' },
        'cubone': { name: 'Marowak', type2: null },
        'paras': { name: 'Parasect', type2: 'Grass' },
        'abra': { name: 'Kadabra', type2: null },
        'kadabra': { name: 'Alakazam', type2: null },
        'krabby': { name: 'Kingler', type2: null },
        'goldeen': { name: 'Seaking', type2: null },
        'horsea': { name: 'Seadra', type2: null },
        'staryu': { name: 'Starmie', type2: 'Psychic' },
        'slowpoke': { name: 'Slowbro', type2: 'Psychic' },
        'shellder': { name: 'Cloyster', type2: 'Ice' },
        'drowzee': { name: 'Hypno', type2: null },
        'exeggcute': { name: 'Exeggutor', type2: 'Psychic' },
        'nidoranf': { name: 'Nidorina', type2: null },
        'nidorina': { name: 'Nidoqueen', type2: 'Ground' },
        'nidoranm': { name: 'Nidorino', type2: null },
        'nidorino': { name: 'Nidoking', type2: 'Ground' },
        'pikachu': { name: 'Raichu', type2: null },
        'clefairy': { name: 'Clefable', type2: null },
        'jigglypuff': { name: 'Wigglytuff', type2: null },
        'venonat': { name: 'Venomoth', type2: 'Poison' },
        'seel': { name: 'Dewgong', type2: 'Ice' },
        'voltorb': { name: 'Electrode', type2: null },
        'omanyte': { name: 'Omastar', type2: 'Water' },
        'kabuto': { name: 'Kabutops', type2: 'Water' },
        'koffing': { name: 'Weezing', type2: null },
        'grimer': { name: 'Muk', type2: null },
        'doduo': { name: 'Dodrio', type2: 'Flying' },
        'dratini': { name: 'Dragonair', type2: null },
        'ekans': { name: 'Arbok', type2: null },
        'clefairy': { name: 'Clefable', type2: null },
        'jigglypuff': { name: 'Wigglytuff', type2: null }
      };
      
      const lowerName = pokemon.name.toLowerCase();

      // Special case: Eevee randomly evolves into Vaporeon, Jolteon, or Flareon
      if (lowerName === 'eevee') {
        const eeveelutions = [
          { name: 'Vaporeon', type: 'Water', type2: null, hp: 130, maxHp: 130, attack: 65, spAtk: 110, def: 60, spDef: 95, color: '💧', moves: ['Water Gun', 'Aurora Beam', 'Hydro Pump', 'Ice Beam'], moveTypes: ['Water', 'Ice', 'Water', 'Ice'] },
          { name: 'Jolteon', type: 'Electric', type2: null, hp: 65, maxHp: 65, attack: 65, spAtk: 110, def: 60, spDef: 95, color: '⚡', moves: ['Thundershock', 'Quick Attack', 'Thunder', 'Pin Missile'], moveTypes: ['Electric', 'Normal', 'Electric', 'Bug'] },
          { name: 'Flareon', type: 'Fire', type2: null, hp: 65, maxHp: 65, attack: 130, spAtk: 95, def: 60, spDef: 110, color: '🔥', moves: ['Ember', 'Quick Attack', 'Fire Blast', 'Bite'], moveTypes: ['Fire', 'Normal', 'Fire', 'Dark'] },
        ];

        const chosen = eeveelutions[Math.floor(Math.random() * eeveelutions.length)];

        const evolvedPokemon = {
          ...chosen,
          exp: newExp,
          defeatedMewtwo: pokemon.defeatedMewtwo
        };

        addLog(`${pokemon.name} evolved into ${chosen.name}!`);

        setTimeout(() => {
          setPlayerPokemon(evolvedPokemon);
          setAvailableTeam(prev => prev.map(p =>
            p.name.toLowerCase() === lowerName ? evolvedPokemon : p
          ));
          setPokedex(prev => prev.find(p => p.name === chosen.name) ? prev : [...prev, evolvedPokemon]);
          setIsEvolving(false);
        }, 2000);

        return evolvedPokemon;
      }

      // Special case: Magikarp transforms into the mighty Gyarados
      if (lowerName === 'magikarp') {
        const gyarados = {
          name: 'Gyarados', type: 'Water', type2: 'Flying',
          hp: 95, maxHp: 95, attack: 125, spAtk: 60, def: 79, spDef: 100,
          color: '🐉', moves: ['Hydro Pump', 'Bite', 'Ice Beam', 'Thrash'],
          moveTypes: ['Water', 'Dark', 'Ice', 'Normal'],
          exp: newExp, defeatedMewtwo: pokemon.defeatedMewtwo
        };

        addLog(`${pokemon.name} evolved into Gyarados!`);

        setTimeout(() => {
          setPlayerPokemon(gyarados);
          setAvailableTeam(prev => prev.map(p =>
            p.name.toLowerCase() === lowerName ? gyarados : p
          ));
          setPokedex(prev => prev.find(p => p.name === 'Gyarados') ? prev : [...prev, gyarados]);
          setIsEvolving(false);
        }, 2000);

        return gyarados;
      }

      const nextEvolution = evolutionMap[lowerName];

      if (nextEvolution) {
        const evolvedPokemon = {
          ...pokemon,
          name: nextEvolution.name,
          type: nextEvolution.type || pokemon.type,
          type2: nextEvolution.type2,
          hp: pokemon.maxHp + 15,
          maxHp: pokemon.maxHp + 15,
          attack: pokemon.attack + 15,
          spAtk: (pokemon.spAtk || 0) + 15,
          def: (pokemon.def || 0) + 15,
          spDef: (pokemon.spDef || 0) + 15,
          exp: newExp
        };

        addLog(`${pokemon.name} evolved into ${nextEvolution.name}!`);
        addLog(`All stats +15!`);

        setTimeout(() => {
          setPlayerPokemon(evolvedPokemon);
          setAvailableTeam(prev => prev.map(p =>
            p.name.toLowerCase() === lowerName ? evolvedPokemon : p
          ));
          setPokedex(prev => prev.find(p => p.name === nextEvolution.name) ? prev : [...prev, evolvedPokemon]);
          setIsEvolving(false);
        }, 2000);
        
        return evolvedPokemon;
      } else {
        // No evolution available (final form)
        addLog(`${pokemon.name} is at max evolution!`);
        addLog(`All stats +5!`);

        const strengthenedPokemon = {
          ...pokemon,
          hp: pokemon.maxHp + 5,
          maxHp: pokemon.maxHp + 5,
          attack: pokemon.attack + 5,
          spAtk: (pokemon.spAtk || 0) + 5,
          def: (pokemon.def || 0) + 5,
          spDef: (pokemon.spDef || 0) + 5,
          exp: newExp
        };
        
        setTimeout(() => {
          setPlayerPokemon(strengthenedPokemon);
          setAvailableTeam(prev => prev.map(p => 
            p.name.toLowerCase() === lowerName ? strengthenedPokemon : p
          ));
          setIsEvolving(false);
        }, 2000);
        
        return strengthenedPokemon;
      }
    }
    
    // No evolution this time, just increase exp
    return { ...pokemon, exp: newExp };
  };

  // Status moves - deal no damage but have special effects
  const statusMoves = {
    'Splash': { effect: 'nothing', message: 'But nothing happened!' },
    'Growl': { effect: 'lower_attack', message: "'s attack fell!" },
    'Withdraw': { effect: 'raise_defense', message: "'s defense rose!" },
    'Harden': { effect: 'raise_defense', message: "'s defense rose!" },
    'Defense Curl': { effect: 'raise_defense', message: "'s defense rose!" },
    'String Shot': { effect: 'nothing', message: "'s speed fell!" },
    'Sand Attack': { effect: 'nothing', message: "'s accuracy fell!" },
    'Sing': { effect: 'sleep', message: ' fell asleep!' },
    'Hypnosis': { effect: 'sleep', message: ' fell asleep!' },
    'Stun Spore': { effect: 'sleep', message: ' fell asleep!' },
    'Spore': { effect: 'sleep', message: ' fell asleep!' },
    'Poison Powder': { effect: 'poison', message: ' was poisoned!' },
    'Focus Energy': { effect: 'nothing', message: ' is getting pumped!' },
    'Dragon Dance': { effect: 'raise_attack', message: "'s attack rose!" },
    'Teleport': { effect: 'teleport', message: ' teleported away!' },
    'Transform': { effect: 'transform', message: ' transformed!' },
    'Leech Seed': { effect: 'heal_small', message: ' was seeded! HP restored!' },
    'Rest': { effect: 'rest', message: ' went to sleep and restored HP!' },
    'Softboiled': { effect: 'heal_half', message: ' restored its HP!' },
    'Self-Destruct': { effect: 'self_destruct', message: '' },
  };

  const isStatusMove = (moveName) => statusMoves.hasOwnProperty(moveName);

  const calculateDamage = (attacker, defender, moveIndex, isEnemyAttack = false) => {
    const moveName = attacker.moves[moveIndex];
    const moveType = attacker.moveTypes[moveIndex];

    // Check if this is a status move
    if (isStatusMove(moveName)) {
      return { damage: 0, effectText: '', isStatus: true, statusData: statusMoves[moveName] };
    }

    // Gen 1-3 Physical/Special split based on move TYPE (not Pokemon type)
    // Special types: Fire, Water, Electric, Grass, Ice, Psychic, Dragon, Dark
    // Physical types: Normal, Fighting, Poison, Ground, Flying, Bug, Rock, Ghost, Steel
    const specialTypes = ['Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Psychic', 'Dragon', 'Dark'];
    const isSpecialMove = specialTypes.includes(moveType);

    // Use appropriate attack and defense stats based on move type
    const attackStat = isSpecialMove ? (attacker.spAtk || 0) : (attacker.attack || 0);
    const defenseStat = isSpecialMove ? (defender.spDef || 0) : (defender.def || 0);

    // Calculate base damage with defense reduction
    // Formula: (attack * 0.4) - (defense * 0.2) + random(0-10)
    let baseDamage = Math.floor(attackStat * 0.4) - Math.floor(defenseStat * 0.2) + Math.floor(Math.random() * 10);
    baseDamage = Math.max(1, baseDamage); // Minimum 1 damage

    // Apply difficulty multiplier for enemy attacks
    if (isEnemyAttack) {
      baseDamage = Math.floor(baseDamage * getEnemyAttackMultiplier());
    }

    // STAB (Same Type Attack Bonus) - 1.5x if move type matches attacker's type
    const hasSTAB = moveType === attacker.type || moveType === attacker.type2;
    const stabMultiplier = hasSTAB ? 1.5 : 1.0;

    const effectiveness = getTypeEffectiveness(moveType, defender.type, defender.type2);
    // If no effect (effectiveness === 0), damage is 0. Otherwise minimum 1 damage.
    const damage = effectiveness === 0 ? 0 : Math.max(1, Math.floor(baseDamage * effectiveness * stabMultiplier));

    let effectText = '';
    if (effectiveness === 0) effectText = " It doesn't affect " + defender.name + "...";
    else if (effectiveness >= 4) effectText = " EXTREMELY effective!";
    else if (effectiveness > 1) effectText = " Super effective!";
    else if (effectiveness < 1) effectText = " Not very effective...";

    return { damage, effectText, isStatus: false };
  };

  const applyStatusEffect = (effect, user, target, isEnemy = false) => {
    const statBoost = 10;
    switch (effect) {
      case 'raise_defense':
        if (isEnemy) {
          setWildPokemon(prev => ({ ...prev, def: (prev.def || 0) + statBoost, spDef: (prev.spDef || 0) + statBoost }));
        } else {
          setPlayerPokemon(prev => ({ ...prev, def: (prev.def || 0) + statBoost, spDef: (prev.spDef || 0) + statBoost }));
        }
        break;
      case 'raise_attack':
        if (isEnemy) {
          setWildPokemon(prev => ({ ...prev, attack: (prev.attack || 0) + statBoost, spAtk: (prev.spAtk || 0) + statBoost }));
        } else {
          setPlayerPokemon(prev => ({ ...prev, attack: (prev.attack || 0) + statBoost, spAtk: (prev.spAtk || 0) + statBoost }));
        }
        break;
      case 'lower_attack':
        if (isEnemy) {
          setWildPokemon(prev => ({ ...prev, attack: Math.max(1, (prev.attack || 0) - statBoost), spAtk: Math.max(1, (prev.spAtk || 0) - statBoost) }));
        } else {
          setPlayerPokemon(prev => ({ ...prev, attack: Math.max(1, (prev.attack || 0) - statBoost), spAtk: Math.max(1, (prev.spAtk || 0) - statBoost) }));
        }
        break;
      case 'heal_full':
        if (isEnemy) {
          setWildPokemon(prev => ({ ...prev, hp: prev.maxHp }));
        } else {
          setPlayerPokemon(prev => ({ ...prev, hp: prev.maxHp }));
        }
        break;
      case 'heal_half':
        if (isEnemy) {
          setWildPokemon(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + Math.floor(prev.maxHp / 2)) }));
        } else {
          setPlayerPokemon(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + Math.floor(prev.maxHp / 2)) }));
        }
        break;
      case 'heal_small':
        if (isEnemy) {
          setWildPokemon(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + Math.floor(prev.maxHp / 4)) }));
        } else {
          setPlayerPokemon(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + Math.floor(prev.maxHp / 4)) }));
        }
        break;
      case 'self_destruct':
        if (isEnemy) {
          setWildPokemon(prev => ({ ...prev, hp: 0 }));
        } else {
          setPlayerPokemon(prev => ({ ...prev, hp: 0 }));
        }
        break;
      case 'sleep':
        // Put target to sleep for 1-2 turns
        if (isEnemy) {
          setIsSleeping(prev => ({ ...prev, enemy: Math.floor(Math.random() * 2) + 1 }));
        } else {
          setIsSleeping(prev => ({ ...prev, player: Math.floor(Math.random() * 2) + 1 }));
        }
        break;
      case 'poison':
        if (isEnemy) {
          setIsPoisoned(prev => ({ ...prev, enemy: true }));
        } else {
          setIsPoisoned(prev => ({ ...prev, player: true }));
        }
        break;
      case 'rest':
        // Heal to full HP and put self to sleep for 2 turns
        if (isEnemy) {
          setWildPokemon(prev => ({ ...prev, hp: prev.maxHp }));
          setIsSleeping(prev => ({ ...prev, enemy: 2 }));
        } else {
          setPlayerPokemon(prev => ({ ...prev, hp: prev.maxHp }));
          setIsSleeping(prev => ({ ...prev, player: 2 }));
        }
        break;
      default:
        break;
    }
  };

  // Teleport: spawn a new wild Pokemon mid-battle (no heal, no EXP)
  const teleportToNewBattle = () => {
    let wild;
    if (hasDefeatedMewtwo.current) {
      const finalEvolutionPokemon = [
        { name: 'Charizard', type: 'Fire', type2: 'Flying', hp: 90, maxHp: 90, attack: 84, spAtk: 109, def: 78, spDef: 85, color: '🔥', moves: ['Flamethrower', 'Wing Attack', 'Fire Blast', 'Dragon Claw'], moveTypes: ['Fire', 'Flying', 'Fire', 'Dragon'] },
        { name: 'Blastoise', type: 'Water', type2: null, hp: 95, maxHp: 95, attack: 83, spAtk: 85, def: 100, spDef: 105, color: '💧', moves: ['Hydro Pump', 'Bite', 'Ice Beam', 'Skull Bash'], moveTypes: ['Water', 'Dark', 'Ice', 'Normal'] },
        { name: 'Venusaur', type: 'Grass', type2: 'Poison', hp: 95, maxHp: 95, attack: 82, spAtk: 100, def: 83, spDef: 100, color: '🌿', moves: ['Solar Beam', 'Sludge Bomb', 'Earthquake', 'Petal Dance'], moveTypes: ['Grass', 'Poison', 'Ground', 'Grass'] },
        { name: 'Gengar', type: 'Ghost', type2: 'Poison', hp: 70, maxHp: 70, attack: 65, spAtk: 130, def: 60, spDef: 75, color: '👻', moves: ['Shadow Ball', 'Sludge Bomb', 'Dark Pulse', 'Hypnosis'], moveTypes: ['Ghost', 'Poison', 'Dark', 'Psychic'] },
        { name: 'Dragonite', type: 'Dragon', type2: 'Flying', hp: 110, maxHp: 110, attack: 134, spAtk: 100, def: 95, spDef: 100, color: '🐉', moves: ['Dragon Claw', 'Wing Attack', 'Thunder', 'Outrage'], moveTypes: ['Dragon', 'Flying', 'Electric', 'Dragon'] },
      ];
      wild = { ...finalEvolutionPokemon[Math.floor(Math.random() * finalEvolutionPokemon.length)] };
    } else if (Math.random() < 0.01) {
      wild = { ...mewData };
    } else {
      wild = getWeightedRandomPokemon(wildPokemons);
    }
    setWildPokemon(wild);
    // Reset enemy status only
    setIsPoisoned(prev => ({ ...prev, enemy: false }));
    setIsSleeping(prev => ({ ...prev, enemy: 0 }));
    addLog(`Teleported to a new area!`);
    addLog(`A wild ${wild.name} appeared!`);
    setIsPlayerTurn(true);
  };

  // Transform: copy opponent's stats, type, moves (keep HP, name, exp)
  // spriteName = visual sprite override, originalForm = to revert on catch/next battle
  const transformInto = (user, target, isEnemy = false) => {
    const base = isEnemy ? wildPokemon : playerPokemon;
    const transformed = {
      ...base,
      spriteName: target.name,
      originalForm: {
        type: base.type,
        type2: base.type2,
        attack: base.attack,
        spAtk: base.spAtk,
        def: base.def,
        spDef: base.spDef,
        moves: [...base.moves],
        moveTypes: [...base.moveTypes],
      },
      type: target.type,
      type2: target.type2,
      attack: target.attack,
      spAtk: target.spAtk || 0,
      def: target.def || 0,
      spDef: target.spDef || 0,
      moves: [...target.moves],
      moveTypes: [...target.moveTypes],
    };
    if (isEnemy) {
      setWildPokemon(transformed);
    } else {
      setPlayerPokemon(transformed);
    }
  };

  const playerAttack = async (moveIndex) => {
    if (!isPlayerTurn || gameState !== 'battle' || isEvolving) return;

    // Check if player is asleep
    if (isSleeping.player > 0) {
      const turnsLeft = isSleeping.player - 1;
      setIsSleeping(prev => ({ ...prev, player: turnsLeft }));
      if (turnsLeft > 0) {
        addLog(`${playerPokemon.name} is fast asleep!`);
        setIsPlayerTurn(false);
        setTimeout(enemyAttack, 1500);
        return;
      } else {
        addLog(`${playerPokemon.name} woke up!`);
        // Continue to attack normally below
      }
    }

    const moveName = playerPokemon.moves[moveIndex];
    const result = calculateDamage(playerPokemon, wildPokemon, moveIndex);

    playSound('attack');

    // Handle status moves
    if (result.isStatus) {
      const status = result.statusData;
      addLog(`${playerPokemon.name} used ${moveName}!`);

      if (status.effect === 'self_destruct') {
        // Self-Destruct: deal massive damage to enemy, faint self
        const selfDestructDamage = Math.min(wildPokemon.hp, Math.floor(playerPokemon.attack * 1.5));
        setWildPokemon(prev => ({ ...prev, hp: Math.max(0, prev.hp - selfDestructDamage) }));
        setPlayerPokemon(prev => ({ ...prev, hp: 0 }));
        addLog(`${wildPokemon.name} took ${selfDestructDamage} damage!`);
        addLog(`${playerPokemon.name} fainted from the explosion!`);
        if (wildPokemon.hp - selfDestructDamage <= 0) {
          setTimeout(() => setGameState('victory'), 1500);
        } else {
          setTimeout(() => setGameState('defeat'), 1500);
        }
        return;
      }

      // Moves that target the enemy (Growl lowers enemy attack)
      if (status.effect === 'lower_attack') {
        applyStatusEffect('lower_attack', playerPokemon, wildPokemon, true);
        addLog(`${wildPokemon.name}${status.message}`);
      }
      // Moves that buff self (Withdraw, Harden, Dragon Dance, etc.)
      else if (status.effect === 'raise_defense' || status.effect === 'raise_attack') {
        applyStatusEffect(status.effect, playerPokemon, wildPokemon, false);
        addLog(`${playerPokemon.name}${status.message}`);
      }
      // Heal moves target self
      else if (status.effect === 'heal_full' || status.effect === 'heal_half' || status.effect === 'heal_small') {
        applyStatusEffect(status.effect, playerPokemon, wildPokemon, false);
        addLog(`${playerPokemon.name}${status.message}`);
      }
      // Rest: heal full HP but fall asleep for 2 turns
      else if (status.effect === 'rest') {
        applyStatusEffect('rest', playerPokemon, wildPokemon, false);
        addLog(`${playerPokemon.name}${status.message}`);
      }
      // Sleep: put enemy to sleep (skip 1-2 turns)
      else if (status.effect === 'sleep') {
        applyStatusEffect('sleep', playerPokemon, wildPokemon, true);
        addLog(`${wildPokemon.name}${status.message}`);
      }
      // Poison: enemy loses 10 HP each turn
      else if (status.effect === 'poison') {
        applyStatusEffect('poison', playerPokemon, wildPokemon, true);
        addLog(`${wildPokemon.name}${status.message}`);
      }
      // Teleport: skip to a new wild Pokemon
      else if (status.effect === 'teleport') {
        teleportToNewBattle();
        return; // Don't trigger enemy attack - new battle started
      }
      // Transform: copy opponent's stats/type/moves
      else if (status.effect === 'transform') {
        transformInto(playerPokemon, wildPokemon, false);
        addLog(`${playerPokemon.name} transformed into ${wildPokemon.name}!`);
      }
      // Flavor-only moves (Splash, String Shot, Sand Attack, Focus Energy)
      else {
        addLog(`${status.effect === 'nothing' && status.message.startsWith("'") ? playerPokemon.name : ''}${status.message}`);
      }

      // After status move, enemy attacks
      setIsPlayerTurn(false);
      setTimeout(enemyAttack, 1500);
      return;
    }

    const { damage, effectText } = result;

    const newWildHp = Math.max(0, wildPokemon.hp - damage);
    const displayDamage = Math.min(damage, wildPokemon.hp);
    setWildPokemon(prev => ({ ...prev, hp: newWildHp }));
    addLog(`${playerPokemon.name} used ${moveName}!${effectText}`);
    if (damage > 0) {
      addLog(`${wildPokemon.name} took ${displayDamage} damage!`);
      playSound('damage');
    }

    if (newWildHp <= 0) {
      setIsPlayerTurn(false);

      // Check if we reached 20 EXP IMMEDIATELY and set ref
      const newExp = (playerPokemon.exp || 0) + 1;
      if (newExp >= 20 && !hasDefeatedMewtwo.current) {
        shouldSpawnMewtwo.current = true;
      }

      setTimeout(async () => {
        addLog(`${wildPokemon.name} fainted!`);

        // Mark Mewtwo as defeated for entire team
        if (wildPokemon.name === 'Mewtwo') {
          const updatedTeam = availableTeam.map(p => ({ ...p, defeatedMewtwo: true }));
          setAvailableTeam(updatedTeam);
          const updatedPlayer = { ...playerPokemon, defeatedMewtwo: true };
          setPlayerPokemon(updatedPlayer);
          hasDefeatedMewtwo.current = true;
          shouldSpawnMewtwo.current = false;
          addLog(`You defeated the legendary Mewtwo!`);
        }

        playSound('levelup');
        addLog(`${playerPokemon.name} gained 1 EXP!`);

        // Show message if we reached 20 EXP
        if (newExp >= 20 && !hasDefeatedMewtwo.current && wildPokemon.name !== 'Mewtwo') {
          addLog(`A powerful presence stirs...`);
        }

        // Check for evolution
        const updatedPokemon = await checkEvolution(playerPokemon);
        if (updatedPokemon) {
          // Only update if NOT evolving (evolution updates happen in setTimeout inside checkEvolution)
          if (newExp % 3 !== 0) {
            // Not evolving, just gaining EXP - update state
            setPlayerPokemon(updatedPokemon);
            setAvailableTeam(prev => prev.map(p =>
              p.name === updatedPokemon.name ? updatedPokemon : p
            ));
          }
        }

        playSound('victory');
        setBattlesWon(prev => prev + 1);
        setTimeout(() => setGameState('victory'), 2500);
      }, 500);
    } else {
      // Apply poison damage to enemy before enemy's turn
      if (isPoisoned.enemy) {
        const poisonDmg = Math.min(10, wildPokemon.hp);
        const newHp = Math.max(0, wildPokemon.hp - 10);
        setWildPokemon(prev => ({ ...prev, hp: Math.max(0, prev.hp - 10) }));
        addLog(`${wildPokemon.name} took ${poisonDmg} poison damage!`);
        if (newHp <= 0) {
          setIsPlayerTurn(false);
          setTimeout(() => {
            addLog(`${wildPokemon.name} fainted from poison!`);
            playSound('victory');
            setBattlesWon(prev => prev + 1);
            setTimeout(() => setGameState('victory'), 1500);
          }, 500);
          return;
        }
      }
      setIsPlayerTurn(false);
      setTimeout(enemyAttack, 1500);
    }
  };

  const enemyAttack = () => {
    // Check if enemy is asleep
    if (isSleeping.enemy > 0) {
      const turnsLeft = isSleeping.enemy - 1;
      setIsSleeping(prev => ({ ...prev, enemy: turnsLeft }));
      if (turnsLeft > 0) {
        addLog(`${wildPokemon.name} is fast asleep!`);
        // Apply poison damage to enemy if poisoned
        if (isPoisoned.enemy && wildPokemon) {
          const poisonDmg = Math.min(10, wildPokemon.hp);
          setWildPokemon(prev => ({ ...prev, hp: Math.max(0, prev.hp - 10) }));
          addLog(`${wildPokemon.name} took ${poisonDmg} poison damage!`);
          if (wildPokemon.hp - 10 <= 0) {
            setTimeout(() => setGameState('victory'), 1000);
            return;
          }
        }
        setIsPlayerTurn(true);
        return;
      } else {
        addLog(`${wildPokemon.name} woke up!`);
        // Continue to attack normally below
      }
    }

    // Use functional setState to ensure we get the most current state
    setPlayerPokemon(prevPlayerPokemon => {
      if (!wildPokemon || !prevPlayerPokemon) return prevPlayerPokemon;

      const moveIndex = Math.floor(Math.random() * wildPokemon.moves.length);
      const moveName = wildPokemon.moves[moveIndex];

      // Calculate damage using the CURRENT playerPokemon from state
      const result = calculateDamage(wildPokemon, prevPlayerPokemon, moveIndex, true);

      // Handle status moves for enemy
      if (result.isStatus) {
        const status = result.statusData;
        addLog(`${wildPokemon.name} used ${moveName}!`);

        if (status.effect === 'self_destruct') {
          // Enemy self-destructs - deal massive damage to player, enemy faints
          const selfDestructDamage = Math.min(prevPlayerPokemon.hp, Math.floor(wildPokemon.attack * 1.5));
          const newHp = Math.max(0, prevPlayerPokemon.hp - selfDestructDamage);
          addLog(`${prevPlayerPokemon.name} took ${selfDestructDamage} damage!`);
          addLog(`${wildPokemon.name} fainted from the explosion!`);
          setWildPokemon(prev => ({ ...prev, hp: 0 }));
          setAvailableTeam(prev => prev.map(p =>
            p.name === prevPlayerPokemon.name ? { ...p, hp: newHp } : p
          ));
          setTimeout(() => setGameState('victory'), 1500);
          return { ...prevPlayerPokemon, hp: newHp };
        }

        // Enemy buffs itself
        if (status.effect === 'raise_defense' || status.effect === 'raise_attack') {
          applyStatusEffect(status.effect, wildPokemon, prevPlayerPokemon, true);
          addLog(`${wildPokemon.name}${status.message}`);
        }
        // Enemy lowers player's attack
        else if (status.effect === 'lower_attack') {
          applyStatusEffect('lower_attack', wildPokemon, prevPlayerPokemon, false);
          addLog(`${prevPlayerPokemon.name}${status.message}`);
        }
        // Enemy heal moves
        else if (status.effect === 'heal_full' || status.effect === 'heal_half' || status.effect === 'heal_small') {
          applyStatusEffect(status.effect, wildPokemon, prevPlayerPokemon, true);
          addLog(`${wildPokemon.name}${status.message}`);
        }
        // Rest: enemy heals full but falls asleep
        else if (status.effect === 'rest') {
          applyStatusEffect('rest', wildPokemon, prevPlayerPokemon, true);
          addLog(`${wildPokemon.name}${status.message}`);
        }
        // Sleep: put player to sleep
        else if (status.effect === 'sleep') {
          applyStatusEffect('sleep', wildPokemon, prevPlayerPokemon, false);
          addLog(`${prevPlayerPokemon.name}${status.message}`);
        }
        // Poison: poison the player
        else if (status.effect === 'poison') {
          applyStatusEffect('poison', wildPokemon, prevPlayerPokemon, false);
          addLog(`${prevPlayerPokemon.name}${status.message}`);
        }
        // Transform: enemy copies player's stats
        else if (status.effect === 'transform') {
          transformInto(wildPokemon, prevPlayerPokemon, true);
          addLog(`${wildPokemon.name} transformed into ${prevPlayerPokemon.name}!`);
        }
        // Teleport: enemy flees, spawn new wild Pokemon (counts as win for player)
        else if (status.effect === 'teleport') {
          addLog(`${wildPokemon.name} fled!`);
          teleportToNewBattle();
          return prevPlayerPokemon;
        }
        // Flavor-only
        else {
          addLog(`${status.effect === 'nothing' && status.message.startsWith("'") ? wildPokemon.name : ''}${status.message}`);
        }

        setIsPlayerTurn(true);
        return prevPlayerPokemon;
      }

      const { damage, effectText } = result;

      const newPlayerHp = Math.max(0, prevPlayerPokemon.hp - damage);
      const currentName = prevPlayerPokemon.name;

      // Update team HP as well
      setAvailableTeam(prev => prev.map(p =>
        p.name === currentName ? { ...p, hp: newPlayerHp } : p
      ));

      const displayDamage = Math.min(damage, prevPlayerPokemon.hp);
      addLog(`${wildPokemon.name} used ${moveName}!${effectText}`);
      if (damage > 0) addLog(`${currentName} took ${displayDamage} damage!`);

      if (newPlayerHp <= 0) {
        setTimeout(() => {
          addLog(`${currentName} fainted!`);
          setGameState('defeat');
        }, 500);
      } else {
        // Apply poison damage to player before their turn
        if (isPoisoned.player) {
          const poisonHp = Math.max(0, newPlayerHp - 10);
          const poisonDmg = Math.min(10, newPlayerHp);
          addLog(`${currentName} took ${poisonDmg} poison damage!`);
          if (poisonHp <= 0) {
            setAvailableTeam(prev => prev.map(p =>
              p.name === currentName ? { ...p, hp: 0 } : p
            ));
            setTimeout(() => {
              addLog(`${currentName} fainted from poison!`);
              setGameState('defeat');
            }, 500);
            return { ...prevPlayerPokemon, hp: 0 };
          }
          setAvailableTeam(prev => prev.map(p =>
            p.name === currentName ? { ...p, hp: poisonHp } : p
          ));
          setIsPlayerTurn(true);
          return { ...prevPlayerPokemon, hp: poisonHp };
        }
        setIsPlayerTurn(true);
      }

      return {
        ...prevPlayerPokemon,
        hp: newPlayerHp
      };
    });
  };

  const usePotion = () => {
    if (potionUsed || !isPlayerTurn || gameState !== 'battle') return;
    
    const healAmount = playerPokemon.maxHp - playerPokemon.hp;
    setPlayerPokemon(prev => ({ ...prev, hp: prev.maxHp }));
    
    // Update team HP
    setAvailableTeam(prev => prev.map(p => 
      p.name === playerPokemon.name ? { ...p, hp: p.maxHp } : p
    ));
    
    setPotionUsed(true);
    addLog(`Used Potion! Restored ${healAmount} HP!`);
    
    playSound('heal');
    
    setIsPlayerTurn(false);
    setTimeout(enemyAttack, 1500);
  };

  const catchPokemon = () => {
    if (!isPlayerTurn || gameState !== 'battle') return;

    const catchRate = wildPokemon.hp / wildPokemon.maxHp;
    const catchChance = Math.random();
    const catchMultiplier = getCatchRateMultiplier();

    // Lower HP = easier to catch. Difficulty affects the threshold.
    // Base: catchChance > catchRate * 0.7 means ~30% base catch at full HP
    // With multiplier: Easy = 1.5x easier, Hard = 0.9x harder
    if (catchChance > catchRate * (0.7 / catchMultiplier)) {
      // Revert transformed Pokemon (Ditto) to original form when caught
      let caughtPokemon = { ...wildPokemon };
      if (caughtPokemon.originalForm) {
        const orig = caughtPokemon.originalForm;
        caughtPokemon = {
          ...caughtPokemon,
          type: orig.type,
          type2: orig.type2,
          attack: orig.attack,
          spAtk: orig.spAtk,
          def: orig.def,
          spDef: orig.spDef,
          moves: [...orig.moves],
          moveTypes: [...orig.moveTypes],
        };
        delete caughtPokemon.spriteName;
        delete caughtPokemon.originalForm;
      }
      const newPokemon = { ...caughtPokemon, hp: caughtPokemon.maxHp };
      
      // Mark Mewtwo as defeated for ALL team members if caught
      if (wildPokemon.name === 'Mewtwo') {
        const updatedTeam = availableTeam.map(p => ({ ...p, defeatedMewtwo: true }));
        setAvailableTeam(updatedTeam);
        const updatedPlayer = { ...playerPokemon, defeatedMewtwo: true };
        setPlayerPokemon(updatedPlayer);
        hasDefeatedMewtwo.current = true;
        shouldSpawnMewtwo.current = false;
      }
      
      setPokedex(prev => {
        const exists = prev.find(p => p.name === wildPokemon.name);
        return exists ? prev : [...prev, newPokemon];
      });
      
      setAvailableTeam(prev => [...prev, newPokemon]);
      addLog(`Success! ${wildPokemon.name} was caught!`);
      
      // Play catch sound
      playSound('catch');
      
      setTimeout(() => setGameState('catch'), 1000);
    } else {
      addLog(`${wildPokemon.name} broke free!`);
      setIsPlayerTurn(false);
      setTimeout(enemyAttack, 1500);
    }
  };

  const switchPokemon = (newPoke) => {
    if (!isPlayerTurn || newPoke.name === playerPokemon.name) return;
    
    const oldPokemonName = playerPokemon.name;
    
    const switchedPokemon = {
      ...newPoke,
      moves: [...newPoke.moves],
      moveTypes: [...newPoke.moveTypes],
    };
    
    // Update the old pokemon's HP in the team
    setAvailableTeam(prev => prev.map(p => {
      if (p.name === oldPokemonName) {
        return { ...p, hp: playerPokemon.hp };
      }
      return p;
    }));
    
    setPlayerPokemon(switchedPokemon);
    playSound('sendout');
    addLog(`Come back, ${oldPokemonName}!`);
    addLog(`Go, ${switchedPokemon.name}!`);
    setIsPlayerTurn(false);
    setTimeout(enemyAttack, 1500);
  };

  const nextBattle = () => {
    totalBattles.current += 1;

    // Check if Team Rocket should appear (every 7-10 battles, only if player has bench Pokemon)
    if (totalBattles.current >= nextRocketBattle.current && availableTeam.length > 1) {
      // Restore/heal before rocket event
      const basePokemon = availableTeam.find(p => p.name === playerPokemon.name);
      let healedPokemon = basePokemon
        ? { ...basePokemon, hp: basePokemon.maxHp, exp: playerPokemon.exp, defeatedMewtwo: playerPokemon.defeatedMewtwo }
        : { ...playerPokemon, hp: playerPokemon.maxHp };
      delete healedPokemon.spriteName;
      delete healedPokemon.originalForm;
      setPlayerPokemon(healedPokemon);
      setAvailableTeam(prev => prev.map(p =>
        p.name === healedPokemon.name ? healedPokemon : p
      ));
      setIsPoisoned({ player: false, enemy: false });
      setIsSleeping({ player: 0, enemy: 0 });
      if (triggerRocketEvent()) return;
    }

    // Restore base stats from availableTeam (undo Withdraw/Growl/Dragon Dance etc.)
    // then heal HP to max
    const basePokemon = availableTeam.find(p => p.name === playerPokemon.name);
    let healedPokemon = basePokemon
      ? { ...basePokemon, hp: basePokemon.maxHp, exp: playerPokemon.exp, defeatedMewtwo: playerPokemon.defeatedMewtwo }
      : { ...playerPokemon, hp: playerPokemon.maxHp };
    // Clean up transform properties
    delete healedPokemon.spriteName;
    delete healedPokemon.originalForm;

    // Reset status effects
    setIsPoisoned({ player: false, enemy: false });
    setIsSleeping({ player: 0, enemy: 0 });

    // Update states
    setPlayerPokemon(healedPokemon);
    setAvailableTeam(prev => prev.map(p =>
      p.name === healedPokemon.name ? healedPokemon : p
    ));

    // STAGE 2: Check ref to see if we should spawn Mewtwo
    if (shouldSpawnMewtwo.current) {
      playSound('mewtwo-warning');
      setGameState('mewtwo-intro');
      setPotionUsed(false);
      setBattleLog([]);
      return;
    }

    // STAGE 3: Post-Mewtwo - spawn final evolutions ONLY
    if (hasDefeatedMewtwo.current) {
      const finalEvolutionPokemon = [
        { name: 'Charizard', type: 'Fire', type2: 'Flying', hp: 90, maxHp: 90, attack: 84, spAtk: 109, def: 78, spDef: 85, color: '🔥', moves: ['Flamethrower', 'Wing Attack', 'Fire Blast', 'Dragon Claw'], moveTypes: ['Fire', 'Flying', 'Fire', 'Dragon'] },
        { name: 'Blastoise', type: 'Water', type2: null, hp: 95, maxHp: 95, attack: 83, spAtk: 85, def: 100, spDef: 105, color: '💧', moves: ['Hydro Pump', 'Bite', 'Ice Beam', 'Skull Bash'], moveTypes: ['Water', 'Dark', 'Ice', 'Normal'] },
        { name: 'Venusaur', type: 'Grass', type2: 'Poison', hp: 95, maxHp: 95, attack: 82, spAtk: 100, def: 83, spDef: 100, color: '🌿', moves: ['Solar Beam', 'Sludge Bomb', 'Earthquake', 'Petal Dance'], moveTypes: ['Grass', 'Poison', 'Ground', 'Grass'] },
        { name: 'Pidgeot', type: 'Normal', type2: 'Flying', hp: 85, maxHp: 85, attack: 80, spAtk: 70, def: 75, spDef: 70, color: '🐦', moves: ['Hurricane', 'Wing Attack', 'Aerial Ace', 'Quick Attack'], moveTypes: ['Flying', 'Flying', 'Flying', 'Normal'] },
        { name: 'Gengar', type: 'Ghost', type2: 'Poison', hp: 70, maxHp: 70, attack: 65, spAtk: 130, def: 60, spDef: 75, color: '👻', moves: ['Shadow Ball', 'Sludge Bomb', 'Dark Pulse', 'Hypnosis'], moveTypes: ['Ghost', 'Poison', 'Dark', 'Psychic'] },
        { name: 'Machamp', type: 'Fighting', type2: null, hp: 110, maxHp: 110, attack: 130, spAtk: 65, def: 80, spDef: 85, color: '💪', moves: ['Dynamic Punch', 'Cross Chop', 'Stone Edge', 'Earthquake'], moveTypes: ['Fighting', 'Fighting', 'Rock', 'Ground'] },
        { name: 'Golem', type: 'Rock', type2: 'Ground', hp: 90, maxHp: 90, attack: 120, spAtk: 55, def: 130, spDef: 65, color: '🪨', moves: ['Earthquake', 'Rock Slide', 'Stone Edge', 'Explosion'], moveTypes: ['Ground', 'Rock', 'Rock', 'Normal'] },
        { name: 'Victreebel', type: 'Grass', type2: 'Poison', hp: 85, maxHp: 85, attack: 105, spAtk: 100, def: 65, spDef: 70, color: '🌿', moves: ['Razor Leaf', 'Sludge Bomb', 'Solar Beam', 'Leaf Blade'], moveTypes: ['Grass', 'Poison', 'Grass', 'Grass'] },
        { name: 'Dragonite', type: 'Dragon', type2: 'Flying', hp: 110, maxHp: 110, attack: 134, spAtk: 100, def: 95, spDef: 100, color: '🐉', moves: ['Dragon Claw', 'Wing Attack', 'Thunder', 'Outrage'], moveTypes: ['Dragon', 'Flying', 'Electric', 'Dragon'] },
        { name: 'Gyarados', type: 'Water', type2: 'Flying', hp: 105, maxHp: 105, attack: 125, spAtk: 60, def: 79, spDef: 100, color: '🐉', moves: ['Hydro Pump', 'Bite', 'Ice Beam', 'Dragon Dance'], moveTypes: ['Water', 'Dark', 'Ice', 'Dragon'] }
      ];

      const wild = { ...finalEvolutionPokemon[Math.floor(Math.random() * finalEvolutionPokemon.length)] };
      setWildPokemon(wild);
      setBattleLog([`A wild ${wild.name} appeared!`]);
      setGameState('battle');
      setIsPlayerTurn(true);
      setPotionUsed(false);
      return;
    }

    // STAGE 1: Normal battles (before reaching 20 EXP)
    // 1% chance to encounter Mew
    if (Math.random() < 0.01) {
      const wild = { ...mewData };
      setWildPokemon(wild);
      setBattleLog([`A wild Mew appeared!`]);
      setGameState('battle');
      setIsPlayerTurn(true);
      setPotionUsed(false);
      return;
    }
    // Uses weighted random: weaker Pokemon appear more often, stronger Pokemon are rare
    const wild = getWeightedRandomPokemon(wildPokemons);
    setWildPokemon(wild);
    setBattleLog([`A wild ${wild.name} appeared!`]);
    setGameState('battle');
    setIsPlayerTurn(true);
    setPotionUsed(false);
  };

  // Team Rocket steal event
  const triggerRocketEvent = () => {
    // Only steal from bench (not active Pokemon), need at least 2 Pokemon
    const benchPokemon = availableTeam.filter(p => p.name !== playerPokemon.name);
    if (benchPokemon.length === 0) return false; // Skip if only 1 Pokemon

    const randomBenchIndex = Math.floor(Math.random() * benchPokemon.length);
    const stolenName = benchPokemon[randomBenchIndex].name;
    const teamIndex = availableTeam.findIndex(p => p.name === stolenName);
    setStolenPokemonIndex(teamIndex);
    setGameState('rocket');
    setRocketPhase('intro');
    setBattleLog([]);

    // Animation sequence - slow and smooth
    setTimeout(() => setRocketPhase('walking'), 2000);
    setTimeout(() => setRocketPhase('grabbing'), 5200);
    setTimeout(() => setRocketPhase('leaving'), 6200);
    setTimeout(() => {
      // Remove stolen Pokemon from team
      setAvailableTeam(prev => prev.filter(p => p.name !== stolenName));
      setRocketPhase('done');
    }, 9500);

    // Set next rocket battle (7-10 battles from now)
    nextRocketBattle.current = totalBattles.current + Math.floor(Math.random() * 4) + 7;
    return true;
  };

  const continueAfterRocket = () => {
    setRocketPhase('');
    setStolenPokemonIndex(-1);
    // Start next normal battle
    const wild = getWeightedRandomPokemon(wildPokemons);
    setWildPokemon(wild);
    setBattleLog([`A wild ${wild.name} appeared!`]);
    setGameState('battle');
    setIsPlayerTurn(true);
    setPotionUsed(false);
  };

  const resetGame = () => {
    setGameState('intro');
    setPlayerPokemon(null);
    setWildPokemon(null);
    setBattleLog([]);
    setIsPlayerTurn(true);
    setPotionUsed(false);
    setBattlesWon(0);
    setAvailableTeam([]);
    setPokedex([]);
    setDifficulty('medium');
    setSelectedDifficultyIndex(1);
    shouldSpawnMewtwo.current = false;
    hasDefeatedMewtwo.current = false;
    setIsPoisoned({ player: false, enemy: false });
    setIsSleeping({ player: 0, enemy: 0 });
    setRocketPhase('');
    setStolenPokemonIndex(-1);
    nextRocketBattle.current = Math.floor(Math.random() * 4) + 7;
    totalBattles.current = 0;
  };

  // Pokemon Red/Blue Intro Screen
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <SettingsModal />
        <HowToPlayModal />
        <PokedexModal />
        <div className={`gameboy-console ${getContainerClass()} w-full`}>
          <div className="gameboy-screen flex flex-col items-center justify-center" style={{backgroundColor: '#ffffff'}}>
            {/* Pokemon Logo using SVG-style text */}
            <div className="mb-6 text-center">
              <h1 className="retro-text" style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: '#ffde00',
                textShadow: '4px 4px 0px #3b5dae, -2px -2px 0px #3b5dae, 2px -2px 0px #3b5dae, -2px 2px 0px #3b5dae, 2px 2px 0px #3b5dae',
                letterSpacing: '2px',
                lineHeight: '1',
                WebkitTextStroke: '2px #3b5dae'
              }}>
                POKéMON
              </h1>
            </div>

            {/* Red Version */}
            <div className="mb-6">
              <h2 className="retro-text text-center" style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#dc2626',
                textShadow: '2px 2px 0px #000',
                letterSpacing: '3px'
              }}>
                Red Version
              </h2>
            </div>

            {/* Red Trainer Sprite - pixel art style */}
            <div className="mb-4 flex justify-center">
              <img
                src="/red-sprite.png"
                alt="Red Trainer"
                style={{
                  width: '96px',
                  height: 'auto',
                  imageRendering: 'pixelated',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Copyright */}
            <div className="mb-4 text-center">
              <p className="retro-text" style={{color: '#000', fontSize: '8px'}}>
                ©'95,'96,'98 GAME FREAK inc.
              </p>
            </div>

            {/* START Button */}
            <button
              onClick={() => {
                if (!introMusicPlaying) {
                  // First click: start music and go to difficulty selection
                  setIntroMusicPlaying(true);
                  setGameState('difficulty');
                } else {
                  // Second click: go to difficulty selection
                  setGameState('difficulty');
                }
              }}
              className="border-3 border-black px-6 py-3 font-bold text-sm transition-all hover:scale-105 retro-text"
              style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                boxShadow: '4px 4px 0px #000'
              }}
            >
              START GAME
            </button>
          </div>

          {/* Game Boy Controls */}
          <div className="gameboy-controls">
            <div className="dpad">
              <div className="dpad-button dpad-up"></div>
              <div className="dpad-button dpad-left"></div>
              <div className="dpad-button dpad-center"></div>
              <div className="dpad-button dpad-right"></div>
              <div className="dpad-button dpad-down"></div>
            </div>
            <div className="action-buttons">
              <div className="action-button"></div>
              <div className="action-button"></div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // Difficulty Selection Screen
  if (gameState === 'difficulty') {
    const difficulties = [
      {
        name: 'Easy',
        color: '#22c55e',
        description: 'Weaker enemies, easier catches'
      },
      {
        name: 'Medium',
        color: '#eab308',
        description: 'Balanced challenge'
      },
      {
        name: 'Hard',
        color: '#dc2626',
        description: 'Stronger enemies, harder catches'
      }
    ];

    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <SettingsModal />
        <HowToPlayModal />
        <PokedexModal />
        <div className={`gameboy-console ${getContainerClass()} w-full`}>
          <div className="gameboy-screen">
            <div className="border-4 border-black p-4 mb-4" style={{backgroundColor: '#dc2626'}}>
              <h1 className="text-2xl font-bold text-center retro-text" style={{color: '#ffffff'}}>
                POKéMON
              </h1>
            </div>

            <div className="border-4 border-black p-3 mb-4" style={{backgroundColor: '#3b82f6'}}>
              <p className="text-center text-xs font-bold retro-text" style={{color: '#ffffff'}}>
                SELECT DIFFICULTY
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {difficulties.map((diff, index) => (
                <button
                  key={diff.name}
                  onClick={() => {
                    setDifficulty(['easy', 'medium', 'hard'][index]);
                    setGameState('start');
                  }}
                  className={`border-4 p-3 transition-all hover:scale-105 ${selectedDifficultyIndex === index ? 'border-blue-500 ring-4 ring-blue-300' : 'border-black'}`}
                  style={{backgroundColor: diff.color, boxShadow: selectedDifficultyIndex === index ? '4px 4px 0px #3b82f6' : '4px 4px 0px #000'}}
                >
                  <h3 className="font-bold text-sm mb-1 uppercase retro-text" style={{color: '#fff', textShadow: '1px 1px 0px #000'}}>
                    {diff.name}
                  </h3>
                  <p className="text-xs retro-text" style={{color: '#fff', textShadow: '1px 1px 0px #000'}}>
                    {diff.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs retro-text" style={{color: '#666'}}>
                Use ← → to select, Enter to confirm
              </p>
            </div>
          </div>

          {/* Game Boy Controls */}
          <div className="gameboy-controls">
            <div className="dpad">
              <div className="dpad-button dpad-up"></div>
              <div className="dpad-button dpad-left"></div>
              <div className="dpad-button dpad-center"></div>
              <div className="dpad-button dpad-right"></div>
              <div className="dpad-button dpad-down"></div>
            </div>
            <div className="action-buttons">
              <div className="action-button"></div>
              <div className="action-button"></div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (gameState === 'start') {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <SettingsModal />
        <HowToPlayModal />
        <PokedexModal />
        <div className={`gameboy-console ${getContainerClass()} w-full`}>
          <div className="gameboy-screen">
            <div className="border-4 border-black p-4 mb-4" style={{backgroundColor: '#dc2626'}}>
              <h1 className="text-2xl font-bold text-center retro-text" style={{color: '#ffffff'}}>
                POKéMON
              </h1>
            </div>

            <div className="border-4 border-black p-3 mb-4" style={{backgroundColor: '#3b82f6'}}>
              <p className="text-center text-xs font-bold retro-text" style={{color: '#ffffff'}}>
                CHOOSE STARTER!
              </p>
            </div>
          
            <div className="grid grid-cols-3 gap-1 sm:gap-3">
              {starters.map((starter, index) => (
                <button
                  key={starter.name}
                  data-starter-index={index}
                  onClick={() => chooseStarter(starter)}
                  className={`border-3 sm:border-4 p-1 sm:p-4 transition-all hover:scale-105 ${selectedStarterIndex === index ? 'border-blue-500 ring-4 ring-blue-300' : 'border-black'}`}
                  style={{backgroundColor: '#fbbf24', boxShadow: selectedStarterIndex === index ? '4px 4px 0px #3b82f6' : '4px 4px 0px #000'}}
                >
                  <div className="mb-1 sm:mb-2 flex justify-center bg-white border-2 border-black p-1 sm:p-2 rounded">
                    <img
                      src={getPokemonSprite(starter.name)}
                      alt={starter.name}
                      className="pixelated"
                      style={{
                        imageRendering: 'pixelated',
                        width: displayMode === 'pc' ? '128px' : '64px',
                        height: displayMode === 'pc' ? '128px' : '64px'
                      }}
                    />
                  </div>
                  <h3 className="font-bold mb-1 uppercase retro-text truncate" style={{color: '#000', fontSize: displayMode === 'pc' ? '12px' : '9px'}}>
                    {starter.name}
                  </h3>
                  <div className="border-2 border-black px-1 sm:px-2 py-1 font-bold inline-block retro-text" style={{backgroundColor: '#dc2626', color: '#fff', fontSize: displayMode === 'pc' ? '12px' : '9px'}}>
                    {starter.type.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Game Boy Controls */}
          <div className="gameboy-controls">
            <div className="dpad">
              <div className="dpad-button dpad-up"></div>
              <div className="dpad-button dpad-left"></div>
              <div className="dpad-button dpad-center"></div>
              <div className="dpad-button dpad-right"></div>
              <div className="dpad-button dpad-down"></div>
            </div>
            <div className="action-buttons">
              <div className="action-button"></div>
              <div className="action-button"></div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (gameState === 'mewtwo-intro') {
    return (
      <div className="min-h-screen bg-black p-8 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <SettingsModal />
        <HowToPlayModal />
        <PokedexModal />
        <div className={`border-8 border-purple-500 bg-black p-8 ${getContainerClass()} w-full text-center`} style={{boxShadow: '0 0 50px rgba(168, 85, 247, 0.8)'}}>
          <div className="mb-6 flex justify-center animate-pulse">
            <img
              src={getPokemonSprite('Mewtwo')}
              alt="Mewtwo"
              style={{
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.8))',
                width: `${getSpriteSize(192)}px`,
                height: `${getSpriteSize(192)}px`
              }}
            />
          </div>
          <div className="border-4 border-red-600 bg-red-600 p-4 mb-6 animate-pulse">
            <h1 className="text-5xl font-bold text-white" style={{textShadow: '3px 3px 0px #000'}}>
              ⚠ WARNING ⚠
            </h1>
          </div>
          <div className="border-4 border-purple-500 bg-purple-900 text-white p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-yellow-300">
              YOU ENCOUNTER
            </h2>
            <h1 className="text-6xl font-bold mb-4 text-purple-300 animate-pulse">MEWTWO</h1>
            <p className="text-xl font-bold text-purple-200">
              THE STRONGEST POKéMON IN THE WORLD!
            </p>
          </div>
          <div className="border-4 border-purple-500 bg-purple-800 text-white p-4 mb-8">
            <p className="text-2xl font-bold mb-2">HP: 106 | ATK: 110 | SP.ATK: 154</p>
            <p className="text-2xl font-bold mb-2">DEF: 90 | SP.DEF: 90</p>
            <p className="text-lg font-bold text-purple-300">TYPE: PSYCHIC</p>
          </div>
          <button
            onClick={() => {
              const mewtwo = {
                name: 'Mewtwo',
                type: 'Psychic',
                type2: null,
                hp: 106,
                maxHp: 106,
                attack: 110,
                spAtk: 154,
                def: 90,
                spDef: 90,
                color: '🧬',
                moves: ['Psychic', 'Shadow Ball', 'Ice Beam', 'Aura Sphere'],
                moveTypes: ['Psychic', 'Ghost', 'Ice', 'Fighting']
              };
              setWildPokemon(mewtwo);
              setIsPlayerTurn(true);
              setGameState('battle');
              setBattleLog([`A legendary Mewtwo appeared!`, `This is the ultimate challenge!`]);
            }}
            className="w-full border-4 border-purple-500 bg-purple-700 hover:bg-purple-600 text-white font-bold py-4 px-8 text-2xl transition-all"
            style={{boxShadow: '8px 8px 0px rgba(168, 85, 247, 0.5)'}}
          >
            ▸ ACCEPT THE CHALLENGE!
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'mewtwo-encounter') {
    return null; // Remove old mewtwo-encounter screen
  }

  if (gameState === 'battle') {
    return (
      <div className="min-h-screen p-4" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <SettingsModal />
        <HowToPlayModal />
        <PokedexModal />
        <div className={`gameboy-console ${getContainerClass()} mx-auto`}>
          <div className="gameboy-screen">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="border-4 border-black p-3" style={{backgroundColor: '#fef3c7'}}>
                <div className="mb-2 flex justify-center">
                  <img
                    src={getPokemonSprite(wildPokemon.spriteName || wildPokemon.name)}
                    alt={wildPokemon.name}
                    style={{
                      imageRendering: 'pixelated',
                      width: `${getSpriteSize(192)}px`,
                      height: `${getSpriteSize(192)}px`
                    }}
                  />
                </div>
                <h3 className="font-bold text-sm mb-2 uppercase retro-text" style={{color: '#000'}}>
                  WILD {wildPokemon.name}
                </h3>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="border-2 border-black px-2 py-1 text-xs font-bold retro-text" style={{backgroundColor: '#dc2626', color: '#fff'}}>
                    {wildPokemon.type.toUpperCase()}
                  </span>
                  {wildPokemon.type2 && (
                    <span className="border-2 border-black px-2 py-1 text-xs font-bold retro-text" style={{backgroundColor: '#7c3aed', color: '#fff'}}>
                      {wildPokemon.type2.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="border-4 border-black p-2 mb-1" style={{backgroundColor: '#e5e7eb'}}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs retro-text" style={{color: '#000'}}>HP</span>
                    <div className="flex-1 border-2 border-black h-3" style={{backgroundColor: '#d1d5db'}}>
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${(wildPokemon.hp / wildPokemon.maxHp) * 100}%`,
                          backgroundColor: (wildPokemon.hp / wildPokemon.maxHp) < 0.2 ? '#dc2626' : (wildPokemon.hp / wildPokemon.maxHp) < 0.5 ? '#eab308' : '#22c55e'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-bold retro-text" style={{color: '#000'}}>{wildPokemon.hp}/{wildPokemon.maxHp}</p>
              </div>
            </div>

            <div className="text-center">
              <div className="border-4 border-black p-3" style={{backgroundColor: '#dbeafe'}}>
                <div className="mb-2 flex justify-center">
                  <img
                    src={getPokemonSprite(playerPokemon.spriteName || playerPokemon.name)}
                    alt={playerPokemon.name}
                    style={{
                      imageRendering: 'pixelated',
                      width: `${getSpriteSize(192)}px`,
                      height: `${getSpriteSize(192)}px`
                    }}
                  />
                </div>
                <h3 className="font-bold text-sm mb-2 uppercase retro-text" style={{color: '#000'}}>
                  {playerPokemon.name}
                </h3>
                <div className="flex items-center justify-center gap-1 mb-2 flex-wrap">
                  <span className="border-2 border-black px-2 py-1 text-xs font-bold retro-text" style={{backgroundColor: '#dc2626', color: '#fff'}}>
                    {playerPokemon.type.toUpperCase()}
                  </span>
                  {playerPokemon.type2 && (
                    <span className="border-2 border-black px-2 py-1 text-xs font-bold retro-text" style={{backgroundColor: '#7c3aed', color: '#fff'}}>
                      {playerPokemon.type2.toUpperCase()}
                    </span>
                  )}
                  <span className="border-2 border-black px-2 py-1 text-xs font-bold retro-text" style={{backgroundColor: '#eab308', color: '#000'}}>
                    EXP: {playerPokemon.exp || 0}
                  </span>
                </div>
                <div className="border-4 border-black p-2 mb-1" style={{backgroundColor: '#e5e7eb'}}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs retro-text" style={{color: '#000'}}>HP</span>
                    <div className="flex-1 border-2 border-black h-3" style={{backgroundColor: '#d1d5db'}}>
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${(playerPokemon.hp / playerPokemon.maxHp) * 100}%`,
                          backgroundColor: (playerPokemon.hp / playerPokemon.maxHp) < 0.2 ? '#dc2626' : (playerPokemon.hp / playerPokemon.maxHp) < 0.5 ? '#eab308' : '#22c55e'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-bold retro-text" style={{color: '#000'}}>{playerPokemon.hp}/{playerPokemon.maxHp}</p>
              </div>
            </div>
          </div>

            <div className="border-4 border-black p-3 mb-3 h-20 overflow-y-auto" style={{backgroundColor: '#f3f4f6'}}>
              {battleLog.map((log, i) => (
                <p key={i} className="text-xs mb-1 font-bold retro-text" style={{color: '#000'}}>▸ {log}</p>
              ))}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {playerPokemon.moves.map((move, index) => (
                  <button
                    key={index}
                    data-action-index={index}
                    onClick={() => playerAttack(index)}
                    disabled={!isPlayerTurn}
                    className={`border-4 py-2 px-3 font-bold text-xs transition-all retro-text ${
                      isPlayerTurn ? 'hover:scale-105' : 'cursor-not-allowed opacity-50'
                    } ${selectedActionIndex === index && isPlayerTurn ? 'border-blue-500 ring-2 ring-blue-300' : 'border-black'}`}
                    style={{
                      backgroundColor: isPlayerTurn ? '#fbbf24' : '#9ca3af',
                      color: '#000',
                      boxShadow: selectedActionIndex === index && isPlayerTurn ? '3px 3px 0px #3b82f6' : (isPlayerTurn ? '3px 3px 0px #000' : 'none')
                    }}
                  >
                    {move.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  data-action-index={4}
                  onClick={usePotion}
                  disabled={!isPlayerTurn || potionUsed}
                  className={`border-4 py-2 px-3 font-bold text-xs transition-all retro-text ${
                    isPlayerTurn && !potionUsed ? 'hover:scale-105' : 'cursor-not-allowed opacity-50'
                  } ${selectedActionIndex === 4 && isPlayerTurn ? 'border-blue-500 ring-2 ring-blue-300' : 'border-black'}`}
                  style={{
                    backgroundColor: isPlayerTurn && !potionUsed ? '#22c55e' : '#9ca3af',
                    color: '#000',
                    boxShadow: selectedActionIndex === 4 && isPlayerTurn ? '3px 3px 0px #3b82f6' : (isPlayerTurn && !potionUsed ? '3px 3px 0px #000' : 'none')
                  }}
                >
                  POTION {potionUsed && '(X)'}
                </button>

                <button
                  data-action-index={5}
                  onClick={catchPokemon}
                  disabled={!isPlayerTurn}
                  className={`border-4 py-2 px-3 font-bold text-xs transition-all retro-text ${
                    isPlayerTurn ? 'hover:scale-105' : 'cursor-not-allowed opacity-50'
                  } ${selectedActionIndex === 5 && isPlayerTurn ? 'border-blue-500 ring-2 ring-blue-300' : 'border-black'}`}
                  style={{
                    backgroundColor: isPlayerTurn ? '#dc2626' : '#9ca3af',
                    color: '#fff',
                    boxShadow: selectedActionIndex === 5 && isPlayerTurn ? '3px 3px 0px #3b82f6' : (isPlayerTurn ? '3px 3px 0px #000' : 'none')
                  }}
                >
                  CATCH
                </button>
              </div>
            
              {availableTeam.length > 1 && (
                <div className="border-t-4 border-black pt-2 mt-2">
                  <p className="text-xs font-bold mb-2 retro-text" style={{color: '#000'}}>SWITCH:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {availableTeam.map((pokemon, index) => (
                      <button
                        key={index}
                        onClick={() => switchPokemon(pokemon)}
                        disabled={!isPlayerTurn || pokemon.name === playerPokemon.name}
                        className={`border-3 border-black py-1 px-1 transition-all ${
                          pokemon.name === playerPokemon.name ? 'cursor-not-allowed opacity-50' :
                          isPlayerTurn ? 'hover:scale-105' : 'cursor-not-allowed opacity-50'
                        }`}
                        style={{
                          backgroundColor: pokemon.name === playerPokemon.name ? '#9ca3af' : '#fbbf24',
                          boxShadow: isPlayerTurn && pokemon.name !== playerPokemon.name ? '2px 2px 0px #000' : 'none'
                        }}
                      >
                        <div className="mb-1 flex justify-center bg-white border-2 border-black p-1">
                          <img
                            src={getPokemonSprite(pokemon.name)}
                            alt={pokemon.name}
                            style={{
                              imageRendering: 'pixelated',
                              width: `${getSpriteSize(48)}px`,
                              height: `${getSpriteSize(48)}px`
                            }}
                          />
                        </div>
                        <p className="text-xs font-bold truncate uppercase retro-text" style={{color: '#000', fontSize: '8px'}}>{pokemon.name}</p>
                        <p className="text-xs font-bold retro-text" style={{color: '#000', fontSize: '8px'}}>{pokemon.hp}/{pokemon.maxHp}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Game Boy Controls */}
          <div className="gameboy-controls">
            <div className="dpad">
              <div className="dpad-button dpad-up"></div>
              <div className="dpad-button dpad-left"></div>
              <div className="dpad-button dpad-center"></div>
              <div className="dpad-button dpad-right"></div>
              <div className="dpad-button dpad-down"></div>
            </div>
            <div className="action-buttons">
              <div className="action-button"></div>
              <div className="action-button"></div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (gameState === 'catch') {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <SettingsModal />
        <HowToPlayModal />
        <PokedexModal />
        <div className={`gameboy-console ${getContainerClass()} w-full`}>
          <div className="gameboy-screen text-center">
            <div className="border-4 border-black p-4 mb-4" style={{backgroundColor: '#dc2626'}}>
              <h2 className="text-2xl font-bold retro-text" style={{color: '#fff'}}>GOTCHA!</h2>
            </div>
            <div className="mb-4 flex justify-center bg-white border-4 border-black p-4 mx-auto" style={{width: 'fit-content'}}>
              <img
                src={getPokemonSprite(wildPokemon.name)}
                alt={wildPokemon.name}
                style={{
                  imageRendering: 'pixelated',
                  width: `${getSpriteSize(192)}px`,
                  height: `${getSpriteSize(192)}px`
                }}
              />
            </div>
            <div className="border-4 border-black p-4 mb-6" style={{backgroundColor: '#fef3c7'}}>
              <p className="text-lg font-bold mb-2 uppercase retro-text" style={{color: '#000'}}>
                {wildPokemon.name} CAUGHT!
              </p>
            </div>
            <button
              data-continue-button
              onClick={nextBattle}
              className="w-full border-4 border-black hover:scale-105 font-bold py-3 px-6 retro-text transition-all"
              style={{backgroundColor: '#fbbf24', color: '#000', boxShadow: '4px 4px 0px #000'}}
            >
              NEXT BATTLE
            </button>
            <button
              onClick={() => setShowPokedex(true)}
              className="w-full border-4 border-black hover:scale-105 font-bold py-2 px-6 retro-text transition-all mt-3"
              style={{backgroundColor: '#dc2626', color: '#fff', boxShadow: '4px 4px 0px #000'}}
            >
              📖 POKéDEX ({pokedex.length}/{allGamePokemon.length})
            </button>
          </div>

          {/* Game Boy Controls */}
          <div className="gameboy-controls">
            <div className="dpad">
              <div className="dpad-button dpad-up"></div>
              <div className="dpad-button dpad-left"></div>
              <div className="dpad-button dpad-center"></div>
              <div className="dpad-button dpad-right"></div>
              <div className="dpad-button dpad-down"></div>
            </div>
            <div className="action-buttons">
              <div className="action-button"></div>
              <div className="action-button"></div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (gameState === 'rocket') {
    const stolenPoke = stolenPokemonIndex >= 0 ? availableTeam[stolenPokemonIndex] : null;
    const isMobile = displayMode === 'mobile';
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <SettingsModal />
        <HowToPlayModal />
        <PokedexModal />
        <div className={`gameboy-console ${getContainerClass()} w-full`} style={{overflow: 'hidden', position: 'relative'}}>
          <div className="gameboy-screen text-center" style={{overflow: 'hidden', position: 'relative'}}>
            {/* Team Rocket Image */}
            <div className={`border-4 border-black mb-4 ${rocketPhase === 'intro' ? 'rocket-flash' : ''}`} style={{backgroundColor: '#1a1a1a'}}>
              <img
                src="https://art.pixilart.com/thumb/sr22f5fb7a1edaws3.png"
                alt="Team Rocket"
                style={{
                  width: '100%',
                  imageRendering: 'pixelated',
                }}
              />
            </div>

            {/* Battle Log */}
            <div className="border-4 border-black p-3 mb-4" style={{backgroundColor: '#fef3c7'}}>
              <p className="text-sm font-bold retro-text" style={{color: '#dc2626'}}>
                {rocketPhase === 'intro' && '⚡ TEAM ROCKET APPEARED! ⚡'}
                {rocketPhase === 'walking' && 'Meowth is sneaking toward your team...'}
                {rocketPhase === 'grabbing' && `Meowth grabbed ${stolenPoke?.name || 'a Pokemon'}!`}
                {rocketPhase === 'leaving' && `Team Rocket stole ${stolenPoke?.name || 'your Pokemon'}!`}
                {rocketPhase === 'done' && `${stolenPoke?.name || 'Your Pokemon'} was stolen!`}
              </p>
            </div>

            {/* Team display with Meowth animation */}
            <div className="border-4 border-black p-3" style={{backgroundColor: '#e5e7eb', position: 'relative', minHeight: '100px', overflow: 'hidden'}}>
              <p className="text-xs font-bold mb-2 retro-text" style={{color: '#000'}}>YOUR TEAM:</p>
              <div className="grid grid-cols-4 gap-2" style={{position: 'relative'}}>
                {availableTeam.map((pokemon, index) => {
                  const isStolen = index === stolenPokemonIndex;
                  const isBeingCarried = isStolen && (rocketPhase === 'leaving');
                  const isGone = isStolen && rocketPhase === 'done';
                  return (
                    <div
                      key={index}
                      className={`border-3 py-1 px-1 text-center ${isGone ? '' : ''} ${isBeingCarried ? 'stolen-pokemon-fade' : ''}`}
                      style={{
                        borderColor: isGone ? '#9ca3af' : '#000',
                        borderStyle: isGone ? 'dashed' : 'solid',
                        backgroundColor: isGone ? 'transparent' : (pokemon.name === playerPokemon?.name ? '#9ca3af' : '#fbbf24'),
                        borderWidth: '3px',
                        opacity: isGone ? 0.4 : 1,
                      }}
                    >
                      {!isGone && (
                        <>
                          <div className="mb-1 flex justify-center bg-white border-2 border-black p-1">
                            <img
                              src={getPokemonSprite(pokemon.name)}
                              alt={pokemon.name}
                              style={{imageRendering: 'pixelated', width: `${getSpriteSize(48)}px`, height: `${getSpriteSize(48)}px`}}
                            />
                          </div>
                          <p className="text-xs font-bold truncate uppercase retro-text" style={{color: '#000', fontSize: '8px'}}>{pokemon.name}</p>
                        </>
                      )}
                      {isGone && (
                        <p className="text-xs retro-text py-4" style={{color: '#9ca3af', fontSize: '8px'}}>STOLEN</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Meowth animation overlay */}
              {(rocketPhase === 'walking' || rocketPhase === 'grabbing' || rocketPhase === 'leaving') && (
                <div
                  className={rocketPhase === 'walking' ? 'meowth-walk-in' : rocketPhase === 'grabbing' ? 'meowth-grab' : 'meowth-leave'}
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: `${(stolenPokemonIndex % 4) * 25 + 5}%`,
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src={getPokemonSprite('Meowth')}
                    alt="Meowth"
                    style={{
                      imageRendering: 'pixelated',
                      width: isMobile ? '48px' : '64px',
                      height: isMobile ? '48px' : '64px',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Continue button (only after done) */}
            {rocketPhase === 'done' && (
              <button
                onClick={continueAfterRocket}
                className="w-full border-4 border-black hover:scale-105 font-bold py-3 px-6 retro-text transition-all mt-4"
                style={{backgroundColor: '#fbbf24', color: '#000', boxShadow: '4px 4px 0px #000'}}
              >
                CONTINUE
              </button>
            )}
          </div>

          {/* Game Boy Controls */}
          <div className="gameboy-controls">
            <div className="dpad">
              <div className="dpad-button dpad-up"></div>
              <div className="dpad-button dpad-left"></div>
              <div className="dpad-button dpad-center"></div>
              <div className="dpad-button dpad-right"></div>
              <div className="dpad-button dpad-down"></div>
            </div>
            <div className="action-buttons">
              <div className="action-button"></div>
              <div className="action-button"></div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (gameState === 'victory') {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <SettingsModal />
        <HowToPlayModal />
        <PokedexModal />
        <div className={`gameboy-console ${getContainerClass()} w-full`}>
          <div className="gameboy-screen text-center">
            <div className="border-4 border-black p-4 mb-4" style={{backgroundColor: '#22c55e'}}>
              <h2 className="text-2xl font-bold retro-text" style={{color: '#fff'}}>VICTORY!</h2>
            </div>
            <div className="border-4 border-black p-4 mb-4" style={{backgroundColor: '#fef3c7'}}>
              <p className="text-sm font-bold mb-2 retro-text" style={{color: '#000'}}>DEFEATED</p>
              <p className="text-lg font-bold uppercase retro-text" style={{color: '#000'}}>
                WILD {wildPokemon.name}!
              </p>
            </div>
            <div className="border-4 border-black p-3 mb-4" style={{backgroundColor: '#dbeafe'}}>
              <p className="font-bold text-sm retro-text" style={{color: '#000'}}>
                {playerPokemon.name} +EXP
              </p>
              <p className="font-bold text-sm retro-text" style={{color: '#000'}}>
                EXP: {playerPokemon.exp || 0}
              </p>
            </div>
            <div className="border-4 border-black p-3 mb-6" style={{backgroundColor: '#fecaca'}}>
              <p className="text-sm font-bold retro-text" style={{color: '#000'}}>
                WINS: {battlesWon}
              </p>
            </div>
            <button
              data-continue-button
              onClick={nextBattle}
              className="w-full border-4 border-black hover:scale-105 font-bold py-3 px-6 retro-text transition-all"
              style={{backgroundColor: '#fbbf24', color: '#000', boxShadow: '4px 4px 0px #000'}}
            >
              NEXT BATTLE
            </button>
            <button
              onClick={() => setShowPokedex(true)}
              className="w-full border-4 border-black hover:scale-105 font-bold py-2 px-6 retro-text transition-all mt-3"
              style={{backgroundColor: '#dc2626', color: '#fff', boxShadow: '4px 4px 0px #000'}}
            >
              📖 POKéDEX ({pokedex.length}/{allGamePokemon.length})
            </button>
          </div>

          {/* Game Boy Controls */}
          <div className="gameboy-controls">
            <div className="dpad">
              <div className="dpad-button dpad-up"></div>
              <div className="dpad-button dpad-left"></div>
              <div className="dpad-button dpad-center"></div>
              <div className="dpad-button dpad-right"></div>
              <div className="dpad-button dpad-down"></div>
            </div>
            <div className="action-buttons">
              <div className="action-button"></div>
              <div className="action-button"></div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (gameState === 'defeat') {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <SettingsModal />
        <HowToPlayModal />
        <PokedexModal />
        <div className={`gameboy-console ${getContainerClass()} w-full`}>
          <div className="gameboy-screen text-center">
            <div className="border-4 border-black p-6 mb-6" style={{backgroundColor: '#dc2626'}}>
              <h2 className="text-2xl font-bold retro-text" style={{color: '#fff'}}>GAME OVER</h2>
            </div>
            <button
              data-continue-button
              onClick={resetGame}
              className="w-full border-4 border-black hover:scale-105 font-bold py-3 px-6 retro-text transition-all"
              style={{backgroundColor: '#fbbf24', color: '#000', boxShadow: '4px 4px 0px #000'}}
            >
              TRY AGAIN
            </button>
          </div>

          {/* Game Boy Controls */}
          <div className="gameboy-controls">
            <div className="dpad">
              <div className="dpad-button dpad-up"></div>
              <div className="dpad-button dpad-left"></div>
              <div className="dpad-button dpad-center"></div>
              <div className="dpad-button dpad-right"></div>
              <div className="dpad-button dpad-down"></div>
            </div>
            <div className="action-buttons">
              <div className="action-button"></div>
              <div className="action-button"></div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return null;
};

export default PokemonGame;