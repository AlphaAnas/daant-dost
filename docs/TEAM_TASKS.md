# ToothTwin: who does what

Read [CLAUDE.md](../CLAUDE.md) first (setup, code map, rules). Branch from `develop`
(`feat/<topic>`), open a PR into `develop`, and ask the other developer to review.

ToothTwin serves three kinds of user. Each developer owns whole user domains end to end
(UI, API routes, AI prompts, tests), so you rarely touch the same files.

| Domain | Who it serves | Owner |
|---|---|---|
| **Student** | Dental students: AI assessment, AI tutor, Learn drills, progress | **M-Haris346** |
| **Patient** | Patients and parents: treatment walkthroughs, "my child's teeth" age timeline | **uroojfatim** |
| **Teacher** | Lecturers: write stations with AI, see class results | **uroojfatim** |
| **Lead** | API key, deploy, clinical review, demo | **Project lead (Arfin6900)** |

## Where we are (Nov 7)

Done on `develop` (72 tests passing):
- AI assessment: 6 stations, AI patient, AI marking and coaching, report, practice and exam modes
- AI-written stations
- AI tutor that drives the 3D mouth
- Learn drills
- Treatment walkthroughs in 7 languages
- **Age timeline** from 0 to 25 years, with baby teeth, eruption and jaw growth (`/explore?age=7`)
- Rate limiting, Render deploy config

**Time left:** about **1 working day each** for the demo-critical tasks (marked ★), and
about 2 days for everything below except the stretch tasks.

Status: ⬜ todo · 🟨 in progress · ✅ done. Tick your rows when your PR merges, and update
`docs/HACKATHON_PLAN.md` section 0.

## File ownership (to avoid merge conflicts)

| Owner | Owns |
|---|---|
| M-Haris346 | `server/engine.js`, `server/assessor.js`, `server/cases/`, `server/caseAuthor.js`, `server/tutor.js`, `src/features/assess/`, `src/features/learn/`, `src/features/explore/TutorPanel.jsx` |
| uroojfatim | `server/explain.js`, new `server/teach.js`, `src/features/explain/`, new `src/features/patient/` and `src/features/teach/`, `src/features/explore/AgeTimeline.jsx`, `src/components/dental/three/ageModel.js`, `src/app/` (palette, nav) |
| Shared (PR approved by both) | `src/shared/sceneCommands.js`, `src/scene/sceneStore.js`, `src/components/dental/three/DentalScene.jsx` and `DentalViewer.jsx`, `server/app.js` |

`server/app.js` tip: put new routes in your own module (`export const teachRoutes = (api, deps) => { ... }`)
and add a single line to `app.js` to register it, so you both rarely edit the same lines.

---

## M-Haris346: Student domain

| ID | Task | Done when | Est. | Status |
|---|---|---|---|---|
| H1 ★ | **Run the student AI features with a real key** (the lead will share it; put it in `.env`). Play every station in practice and exam modes; ask the tutor 15 questions; generate 3 stations. Tune the prompts in `assessor.js`, `tutor.js` and `caseAuthor.js` where the patient gives away the diagnosis, marking is too harsh or too lenient, or tutor commands show the wrong teeth | The PR lists what you changed and typical response times | 2–3 h | ⬜ |
| H2 ★ | **Four more stations** in `server/cases/`: periodontal abscess or periodontitis, a non-healing ulcer (urgent referral), TMJ disc displacement with reduction, and an avulsed tooth (trauma). Copy the shape of `01-cold-sensitive-molar.json` | `npm test` passes (each worth 100, valid teeth and commands); the lead has had them clinically reviewed | 2–3 h | ⬜ |
| H3 | **"Which teeth at what age" drill** in Learn using `dentitionAtAge` from `src/shared/chronology.js` (e.g. "At 7, which of these has erupted?", "Click the first adult tooth to appear"), plus tests | New mode in `QUIZ_MODES`, tested like the others | 1–2 h | ⬜ |
| H4 | **Progress on the server**: `GET/POST /api/progress` (XP, streak, misses per tooth) per `studentId` in `server/store.js`; `src/features/learn/progress.js` uses it, falling back to localStorage; the assessment report shows "your best on this station" | Progress survives a new browser with the same student id; tests | 1–2 h | ⬜ |
| H5 | **Stream the patient's replies** word by word (SSE + `client.messages.stream` in `server/ai.js`; the thread shows them live) | First words appear in under a second | 1–2 h | ⬜ |
| H6 | **Student dashboard on `/assess`**: attempts over time, average per skill (history, examination…), "weakest skill: practise this station" | Shows after 2 or more attempts | 1–2 h | ⬜ |
| H-S1 | Stretch: **speak questions** to the patient (mic button using the Web Speech API in `Composers.jsx`) | Speak a question; it appears and sends | 1–2 h | ⬜ |

## uroojfatim: Patient and Teacher domains

| ID | Task | Done when | Est. | Status |
|---|---|---|---|---|
| U1 ★ | **Check the age timeline in a real browser** (headless screenshots can't draw it). Open `/explore?age=7`, then `&layer=xray`; press Play from 0 to 25. Tune baby-tooth positions, eruption depth and jaw growth in `ageModel.js`, and fix anything that pokes through (the known risks are listed in `ageModel.js` and the age-model PR notes). Check the frame rate during Play | Ages 3, 7, 10, 15 and 25 look believable; Play stays smooth; screenshots in the PR | 2–3 h | ⬜ |
| U2 ★ | **Patient home `/patient`**: a calm, plain-language entry for patients and parents. "My child's teeth": enter an age, and the 3D mouth shows that age with "what to expect next" (from `DENTITION_MILESTONES` and `dentitionAtAge`), plus cards for each Explain treatment. Add it to the nav and the home page | A parent can see their 6-year-old's mouth and what comes next in under 30 seconds | 2–3 h | ⬜ |
| U3 | **Explain with a real key**: test all 5 treatments in all 7 languages (Urdu and Arabic are right-to-left); improve the narration prompt in `server/explain.js`; add one more treatment (scale and polish, or a children's fissure sealant) | Narration reads naturally; the PR lists any issues by language | 1–2 h | ⬜ |
| U4 ★ | **Teacher view `/teach`**: write a station with AI (reuse `CreateCaseDialog`), list built-in and AI-made stations, unpublish or delete AI-made ones, and see class results per station (number of attempts, average score, hardest question) from `GET /api/teach/stats` (new `server/teach.js`) | A teacher creates a station, students play it, and the teacher sees the results | 3 h | ⬜ |
| U5 | **Mobile pass** at 375 px across all pages (assessment: 3D on top with the composer always visible; explain player; quizzes; nav menu) | Usable one-handed; screenshots in the PR | 1–2 h | ⬜ |
| U6 | **Cmd/Ctrl-K palette and shortcuts**: jump to pages, teeth ("36") and ages; `1`–`5` layers, `Space` play/spin, `[` and `]` age, `?` help | Works everywhere there is a 3D view; ignored while typing | 1–2 h | ⬜ |
| U-S1 | Stretch: **live classroom** (Socket.IO): students follow the teacher's 3D camera and SceneCommands | 2 browsers stay in sync | 3+ h | ⬜ |

## Lead (Arfin6900)

| ID | Task | Status |
|---|---|---|
| L1 ★ | Create an Anthropic API key; share it privately with both developers (never commit it) | ⬜ |
| L2 ★ | Deploy on Render with `render.yaml` (`ANTHROPIC_API_KEY` as a secret; optional MongoDB Atlas `MONGO_URI`); share the URL | ⬜ |
| L3 | Get a dental student or teacher to review all stations (H2 adds 4) | ⬜ |
| L4 | Fix lint: `eslint.config.js` ignores `src`; make `npm run lint` pass (or hand it to whoever finishes first) | ⬜ |

## Everyone: demo checklist (last)

| ID | Task | Status |
|---|---|---|
| D1 | Full run-through on the deployed URL in under 3 minutes: Home → assessment (Sara, practice) → report → tutor ("When do baby teeth fall out?") → age timeline → patient view → Explain in Urdu | ⬜ |
| D2 | Backup screen recording of D1 | ⬜ |
| D3 | 5 pitch slides: problem, live demo, how it works (3D from maths, AI that moves the model, assessment engine with fallbacks), impact, roadmap | ⬜ |
| D4 | Rehearse 3 times; before going on stage, play one station so the AI cache is warm | ⬜ |

## Starting prompt for your Claude session

> Read CLAUDE.md and docs/TEAM_TASKS.md. I'm <M-Haris346 | uroojfatim>. Start task <ID>:
> create a `feat/<topic>` branch from `develop`, follow the rules in CLAUDE.md, write tests
> for the logic, run `npm test` and `npm run build`, then open a PR into `develop` and
> tick the task in docs/TEAM_TASKS.md.
