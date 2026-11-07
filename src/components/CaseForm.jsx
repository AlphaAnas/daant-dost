import { useState } from "react";

// Standalone version of the main app's CaseForm: same props and layout, without
// the API, router, patient record and MR number lookup. On submit it hands the
// case to onStart, the same object the main app sends to its backend.
const PATIENT_SEX = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "other", label: "Other" },
];

const CaseForm = ({ onStart, busy, draft, payload, panel, summary, starters = [], intro, placeholder }) => {
  const [text, setText] = useState(draft?.message || "");
  const [age, setAge] = useState(draft?.patient?.age ?? "");
  const [sex, setSex] = useState(draft?.patient?.sex || "");

  const ageNumber = Number(age);
  const ageValid = age !== "" && Number.isInteger(ageNumber) && ageNumber >= 0 && ageNumber <= 120;
  const ready = ageValid && sex && text.trim() && !busy;

  const submit = (e) => {
    e?.preventDefault();
    if (!ready) return;
    onStart({ message: text.trim(), ...payload, patient: { age: ageNumber, sex } });
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10 lg:py-10">
      <div className="order-2 lg:order-1">{panel}</div>

      <form onSubmit={submit} className="order-1 flex flex-col lg:order-2">
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">New dental case</h1>
        <p className="mt-3 max-w-lg text-lg leading-relaxed text-ink-soft">{intro}</p>

        <fieldset className="mt-6 grid gap-4 sm:grid-cols-[7rem_1fr]">
          <legend className="sr-only">Patient</legend>
          <div>
            <label htmlFor="patient-age" className="mb-1.5 block font-bold">Age</label>
            <input
              id="patient-age"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="field tabular-nums"
              placeholder="Years"
            />
          </div>
          <div>
            <span id="patient-sex" className="mb-1.5 block font-bold">Sex</span>
            <div role="radiogroup" aria-labelledby="patient-sex" className="inline-flex rounded-xl border border-line bg-white p-1">
              {PATIENT_SEX.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={sex === s.id}
                  onClick={() => setSex(s.id)}
                  className={`rounded-lg px-3.5 py-2 font-bold transition-colors ${
                    sex === s.id ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        {summary}

        {starters.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-bold text-ink-soft">Common presentations</p>
            <div className="flex flex-wrap gap-2">
              {starters.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setText(s)}
                  className={`rounded-xl border px-3.5 py-2 text-left transition-colors ${
                    text === s ? "border-brand bg-brand-tint" : "border-line bg-white hover:border-ink-faint"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <label htmlFor="start-text" className="mt-6 block font-bold">Presentation</label>
        <textarea
          id="start-text"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          placeholder={placeholder}
          className="field mt-2 resize-y"
        />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="submit" className="btn-primary" disabled={!ready}>Show case data</button>
          {!ready && !busy && (
            <p className="text-sm text-ink-faint">
              {!ageValid ? "Enter the patient's age to continue" : !sex ? "Select the patient's sex to continue" : "Describe the presentation to continue"}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default CaseForm;
