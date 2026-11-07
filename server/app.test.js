// @vitest-environment node
import { beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { createStore } from "./store.js";

process.env.AI_DISABLED = "1";
let app;
beforeAll(async () => {
  app = createApp({ store: await createStore({ mongoUri: "", file: null }) });
});

describe("assessment API", () => {
  test("health reports the store and AI", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body).toMatchObject({ ok: true, ai: false, db: "memory" });
  });

  test("the case list never includes answers", async () => {
    const res = await request(app).get("/api/cases");
    expect(res.body.length).toBe(6);
    expect(res.text).not.toMatch(/Reversible pulpitis|teachingPoints|"answer"|expected/);
  });

  test("a whole station through the API", async () => {
    let res = await request(app).post("/api/assessments").send({ caseId: "cold-sensitive-molar", student: { id: "u1", name: "Ana" } });
    expect(res.status).toBe(201);
    const id = res.body.id;
    expect(res.body.status).toBe("history");
    expect(res.text).not.toContain("Reversible pulpitis");

    res = await request(app).post(`/api/assessments/${id}/ask`).send({ question: "Does it wake you up at night?" });
    expect(res.body.transcript.at(-1).text).toMatch(/never wakes me/);

    res = await request(app).post(`/api/assessments/${id}/examine`);
    expect(res.body.item).toMatchObject({ id: "find", type: "tooth" });
    expect(res.body.item.answer).toBeUndefined();

    res = await request(app).post(`/api/assessments/${id}/answer`).send({ answer: ["36"] });
    expect(res.body.transcript.at(-2).verdict).toBe("correct");
    res = await request(app).post(`/api/assessments/${id}/answer`).send({ answer: ["Cold test"] });
    res = await request(app).post(`/api/assessments/${id}/answer`).send({ answer: "Reversible pulpitis" });
    res = await request(app).post(`/api/assessments/${id}/answer`).send({ answer: "It stops in seconds, no night pain." });
    res = await request(app).post(`/api/assessments/${id}/answer`).send({ answer: "Remove the caries and place a restoration" });
    res = await request(app).post(`/api/assessments/${id}/answer`).send({ answer: "No root canal, just a filling." });
    expect(res.body.status).toBe("review");

    res = await request(app).post(`/api/assessments/${id}/finish`);
    expect(res.body.report.score).toBeGreaterThan(50);
    expect(res.body.report.diagnosis).toBe("Reversible pulpitis");

    res = await request(app).get("/api/assessments").query({ studentId: "u1" });
    expect(res.body[0]).toMatchObject({ id, status: "done" });
  });

  test("bad requests get friendly errors", async () => {
    expect((await request(app).post("/api/assessments").send({ caseId: "nope" })).status).toBe(404);
    expect((await request(app).get("/api/assessments/nope")).body).toEqual({ error: "That assessment could not be found." });
    const start = await request(app).post("/api/assessments").send({ caseId: "pain-on-release" });
    expect((await request(app).post(`/api/assessments/${start.body.id}/answer`).send({ answer: "x" })).status).toBe(409);
    expect((await request(app).post(`/api/assessments/${start.body.id}/ask`).send({ question: "" })).status).toBe(400);
  });
});

describe("tutor API", () => {
  test("answers with steps whose commands are all valid", async () => {
    const res = await request(app).post("/api/tutor").send({ question: "Why does the lower molar have two roots?" });
    expect(res.status).toBe(200);
    expect(res.body.steps.length).toBeGreaterThan(1);
    expect(res.body.steps[0].commands).toContainEqual({ type: "focusTeeth", teeth: ["36"] });
  });

  test("falls back to the selected tooth", async () => {
    const res = await request(app).post("/api/tutor").send({ question: "tell me about this one", context: { teeth: ["14"] } });
    expect(res.body.steps[0].say).toMatch(/14/);
  });

  test("needs a question", async () => {
    expect((await request(app).post("/api/tutor").send({})).status).toBe(400);
  });
});
