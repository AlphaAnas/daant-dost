import { useState } from "react";
import DentalCase from "./components/dental/DentalCase";

// The dental module on its own: the case form with the 3D mouth, and the
// case data it produces shown below instead of being sent to a backend.
const App = () => {
  const [result, setResult] = useState(null);
  return (
    <main className="min-h-screen">
      <DentalCase onStart={setResult} busy={false} />
      {result && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-medium">Case data</h2>
            <button type="button" className="btn-quiet" onClick={() => setResult(null)}>Clear</button>
          </div>
          <pre className="mt-3 overflow-auto rounded-2xl border border-line bg-white p-4 text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
};

export default App;
