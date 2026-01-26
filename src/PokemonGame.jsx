import React, { useState, useEffect, useRef } from 'react';

const PokemonGame = () => {
  const [gameState, setGameState] = useState('start');
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
  const [displayMode, setDisplayMode] = useState(() => {
    // Load from localStorage or default to 'pc'
    return localStorage.getItem('pokemonGameDisplayMode') || 'pc';
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

  // Use ref to track Mewtwo spawn - bypasses React state timing issues
  const shouldSpawnMewtwo = useRef(false);
  const hasDefeatedMewtwo = useRef(false);

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

  // Get container size based on display mode
  // PC mode = bigger landscape, Mobile mode = smaller portrait
  const getContainerClass = () => {
    return displayMode === 'pc' ? 'max-w-4xl' : 'max-w-2xl';
  };

  // Get sprite size based on display mode
  const getSpriteSize = (baseSize) => {
    return displayMode === 'pc' ? baseSize : Math.floor(baseSize * 0.6);
  };

  // Settings button component
  const SettingsButton = () => (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setShowSettings(true)}
        className="border-4 border-black px-4 py-2 font-bold text-xs transition-all hover:scale-105 retro-text"
        style={{
          backgroundColor: '#3b82f6',
          color: '#fff',
          boxShadow: '4px 4px 0px #000'
        }}
      >
        ⚙️ SETTINGS
      </button>
    </div>
  );

  // Settings modal component
  const SettingsModal = () => {
    if (!showSettings) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{backgroundColor: 'rgba(0,0,0,0.8)'}}>
        <div className="border-8 border-black bg-yellow-100 p-6 max-w-md w-full mx-4" style={{boxShadow: '12px 12px 0px #000'}}>
          <div className="border-4 border-black bg-red-600 p-3 mb-4">
            <h2 className="text-2xl font-bold text-center retro-text text-white">⚙️ SETTINGS</h2>
          </div>

          {/* Display Mode */}
          <div className="border-4 border-black bg-white p-4 mb-3">
            <h3 className="font-bold text-sm mb-2 retro-text">DISPLAY MODE:</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setDisplayMode('pc')}
                className={`flex-1 border-4 border-black px-3 py-2 font-bold text-xs retro-text ${
                  displayMode === 'pc' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                PC MODE
              </button>
              <button
                onClick={() => setDisplayMode('mobile')}
                className={`flex-1 border-4 border-black px-3 py-2 font-bold text-xs retro-text ${
                  displayMode === 'mobile' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
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
                className={`flex-1 border-4 border-black px-3 py-2 font-bold text-xs retro-text ${
                  audioVolume === 'none' ? 'bg-red-500 text-white' : 'bg-gray-200'
                }`}
              >
                NONE
              </button>
              <button
                onClick={() => setAudioVolume('low')}
                className={`flex-1 border-4 border-black px-3 py-2 font-bold text-xs retro-text ${
                  audioVolume === 'low' ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}
              >
                LOW
              </button>
              <button
                onClick={() => setAudioVolume('high')}
                className={`flex-1 border-4 border-black px-3 py-2 font-bold text-xs retro-text ${
                  audioVolume === 'high' ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}
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
                className={`flex-1 border-4 border-black px-3 py-2 font-bold text-xs retro-text ${
                  !debugMode ? 'bg-gray-500 text-white' : 'bg-gray-200'
                }`}
              >
                OFF
              </button>
              <button
                onClick={() => setDebugMode(true)}
                className={`flex-1 border-4 border-black px-3 py-2 font-bold text-xs retro-text ${
                  debugMode ? 'bg-purple-500 text-white' : 'bg-gray-200'
                }`}
              >
                ON
              </button>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowSettings(false)}
            className="w-full border-4 border-black bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 retro-text transition-all"
            style={{boxShadow: '4px 4px 0px #000'}}
          >
            CLOSE
          </button>
        </div>
      </div>
    );
  };

  // Debug button component (only shown when debug mode is enabled)
  const DebugButton = () => {
    if (!debugMode) return null;

    return (
      <div className="fixed top-20 right-4 z-50">
        <button
          onClick={() => {
            if (availableTeam.length > 0 && playerPokemon) {
              // Update team
              setAvailableTeam(prevTeam => {
                const updatedTeam = prevTeam.map((pokemon, index) => {
                  if (index === 0) {
                    return { ...pokemon, exp: 19 };
                  }
                  return pokemon;
                });
                return updatedTeam;
              });
              // Update current player Pokemon
              setPlayerPokemon(prev => ({ ...prev, exp: 19 }));
              setBattleLog(prev => [...prev, 'DEBUG: Set first Pokemon EXP to 19. Win one more battle to spawn Mewtwo!']);
            }
          }}
          className="border-4 border-black px-4 py-2 font-bold text-xs transition-all hover:scale-105 retro-text"
          style={{
            backgroundColor: '#ef4444',
            color: '#fff',
            boxShadow: '4px 4px 0px #000'
          }}
        >
          DEBUG: EXP→19
        </button>
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

  // Helper function to get Pokemon sprite from PokeAPI
  const getPokemonSprite = (pokemonName) => {
    const name = pokemonName.toLowerCase();
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokemonId(name)}.png`;
  };

  // Helper function to get Pokemon ID from name
  const getPokemonId = (name) => {
    const pokemonIds = {
      'charmander': 4, 'charmeleon': 5, 'charizard': 6,
      'squirtle': 7, 'wartortle': 8, 'blastoise': 9,
      'bulbasaur': 1, 'ivysaur': 2, 'venusaur': 3,
      'magikarp': 129, 'metapod': 11, 'kakuna': 14,
      'rattata': 19, 'raticate': 20, 'pidgey': 16, 'pidgeotto': 17, 'pidgeot': 18,
      'caterpie': 10, 'butterfree': 12, 'weedle': 13, 'beedrill': 15,
      'oddish': 43, 'gloom': 44, 'vileplume': 45,
      'bellsprout': 69, 'weepinbell': 70, 'victreebel': 71,
      'geodude': 74, 'graveler': 75, 'golem': 76,
      'onix': 95, 'steelix': 208,
      'pikachu': 25, 'raichu': 26,
      'magnemite': 81, 'magneton': 82,
      'meowth': 52, 'persian': 53,
      'psyduck': 54, 'golduck': 55,
      'poliwag': 60, 'poliwhirl': 61, 'poliwrath': 62,
      'tentacool': 72, 'tentacruel': 73,
      'machop': 66, 'machoke': 67, 'machamp': 68,
      'mankey': 56, 'primeape': 57,
      'gastly': 92, 'haunter': 93, 'gengar': 94,
      'sandshrew': 27, 'sandslash': 28,
      'diglett': 50, 'dugtrio': 51,
      'vulpix': 37, 'ninetales': 38,
      'growlithe': 58, 'arcanine': 59,
      'ponyta': 77, 'rapidash': 78,
      'zubat': 41, 'golbat': 42, 'crobat': 169,
      'spearow': 21, 'fearow': 22,
      'snorlax': 143,
      'mewtwo': 150,
      'gyarados': 130,
      'dratini': 147, 'dragonair': 148, 'dragonite': 149
    };
    return pokemonIds[name] || 1;
  };

  const starters = [
    { name: 'Charmander', type: 'Fire', type2: null, hp: 43, maxHp: 43, attack: 52, color: '🔥', moves: ['Scratch', 'Ember', 'Growl', 'Flame Burst'], moveTypes: ['Normal', 'Fire', 'Normal', 'Fire'], exp: 0 },
    { name: 'Squirtle', type: 'Water', type2: null, hp: 44, maxHp: 44, attack: 48, color: '💧', moves: ['Tackle', 'Water Gun', 'Withdraw', 'Bubble Beam'], moveTypes: ['Normal', 'Water', 'Water', 'Water'], exp: 0 },
    { name: 'Bulbasaur', type: 'Grass', type2: 'Poison', hp: 45, maxHp: 45, attack: 49, color: '🌿', moves: ['Tackle', 'Vine Whip', 'Growl', 'Razor Leaf'], moveTypes: ['Normal', 'Grass', 'Normal', 'Grass'], exp: 0 }
  ];

  const wildPokemons = [
    // Easy targets
    { name: 'Magikarp', type: 'Water', type2: null, hp: 20, maxHp: 20, attack: 10, color: '🐟', moves: ['Splash', 'Tackle'], moveTypes: ['Normal', 'Normal'] },
    { name: 'Metapod', type: 'Bug', type2: null, hp: 25, maxHp: 25, attack: 15, color: '🥚', moves: ['Harden', 'Tackle'], moveTypes: ['Normal', 'Normal'] },
    { name: 'Kakuna', type: 'Bug', type2: 'Poison', hp: 25, maxHp: 25, attack: 15, color: '🐝', moves: ['Harden', 'Poison Sting'], moveTypes: ['Normal', 'Poison'] },
    
    // Normal difficulty
    { name: 'Rattata', type: 'Normal', type2: null, hp: 30, maxHp: 30, attack: 35, color: '🐀', moves: ['Tackle', 'Quick Attack', 'Bite', 'Hyper Fang'], moveTypes: ['Normal', 'Normal', 'Dark', 'Normal'] },
    { name: 'Pidgey', type: 'Normal', type2: 'Flying', hp: 40, maxHp: 40, attack: 40, color: '🐦', moves: ['Peck', 'Gust', 'Sand Attack', 'Wing Attack'], moveTypes: ['Flying', 'Flying', 'Ground', 'Flying'] },
    { name: 'Caterpie', type: 'Bug', type2: null, hp: 45, maxHp: 45, attack: 30, color: '🐛', moves: ['Tackle', 'String Shot', 'Bug Bite'], moveTypes: ['Normal', 'Bug', 'Bug'] },
    { name: 'Weedle', type: 'Bug', type2: 'Poison', hp: 40, maxHp: 40, attack: 35, color: '🐝', moves: ['Poison Sting', 'String Shot', 'Bug Bite'], moveTypes: ['Poison', 'Bug', 'Bug'] },
    { name: 'Oddish', type: 'Grass', type2: 'Poison', hp: 45, maxHp: 45, attack: 50, color: '🌱', moves: ['Absorb', 'Acid', 'Poison Powder', 'Mega Drain'], moveTypes: ['Grass', 'Poison', 'Poison', 'Grass'] },
    { name: 'Bellsprout', type: 'Grass', type2: 'Poison', hp: 50, maxHp: 50, attack: 75, color: '🌿', moves: ['Vine Whip', 'Acid', 'Wrap', 'Razor Leaf'], moveTypes: ['Grass', 'Poison', 'Normal', 'Grass'] },
    { name: 'Geodude', type: 'Rock', type2: 'Ground', hp: 40, maxHp: 40, attack: 55, color: '🪨', moves: ['Tackle', 'Rock Throw', 'Defense Curl', 'Rock Blast'], moveTypes: ['Normal', 'Rock', 'Normal', 'Rock'] },
    { name: 'Onix', type: 'Rock', type2: 'Ground', hp: 35, maxHp: 35, attack: 45, color: '🐍', moves: ['Rock Throw', 'Bind', 'Rock Slide', 'Dig'], moveTypes: ['Rock', 'Normal', 'Rock', 'Ground'] },
    { name: 'Pikachu', type: 'Electric', type2: null, hp: 35, maxHp: 35, attack: 55, color: '⚡', moves: ['Thunder Shock', 'Quick Attack', 'Thunderbolt', 'Iron Tail'], moveTypes: ['Electric', 'Normal', 'Electric', 'Steel'] },
    { name: 'Magnemite', type: 'Electric', type2: 'Steel', hp: 25, maxHp: 25, attack: 60, color: '🧲', moves: ['Thunder Shock', 'Sonic Boom', 'Spark', 'Thunderbolt'], moveTypes: ['Electric', 'Normal', 'Electric', 'Electric'] },
    { name: 'Meowth', type: 'Normal', type2: null, hp: 40, maxHp: 40, attack: 45, color: '🐱', moves: ['Scratch', 'Bite', 'Fury Swipes', 'Pay Day'], moveTypes: ['Normal', 'Dark', 'Normal', 'Normal'] },
    { name: 'Psyduck', type: 'Water', type2: null, hp: 50, maxHp: 50, attack: 52, color: '🦆', moves: ['Scratch', 'Water Gun', 'Confusion', 'Aqua Tail'], moveTypes: ['Normal', 'Water', 'Psychic', 'Water'] },
    { name: 'Poliwag', type: 'Water', type2: null, hp: 40, maxHp: 40, attack: 50, color: '💧', moves: ['Water Gun', 'Bubble', 'Hypnosis', 'Bubble Beam'], moveTypes: ['Water', 'Water', 'Psychic', 'Water'] },
    { name: 'Tentacool', type: 'Water', type2: 'Poison', hp: 40, maxHp: 40, attack: 40, color: '🪼', moves: ['Acid', 'Poison Sting', 'Water Gun', 'Wrap'], moveTypes: ['Poison', 'Poison', 'Water', 'Normal'] },
    { name: 'Machop', type: 'Fighting', type2: null, hp: 70, maxHp: 70, attack: 80, color: '💪', moves: ['Karate Chop', 'Low Kick', 'Focus Energy', 'Seismic Toss'], moveTypes: ['Fighting', 'Fighting', 'Normal', 'Fighting'] },
    { name: 'Mankey', type: 'Fighting', type2: null, hp: 40, maxHp: 40, attack: 80, color: '🐵', moves: ['Scratch', 'Karate Chop', 'Fury Swipes', 'Cross Chop'], moveTypes: ['Normal', 'Fighting', 'Normal', 'Fighting'] },
    { name: 'Gastly', type: 'Ghost', type2: 'Poison', hp: 30, maxHp: 30, attack: 35, color: '👻', moves: ['Lick', 'Hypnosis', 'Shadow Ball', 'Night Shade'], moveTypes: ['Ghost', 'Psychic', 'Ghost', 'Ghost'] },
    { name: 'Sandshrew', type: 'Ground', type2: null, hp: 50, maxHp: 50, attack: 75, color: '🦔', moves: ['Scratch', 'Sand Attack', 'Dig', 'Earthquake'], moveTypes: ['Normal', 'Ground', 'Ground', 'Ground'] },
    { name: 'Diglett', type: 'Ground', type2: null, hp: 10, maxHp: 10, attack: 55, color: '🕳️', moves: ['Scratch', 'Dig', 'Mud Slap', 'Earthquake'], moveTypes: ['Normal', 'Ground', 'Ground', 'Ground'] },
    { name: 'Vulpix', type: 'Fire', type2: null, hp: 38, maxHp: 38, attack: 41, color: '🦊', moves: ['Ember', 'Quick Attack', 'Flame Burst', 'Flamethrower'], moveTypes: ['Fire', 'Normal', 'Fire', 'Fire'] },
    { name: 'Growlithe', type: 'Fire', type2: null, hp: 55, maxHp: 55, attack: 70, color: '🐕', moves: ['Ember', 'Bite', 'Flame Wheel', 'Fire Fang'], moveTypes: ['Fire', 'Dark', 'Fire', 'Fire'] },
    { name: 'Ponyta', type: 'Fire', type2: null, hp: 50, maxHp: 50, attack: 85, color: '🐴', moves: ['Ember', 'Stomp', 'Flame Charge', 'Fire Blast'], moveTypes: ['Fire', 'Normal', 'Fire', 'Fire'] },
    { name: 'Zubat', type: 'Poison', type2: 'Flying', hp: 40, maxHp: 40, attack: 45, color: '🦇', moves: ['Bite', 'Wing Attack', 'Air Slash', 'Poison Fang'], moveTypes: ['Dark', 'Flying', 'Flying', 'Poison'] },
    { name: 'Spearow', type: 'Normal', type2: 'Flying', hp: 40, maxHp: 40, attack: 60, color: '🐦', moves: ['Peck', 'Fury Attack', 'Aerial Ace', 'Drill Peck'], moveTypes: ['Flying', 'Normal', 'Flying', 'Flying'] },
    { name: 'Snorlax', type: 'Normal', type2: null, hp: 100, maxHp: 100, attack: 30, color: '😴', moves: ['Body Slam', 'Rest', 'Crunch', 'Hyper Beam'], moveTypes: ['Normal', 'Psychic', 'Dark', 'Normal'] }
  ];

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
    encounterWildPokemon();
    setGameState('battle');
    setBattleLog([`You chose ${starter.name}!`]);
  };

  const encounterWildPokemon = () => {
    // STAGE 1: Normal wild Pokemon encounters (used only on game start)
    const wild = { ...wildPokemons[Math.floor(Math.random() * wildPokemons.length)] };
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
        'magikarp': { name: 'Gyarados', type2: 'Flying' },
        'geodude': { name: 'Graveler', type2: 'Ground' },
        'graveler': { name: 'Golem', type2: 'Ground' },
        'zubat': { name: 'Golbat', type2: 'Flying' },
        'golbat': { name: 'Crobat', type2: 'Flying' },
        'oddish': { name: 'Gloom', type2: 'Poison' },
        'gloom': { name: 'Vileplume', type2: 'Poison' },
        'bellsprout': { name: 'Weepinbell', type2: 'Poison' },
        'weepinbell': { name: 'Victreebel', type2: 'Poison' },
        'machop': { name: 'Machoke', type2: null },
        'machoke': { name: 'Machamp', type2: null },
        'mankey': { name: 'Primeape', type2: null },
        'gastly': { name: 'Haunter', type2: 'Poison' },
        'haunter': { name: 'Gengar', type2: 'Poison' },
        'onix': { name: 'Steelix', type2: 'Ground' },
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
        'spearow': { name: 'Fearow', type2: 'Flying' }
      };
      
      const lowerName = pokemon.name.toLowerCase();
      const nextEvolution = evolutionMap[lowerName];
      
      if (nextEvolution) {
        const evolvedPokemon = {
          ...pokemon,
          name: nextEvolution.name,
          type2: nextEvolution.type2,
          hp: pokemon.hp + 10,
          maxHp: pokemon.maxHp + 10,
          attack: pokemon.attack + 10,
          exp: newExp
        };
        
        addLog(`${pokemon.name} evolved into ${nextEvolution.name}!`);
        addLog(`HP +10! Attack +10!`);
        
        setTimeout(() => {
          setPlayerPokemon(evolvedPokemon);
          setAvailableTeam(prev => prev.map(p => 
            p.name.toLowerCase() === lowerName ? evolvedPokemon : p
          ));
          setIsEvolving(false);
        }, 2000);
        
        return evolvedPokemon;
      } else {
        // No evolution available (final form)
        addLog(`${pokemon.name} is at max evolution!`);
        addLog(`HP +5! Attack +5!`);
        
        const strengthenedPokemon = {
          ...pokemon,
          hp: Math.min(pokemon.hp + 5, pokemon.maxHp + 5),
          maxHp: pokemon.maxHp + 5,
          attack: pokemon.attack + 5,
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

  const calculateDamage = (attacker, defender, moveIndex) => {
    const baseDamage = Math.floor(attacker.attack * 0.4) + Math.floor(Math.random() * 10);
    const moveType = attacker.moveTypes[moveIndex];
    const effectiveness = getTypeEffectiveness(moveType, defender.type, defender.type2);
    const damage = Math.floor(baseDamage * effectiveness);
    
    let effectText = '';
    if (effectiveness === 0) effectText = " It doesn't affect " + defender.name + "...";
    else if (effectiveness >= 4) effectText = " EXTREMELY effective!";
    else if (effectiveness > 1) effectText = " Super effective!";
    else if (effectiveness < 1) effectText = " Not very effective...";
    
    return { damage, effectText };
  };

  const playerAttack = async (moveIndex) => {
    if (!isPlayerTurn || gameState !== 'battle' || isEvolving) return;

    const moveName = playerPokemon.moves[moveIndex];
    const { damage, effectText } = calculateDamage(playerPokemon, wildPokemon, moveIndex);
    
    playSound('attack');
    
    const newWildHp = Math.max(0, wildPokemon.hp - damage);
    setWildPokemon(prev => ({ ...prev, hp: newWildHp }));
    addLog(`${playerPokemon.name} used ${moveName}!${effectText}`);
    if (damage > 0) {
      addLog(`${wildPokemon.name} took ${damage} damage!`);
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
        if (newExp >= 20 && !hasDefeatedMewtwo.current && !wildPokemon.name === 'Mewtwo') {
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
      setIsPlayerTurn(false);
      setTimeout(enemyAttack, 1500);
    }
  };

  const enemyAttack = () => {
    // Use functional setState to ensure we get the most current state
    setPlayerPokemon(prevPlayerPokemon => {
      if (!wildPokemon || !prevPlayerPokemon) return prevPlayerPokemon;

      const moveIndex = Math.floor(Math.random() * wildPokemon.moves.length);
      const moveName = wildPokemon.moves[moveIndex];

      // Calculate damage using the CURRENT playerPokemon from state
      const { damage, effectText } = calculateDamage(wildPokemon, prevPlayerPokemon, moveIndex);

      const newPlayerHp = Math.max(0, prevPlayerPokemon.hp - damage);
      const currentName = prevPlayerPokemon.name;

      // Update team HP as well
      setAvailableTeam(prev => prev.map(p =>
        p.name === currentName ? { ...p, hp: newPlayerHp } : p
      ));

      addLog(`${wildPokemon.name} used ${moveName}!${effectText}`);
      if (damage > 0) addLog(`${currentName} took ${damage} damage!`);

      if (newPlayerHp <= 0) {
        setTimeout(() => {
          addLog(`${currentName} fainted!`);
          setGameState('defeat');
        }, 500);
      } else {
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
    
    if (catchChance > catchRate * 0.7) {
      const newPokemon = { ...wildPokemon, hp: wildPokemon.maxHp };
      
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
      name: newPoke.name,
      type: newPoke.type,
      type2: newPoke.type2,
      hp: newPoke.hp,
      maxHp: newPoke.maxHp,
      attack: newPoke.attack,
      color: newPoke.color,
      moves: [...newPoke.moves],
      moveTypes: [...newPoke.moveTypes],
      exp: newPoke.exp || 0,
      defeatedMewtwo: newPoke.defeatedMewtwo
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
    // Heal the Pokemon first
    const healedPokemon = { ...playerPokemon, hp: playerPokemon.maxHp };

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
        { name: 'Charizard', type: 'Fire', type2: 'Flying', hp: 90, maxHp: 90, attack: 100, color: '🔥', moves: ['Flamethrower', 'Wing Attack', 'Fire Blast', 'Dragon Claw'], moveTypes: ['Fire', 'Flying', 'Fire', 'Dragon'] },
        { name: 'Blastoise', type: 'Water', type2: null, hp: 95, maxHp: 95, attack: 95, color: '💧', moves: ['Hydro Pump', 'Bite', 'Ice Beam', 'Skull Bash'], moveTypes: ['Water', 'Dark', 'Ice', 'Normal'] },
        { name: 'Venusaur', type: 'Grass', type2: 'Poison', hp: 95, maxHp: 95, attack: 95, color: '🌿', moves: ['Solar Beam', 'Sludge Bomb', 'Earthquake', 'Petal Dance'], moveTypes: ['Grass', 'Poison', 'Ground', 'Grass'] },
        { name: 'Pidgeot', type: 'Normal', type2: 'Flying', hp: 85, maxHp: 85, attack: 85, color: '🐦', moves: ['Hurricane', 'Wing Attack', 'Aerial Ace', 'Quick Attack'], moveTypes: ['Flying', 'Flying', 'Flying', 'Normal'] },
        { name: 'Gengar', type: 'Ghost', type2: 'Poison', hp: 70, maxHp: 70, attack: 75, color: '👻', moves: ['Shadow Ball', 'Sludge Bomb', 'Dark Pulse', 'Hypnosis'], moveTypes: ['Ghost', 'Poison', 'Dark', 'Psychic'] },
        { name: 'Machamp', type: 'Fighting', type2: null, hp: 110, maxHp: 110, attack: 130, color: '💪', moves: ['Dynamic Punch', 'Cross Chop', 'Stone Edge', 'Earthquake'], moveTypes: ['Fighting', 'Fighting', 'Rock', 'Ground'] },
        { name: 'Golem', type: 'Rock', type2: 'Ground', hp: 90, maxHp: 90, attack: 115, color: '🪨', moves: ['Earthquake', 'Rock Slide', 'Stone Edge', 'Explosion'], moveTypes: ['Ground', 'Rock', 'Rock', 'Normal'] },
        { name: 'Victreebel', type: 'Grass', type2: 'Poison', hp: 85, maxHp: 85, attack: 105, color: '🌿', moves: ['Razor Leaf', 'Sludge Bomb', 'Solar Beam', 'Leaf Blade'], moveTypes: ['Grass', 'Poison', 'Grass', 'Grass'] },
        { name: 'Dragonite', type: 'Dragon', type2: 'Flying', hp: 110, maxHp: 110, attack: 134, color: '🐉', moves: ['Dragon Claw', 'Wing Attack', 'Thunder', 'Outrage'], moveTypes: ['Dragon', 'Flying', 'Electric', 'Dragon'] },
        { name: 'Gyarados', type: 'Water', type2: 'Flying', hp: 105, maxHp: 105, attack: 125, color: '🐉', moves: ['Hydro Pump', 'Bite', 'Ice Beam', 'Dragon Dance'], moveTypes: ['Water', 'Dark', 'Ice', 'Dragon'] }
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
    const wild = { ...wildPokemons[Math.floor(Math.random() * wildPokemons.length)] };
    setWildPokemon(wild);
    setBattleLog([`A wild ${wild.name} appeared!`]);
    setGameState('battle');
    setIsPlayerTurn(true);
    setPotionUsed(false);
  };

  const resetGame = () => {
    setGameState('start');
    setPlayerPokemon(null);
    setWildPokemon(null);
    setBattleLog([]);
    setIsPlayerTurn(true);
    setPotionUsed(false);
    setBattlesWon(0);
    setAvailableTeam([]);
    setPokedex([]);
    shouldSpawnMewtwo.current = false;
    hasDefeatedMewtwo.current = false;
  };

  if (gameState === 'start') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <DebugButton />
        <SettingsModal />
        <div className={`gameboy-console ${getContainerClass()} mx-auto`}>
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
          
            <div className="grid grid-cols-3 gap-3">
              {starters.map(starter => (
                <button
                  key={starter.name}
                  onClick={() => chooseStarter(starter)}
                  className="border-4 border-black p-4 transition-all hover:scale-105"
                  style={{backgroundColor: '#fbbf24', boxShadow: '4px 4px 0px #000'}}
                >
                  <div className="mb-2 flex justify-center bg-white border-2 border-black p-2 rounded">
                    <img
                      src={getPokemonSprite(starter.name)}
                      alt={starter.name}
                      className="pixelated"
                      style={{
                        imageRendering: 'pixelated',
                        width: `${getSpriteSize(128)}px`,
                        height: `${getSpriteSize(128)}px`
                      }}
                    />
                  </div>
                  <h3 className="font-bold text-xs mb-1 uppercase retro-text" style={{color: '#000'}}>
                    {starter.name}
                  </h3>
                  <div className="border-2 border-black px-2 py-1 text-xs font-bold inline-block retro-text" style={{backgroundColor: '#dc2626', color: '#fff'}}>
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
        <DebugButton />
        <SettingsModal />
        <div className={`${getContainerClass()} mx-auto`} style={{padding: '40px'}}>
          <div className="border-8 border-purple-500 bg-black p-8 text-center" style={{boxShadow: '0 0 50px rgba(168, 85, 247, 0.8)', minHeight: '500px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
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
              <h1 className="text-4xl font-bold text-white" style={{textShadow: '3px 3px 0px #000'}}>
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
              <p className="text-2xl font-bold mb-2">HP: 150 | ATTACK: 150</p>
              <p className="text-lg font-bold text-purple-300">TYPE: PSYCHIC</p>
            </div>
            <button
              onClick={() => {
                const mewtwo = {
                  name: 'Mewtwo',
                  type: 'Psychic',
                  type2: null,
                  hp: 150,
                  maxHp: 150,
                  attack: 150,
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
        <DebugButton />
        <SettingsModal />
        <div className={`gameboy-console ${getContainerClass()} mx-auto`}>
          <div className="gameboy-screen">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="border-4 border-black p-3" style={{backgroundColor: '#fef3c7'}}>
                <div className="mb-2 flex justify-center">
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
                    src={getPokemonSprite(playerPokemon.name)}
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
                    onClick={() => playerAttack(index)}
                    disabled={!isPlayerTurn}
                    className={`border-4 border-black py-2 px-3 font-bold text-xs transition-all retro-text ${
                      isPlayerTurn ? 'hover:scale-105' : 'cursor-not-allowed opacity-50'
                    }`}
                    style={{
                      backgroundColor: isPlayerTurn ? '#fbbf24' : '#9ca3af',
                      color: '#000',
                      boxShadow: isPlayerTurn ? '3px 3px 0px #000' : 'none'
                    }}
                  >
                    {move.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={usePotion}
                  disabled={!isPlayerTurn || potionUsed}
                  className={`border-4 border-black py-2 px-3 font-bold text-xs transition-all retro-text ${
                    isPlayerTurn && !potionUsed ? 'hover:scale-105' : 'cursor-not-allowed opacity-50'
                  }`}
                  style={{
                    backgroundColor: isPlayerTurn && !potionUsed ? '#22c55e' : '#9ca3af',
                    color: '#000',
                    boxShadow: isPlayerTurn && !potionUsed ? '3px 3px 0px #000' : 'none'
                  }}
                >
                  POTION {potionUsed && '(X)'}
                </button>

                <button
                  onClick={catchPokemon}
                  disabled={!isPlayerTurn}
                  className={`border-4 border-black py-2 px-3 font-bold text-xs transition-all retro-text ${
                    isPlayerTurn ? 'hover:scale-105' : 'cursor-not-allowed opacity-50'
                  }`}
                  style={{
                    backgroundColor: isPlayerTurn ? '#dc2626' : '#9ca3af',
                    color: '#fff',
                    boxShadow: isPlayerTurn ? '3px 3px 0px #000' : 'none'
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
      <div className="min-h-screen p-8 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <DebugButton />
        <SettingsModal />
        <div className={`gameboy-console ${getContainerClass()} mx-auto`}>
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
              onClick={nextBattle}
              className="w-full border-4 border-black hover:scale-105 font-bold py-3 px-6 retro-text transition-all"
              style={{backgroundColor: '#fbbf24', color: '#000', boxShadow: '4px 4px 0px #000'}}
            >
              NEXT BATTLE
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

  if (gameState === 'victory') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <DebugButton />
        <SettingsModal />
        <div className={`gameboy-console ${getContainerClass()} mx-auto`}>
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
              onClick={nextBattle}
              className="w-full border-4 border-black hover:scale-105 font-bold py-3 px-6 retro-text transition-all"
              style={{backgroundColor: '#fbbf24', color: '#000', boxShadow: '4px 4px 0px #000'}}
            >
              NEXT BATTLE
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
      <div className="min-h-screen p-8 flex items-center justify-center" style={{fontFamily: 'monospace'}}>
        <SettingsButton />
        <DebugButton />
        <SettingsModal />
        <div className={`gameboy-console ${getContainerClass()} mx-auto`}>
          <div className="gameboy-screen text-center">
            <div className="border-4 border-black p-6 mb-6" style={{backgroundColor: '#dc2626'}}>
              <h2 className="text-2xl font-bold retro-text" style={{color: '#fff'}}>GAME OVER</h2>
            </div>
            <button
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