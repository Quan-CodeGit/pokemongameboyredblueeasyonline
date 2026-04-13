// Fetches correct base stats from PokéAPI for all pokemon in the game
// Run with: node scripts/fetch-pokemon-stats.mjs

const NAME_MAP = {
  'NidoranF': 'nidoran-f',
  'NidoranM': 'nidoran-m',
  'Mr. Mime': 'mr-mime',
  'Farfetchd': 'farfetchd',
};

const POKEMON_NAMES = [
  // Very Common
  'Magikarp', 'Metapod', 'Kakuna', 'Caterpie', 'Weedle', 'Pidgey', 'Rattata', 'Snorlax',
  // Common
  'Clefairy', 'Jigglypuff', 'Seel', 'NidoranF', 'Gastly', 'Tentacool', 'Vulpix', 'Meowth',
  'Zubat', 'Onix', 'Oddish', 'Poliwag', 'Paras', 'Venonat', 'Krabby', 'Horsea', 'Goldeen', 'Staryu',
  // Uncommon
  'Ekans', 'NidoranM', 'Dratini', 'Koffing', 'Psyduck', 'Pikachu', 'Diglett', 'Geodude',
  'Spearow', 'Magnemite', 'Cubone', 'Drowzee', 'Slowpoke', 'Shellder', 'Voltorb',
  'Exeggcute', 'Omanyte',
  // Rare
  'Farfetchd', 'Grimer', 'Doduo', 'Growlithe', 'Bellsprout', 'Sandshrew', 'Machop', 'Mankey',
  'Ponyta', 'Rhyhorn', 'Tangela', 'Lickitung', 'Chansey', 'Dragonair', 'Weepinbell', 'Kabuto',
  // Very Rare
  'Kangaskhan', 'Mr. Mime', 'Jynx', 'Abra', 'Electabuzz', 'Magmar', 'Pinsir', 'Tauros',
  'Scyther', 'Ditto', 'Eevee', 'Porygon', 'Lapras', 'Aerodactyl', 'Beedrill', 'Butterfree',
  'Hitmonlee', 'Hitmonchan',
  // Birds
  'Articuno', 'Zapdos', 'Moltres',
];

async function fetchStats(name) {
  const apiName = NAME_MAP[name] ?? name.toLowerCase().replace(/[. ]/g, '-');
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${apiName}`);
  if (!res.ok) throw new Error(`Failed to fetch ${name} (${apiName}): ${res.status}`);
  const data = await res.json();
  const stats = {};
  for (const s of data.stats) {
    stats[s.stat.name] = s.base_stat;
  }
  return {
    name,
    hp: stats['hp'],
    attack: stats['attack'],
    def: stats['defense'],
    spAtk: stats['special-attack'],
    spDef: stats['special-defense'],
    speed: stats['speed'],
  };
}

const results = {};
let failed = [];

for (const name of POKEMON_NAMES) {
  try {
    const stats = await fetchStats(name);
    results[name] = stats;
    process.stdout.write('.');
  } catch (e) {
    failed.push(name);
    process.stdout.write('X');
  }
}

console.log('\n\nFailed:', failed);
console.log('\n--- RESULTS ---\n');
console.log(JSON.stringify(results, null, 2));
