# LLD Practice Platform

A focused web application built for the **CipherSchool 2-Day Hiring Assignment**. The platform provides an end-to-end environment for software engineers to practice Low-Level Design (LLD) problems, submit structured design write-ups, and receive explainable, criterion-level feedback.

---

## Overview

Low-Level Design practice is notoriously difficult to self-evaluate because LLD problems rarely have a single "correct" answer. Unlike algorithmic coding platforms that rely on binary unit tests, or system design platforms that focus on high-level distributed infrastructure, this platform focuses strictly on object-oriented domain modeling, responsibilities, abstractions, and trade-offs.

### Who It Is For
* Software engineering candidates preparing for Machine Coding and Object-Oriented Design (OOD) interview rounds.
* Learners seeking actionable, multi-dimensional feedback on class responsibilities, coupling, cohesion, and extensibility.

### The Learner Journey
```text
Choose Problem ──► Think / Design ──► Submit Design ──► Get Feedback ──► Review Rubric ──► Try Again
```

The MVP provides a complete, runnable practice loop:
1. **Browse Problems**: Choose from a bank of classic LLD problems with clear requirements.
2. **Design Solution**: Draft a structured write-up covering requirements, responsibilities, relationships, trade-offs, and edge cases.
3. **Submit & Evaluate**: Submit the design for automated evaluation via a pluggable Strategy (fast deterministic heuristics or AI-powered semantic analysis).
4. **Review Feedback**: Inspect structured scores (1–5), evidence citations, identified concerns, and actionable suggestions across 8 standard rubric dimensions.

---

## Features

* **LLD Problem Bank**: 4 seeded problems with clear requirements, constraints, and difficulty levels (*Parking Lot*, *Vending Machine*, *Elevator System*, *Rate Limiter*).
* **Structured Design Submission**: Form-guided text submission capturing requirements/assumptions, class responsibilities, relationships & flows, trade-offs, and edge cases.
* **Submission State Machine**: Submissions are persisted immediately with a defined lifecycle (`SUBMITTED → EVALUATING → COMPLETED / FAILED`), ensuring auditability and state recovery on failure.
* **Pluggable Evaluation Strategies**:
  * **Rule-Based Evaluator**: Fast, deterministic structural validation checking length, required sections, and heuristic keyword alignment.
  * **AI Evaluator**: Deep semantic evaluation powered by Google Gemini (`gemini-3.5-flash`), providing nuanced analysis of abstractions and design trade-offs.
* **8-Dimension Rubric Feedback**: Detailed evaluation broken down across:
  1. *Requirement understanding*
  2. *Class responsibilities*
  3. *Coupling / cohesion*
  4. *Encapsulation and interfaces*
  5. *Appropriate use of abstraction / patterns*
  6. *Extensibility*
  7. *Edge cases and testability*
  8. *Quality of explanation*
* **Application-Side Validation**: AI output is strictly validated against a typed JSON schema before persistence to guarantee score bounds (1–5) and complete criterion coverage.
* **Attempt History API**: Relational persistence tracking attempts, submissions, evaluations, and individual criterion results per learner (`GET /api/learners/:name/attempts`).

---

## Architecture

The platform is designed as a clean, layered monolith adhering to Domain-Driven Design principles.

```text
┌─────────────────────────────────────────────────────────────┐
│                 React + Vite Frontend (SPA)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST (via /api proxy)
┌──────────────────────────────▼──────────────────────────────┐
│                    Express REST API Layer                   │
│         /api/problems  •  /api/attempts  •  /api/submissions│
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   Application Service Layer                 │
│              AttemptService  •  EvaluationService           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│        Domain Entities      ││      Evaluator Strategy      │
│  Problem • Attempt • Rubric ││        <<Evaluator>>         │
│  Submission • Evaluation    ││        ▲            ▲        │
│  CriterionResult            ││        │            │        │
└──────────────┬──────────────┘│ RuleBasedEval   AIEval       │
               │               │                     │        │
               │               │               LLMProvider    │
               │               │                     │        │
               │               │               GeminiProvider │
               │               └──────────────────────────────┘
┌──────────────▼──────────────────────────────────────────────┐
│                    Prisma ORM Persistence                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL
┌──────────────────────────────▼──────────────────────────────┐
│                        MySQL Database                       │
└─────────────────────────────────────────────────────────────┘
```

### Evaluator Strategy Pattern
The `EvaluationService` interacts with evaluators through the `Evaluator` interface:
```typescript
export interface Evaluator {
  evaluate(submission: Submission): Promise<Omit<Evaluation, 'id' | 'submissionId' | 'createdAt'>>;
}
```
Based on the `EVALUATOR_MODE` environment variable (`rule` or `ai`), the service instantiates either `RuleBasedEvaluator` or `AIEvaluator(new GeminiProvider())`.

### Submission Lifecycle State Machine
```text
  [ Learner Submits ]
           │
           ▼
     ┌───────────┐
     │ SUBMITTED │ (Persisted immediately in DB)
     └─────┬─────┘
           │
           ▼
    ┌─────────────┐
    │ EVALUATING  │ (Guard: Rejects duplicate concurrent evaluations)
    └─────┬───────┘
          │
     ┌────┴────────────────────────┐
     │                             │
 [Success]                     [Failure / Error]
     │                             │
     ▼                             ▼
┌───────────┐                 ┌──────────┐
│ COMPLETED │                 │  FAILED  │
└───────────┘                 └──────────┘
```

---

## Tech Stack

* **Frontend**: React 18, React Router v6, Vite, Vanilla CSS
* **Backend**: Node.js, Express, TypeScript, `ts-node`
* **Database & ORM**: MySQL 8.0+, Prisma ORM (Client & CLI v5.0.0)
* **AI Provider**: Google GenAI SDK (`@google/genai`), Gemini 3.5 Flash (`gemini-3.5-flash`)
* **Testing**: Vitest, Supertest

---

## Project Structure

```text
lld-practice-platform/
├── client/                           # React + Vite frontend SPA
│   ├── src/
│   │   ├── api/                      # Fetch wrappers for backend endpoints
│   │   ├── pages/                    # ProblemList, ProblemDetail, Attempt, Feedback, History
│   │   ├── App.tsx                   # Route definitions
│   │   ├── index.css                 # Global styling and design system tokens
│   │   └── main.tsx                  # React entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts                # Configured with /api proxy to http://localhost:3000
│
├── server/                           # Node.js + Express backend
│   ├── prisma/
│   │   ├── schema.prisma             # MySQL domain schema
│   │   └── seed.ts                   # Idempotent seed script for 4 LLD problems
│   ├── src/
│   │   ├── domain/                   # Problem, Attempt, Submission, TextSubmission, Evaluation, CriterionResult
│   │   ├── evaluators/               # Evaluator interface, RuleBasedEvaluator, AIEvaluator
│   │   ├── providers/                # LLMProvider interface, GeminiProvider (@google/genai)
│   │   ├── routes/                   # problems.ts, attempts.ts, submissions.ts, learners.ts
│   │   ├── rubric/                   # 8 fixed assignment rubric criteria
│   │   ├── services/                 # AttemptService, EvaluationService
│   │   ├── app.ts                    # Express application configuration
│   │   ├── prisma.ts                 # PrismaClient singleton
│   │   └── server.ts                 # Server entry point (starts on port 3000)
│   ├── tests/
│   │   ├── api.test.ts               # Integration tests covering REST endpoints & error handling
│   │   ├── EvaluationService.test.ts # Strategy selection & state guard tests
│   │   ├── AIEvaluator.test.ts       # AI response parsing, validation, and error tests
│   │   └── RuleBasedEvaluator.test.ts# Deterministic rule & heuristic score tests
│   ├── .env.example                  # Environment variable template
│   ├── package.json
│   └── tsconfig.json
│
├── AI_USAGE.md                       # Comprehensive record of AI-assisted decisions and human corrections
├── DESIGN_NOTE.md                    # In-depth architectural specification and trade-off analysis
├── PLAN.md                           # Master implementation roadmap and execution checklist
├── README.md                         # This file
└── RESEARCH_NOTE.md                  # Learner problem research, competitor analysis, and architectural mapping
```

---

## Prerequisites

* **Node.js**: v18.0.0 or later (v20+ recommended)
* **npm**: v9.0.0 or later
* **MySQL**: v8.0 or later (running locally on port 3306 or hosted via Docker / cloud provider)
* **Google Gemini API Key**: Required only if running in AI evaluation mode (`EVALUATOR_MODE=ai`)

---

## Database Setup

1. **Start MySQL** and create an empty database for the platform:
   ```sql
   CREATE DATABASE lld_platform;
   ```

2. **Configure Connection**:
   In the `server/` directory, create a `.env` file from `.env.example`:
   ```bash
   cd server
   cp .env.example .env
   ```
   Edit `.env` to specify your MySQL credentials:
   ```env
   DATABASE_URL="mysql://root:password@localhost:3306/lld_platform"
   ```

3. **Push Schema & Generate Prisma Client**:
   Run the Prisma migration tool from the `server/` directory:
   ```bash
   npx prisma db push
   ```

4. **Seed the 4 LLD Problems**:
   Run the idempotent seed script:
   ```bash
   npx prisma db seed
   ```
   *This seeds Parking Lot, Vending Machine, Elevator System, and Rate Limiter.*

---

## Environment Variables

All backend configuration is defined in `server/.env`. A template is provided in `server/.env.example`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `""` | MySQL connection string in the format `mysql://USER:PASSWORD@HOST:PORT/DATABASE`. |
| `EVALUATOR_MODE` | No | `"rule"` | Determines evaluation strategy: `"rule"` (deterministic) or `"ai"` (Gemini). |
| `GEMINI_API_KEY` | Conditional | `""` | Google AI Studio API key. Required only when `EVALUATOR_MODE=ai`. |

> [!NOTE]
> The frontend requires no environment variables. The Vite development server automatically proxies requests from `/api` to `http://localhost:3000`.

---

## Installation

The repository consists of two packages (`server` and `client`). Install dependencies in both:

### 1. Backend Installation
```bash
cd server
npm install
```

### 2. Frontend Installation
```bash
cd ../client
npm install
```

---

## Running the Application

To run the application locally, start the backend and frontend in separate terminals:

### Terminal 1: Backend Server
```bash
cd server
npm start
```
*The backend starts at `http://localhost:3000`.*

### Terminal 2: Frontend Client
```bash
cd client
npm run dev
```
*The Vite development server starts at `http://localhost:5173`.*

Open **`http://localhost:5173`** in your browser to interact with the platform.

---

## Evaluator Modes

The platform supports two selectable evaluation strategies configured via `EVALUATOR_MODE` in `server/.env`:

### 1. Rule Mode (`EVALUATOR_MODE="rule"`)
* **Behavior**: Evaluates submissions using `RuleBasedEvaluator`.
* **Checks**:
  * Minimum content length (rejects submissions under 50 characters).
  * Presence of critical structural sections (requires explicit class responsibilities).
  * Assigns heuristic baseline scores (1–4) across the 8 rubric dimensions based on section presence and depth.
* **Benefits**: 100% deterministic, instant execution, zero network overhead, and requires no API keys.

### 2. AI Mode (`EVALUATOR_MODE="ai"`)
* **Behavior**: Evaluates submissions using `AIEvaluator` connected to Google Gemini 3.5 Flash via `GeminiProvider`.
* **Prerequisites**: A valid `GEMINI_API_KEY` must be set in `server/.env`.
* **Execution & Output Contract**:
  * Formulates a structured prompt including problem title, description, requirements, and the candidate write-up.
  * Requests JSON output constrained by `responseMimeType: "application/json"`.
  * Enforces the 8 required rubric criteria with scores bounded between 1 and 5.
  * Requires concrete evidence quotes grounded solely in the candidate's text.
* **Error Handling & Failure State**:
  * If the response is not valid JSON, has missing criteria, or contains out-of-bounds scores, an error is thrown.
  * `EvaluationService` catches provider errors (e.g. rate limits, timeouts) and transitions the submission status to `FAILED`.

---

## Testing

The automated test suite contains **24 tests** across 4 test suites. Tests are completely isolated from live Gemini API calls, require no API key, and consume zero quota.

### Running the Test Suite
From the `server/` directory, run:
```bash
cd server
npx vitest run --no-threads
```
*(Alternatively: `npm test -- --no-threads`)*

> [!IMPORTANT]
> The `--no-threads` flag ensures tests execute serially against the shared MySQL database, avoiding concurrent transaction race conditions.

### Test Coverage Breakdown
* **`tests/RuleBasedEvaluator.test.ts` (5 tests)**:
  * Empty submission rejection.
  * Below-threshold length rejection (<50 chars).
  * Missing required sections rejection (missing class responsibilities).
  * Full 8-criterion heuristic evaluation on complete submissions.
  * Partial scoring when optional sections are omitted.
* **`tests/AIEvaluator.test.ts` (5 tests)**:
  * Parsing of valid structured JSON output into domain `CriterionResult` entities.
  * Safe error handling on malformed non-JSON output.
  * Safe error handling on invalid scores (<1 or >5).
  * Safe error handling on missing rubric criteria.
  * Propagation of provider network errors.
* **`tests/EvaluationService.test.ts` (2 tests)**:
  * Guard preventing concurrent re-evaluation of submissions in `EVALUATING` status.
  * Evaluator strategy selection under `EVALUATOR_MODE=rule` with MySQL transaction verification.
* **`tests/api.test.ts` (12 tests)**:
  * `GET /api/problems` & `GET /api/problems/:id` (200 and 404 boundaries).
  * `POST /api/attempts` (valid creation and 404 on unknown problem).
  * `POST /api/attempts/:id/submissions` (empty content rejection and non-existent attempt rejection).
  * End-to-end submission and synchronous evaluation lifecycle (`SUBMITTED → EVALUATING → COMPLETED`).
  * Feedback retrieval (`GET /api/submissions/:id`).
  * Evaluation failure lifecycle (`SUBMITTED → EVALUATING → FAILED`).
  * Learner history retrieval (`GET /api/learners/:name/attempts`).

### TypeScript Compilation Check
Verify strict TypeScript compilation with zero errors:
```bash
cd server && npx tsc --noEmit
cd ../client && npx tsc --noEmit
```

---

## API Overview

All routes are prefixed with `/api` and return JSON.

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/problems` | List all available LLD problems. | `200`, `500` |
| `GET` | `/api/problems/:id` | Fetch problem description, requirements, and difficulty. | `200`, `400`, `404`, `500` |
| `POST` | `/api/attempts` | Create a new attempt for a problem (`{ problemId, learnerName }`). | `201`, `400`, `404`, `500` |
| `POST` | `/api/attempts/:id/submissions` | Submit a design write-up (`{ content }`). Synchronously triggers evaluation and returns the updated submission. | `201`, `400`, `500` |
| `GET` | `/api/submissions/:id` | Retrieve submission status, evaluator type, and 8 criterion results. | `200`, `400`, `404`, `500` |
| `GET` | `/api/learners/:name/attempts` | Retrieve all past attempts and latest submission feedback for a learner. | `200`, `400`, `500` |

---

## Evaluation Flow

When a candidate clicks **Submit Design**:
1. **Input Validation**: The route validates that `attemptId` exists and `content` is not empty.
2. **Submission Creation**: `AttemptService` creates a `Submission` row with `status = "SUBMITTED"`.
3. **Immediate Response**: The API immediately returns HTTP 201 with the created submission so the main submission request is never blocked by slow AI evaluation. The frontend navigates to `/feedback/:id` and begins polling status.
4. **Asynchronous State Transition**: In the background, `EvaluationService` updates the submission to `status = "EVALUATING"`. An atomic concurrency guard prevents duplicate or concurrent evaluation executions.
5. **Strategy Execution**:
   * If `EVALUATOR_MODE=ai`: `AIEvaluator` builds the prompt, invokes Gemini, and parses the structured response.
   * If `EVALUATOR_MODE=rule`: `RuleBasedEvaluator` executes deterministic syntax and keyword checks.
6. **Persistence or Failure**:
   * **On Success**: In a Prisma database transaction, an `Evaluation` record and 8 `CriterionResult` records are created, and `Submission.status` transitions to `COMPLETED`.
   * **On Failure**: `EvaluationService` catches the exception, updates `Submission.status` to `FAILED`, and logs the error reason.
7. **Client Feedback**: The frontend polls `GET /api/submissions/:id`, transitions from evaluating spinner to the completed 8-criterion feedback breakdown, or displays a retry banner on `FAILED`.

---

## Documentation

The project includes four specialized engineering documents:

* [**PLAN.md**](./PLAN.md): The foundational source of truth covering assignment requirements, tech stack decisions, MVP scope boundaries, and the execution roadmap.
* [**DESIGN_NOTE.md**](./DESIGN_NOTE.md): Complete technical design note explaining layer boundaries, entity domain models, the Strategy pattern, rubric design, Change Tests A & B, failure modes, and architectural trade-offs.
* [**RESEARCH_NOTE.md**](./RESEARCH_NOTE.md): Concise research note examining 6 existing platforms (AlgoMaster, Educative, LeetCode, Pramp, etc.), identifying key industry gaps, analyzing deterministic vs. AI evaluation trade-offs, and mapping research to architecture.
* [**AI_USAGE.md**](./AI_USAGE.md): Transparent log detailing how AI was utilized as an engineering copilot, highlighting human corrections (SQLite to MySQL migration, template keyword sanitization, Gemini model debugging from 2.5/3.6 to 3.5 Flash, and documentation audits).

---

## Known Limitations / Scope Boundaries

To deliver a high-quality prototype within the 2-day constraint, the following items were deliberately kept out of scope:
* **No Authentication / Session Management**: Learner identity is tracked via simple strings (e.g. `'Learner MVP'`) rather than OAuth/JWT infrastructure.
* **Text Submission Format**: Focuses on structured markdown write-ups rather than real-time code compilation or diagram rendering. (Extensible via `TextSubmission extends Submission`).
* **In-Process Asynchronous Evaluation**: Uses in-process non-blocking evaluation with frontend polling rather than heavyweight distributed message brokers (BullMQ/Redis/Kafka), keeping the architecture simple, robust, and aligned with 2-day assignment constraints.
* **Focused Problem Bank**: Seeds 4 classic LLD problems rather than a large dynamic CMS.
* **No Longitudinal Weakness Aggregation**: The database persists per-attempt `CriterionResult` records, establishing the foundation for longitudinal analytics, but automated cross-attempt trend dashboards are left for future iterations.

---

## Design Decisions

* **Strategy Pattern for Evaluators**: Decouples the practice flow from the evaluation implementation, directly satisfying **Change Test B** (adding human evaluation or other LLM providers requires zero changes to the core submission pipeline).
* **Abstract `Submission` Domain Base**: Models `Submission` as an extensible entity with `TextSubmission` as the initial specialization, directly satisfying **Change Test A** (adding diagram or code submissions requires no changes to `Attempt` or the lifecycle).
* **Prisma with MySQL**: Relational integrity with foreign keys ensuring that evaluations and criterion results remain strictly linked to submissions and attempts.
* **Application-Side Output Validation**: Mitigates LLM non-determinism by validating structure, score ranges, and criteria counts before database writes.

---

## Troubleshooting

### 1. MySQL Connection Issues (`P1001: Can't reach database server`)
* Verify MySQL is running locally:
  ```bash
  mysqladmin -u root -p ping
  ```
* Ensure `DATABASE_URL` in `server/.env` uses the correct username, password, port (default `3306`), and database name.

### 2. Gemini API Errors (`GEMINI_API_KEY environment variable is missing`)
* If running in AI mode (`EVALUATOR_MODE="ai"`), verify `GEMINI_API_KEY` is set in `server/.env`.
* If you do not have an API key, set `EVALUATOR_MODE="rule"` to use the deterministic evaluator with zero external dependencies.

### 3. Gemini Rate Limiting (`HTTP 503 / 429 Demand Spike`)
* Free-tier Gemini endpoints occasionally experience demand spikes. If a submission transitions to `FAILED`, check the server console for details. Re-submitting or switching to `EVALUATOR_MODE="rule"` will bypass API limits.

### 4. Vitest Concurrency Issues
* Always execute backend tests using `npx vitest run --no-threads` to prevent parallel tests from conflicting on shared database tables.

---

## Submission Notes

To evaluate this submission end-to-end:
1. Ensure MySQL is running and create database `lld_platform`.
2. Configure `server/.env` using `server/.env.example` as a reference.
3. In `server/`: run `npm install`, `npx prisma db push`, and `npx prisma db seed`.
4. In `client/`: run `npm install`.
5. Run the test suite: `cd server && npx vitest run --no-threads` (verifies all 24 tests pass).
6. Start backend (`npm start` in `server/`) and frontend (`npm run dev` in `client/`).
7. Visit `http://localhost:5173`, select a problem (e.g. *Parking Lot*), click *Start Attempt*, fill out the 5 structured sections, and submit to observe evaluation feedback.
