// Map is 4× the legacy area: 2560×1600 (legacy was 1280×800).
export const MAP_W = 2560;
export const MAP_H = 1600;
// VIEWPORT_W/H are not used by the fullscreen canvas anymore (it reads window size),
// but kept for any non-fullscreen embeds.
export const VIEWPORT_W = 800;
export const VIEWPORT_H = 500;

export const TICK_RATE = 60;
export const TICK_DT = 1 / TICK_RATE;

export const TURTLE_RADIUS = 22;
export const TURTLE_BASE_SPEED = 3.5; // px per tick
export const LETTUCE_RADIUS = 14;
export const ROCK_RADIUS = 18;
export const POWERUP_RADIUS = 16;

export const SOLO_DURATION_SEC = 60;
export const SOLO_TARGET = 10;
export const COMBO_TIMEOUT_SEC = 2;
export const COMBO_THRESHOLD_2X = 3;
export const COMBO_THRESHOLD_3X = 5;

// 4× area → ~4× spawn budget
export const LETTUCE_INITIAL_COUNT = 12;
export const LETTUCE_RESPAWN_SEC = 0.9;
export const ROCK_INITIAL_COUNT = 18;
export const ROCK_RESPAWN_SEC = 2.5;
export const ROCK_MAX = 60;
export const POWERUP_INTERVAL_SEC = 13;
export const POWERUP_DURATION_SEC = 12; // bigger map = more time to reach
export const GOLD_VALUE = 10;
export const HIT_INVULN_SEC = 1.5;
export const CAMERA_LERP = 0.12;
export const MAGNET_FORCE = 0.18;
export const POWERUP_RADIUS_PICK = 22;
export const STAR_DURATION_SEC = 5;
export const STRAWBERRY_DURATION_SEC = 3;
export const STRAWBERRY_GLOBAL_MAGNET = 99999; // huge — pulls all lettuces
export const TOMATO_TIME_BONUS = 5;
export const TOMATO_ENDLESS_COIN_BONUS = 5;

export const COLORS = {
  grass: "#84cc16",
  grassDark: "#65a30d",
  grassLight: "#bef264",
  dirt: "#d6a26b",
  dirtDark: "#a17350",
  flower: ["#fde047", "#ef4444", "#f0abfc", "#ffffff", "#fb923c"],
  mushroomCap: "#dc2626",
  mushroomStem: "#fef9c3",
  water: "#67e8f9",
  waterDeep: "#0ea5e9",
  bush: "#15803d",
  bushHighlight: "#22c55e",
  rock: "#94a3b8",
  rockDark: "#475569",
  vignette: "rgba(15, 90, 50, 0.35)",
};
