// Where the student is in the station: history to management.
const StageBar = ({ stages, stage, done, className = "" }) => {
  const current = done ? stages.length : Math.max(0, stages.findIndex((s) => s.id === stage));
  return (
    <div className={`w-full ${className}`} aria-label="Assessment progress">
      <ol className="flex gap-1">
        {stages.map((s, i) => {
          const complete = i < current;
          const active = i === current;
          return (
            <li key={s.id} className="flex-1">
              <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                <span
                  className={`block h-full rounded-full transition-all duration-700 ${complete ? "w-full bg-brand" : active ? "w-1/2 bg-sky" : "w-0"}`}
                />
              </span>
              <span
                className={`mt-1 hidden text-xs sm:block ${active ? "font-bold text-ink" : complete ? "text-ink-soft" : "text-ink-faint"}`}
                aria-current={active ? "step" : undefined}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-xs text-ink-soft sm:hidden">
        {done ? "Station complete" : `Step ${current + 1} of ${stages.length}: ${stages[current]?.label}`}
      </p>
    </div>
  );
};

export default StageBar;
