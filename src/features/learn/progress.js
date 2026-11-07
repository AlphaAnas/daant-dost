import { useSyncExternalStore } from "react";

// Quiz progress on this browser: XP, a daily streak and misses per tooth.

const KEY = "tt-progress";
const empty = { xp: 0, streak: 0, lastDay: null, misses: {}, rounds: 0, best: {} };
const listeners = new Set();
let current;

const today = () => new Date().toISOString().slice(0, 10);
const load = () => {
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...empty };
  }
};

export const getProgress = () => {
  current ??= load();
  return current;
};

const save = (next) => {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Memory only.
  }
  listeners.forEach((l) => l());
};

// Records a finished round: results is [{ tooth, correct }].
export const recordRound = (mode, results, xp) => {
  const p = getProgress();
  const misses = { ...p.misses };
  results.forEach(({ tooth, correct }) => {
    misses[tooth] = Math.max(0, (misses[tooth] || 0) + (correct ? -1 : 1));
    if (!misses[tooth]) delete misses[tooth];
  });
  const day = today();
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const streak = p.lastDay === day ? p.streak : p.lastDay === yesterday ? p.streak + 1 : 1;
  const score = results.filter((r) => r.correct).length;
  save({
    ...p,
    xp: p.xp + xp,
    streak,
    lastDay: day,
    misses,
    rounds: p.rounds + 1,
    best: { ...p.best, [mode]: Math.max(p.best[mode] || 0, score) },
  });
};

export const weakTeeth = (p = getProgress(), n = 6) =>
  Object.entries(p.misses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => id);

export const useProgress = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getProgress,
  );
