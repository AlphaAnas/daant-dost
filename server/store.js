import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Where attempts live: MongoDB when MONGO_URI is set, otherwise memory saved
// to server/data/attempts.json. Both have the same three functions.

const memoryStore = ({ file }) => {
  const map = new Map();
  if (file) {
    try {
      JSON.parse(readFileSync(file, "utf8")).forEach((a) => map.set(a.id, a));
    } catch {
      // No file yet.
    }
  }
  let timer;
  const flush = () => {
    if (!file) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify([...map.values()]));
    }, 200);
  };
  return {
    kind: "memory",
    get: async (id) => structuredClone(map.get(id) ?? null),
    save: async (attempt) => {
      map.set(attempt.id, structuredClone(attempt));
      flush();
      return attempt;
    },
    list: async (studentId) =>
      [...map.values()]
        .filter((a) => a.student?.id === studentId)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .map((a) => structuredClone(a)),
  };
};

const mongoStore = async (uri) => {
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(uri);
  const Attempt =
    mongoose.models.Attempt ||
    mongoose.model(
      "Attempt",
      new mongoose.Schema(
        { _id: String, studentId: { type: String, index: true }, startedAt: String, data: Object },
        { minimize: false },
      ),
    );
  return {
    kind: "mongo",
    get: async (id) => (await Attempt.findById(id).lean())?.data ?? null,
    save: async (a) => {
      await Attempt.updateOne(
        { _id: a.id },
        { _id: a.id, studentId: a.student?.id, startedAt: a.startedAt, data: a },
        { upsert: true },
      );
      return a;
    },
    list: async (studentId) =>
      (await Attempt.find({ studentId }).sort({ startedAt: -1 }).lean()).map((d) => d.data),
  };
};

export const createStore = async ({ mongoUri = process.env.MONGO_URI, file } = {}) => {
  if (mongoUri) {
    try {
      return await mongoStore(mongoUri);
    } catch (err) {
      console.warn("[store] MongoDB unreachable, using memory:", err.message);
    }
  }
  return memoryStore({
    file: file === undefined ? join(dirname(fileURLToPath(import.meta.url)), "data", "attempts.json") : file,
  });
};
