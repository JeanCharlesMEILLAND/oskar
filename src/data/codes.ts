// Bonus codes — kids share them with friends to unlock coins / classes.
// Each code can only be redeemed ONCE per account (tracked in account.redeemed).

export type CodeReward = {
  /** Stable internal id stored on the account (don't change after release). */
  id: string;
  /** Coins added to totalEver. */
  coins?: number;
  /** Class IDs added to owned (turtles unlocked for free). */
  classes?: string[];
  /** If true, the code can be redeemed unlimited times (cheat code). Otherwise once per account. */
  repeatable?: boolean;
  /** Display label in the success toast. */
  label: { pl: string; fr: string };
};

// Keys are the codes the user types — case-insensitive (we lowercase before lookup).
export const CODES: Record<string, CodeReward> = {
  oskar1000: {
    id: "oskar1000",
    coins: 1000,
    label: { pl: "+1000 sałatomonet 🥬", fr: "+1000 saladocoins 🥬" },
  },
  bogacz: {
    id: "bogacz",
    coins: 5000,
    label: { pl: "Bogacz! +5000 🥬", fr: "Riche ! +5000 🥬" },
  },
  zlota: {
    id: "zlota",
    coins: 500,
    classes: ["royal"],
    label: { pl: "Złota klasa Royal + 500 🥬", fr: "Classe Royal + 500 🥬" },
  },
  viposkar: {
    id: "viposkar",
    coins: 1500,
    classes: ["vip_limited"],
    label: { pl: "VIP Limited odblokowane!", fr: "VIP Limited débloqué !" },
  },
  // Cheat code — działa nieskończenie (każde użycie daje +1000)
  minecraft: {
    id: "minecraft",
    coins: 1000,
    repeatable: true,
    label: { pl: "🎮 MINECRAFT! +1000 🥬", fr: "🎮 MINECRAFT ! +1000 🥬" },
  },
};
