# PLAN.md — LLD Practice Platform (CipherSchool Hiring Assignment)

> This document is the single source of truth for building this project. It contains the assignment requirements, research findings, all architecture/tech decisions already made (with reasoning), the exact rubric and prompt shape to use, the domain model, folder structure, a step-by-step execution plan, and a standout checklist. A model or developer picking this up should be able to execute the entire assignment from this file alone.

---

## 1. What this assignment actually is

A 2-day take-home for a Full Stack Dev Intern role. Build a small working **LLD (Low-Level Design) practice platform**: a learner picks a problem, designs a solution, submits it, gets useful feedback, and can view past attempts. This is explicitly an **LLD/domain-design exercise, not an HLD exercise** — no microservices, no multi-region, no sharding. A simple monolith is correct.

**Grading weights (this drives every priority decision below):**

| Area | Weight |
|---|---|
| LLD / domain design | 25% |
| Problem understanding & research | 15% |
| Product thinking / creativity | 15% |
| Evaluation & feedback approach | 15% |
| Extensibility & engineering judgement | 10% |
| Implementation quality | 10% |
| Testing & reliability | 5% |
| AI usage | 5% |

**Rule of thumb:** domain design + evaluation approach + product thinking + research = 70% of the grade. UI polish and infrastructure are worth very little. Do not over-invest there.

**Deliverables required:** Research note (1–2 pages), Design note, Working prototype, Tests, README + AI_USAGE.md, submitted via the CipherSchool Google Form.

---

## 2. Research findings (already done — see `RESEARCH_NOTE.md`)

Six existing tools/resources were reviewed:

| Tool | What it does | Gap |
|---|---|---|
| LeetCode discuss + community GitHub repos | Curated problem lists + pattern reference | No submission mechanism, no feedback at all |
| HackerRank / "machine coding round" discussions | No dedicated LLD track; confirms a named resource gap for this interview format | Community explicitly says prep material is scarce here |
| Educative "Grokking the LLD Interview" | 215 lessons, 19 mock interviews, worked model solutions | Content-consumption product — you study an answer, don't submit your own |
| AlgoMaster.io "LLD Practice" | Closest real competitor: problem bank, AI scoring, attempt history | Grades against **one reference solution** with a **single score** — exactly what our guide warns against |
| "LLD Mastery" (indie project) | In-browser playground, visual diagrams, flashcards | Feedback is about code correctness/complexity, not design quality dimensions |
| Pramp / Exponent | Peer-to-peer mock interviews | Feedback quality = whoever your peer is that day; no persistent rubric; needs a live partner |

**The gap, and our product direction:** nobody gives multi-dimensional, evidence-linked feedback that treats "more than one valid design" as the normal case. Our differentiator: rubric-based feedback across named design dimensions, not a single AI score against a reference answer, plus attempt history that surfaces *recurring* weaknesses.

---

## 3. MVP scope decisions (already made — do not relitigate these mid-build)

- **Problems:** 3–5 problems (e.g. Parking Lot, Elevator System, Vending Machine, Library Management, Rate Limiter). Pull requirements from the researched GitHub lists for realism.
- **Submission format: structured text design write-up** (not code, not diagrams). Rationale: fastest to build a consistent evaluation pipeline around in 2 days, and the assignment explicitly rewards *justifying* this choice over "supporting everything." State this reasoning explicitly in the design note.
- **Learner identity:** no auth system. A simple name/identifier field (or a single hardcoded demo learner) is enough — building login/session infra would be exactly the kind of unnecessary scope the guide warns against.
- **Evaluation:** two evaluators — a fast deterministic `RuleBasedEvaluator` (structure/length/required-sections check) that always runs first, then an `AIEvaluator` (Gemini) that runs the judgment-heavy part.

---

## 4. Domain model

```
Problem          — id, title, description, requirements, difficulty
Attempt          — links a learner to a Problem; has one or more Submissions
Submission        — the learner's design write-up (abstract; TextSubmission today)
                    status: SUBMITTED → EVALUATING → COMPLETED / FAILED
Evaluator (interface) — RuleBasedEvaluator and AIEvaluator both implement it
Rubric           — a fixed list of Criterion definitions
Evaluation       — result of running an Evaluator on a Submission
CriterionResult  — per-criterion: score, evidence, concern, suggestion, confidence
```

### Patterns used, and why (not decoration — each maps to a graded requirement)

- **Strategy pattern on `Evaluator`.** `RuleBasedEvaluator` and `AIEvaluator` implement the same interface. Adding a third evaluator (human review, a different LLM) later means writing a new class, not touching the practice flow. This directly answers **Change Test B**.
- **State machine on `Submission.status`.** `SUBMITTED → EVALUATING → COMPLETED/FAILED`. The submission is persisted the instant it's created — before evaluation starts — so nothing is lost if the evaluator fails or times out.
- **Abstract `Submission` base type.** Today: `TextSubmission`. Adding `DiagramSubmission` later doesn't require touching `Attempt`, `Evaluator`, or `Feedback`. This directly answers **Change Test A**.

**Write both change-test answers explicitly into the design note** — this maps 1:1 to what's graded and shows you engaged with the guide, not just the brief.

---

## 5. Tech stack (decided, with reasoning)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Fast dev loop, standard for "full stack" expectations |
| Backend | Node.js + Express | Developer is fastest here — no context-switch cost under a 2-day deadline |
| Database | **MySQL**, via Prisma ORM | Developer's choice. Prisma's schema.prisma doubles as a readable domain model artifact. Needs a running MySQL instance (Docker locally, or a free hosted instance — PlanetScale/Railway/Aiven) — a bit more setup than SQLite but not a scaling concern here |
| AI evaluator | **Gemini API, free tier**, model `gemini-2.5-flash` (fall back to `-lite` if rate-limited) | Free tier requires no card; good enough for constrained, rubric-based structured output; not the most powerful model but this is not a creative-reasoning task |
| Testing | Vitest/Jest + Supertest | Standard for Node; enough to cover state-machine and idempotency behavior |
| Deployment (optional but recommended) | Frontend on Vercel/Netlify, backend+DB on Render/Railway | Lets evaluators click a live link instead of running locally — disproportionate impression for low effort |

### Gemini free-tier constraints to design around

- Roughly **10 RPM**, **~250k TPM**, **~250–500 RPD** for `gemini-2.5-flash` on the free tier (check live numbers in Google AI Studio before building — they shift).
- **Quota is per Google Cloud project, not per API key** — parallel test scripts share the same budget.
- **Preview/experimental model tags have stricter limits** — use the stable model name.
- **RPD resets at midnight Pacific time**, not local time.
- **Free-tier request content may be used to improve Google's products** — acceptable for a coursework prototype with synthetic submissions, but note this trade-off explicitly in `AI_USAGE.md` — it's a genuine, honest engineering-judgement point, not just a disclaimer.
- **Design implication:** a Gemini 429/timeout is a real failure mode you will hit, not a hypothetical. The `EVALUATING → FAILED` transition (with a retry option) must actually be built and tested — this is the practical answer to the assignment's own question, "what should happen if evaluation takes time or fails?"

---

## 6. Suggested folder structure

```
lld-practice-platform/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── pages/              # ProblemList, Attempt, Feedback, History
│       ├── components/
│       └── api/                # fetch wrappers to backend
├── server/                     # Node + Express backend
│   ├── prisma/
│   │   └── schema.prisma       # MySQL schema — the domain model
│   ├── src/
│   │   ├── domain/             # Problem, Attempt, Submission classes/types
│   │   ├── evaluators/         # Evaluator interface, RuleBasedEvaluator, AIEvaluator
│   │   ├── rubric/             # fixed Criterion list + prompt template
│   │   ├── routes/             # problems.ts, attempts.ts, submissions.ts
│   │   └── services/           # evaluation orchestration, state transitions
│   └── tests/
├── RESEARCH_NOTE.md
├── DESIGN_NOTE.md
├── AI_USAGE.md
├── README.md
└── PLAN.md                     # this file
```

---

## 7. Prisma schema draft (MySQL)

```prisma
model Problem {
  id           Int       @id @default(autoincrement())
  title        String
  description  String    @db.Text
  requirements String    @db.Text
  difficulty   String
  createdAt    DateTime  @default(now())
  attempts     Attempt[]
}

model Attempt {
  id          Int          @id @default(autoincrement())
  problemId   Int
  problem     Problem      @relation(fields: [problemId], references: [id])
  learnerName String
  createdAt   DateTime     @default(now())
  submissions Submission[]
}

enum SubmissionStatus {
  SUBMITTED
  EVALUATING
  COMPLETED
  FAILED
}

model Submission {
  id         Int               @id @default(autoincrement())
  attemptId  Int
  attempt    Attempt           @relation(fields: [attemptId], references: [id])
  content    String            @db.Text
  status     SubmissionStatus  @default(SUBMITTED)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
  evaluation Evaluation?
}

model Evaluation {
  id          Int               @id @default(autoincrement())
  submissionId Int              @unique
  submission  Submission        @relation(fields: [submissionId], references: [id])
  evaluatorType String          // "rule_based" | "ai"
  createdAt   DateTime          @default(now())
  criteria    CriterionResult[]
}

model CriterionResult {
  id           Int        @id @default(autoincrement())
  evaluationId Int
  evaluation   Evaluation @relation(fields: [evaluationId], references: [id])
  criterion    String
  score        Int
  evidence     String     @db.Text
  concern      String     @db.Text
  suggestion   String     @db.Text
  confidence   Float
}
```

---

## 8. API design

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/problems` | List the problem bank |
| GET | `/api/problems/:id` | Problem detail (requirements, constraints) |
| POST | `/api/attempts` | Start an attempt for a problem |
| POST | `/api/attempts/:id/submissions` | Submit a design → creates Submission (`SUBMITTED`), triggers async evaluation |
| GET | `/api/submissions/:id` | Poll status/result (`SUBMITTED`/`EVALUATING`/`COMPLETED`/`FAILED`) |
| GET | `/api/learners/:name/attempts` | Attempt history + recurring-weakness summary |

**Idempotency guard:** before starting evaluation on a submission, check there isn't already an `EVALUATING` evaluation in progress for it — if the learner double-clicks submit, don't spin up a duplicate evaluation.

---

## 9. Evaluation rubric and Gemini prompt template

Fixed rubric dimensions (from the assignment guide — use these, don't invent new ones):
`Requirement understanding`, `Class responsibilities`, `Coupling/cohesion`, `Encapsulation & interfaces`, `Appropriate abstraction/patterns`, `Extensibility`, `Edge cases & testability`, `Quality of explanation`.

**Prompt template (forces structured output, never asks an open-ended "is this good?"):**

```
You are evaluating a Low-Level Design submission against a fixed rubric.
Respond ONLY with valid JSON matching this schema — no prose outside the JSON:

{
  "criteria": [
    {
      "criterion": string,
      "score": integer 0-5,
      "evidence": string,   // quote or reference specific part of the submission
      "concern": string,    // biggest weakness for this criterion, or "" if none
      "suggestion": string, // one concrete improvement
      "confidence": number  // 0-1
    }
  ]
}

Rubric criteria to evaluate:
1. Requirement understanding
2. Class responsibilities
3. Coupling / cohesion
4. Encapsulation and interfaces
5. Appropriate use of abstraction / patterns
6. Extensibility when requirements change
7. Edge cases and testability
8. Quality of explanation

Problem requirements:
<insert problem.requirements>

Learner submission:
<insert submission.content>
```

Do **not** ask "give this a score out of 100" — that's the exact anti-pattern the assignment guide calls out.

---

## 10. Async evaluation flow (state machine)

1. Learner submits → row created immediately, `status = SUBMITTED`. Nothing is lost even if the next step fails.
2. Background job picks it up → `status = EVALUATING`.
3. Run `RuleBasedEvaluator` first (cheap, fast — checks required sections present, minimum length, basic structure). If it fails hard requirements, short-circuit to `FAILED` with a clear reason — don't spend an AI call on an incomplete submission.
4. Run `AIEvaluator` (Gemini call with the prompt above). On success → `status = COMPLETED`, store `CriterionResult` rows.
5. On Gemini error (429, timeout, malformed JSON) → `status = FAILED`, with a retry action exposed to the learner. Log the failure reason.
6. Guard: reject a new evaluation request on a submission that already has one `EVALUATING`.

---

## 11. Testing plan (5% of grade, but do not skip)

- State machine: submission moves `SUBMITTED → EVALUATING → COMPLETED` on a mocked successful evaluator.
- State machine: `SUBMITTED → EVALUATING → FAILED` on a mocked evaluator error.
- Idempotency: double-submitting the same attempt does not create two concurrent evaluations.
- `RuleBasedEvaluator`: rejects a submission missing required sections.
- `AIEvaluator`: mock the Gemini call in tests — do not depend on live API access for CI.
- At least one end-to-end test: create attempt → submit → poll → get feedback.

---

## 12. How to stand out (checklist)

- [ ] Put your best effort into the domain model and design note — it's 25% alone.
- [ ] Write both change-test answers explicitly into the design note.
- [ ] Use the exact rubric shape (`criterion → score → evidence → concern → suggestion → confidence`) — signals you read the guide closely.
- [ ] Show the deterministic-vs-AI split visibly in code (rule check runs before the AI call).
- [ ] Real research note with named tools and named gaps (already done — see `RESEARCH_NOTE.md`).
- [ ] Test the state machine and idempotency, not just happy-path code.
- [ ] Honest `AI_USAGE.md` with 3–5 *specific* decisions (what AI suggested, what you rejected, why) — including the Gemini free-tier data-usage trade-off.
- [ ] Deploy it if time allows — a live link beats "clone and run locally."
- [ ] Explicitly say what you *didn't* build and why (e.g. no auth, no diagram submissions yet) — resisting scope is a graded signal, not a weakness to hide.

## 13. Scope traps to explicitly avoid

- Microservices, multi-region, sharding, CDN design — none of this is asked for or rewarded.
- Auth/session systems — not needed for the MVP.
- Grading against a single "correct" reference solution — this is the exact anti-pattern found in the competitor research (AlgoMaster) and explicitly warned against in the guide.
- An AI prompt that just asks "score this design out of 100" — explicitly called out as a bad pattern.
- Building a diagram or code submission format "to be safe" — text-only is a defensible, explicit choice; don't hedge by building all three.

---

## 14. Execution plan (2 days)

**Day 1**
1. (Done) Research — see `RESEARCH_NOTE.md`.
2. Lock MVP scope: 3–5 problems, text submission format, rule-based + AI evaluation (Section 3).
3. Write the domain model and both change-test answers into `DESIGN_NOTE.md` before writing code.
4. Scaffold `client/` and `server/`, set up MySQL + Prisma schema (Section 7), seed 3–5 problems.
5. Build the core loop with `RuleBasedEvaluator` only: problem list → attempt → submission → stored feedback. Get this working end-to-end before touching AI.

**Day 2**
6. Add `AIEvaluator` (Gemini, Section 9), wire the state machine and failure handling (Section 10).
7. Add the idempotency guard.
8. Build the learner-facing flow fully: submission form, feedback view, attempt history with a recurring-weakness summary (e.g. "lowest-scoring criterion across your last 3 attempts").
9. Write tests (Section 11).
10. Write `README.md` and `AI_USAGE.md`; finalize `DESIGN_NOTE.md` with trade-offs and limitations.
11. Deploy if time allows.
12. Final check against the grading weights (Section 1) — most visible effort should be in domain design and evaluation approach, not UI.
13. Submit all deliverables via the CipherSchool Google Form.

---

## 15. Final deliverables checklist

- [ ] `RESEARCH_NOTE.md` — 1–2 pages (already generated)
- [ ] `DESIGN_NOTE.md` — MVP, user flow, classes/interfaces, evaluation approach, trade-offs, both change tests answered
- [ ] Working prototype — end-to-end demoable flow
- [ ] Tests — state machine, idempotency, at least one evaluator, one e2e
- [ ] `README.md` — how to run the project
- [ ] `AI_USAGE.md` — 3–5 real, specific AI-assisted decisions
- [ ] Submitted via the Google Form linked in the original assignment
