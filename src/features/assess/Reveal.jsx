import { useEffect, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Shows text a word at a time, like it is being spoken.
const Reveal = ({ text, active, onDone, speed = 26 }) => {
  const words = text.split(/(\s+)/);
  const [shown, setShown] = useState(active && !reduced() ? 0 : words.length);
  useEffect(() => {
    if (shown >= words.length) {
      onDone?.();
      return undefined;
    }
    const t = setTimeout(() => setShown((n) => Math.min(words.length, n + 2)), speed);
    return () => clearTimeout(t);
  }, [shown, words.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {words.slice(0, shown).join("")}
      {shown < words.length && <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-caret-blink bg-brand" />}
    </>
  );
};

export default Reveal;
