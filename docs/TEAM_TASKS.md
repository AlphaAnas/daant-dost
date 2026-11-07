# ToothTwin: who does what next

Read [CLAUDE.md](../CLAUDE.md) first (setup, map of the code, the rules). Work from
`develop` on `feat/<topic>` branches and open PRs into `develop`.

## Where we are (Nov 7)

**Done and pushed on `develop`:**
- AI assessment: 6 patient stations, AI patient, AI marking and coaching, report, practice and exam modes
- AI-written stations
- AI tutor that drives the 3D mouth
- Learn drills with XP, streak and weak spots
- Treatment walkthroughs in 7 languages
- Rate limiting, Render deploy config, 58 tests

**In progress (being merged now):** the age-based mouth: a 0–25 year timeline with baby
teeth, eruption and jaw growth (`feat/age-based-mouth`).

**Remaining time:** about **1 working day for the two of you** to finish everything needed
for the demo (Teammate A tasks A1–A4, Teammate B tasks B1–B3, then the demo checklist).
About **2 days** including the teacher view and server-side progress. Stretch items are
extra.

Status key: ⬜ todo · 🟨 in progress · ✅ done. Tick tasks here and in
`docs/HACKATHON_PLAN.md` when merged.

---

## Teammate A: frontend, 3D and experience

| ID | Task | Files | Done when | Est. | Status |
|---|---|---|---|---|---|
| A1 | **Age timeline: review and polish** after `feat/age-based-mouth` merges. Mount `AgeTimeline` on Explore (as a child of `DentalViewer`), check ages 3, 7, 10, 15 and 25 by eye, tune baby-tooth positions and the jaw scale in `ageModel.js` | `src/features/explore/`, `src/components/dental/three/ageModel.js` | Scrubbing 0→25 looks believable and smooth on a laptop; the tutor can show an age (`setAge`) | 2–3 h | ⬜ |
| A2 | **"Which teeth at what age" drill** in Learn, using `dentitionAtAge` (e.g. "Which of these has erupted at 7?", "Click the first adult tooth to appear") | `src/features/learn/quizEngine.js` (+ tests), `QuizPage.jsx` | New mode in `QUIZ_MODES`, tested like the others | 1–2 h | ⬜ |
| A3 | **Mobile pass** at 375 px: assessment screen (3D on top, composer always visible), report, quiz, explain player, nav menu | `src/features/**` | Every page usable one-handed on a phone; screenshots in the PR | 1–2 h | ⬜ |
| A4 | **Cmd/Ctrl-K palette and shortcuts**: jump to pages, teeth ("36"), ages; `1`–`5` layers, `Space` spin, `?` help sheet | `src/app/` (new `CommandPalette.jsx`, `useShortcuts.js`) | Works on every page with a 3D view; ignored while typing in inputs | 1–2 h | ⬜ |
| A5 | **First-run tour** on the assessment screen (3 hints: chat, 3D tooth picking, finish) | `src/features/assess/` | Shown once (localStorage), skippable | 1 h | ⬜ |
| A6 | **Fix lint**: `eslint.config.js` ignores `src`; lint everything and fix | `eslint.config.js` | `npm run lint` passes | 30–60 min | ⬜ |
| A-S1 | Stretch: **voice questions** to the patient (mic button using the Web Speech API) | `Composers.jsx` | Speak a question; it appears and sends | 1–2 h | ⬜ |

## Teammate B: backend, AI and content

| ID | Task | Files | Done when | Est. | Status |
|---|---|---|---|---|---|
| B1 | **Run every AI path with a real key** (most important). Put `ANTHROPIC_API_KEY` in `.env`; play a whole station in practice and exam mode, ask the tutor 10 questions, play Explain in Urdu and Arabic, generate 3 stations. Fix prompts that misbehave (patient revealing the diagnosis, marking too harsh or lenient, tutor commands that don't show the right teeth) | `server/assessor.js`, `server/tutor.js`, `server/explain.js`, `server/caseAuthor.js` | Notes in the PR: what you changed, typical latency per route | 2–3 h | ⬜ |
| B2 | **Deploy** on Render with `render.yaml` (add the key as a secret; optional MongoDB Atlas `MONGO_URI`). Share the URL with the team | `render.yaml` | Public URL works end to end with AI on | 1 h | ⬜ |
| B3 | **Four more stations**: periodontal (perio abscess or periodontitis), mucosa (non-healing ulcer: refer urgently), TMJ (disc displacement with reduction), trauma (avulsed tooth). Same JSON shape as `server/cases/01-*.json`; ask a dental student to review all 10 | `server/cases/` | `npm test` passes (100 points each, valid teeth and commands); reviewer sign-off noted | 2–3 h | ⬜ |
| B4 | **Progress on the server**: `GET/POST /api/progress` (XP, streak, misses per tooth) stored per `studentId` in `store.js`; Learn reads it, falling back to localStorage | `server/app.js`, `server/store.js`, `src/features/learn/progress.js` | Progress survives a new browser with the same student id; tests added | 1–2 h | ⬜ |
| B5 | **Teacher view** `/teach`: list stations (built-in and AI-made), unpublish or delete AI-made ones, see attempts per station (count, average score, hardest question) | new `src/features/teach/`, routes in `server/app.js` | A teacher can create a station and see the class results | 2–3 h | ⬜ |
| B6 | Optional: **stream the patient's reply** token by token (SSE + `client.messages.stream`) | `server/ai.js`, `server/app.js`, `AssessmentPage.jsx` | First words appear in under a second | 1–2 h | ⬜ |
| B-S1 | Stretch: **live classroom** (Socket.IO): a teacher's camera and SceneCommands mirrored to students | new | 2 browsers stay in sync | 3+ h | ⬜ |

## Both: demo checklist (last)

| ID | Task | Status |
|---|---|---|
| D1 | Full run-through on the deployed URL: Home → assessment (Sara, practice) → report → tutor → age timeline → explain in Urdu, under 3 minutes | ⬜ |
| D2 | Backup screen recording of D1 | ⬜ |
| D3 | 5 pitch slides: problem, live demo, how it works (3D from maths, AI that moves the model, assessment engine with fallbacks), impact, roadmap | ⬜ |
| D4 | Rehearse 3 times; before going on stage, play one station so the AI cache is warm | ⬜ |

## Follow-ups that need a person

- **API key:** someone must add `ANTHROPIC_API_KEY` locally and on Render (B1, B2). Without it the app runs on fallbacks only.
- **Clinical review:** the 6 current stations and any new ones should be checked by a dental student or teacher before judging.
- **Hackathon date and judging criteria:** if the demo is within a day, do A1, A3, B1, B2 and D1–D4 only.
