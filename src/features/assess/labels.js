export const SITE_LABEL = {
  teeth: "Tooth and pulp",
  third_molar: "Wisdom teeth",
  gingiva: "Gums",
  mucosa: "Mucosa",
  jaw: "Jaw",
  tmj: "Jaw joint",
};

export const VERDICT = {
  correct: { label: "Correct", className: "bg-score-good-tint text-score-good", color: "#2BD19A" },
  partial: { label: "Partly right", className: "bg-score-mid-tint text-score-mid", color: "#FFB020" },
  wrong: { label: "Not quite", className: "bg-score-low-tint text-score-low", color: "#FF3D5E" },
};

export const GRADE_STYLE = {
  Distinction: "bg-score-good text-white",
  Pass: "bg-brand text-white",
  Borderline: "bg-score-mid text-white",
  "Not yet": "bg-score-low text-white",
};

export const scoreColor = (score) => (score >= 80 ? "#12805C" : score >= 60 ? "#0A74DA" : score >= 50 ? "#9A5B00" : "#C21E3A");

export const firstName = (name = "") => name.split(" ")[0];

export const formatClock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
