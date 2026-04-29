export type DailyType =
  | "score_solo"
  | "wins_solo"
  | "combo3_count"
  | "powerups"
  | "endless_sec"
  | "gold_eaten";

export type DailyChallenge = {
  id: string;
  target: number;
  type: DailyType;
  names: { pl: string; fr: string };
};

// 7 daily challenges — ported from legacy lines 36-44
export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: "d_score15", target: 15, type: "score_solo", names: { pl: "Zdobądź 15 sałat solo", fr: "Marque 15 salades solo" } },
  { id: "d_score20", target: 20, type: "score_solo", names: { pl: "Zdobądź 20 sałat solo", fr: "Marque 20 salades solo" } },
  { id: "d_combo4", target: 4, type: "combo3_count", names: { pl: "Combo ×3 (4 razy)", fr: "Combo ×3 (4 fois)" } },
  { id: "d_powerup3", target: 3, type: "powerups", names: { pl: "Zbierz 3 power-upy", fr: "Ramasse 3 power-ups" } },
  { id: "d_winsolo", target: 2, type: "wins_solo", names: { pl: "Wygraj 2 razy solo", fr: "Gagne 2 fois solo" } },
  { id: "d_endless30", target: 60, type: "endless_sec", names: { pl: "Endless: przetrwaj 60s", fr: "Endless : survis 60s" } },
  { id: "d_gold2", target: 2, type: "gold_eaten", names: { pl: "Zjedz 2 złote sałaty", fr: "Mange 2 salades dorées" } },
];

export const DAILY_REWARD = 100;

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Deterministic per-day challenge selection based on date.
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function getTodaysChallenge(): DailyChallenge {
  const idx = djb2(todayKey()) % DAILY_CHALLENGES.length;
  return DAILY_CHALLENGES[idx];
}

export const DAILY_BY_ID = Object.fromEntries(DAILY_CHALLENGES.map((d) => [d.id, d]));
