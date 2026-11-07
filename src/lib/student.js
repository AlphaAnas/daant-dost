import { useSyncExternalStore } from "react";

// Who is learning on this browser. No accounts for the prototype: a random id
// and a display name kept in localStorage.

const KEY = "tt-student";
const listeners = new Set();
let current;

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved?.id) return saved;
  } catch {
    // Storage blocked or corrupt.
  }
  const fresh = { id: crypto.randomUUID?.() || String(Math.random()).slice(2), name: "" };
  try {
    localStorage.setItem(KEY, JSON.stringify(fresh));
  } catch {
    // Works for this visit only.
  }
  return fresh;
};

export const getStudent = () => {
  current ??= read();
  return current;
};

export const setStudentName = (name) => {
  current = { ...getStudent(), name: name.trim().slice(0, 60) };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Kept in memory.
  }
  listeners.forEach((l) => l());
};

export const useStudent = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getStudent,
  );

export const initialsOf = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";
