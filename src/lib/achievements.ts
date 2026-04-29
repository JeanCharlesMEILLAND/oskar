import { ACHIEVEMENTS, ACH_REWARD } from "@/data/achievements";
import { TURTLES } from "@/data/turtles";
import type { Account } from "./auth";
import type { GameResult } from "./auth";

type Mode = "solo" | "duo" | "endless";

const RARITY_OF: Record<string, string> = Object.fromEntries(
  TURTLES.map((t) => [t.id, t.rarity]),
);

function ownsAnyOfRarity(account: Account, rarity: string): boolean {
  for (const id of Object.keys(account.owned)) {
    if (RARITY_OF[id] === rarity) return true;
  }
  return false;
}

function ownsAllBasic(account: Account): boolean {
  const basics = TURTLES.filter((t) => t.rarity === "basic").map((t) => t.id);
  return basics.every((id) => account.owned[id]);
}

/** Returns the IDs of achievements newly unlocked, after mutating `account` to mark them. */
export function checkAchievements(
  account: Account,
  ctx: { mode?: Mode; result?: GameResult },
): string[] {
  const unlocked: string[] = [];
  const ach = account.ach ?? (account.ach = {});

  function unlock(id: string) {
    if (!ach[id]) {
      ach[id] = 1;
      unlocked.push(id);
    }
  }

  // Game-end specific
  if (ctx.result) {
    const r = ctx.result;
    if (r.won) unlock("first_win");
    if ((r.maxCombo ?? 0) >= 3) unlock("combo3");
    if ((r.maxCombo ?? 0) >= 5) unlock("combo5");
    if ((r.goldEaten ?? 0) > 0) unlock("goldsalad");
    if (
      ctx.mode === "solo" &&
      r.score >= 10 &&
      (r.durationSec ?? Infinity) <= 30
    ) unlock("speedrun");
    if (!(r.gotHit ?? false) && r.won) unlock("pacifist");
    if (ctx.mode === "endless" && (r.survivedSec ?? 0) >= 50) unlock("endless50");
    if (ctx.mode === "endless" && (r.survivedSec ?? 0) >= 100) unlock("endless100");
  }

  // State-based (work after both game and shop)
  const ownedCount = Object.keys(account.owned).length;
  if (ownedCount >= 5) unlock("collector5");
  if (ownsAllBasic(account)) unlock("allbasic");
  if (ownsAnyOfRarity(account, "rare")) unlock("firstrare");
  if (ownsAnyOfRarity(account, "epic")) unlock("firstepic");
  if (ownsAnyOfRarity(account, "legendary")) unlock("firstlegend");
  if (account.totalEver >= 1000) unlock("rich");
  if ((account.stats?.powerups ?? 0) >= 10) unlock("powerup10");

  // Reward
  if (unlocked.length > 0) {
    account.totalEver += unlocked.length * ACH_REWARD;
  }

  return unlocked;
}

export function totalAchievements() {
  return ACHIEVEMENTS.length;
}
