import { FiAward, FiClipboard } from "react-icons/fi";
import Avatar from "../../ui/Avatar";
import Reveal from "./Reveal";
import { VERDICT } from "./labels";

const Typing = ({ who }) => (
  <div className="flex items-center gap-3 py-2" aria-live="polite">
    <span className="flex gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-line">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-dot-bounce rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
    <span className="text-sm text-ink-faint">{who}</span>
  </div>
);

const ExaminerMark = () => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky to-brand text-white" aria-hidden>
    <FiAward size={17} />
  </span>
);

const Message = ({ m, patient, fresh }) => {
  if (m.role === "student") {
    return (
      <div className="flex justify-end py-1.5">
        <p className="max-w-[85%] animate-rise-in whitespace-pre-wrap rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-white">{m.text}</p>
      </div>
    );
  }
  const isPatient = m.role === "patient";
  const verdict = m.verdict && VERDICT[m.verdict];
  return (
    <div className="flex items-start gap-3 py-2">
      {isPatient ? <Avatar name={patient.name} role="patient" /> : <ExaminerMark />}
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-bold text-ink-faint">{isPatient ? patient.name : "Examiner"}</p>
        <div
          className={`rounded-2xl rounded-tl-md px-4 py-3 shadow-sm ring-1 ${
            isPatient ? "bg-white ring-line" : "bg-brand-tint/60 ring-brand/15"
          }`}
        >
          {verdict && <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${verdict.className}`}>{verdict.label}</span>}
          <p className={`whitespace-pre-wrap leading-relaxed ${isPatient ? "text-ink" : "text-ink"}`}>
            {isPatient && "“"}
            <Reveal text={m.text} active={fresh} />
            {isPatient && "”"}
          </p>
          {m.findings && (
            <ul className="mt-3 grid gap-2">
              {m.findings.map((f) => {
                const [name, ...rest] = f.split(": ");
                return (
                  <li key={f} className="flex gap-2.5 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line">
                    <FiClipboard className="mt-0.5 shrink-0 text-brand" aria-hidden />
                    <span>
                      <span className="font-bold">{name}</span>
                      <span className="block text-ink-soft">{rest.join(": ")}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const Thread = ({ transcript, patient, freshFrom, typing }) => (
  <div className="flex flex-col">
    {transcript.map((m, i) => (
      <Message key={`${i}-${m.at}`} m={m} patient={patient} fresh={i >= freshFrom} />
    ))}
    {typing && <Typing who={typing} />}
  </div>
);

export default Thread;
