# ToothTwin: Hackathon Development Plan

A living 3D twin of the mouth for **learning**. Students explore it at any age, get tutored
on it, are quizzed on it and examine AI virtual patients on it. Patients see treatments
explained on it. **No dentist clinical module**: every patient is fictional, and nothing
diagnoses a real person.

**Approach:** minimal tech, maximum experience. Keep the current Vite + React app where it
is, add a small Express server, use AI coding help to move fast. MongoDB is optional: the
app runs fully without it.

---

## 0. Status tracker

Status: ⬜ todo · 🟨 in progress · ✅ done · ⏭️ skipped (stretch)
Progress = done tasks ÷ total tasks in that track (stretch tasks are not counted).

| Track | Done | Total | Progress |
|---|---|---|---|
| Setup (both) | 3 | 3 | 100% |
| Dev A: 3D and UI | 5 | 10 | 50% (age mouth A4-A7 in progress) |
| Dev B: Backend and AI | 9 | 10 | 90% |
| Demo readiness (both) | 0 | 4 | 0% |
| **Overall** | **17** | **27** | **63%** |

Bonus done: B-S1 AI case generator (stretch).

**Notes on what shipped (Nov 7):** the AI examiner returns full JSON turns rather than a
token stream (the UI reveals text word by word instead). Progress (XP, streak, weak spots)
is kept in the browser for now. A10 still needs the Cmd-K palette and shortcuts; B10 still
needs a rate limit and the deploy.

We update this table and the task rows below after every task is merged.

---

## 1. What the judges will see (the demo story)

1. **Home:** the 3D mouth spins in a dark studio. Three doors: *Explore*, *Practise*, *Explain*.
2. **Explore + age timeline:** drag from 0 to 25 years; baby teeth appear, adult teeth rise
   from inside the bone, baby teeth fall out, the jaw grows. Press Play to watch it grow.
3. **AI tutor:** "Why does the lower first molar have two roots?" The answer streams in while
   the camera flies to tooth 36, peels away the bone and highlights both roots.
4. **Virtual patient:** "My bottom left tooth hurts when I drink cold water." The student
   chats, orders a cold test, marks the tooth, submits a diagnosis and gets a score card
   with feedback.
5. **Quiz:** "Click tooth 36", "Which teeth erupt at age 6?", with streaks and weak spots.
6. **Explain a treatment:** pick "Filling" and a language; a narrated 3D walkthrough shows
   the cavity, the cleaning and the filling.

---

## 2. Scope

**In (must ship):** clinical code removed · new app shell and design · scene command system ·
age timeline with baby teeth · AI tutor that moves the 3D view · virtual patient cases with
grading · quizzes with weak spots · treatment explainer with voice · Express API ·
optional MongoDB.

**Stretch (only if time is left):** AI case generator for teachers · live classroom (students
follow the teacher's camera) · voice input · X-ray reading trainer · real baked baby-tooth
shapes (instead of the scaled shortcut) · AR view.

**Out:** dentist case intake, login and passwords (a display name in the browser is enough),
payments, real patient data.

---

## 3. Architecture

```
dental-3d/
├─ src/                          React app (existing, extended)
│  ├─ app/                       router, AppShell, theme, shortcuts
│  ├─ ui/                        small design kit
│  ├─ scene/                     scene store + command executor
│  ├─ shared/                    used by BOTH web and server (plain JS)
│  │   ├─ sceneCommands.js       command list + validator
│  │   ├─ chronology.js          tooth ages + dentitionAtAge()
│  │   └─ cases/*.json           fictional patient cases
│  ├─ components/dental/         3D mouth (existing)
│  └─ features/                  home, explore, tutor, learn, cases, explain, teach
├─ server/                       Express API
│  ├─ index.js                   app, routes, static serve in production
│  ├─ ai.js                      Claude helper (JSON + streaming)
│  ├─ prompts/                   patient, tutor, grader, explain, caseAuthor
│  ├─ routes/                    cases, tutor, explain, progress
│  └─ store/                     memory or Mongo, same interface
└─ docs/HACKATHON_PLAN.md
```

- **Dev:** `npm run dev` starts Vite (5173) and Express (3001) together; Vite proxies `/api`.
- **Production:** `npm run build && npm start`: Express serves `dist/` and the API on one port.
  Deploy to Render or Railway (one service).
- **New packages, web:** `react-router-dom`, `zustand`, `framer-motion`, `cmdk`, `sonner`.
- **New packages, server:** `express`, `@anthropic-ai/sdk`, `zod`, `dotenv`, `mongoose`
  (optional), `concurrently` (dev).
- **Environment (`.env`):** `ANTHROPIC_API_KEY`, `AI_MODEL=claude-opus-5-5`, `PORT=3001`,
  optional `MONGO_URI`.

### Storage: Mongo optional

`server/store/index.js` exports the same five functions either way:
`saveAttempt`, `getAttempt`, `saveProgress`, `getProgress`, `saveCase` (generated cases).
If `MONGO_URI` is set it uses Mongoose models; otherwise an in-memory store saved to
`server/data/db.json`. The browser keeps a random `userId` and display name in localStorage
and sends `x-user-id` with each request.

---

## 4. The contracts both developers share

### 4.1 Scene commands (`src/shared/sceneCommands.js`)

Everything that moves the 3D mouth is a command: buttons, keyboard, AI tutor, explainer.

| Command | Fields | Effect |
|---|---|---|
| `focusTeeth` | `teeth: ["36"]` | camera flies to the teeth |
| `focusRegion` | `region: "palate"` | camera flies to a site |
| `setView` | `view: front/right/left/upper/lower` | preset camera |
| `setLayer` | `layer: gums/bone/roots/teeth/xray` | what is visible |
| `setArches` | `arches: both/upper/lower` | show one jaw |
| `setJaw` | `open: 0..1` | open or close the jaw |
| `setAge` | `years: 0..25` or `null` (adult) | age of the mouth |
| `highlight` | `teeth`, `color?`, `surfaces?` | glow teeth or surfaces |
| `clearHighlights` | | |
| `section` | `tooth` or `null` | cross-section view |
| `showCondition` | `tooth`, `condition`, `surfaces?` | cavity, fracture, filling... |
| `wait` | `ms` | pause inside a sequence |
| `reset` | | back to start |

`validateCommands(list)` returns `{ commands, rejected }`; unknown teeth or fields are dropped,
never executed. The server validates AI output with it, and the client validates again.

### 4.2 API (Express, all JSON, prefix `/api`)

| Method and path | Body | Returns |
|---|---|---|
| `GET /health` | | `{ ok: true, ai: boolean, db: "memory" or "mongo" }` |
| `GET /cases` | | `[{ id, title, site, difficulty, patient }]` (no hidden data) |
| `POST /cases/:id/start` | | `{ attemptId, opening, availableTests }` |
| `POST /attempts/:id/chat` | `{ message }` | Server-Sent Events: text chunks, then `done` |
| `POST /attempts/:id/test` | `{ testId, teeth? }` | `{ finding }` (from the case card, no AI) |
| `POST /attempts/:id/submit` | `{ diagnosis, teeth }` | `{ score, verdict, missed, teachingPoints, commands }` |
| `POST /tutor` | `{ question, context: { teeth, age, layer } }` | `{ answer, steps: [{ say, commands }] }` |
| `POST /explain` | `{ treatment, language }` | `{ title, steps: [{ say, commands }] }` |
| `GET/POST /progress` | quiz results | `{ xp, streak, weakSpots }` |
| `POST /cases/generate` (stretch) | `{ brief }` | new case card |

Errors are always `{ error: "friendly message" }`. If the AI fails or refuses, the API returns
503 "The tutor is busy, try again", and the UI shows a retry button.

### 4.3 Case card (`src/shared/cases/*.json`)

```json
{
  "id": "cold-lower-molar",
  "title": "Cold sensitivity, lower left",
  "site": "teeth",
  "difficulty": 1,
  "patient": { "name": "Sara", "age": 24, "sex": "female",
               "complaint": "My bottom left tooth hurts when I drink cold water.",
               "personality": "anxious, chatty" },
  "hidden": {
    "diagnosis": "Reversible pulpitis",
    "accepted": ["reversible pulpitis"],
    "keyTeeth": ["36"],
    "history": { "duration": "3 days", "night pain": "No", "lingering": "Pain stops within seconds" },
    "findings": { "cold_test": "Sharp pain on 36, gone within 2 seconds",
                  "percussion": "Not tender", "periapical_radiograph": "Deep occlusal caries on 36, no apical change" },
    "teachingPoints": ["Short, sharp pain to cold that stops quickly points to reversible pulpitis",
                       "Lingering pain or night pain points to irreversible pulpitis"]
  }
}
```

The `hidden` part never leaves the server before the student submits.

---

## 5. AI design (`server/ai.js`)

- **One helper, two functions:** `askJson({ system, messages, schema })` uses structured outputs
  (`client.messages.parse` + `zodOutputFormat`) and returns a validated object;
  `askStream({ system, messages })` streams text for the patient chat.
- **Model:** `AI_MODEL` (default `claude-opus-5-5`). Effort `low` for chat and explain,
  `medium` for the tutor, `high` for grading. The system prompt is cached so repeat calls are
  fast and cheap.
- **Safety:** check for a refusal before using output; validate every scene command; the
  grader only uses the case card's answers and teaching points.

| Prompt | Job | Key rules |
|---|---|---|
| `patient` | Play the fictional patient | Speak like a patient, not a dentist; reveal history facts only when asked; never say the diagnosis; 1-3 sentences |
| `tutor` | Teach and drive the 3D view | Answer in under 120 words; return 1-4 steps, each with what to say and the commands to show it; use FDI numbers; respect the current age |
| `grader` | Score the student | Score 0-100 against `accepted` and `keyTeeth`; list what was missed; return commands that highlight the key teeth |
| `explain` | Narrate a treatment | 4-7 short steps in the requested language, each with commands (`showCondition`, `section`, `setLayer`, `focusTeeth`, `wait`) |
| `caseAuthor` (stretch) | Write a new case card from a brief | Output must validate as a case card; fictional patient |

**Fallback when there is no API key:** the tutor and explainer serve 5 pre-written answers
from `src/shared/fallbacks.json`, so the demo never breaks.

---

## 6. The age-based mouth (how it works)

**Data (`src/shared/chronology.js`):** for each of the 52 teeth, the age when it starts
forming, the crown is complete, it erupts, the root is complete, and (baby teeth) when it falls out.
`dentitionAtAge(years)` returns, for every tooth, `present`, `phase` and `crownFormed`,
`rootFormed`, `eruption` and `resorption`, each from 0 to 1.

Permanent teeth (years), position 1 to 8:

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Upper: starts / crown done / erupts / root done | 0.3 / 4.5 / 7.5 / 10 | 1 / 4.5 / 8.5 / 11 | 0.35 / 6.5 / 11.5 / 14 | 1.6 / 5.5 / 10.5 / 13 | 2.1 / 6.5 / 11 / 13.5 | 0 / 2.75 / 6.5 / 9.5 | 2.75 / 7.5 / 12.5 / 15 | 8 / 14 / 19 / 22 |
| Lower: starts / crown done / erupts / root done | 0.3 / 4 / 6.5 / 9 | 0.3 / 4 / 7.5 / 10 | 0.35 / 6.5 / 9.5 / 13 | 1.9 / 6 / 11 / 13.5 | 2.4 / 6.5 / 11.5 / 14 | 0 / 2.75 / 6.5 / 9.5 | 2.75 / 7.5 / 12 / 15 | 9 / 14 / 19 / 22 |

Baby teeth (years), A to E:

| | A | B | C | D | E |
|---|---|---|---|---|---|
| Starts (before birth) / crown done | -0.4 / 0.12 | -0.35 / 0.2 | -0.3 / 0.75 | -0.35 / 0.5 | -0.2 / 0.9 |
| Upper erupts / root done / falls out | 0.83 / 1.5 / 6.5 | 0.92 / 2 / 7.5 | 1.58 / 3.25 / 11 | 1.33 / 2.5 / 10 | 2.42 / 3 / 11 |
| Lower erupts / root done / falls out | 0.67 / 1.5 / 6.5 | 1.08 / 2 / 7.5 | 1.67 / 3.25 / 10.5 | 1.33 / 2.5 / 10 | 2.25 / 3 / 11 |

Formulas (`c` = clamp to 0..1):
`crownFormed = c((age − starts) / (crownDone − starts))` ·
`rootFormed = c((age − crownDone) / (rootDone − crownDone))` ·
`eruption = 0.8·c((age − crownDone) / (erupts − crownDone)) + 0.2·c((age − erupts) / 0.75)`
(0.8 means it is through the gum) · `resorption = c((age − (fallsOut − 3)) / 3)` for baby teeth.

**Rendering (in `DentalScene`):**
- **Baby teeth, hackathon shortcut:** reuse the adult tooth meshes scaled to about 70%
  (A from incisor 1, B from 2, C from canine 3, D from premolar 4 widened, E from molar 6),
  placed on the first five positions of the arch pulled towards the midline. Real baked baby
  shapes are a stretch task.
- **Eruption:** each tooth slides from inside the bone (offset by its crown height + 4 mm along
  its own axis) to its place as `eruption` goes from 0 to 1.
- **Growing crowns and roots:** a `uFormRange` uniform in the existing tooth shader hides the
  unformed part, so young teeth show short roots and open root tips in the X-ray and section views.
- **Falling out:** a baby tooth fades and drops over the last 0.3 years.
- **Jaw growth:** the gums, bone and tongue group scales from about 0.82 at age 3 to 1.0 at age 18.
- **Timeline UI:** a slider from 0 to 25 with milestone dots (first tooth 0.5, all baby teeth 3,
  first adult molars 6, mixed teeth 6-12, adult set 13, wisdom teeth 17-21), Play/Pause at
  2 years per second, an age chip, and a live counter: "24 teeth · 12 baby · 12 adult · erupting: 11, 21".

---

## 7. Experience and design ("Studio")

- **Look:** a deep navy stage for the 3D mouth (the existing gradient) with glass panels on top;
  clean light surfaces for content; ClashDisplay headings, Atkinson Hyperlegible text (both
  already in the repo); light and dark themes.
- **Motion:** smooth camera flights, panels that slide and fade in, typing indicators, a score
  card that counts up, confetti on a high score. All motion turns off with reduced-motion settings.
- **Speed:** Cmd/Ctrl-K palette (jump to a tooth, an age or a page); shortcuts `1-5` layers,
  `[` `]` age, `Space` play/spin, `?` help.
- **Never stuck:** skeleton loaders, friendly errors with retry, the 2D tooth chart when there
  is no WebGL, offline fallbacks for the AI.
- **Mobile:** full-screen 3D view, controls in a bottom sheet, a thumb-sized timeline.

| Screen | Layout | Key interactions |
|---|---|---|
| **Home** `/` | Full-screen spinning mouth, headline, three cards | Cards go to Explore, Practise and Explain; name prompt on first visit |
| **Explore** `/explore` | 3D view fills the page; timeline docked at the bottom; tutor drawer on the right; study notes for the selected site | Pick teeth, layers, jaw, age; ask the tutor; steps play as a guided tour with captions |
| **Learn** `/learn` | Mode cards: Find the tooth, Numbering systems, Which teeth at what age, Charting challenge | Timed rounds, streak flame, XP, results with weak spots and "practise these" |
| **Cases** `/cases` | Grid of patient cards (avatar, complaint, difficulty dots) | Start a case |
| **Case Play** `/cases/:id` | Left: chat with the patient. Right: 3D mouth with a tests tray. Bottom: diagnosis bar | Chat, order tests (findings appear as cards), mark teeth, submit; score card with what you missed and teaching points; the 3D view highlights the answer |
| **Explain** `/explain` | Treatment picker (filling, root canal, crown, extraction, implant) and language; full-screen 3D view with captions and a step bar | Plays the narrated animation with the browser's built-in voice; pause, next, replay |
| **Teach** `/teach` (stretch) | Brief box; generated case preview | Generate and publish a case |

---

## 8. Team split and tasks

**Dev A owns:** `src/app`, `src/ui`, `src/scene`, `src/components/dental`, `src/shared/chronology.js`,
`src/shared/sceneCommands.js`, and the Home, Explore and Explain screens.
**Dev B owns:** `server/`, `src/shared/cases`, `src/shared/fallbacks.json`, and the Learn, Cases,
Case Play and Teach screens plus their data hooks.
**Rule:** a change to `sceneCommands.js` or the API table is agreed by both in chat before
merging. Until the real piece exists, each side works against a stand-in (a hard-coded
response or a mock command list).

### Setup (both, first)

| ID | Task | Owner | Done when | Status |
|---|---|---|---|---|
| S1 | Agree on this plan and the contracts in section 4 | Both | Both say yes | ✅ |
| S2 | Remove clinical code: delete `CaseForm.jsx`, `DentalCase.jsx`, triage `STAGE_COLORS`, `care` colours, `payload`/`draft` in `toothSelection.js`; keep study notes as teaching content | A | App runs, tests pass, no clinical words left | ✅ |
| S3 | Express server skeleton, `/api/health`, Vite proxy, `npm run dev` runs both, `.env.example`, store adapter (memory, with Mongo when `MONGO_URI` is set) | B | `curl localhost:5173/api/health` works through the proxy | ✅ |

### Dev A: 3D and UI

| ID | Task | Done when | Status |
|---|---|---|---|
| A1 | Design kit (Button, Panel, Sheet, Segmented, Slider, Toast) + theme tokens light/dark + AppShell with nav + routes for every screen | Every route opens with a title; theme toggle works | ✅ |
| A2 | Scene store (zustand) + `sceneCommands.js` validator + `runSequence(steps)` for timed steps; viewer toolbar goes through the store | Buttons, keyboard and a test command list all move the view | ✅ |
| A3 | Camera commands for teeth and regions, `highlight` glow, `section` from a command | `focusTeeth ["36"]` + `highlight` + `section` work from code | ✅ |
| A4 | `chronology.js` + `dentitionAtAge()` + quick tests (ages 0, 1, 3, 7, 12.25, 25) | Tests pass | 🟨 |
| A5 | Baby teeth (scaled shortcut) + eruption movement + falling out | At age 7 you see a mixed mouth with adult teeth inside the bone in the X-ray view | 🟨 |
| A6 | Crown and root formation in the shader + jaw growth | Young teeth show short roots; the jaw grows smoothly | 🟨 |
| A7 | Timeline UI (milestones, Play, counter) on Explore | Scrubbing 0 to 25 is smooth, about 60 fps on a laptop | 🟨 |
| A8 | Explore page: tutor drawer UI with streamed answer, step captions, study notes | A canned tutor answer plays as a guided tour | ✅ |
| A9 | `showCondition` looks (cavity, fracture, filling, crown, root canal, missing) + Explain page player with voice and step bar | A canned "filling" script plays end to end with narration | ✅ |
| A10 | Home page hero, Cmd-K palette, shortcuts, mobile layout, motion polish | Looks finished on a laptop and a phone | 🟨 |
| A-S1 | Stretch: real baked baby-tooth shapes | | ⏭️ |
| A-S2 | Stretch: live classroom follow mode (camera sync) | | ⏭️ |

### Dev B: Backend and AI

| ID | Task | Done when | Status |
|---|---|---|---|
| B1 | `server/ai.js`: `askJson` (structured, validated) + `askStream` (SSE), refusal and error handling, no-key fallback switch | A test script prints a parsed object and a streamed reply | ✅ |
| B2 | 8 fictional case cards (2 tooth pain, 1 wisdom tooth, 2 gums, 1 ulcer, 1 dry socket, 1 jaw joint) + `GET /cases` without hidden data | List works; hidden data never appears | ✅ |
| B3 | Case attempts: `start`, `chat` (patient prompt, streaming), `test` (findings from the card) | A full conversation streams in the terminal | ✅ |
| B4 | `submit` + grader prompt: score, verdict, missed points, teaching points, highlight commands | Right and wrong answers get sensible scores | ✅ |
| B5 | Case list + Case Play screen: chat UI with typing indicator, tests tray, tooth marking via the 3D view, diagnosis bar, score card | One case playable start to finish in the browser | ✅ |
| B6 | `POST /tutor` + tutor prompt (answer + steps with validated commands), wired to A8's drawer | Asking about 36 moves the camera and highlights it | ✅ |
| B7 | `POST /explain` + explain prompt for 5 treatments and any language, wired to A9's player | "Root canal in Spanish" plays narrated | ✅ |
| B8 | Quiz engine (client side): Find the tooth (click on the 3D view), Numbering (FDI, Palmer, Universal), Age quiz (uses `dentitionAtAge`), Charting challenge | Each mode plays a 10-question round | ✅ |
| B9 | Progress: XP, streak, weak spots (`/progress` + localStorage), "practise your weak spots" round, Learn screen | Wrong answers come back in the next round | ✅ |
| B10 | `fallbacks.json` (5 tutor answers, 5 explain scripts) + rate limit + production build (Express serves `dist`) + deploy | Works with no API key; public URL live | 🟨 |
| B-S1 | Stretch: AI case generator + Teach screen | | ✅ |
| B-S2 | Stretch: live classroom server (Socket.IO) | | ⏭️ |

### Demo readiness (both, last)

| ID | Task | Done when | Status |
|---|---|---|---|
| D1 | Full run-through of the demo story in section 1 on the deployed URL | No errors, under 3 minutes | ⬜ |
| D2 | Backup screen recording of the full demo | Video saved | ⬜ |
| D3 | Pitch slides: problem, demo, how it works (3D generated from maths, AI that moves the view), roadmap | 5 slides ready | ⬜ |
| D4 | Rehearse the demo 3 times; prime the AI cache by playing the demo case once before going on stage | Smooth and confident | ⬜ |

---

## 9. Build order

Each line runs in parallel across the two columns; a task only waits for the contract it uses.

| Step | Dev A | Dev B | Joint checkpoint |
|---|---|---|---|
| 1 | S2, A1 | S3, B1 | App shell + API + AI helper running |
| 2 | A2, A3 | B2, B3 | Commands move the view; patient chat streams |
| 3 | A4, A5 | B4, B5 | **Case playable end to end**; mixed mouth visible |
| 4 | A6, A7 | B6 | **Age timeline + tutor moving the camera** |
| 5 | A8, A9 | B7, B8 | Explain plays; quizzes play |
| 6 | A10 | B9, B10 | Deployed, polished |
| 7 | D1-D4 together | | **Demo ready** |

If time runs short, ship in this order of value: case play (B2-B5) and tutor (B6 + A8) →
age timeline (A4-A7) → explain (A9 + B7) → quizzes (B8-B9) → polish (A10).

---

## 10. Risks and fallbacks

| Risk | Fallback |
|---|---|
| AI is slow or down on stage | Pre-written fallbacks, cached system prompts, backup video |
| AI returns a bad command | Validated on server and client; bad commands are dropped |
| Baby teeth look odd | Show the timeline mostly in the X-ray and Bone views, where shapes matter less |
| Slow on the judges' laptop | Lower pixel ratio automatically, turn off shadows, keep the 2D chart fallback |
| Mongo not reachable | The memory store is the default; Mongo is only used when `MONGO_URI` is set |
| Hidden case answers leak | The server strips `hidden` from every response before submit |
