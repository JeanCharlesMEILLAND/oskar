export type Achievement = {
  id: string;
  emoji: string;
  names: { pl: string; fr: string };
};

// 15 medals — ported from legacy gra_zolwiki_v10.html lines 16-33
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_win", emoji: "🥇", names: { pl: "Pierwsza wygrana", fr: "Première victoire" } },
  { id: "combo3", emoji: "🔥", names: { pl: "Combo Master", fr: "Maître Combo" } },
  { id: "combo5", emoji: "🎯", names: { pl: "Sniper (combo ×3)", fr: "Sniper (combo ×3)" } },
  { id: "speedrun", emoji: "⚡", names: { pl: "Speedrun (10 w 30s)", fr: "Speedrun (10 en 30s)" } },
  { id: "collector5", emoji: "💎", names: { pl: "Kolekcjoner (5 klas)", fr: "Collectionneur (5)" } },
  { id: "rich", emoji: "👑", names: { pl: "Bogacz (1000 monet)", fr: "Riche (1000 pièces)" } },
  { id: "pacifist", emoji: "🛡️", names: { pl: "Pacyfista (bez trafienia)", fr: "Pacifiste (sans coup)" } },
  { id: "allbasic", emoji: "🌈", names: { pl: "Wszystkie podstawowe", fr: "Toutes basiques" } },
  { id: "firstrare", emoji: "🎀", names: { pl: "Pierwsza rzadka", fr: "Première rare" } },
  { id: "firstepic", emoji: "✨", names: { pl: "Pierwsza epicka", fr: "Première épique" } },
  { id: "firstlegend", emoji: "🚀", names: { pl: "Pierwsza legendarna", fr: "Première légendaire" } },
  { id: "endless50", emoji: "♾️", names: { pl: "Endless 50s", fr: "Endless 50s" } },
  { id: "endless100", emoji: "🏆", names: { pl: "Endless 100s", fr: "Endless 100s" } },
  { id: "goldsalad", emoji: "🌟", names: { pl: "Złota sałata", fr: "Salade dorée" } },
  { id: "powerup10", emoji: "🎁", names: { pl: "10 power-upów", fr: "10 power-ups" } },
];

export const ACH_REWARD = 30; // saladocoins per medal unlocked
export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
