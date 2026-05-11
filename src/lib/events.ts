// Event system — admin can trigger limited-time events (gold rain, salad rain).
// Stored in localStorage with the same key as the legacy game so both share state.

const EVENT_KEY = "zolwie:zolwiki_event_v4";
const EVENT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export type EventType = "double" | "rain" | "halloween" | "christmas";
export type EventState = {
  active: boolean;
  type: EventType | null;
  endsAt: number; // timestamp ms
};

const EMPTY: EventState = { active: false, type: null, endsAt: 0 };

export function getEventState(): EventState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(EVENT_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as EventState;
    if (!parsed?.active) return EMPTY;
    if (Date.now() > parsed.endsAt) {
      // Expired — clear
      stopEvent();
      return EMPTY;
    }
    return parsed;
  } catch {
    return EMPTY;
  }
}

export function startEvent(type: EventType) {
  if (typeof window === "undefined") return;
  const state: EventState = {
    active: true,
    type,
    endsAt: Date.now() + EVENT_DURATION_MS,
  };
  try {
    localStorage.setItem(EVENT_KEY, JSON.stringify(state));
  } catch {}
}

export function stopEvent() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EVENT_KEY, JSON.stringify(EMPTY));
  } catch {}
}

export function eventTimeRemainingSec(state: EventState): number {
  if (!state.active) return 0;
  return Math.max(0, Math.floor((state.endsAt - Date.now()) / 1000));
}
