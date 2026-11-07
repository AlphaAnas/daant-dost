import { randomUUID } from "node:crypto";
import express from "express";
import { aiEnabled, MODEL } from "./ai.js";
import { coachReport, gradeText, patientReply } from "./assessor.js";
import { CASES, caseById } from "./cases.js";
import { TUTOR_SUGGESTIONS, tutorPlan } from "./tutor.js";
import {
  MAX_HISTORY_QUESTIONS,
  answerItem,
  askPatient,
  buildReport,
  endHistory,
  gradeChoice,
  publicCase,
  startAttempt,
  viewOf,
} from "./engine.js";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const cleanStudent = (s) => ({
  id: String(s?.id || "").slice(0, 64) || randomUUID(),
  name: String(s?.name || "Student").trim().slice(0, 60) || "Student",
});

export const createApp = ({ store }) => {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  const api = express.Router();

  const load = async (id) => {
    const attempt = await store.get(id);
    if (!attempt) throw new HttpError(404, "That assessment could not be found.");
    return { attempt, card: caseById(attempt.caseId) };
  };

  api.get("/health", (req, res) => res.json({ ok: true, ai: aiEnabled(), model: aiEnabled() ? MODEL : null, db: store.kind }));

  api.get("/cases", (req, res) => res.json(CASES.map(publicCase)));

  api.post(
    "/assessments",
    wrap(async (req, res) => {
      const card = caseById(req.body?.caseId);
      if (!card) throw new HttpError(404, "That case could not be found.");
      const mode = req.body?.mode === "exam" ? "exam" : "practice";
      const attempt = startAttempt(card, { id: randomUUID(), student: cleanStudent(req.body?.student), mode });
      await store.save(attempt);
      res.status(201).json(viewOf(attempt, card));
    }),
  );

  api.get(
    "/assessments",
    wrap(async (req, res) => {
      const list = await store.list(String(req.query.studentId || ""));
      res.json(
        list.map((a) => ({
          id: a.id,
          case: publicCase(caseById(a.caseId)),
          mode: a.mode,
          status: a.status,
          startedAt: a.startedAt,
          finishedAt: a.finishedAt,
          score: a.report?.score ?? null,
          grade: a.report?.grade ?? null,
        })),
      );
    }),
  );

  api.get(
    "/assessments/:id",
    wrap(async (req, res) => {
      const { attempt, card } = await load(req.params.id);
      res.json(viewOf(attempt, card));
    }),
  );

  api.post(
    "/assessments/:id/ask",
    wrap(async (req, res) => {
      const { attempt, card } = await load(req.params.id);
      const question = String(req.body?.question || "").trim().slice(0, 500);
      if (attempt.status !== "history") throw new HttpError(409, "The history part is over.");
      if (!question) throw new HttpError(400, "Type a question for the patient.");
      if (attempt.history.asked >= MAX_HISTORY_QUESTIONS) throw new HttpError(409, "That's the most questions for this station. Move on to the examination.");
      const reply = await patientReply(card, attempt, question);
      askPatient(attempt, question, reply);
      await store.save(attempt);
      res.json(viewOf(attempt, card));
    }),
  );

  api.post(
    "/assessments/:id/examine",
    wrap(async (req, res) => {
      const { attempt, card } = await load(req.params.id);
      endHistory(attempt, card);
      await store.save(attempt);
      res.json(viewOf(attempt, card));
    }),
  );

  api.post(
    "/assessments/:id/answer",
    wrap(async (req, res) => {
      const { attempt, card } = await load(req.params.id);
      if (attempt.status !== "items") throw new HttpError(409, "There is no question waiting for an answer.");
      const item = card.items[attempt.itemIndex];
      const answer = req.body?.answer;
      const empty = [].concat(answer ?? []).filter((a) => String(a).trim()).length === 0;
      if (empty) throw new HttpError(400, "Give an answer first.");
      const grade =
        item.type === "text"
          ? await gradeText(card, item, String(answer).slice(0, 2000))
          : { score: gradeChoice(item, answer) };
      answerItem(attempt, card, item.type === "text" ? String(answer).slice(0, 2000) : answer, grade);
      await store.save(attempt);
      res.json(viewOf(attempt, card));
    }),
  );

  api.post(
    "/assessments/:id/finish",
    wrap(async (req, res) => {
      const { attempt, card } = await load(req.params.id);
      if (!attempt.report) {
        if (attempt.status === "history") endHistory(attempt, card);
        attempt.status = "done";
        attempt.finishedAt = new Date().toISOString();
        attempt.report = await coachReport(card, attempt, buildReport(attempt, card));
        await store.save(attempt);
      }
      res.json(viewOf(attempt, card));
    }),
  );

  api.get("/tutor/suggestions", (req, res) => res.json(TUTOR_SUGGESTIONS));

  api.post(
    "/tutor",
    wrap(async (req, res) => {
      const question = String(req.body?.question || "").trim().slice(0, 500);
      if (!question) throw new HttpError(400, "Ask the tutor a question.");
      const context = req.body?.context || {};
      res.json(
        await tutorPlan(question, {
          teeth: [].concat(context.teeth || []).map(String).slice(0, 8),
          layer: String(context.layer || ""),
        }),
      );
    }),
  );

  app.use("/api", api);
  app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || (err.type === "entity.parse.failed" ? 400 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? "Something went wrong. Please try again." : err.message });
  });
  return app;
};
