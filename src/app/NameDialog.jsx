import { useEffect, useRef, useState } from "react";
import { setStudentName, useStudent } from "../lib/student";

// Asks for the name shown on assessments and results.
const NameDialog = ({ open, onClose, title = "What should we call you?" }) => {
  const student = useStudent();
  const [name, setName] = useState(student.name);
  const input = useRef(null);
  useEffect(() => {
    if (open) {
      setName(student.name);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const save = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStudentName(name);
    onClose?.(true);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center" onMouseDown={() => onClose?.(false)}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-title"
        onSubmit={save}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-rise-in rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 id="name-title" className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-ink-soft">Your name appears on your results. No account needed.</p>
        <label htmlFor="student-name" className="sr-only">Your name</label>
        <input
          id="student-name"
          ref={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="e.g. Ana"
          className="field mt-4"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-quiet" onClick={() => onClose?.(false)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!name.trim()}>Save</button>
        </div>
      </form>
    </div>
  );
};

export default NameDialog;
