import {
  DAILY_BY_ID,
  DAILY_REWARD,
  getTodaysChallenge,
  todayKey,
  type DailyChallenge,
} from "@/data/daily";
import type { Account, GameResult } from "./auth";

type Mode = "solo" | "duo" | "endless";

/** Ensure account.daily reflects today's challenge (resets at midnight UTC). */
export function ensureDaily(account: Account): { challenge: DailyChallenge; progress: number; claimed: boolean } {
  const today = todayKey();
  const todayCh = getTodaysChallenge();
  if (!account.daily || account.daily.day !== today) {
    account.daily = { day: today, progress: 0, claimed: false };
  }
  return {
    challenge: todayCh,
    progress: account.daily.progress,
    claimed: account.daily.claimed,
  };
}

/** Update daily progress after a finished game. Auto-claims reward if reached. */
export function updateDaily(
  account: Account,
  mode: Mode,
  result: GameResult,
): { justCompleted: boolean; challenge: DailyChallenge } {
  const today = todayKey();
  if (!account.daily || account.daily.day !== today) {
    account.daily = { day: today, progress: 0, claimed: false };
  }
  const todayCh = getTodaysChallenge();
  const beforeClaimed = account.daily.claimed;

  if (!account.daily.claimed) {
    switch (todayCh.type) {
      case "score_solo":
        if (mode === "solo") {
          account.daily.progress = Math.max(account.daily.progress, result.score);
        }
        break;
      case "wins_solo":
        if (mode === "solo" && result.won) account.daily.progress += 1;
        break;
      case "combo3_count":
        account.daily.progress += result.combo3Count ?? 0;
        break;
      case "powerups":
        account.daily.progress += result.powerupsPicked ?? 0;
        break;
      case "endless_sec":
        if (mode === "endless") {
          account.daily.progress = Math.max(
            account.daily.progress,
            result.survivedSec ?? 0,
          );
        }
        break;
      case "gold_eaten":
        account.daily.progress += result.goldEaten ?? 0;
        break;
    }
    if (account.daily.progress >= todayCh.target) {
      account.daily.claimed = true;
      account.totalEver += DAILY_REWARD;
    }
  }

  return {
    justCompleted: !beforeClaimed && account.daily.claimed,
    challenge: todayCh,
  };
}

export const TODAY_DAILY_REWARD = DAILY_REWARD;
export { DAILY_BY_ID, getTodaysChallenge, todayKey };
