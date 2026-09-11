# 🧠 LLD Forge

### Practice. Design. Get feedback. Improve.

**LLD Forge** is an interactive Low-Level Design (LLD) practice platform built for software engineers preparing for machine coding and object-oriented design interviews. Learners select a problem, draft a structured design, submit it for asynchronous multi-dimensional evaluation, inspect actionable feedback with concrete evidence citations, and iterate through a dedicated "Try Again" workflow.

---

## 🌐 Live Deployment

The platform is deployed in production across two decoupled services connected via transparent edge proxying:

| Component | Role | Live Link |
|---|---|---|
| **Frontend** | Interactive Single-Page Application (React + Vite) | [🚀 Live Demo](https://lld-forge.vercel.app/) |
| **Backend API** | REST API & Asynchronous Evaluation Service (Express + Prisma) | [🔌 API Root](https://lld-forge-ksu8.onrender.com) |
| **Health Check** | Seeded LLD Problem Bank Verification Endpoint | [📦 Problems Endpoint](https://lld-forge-ksu8.onrender.com/api/problems) |

> **Direct Access**: 
> - **User-Facing App**: [https://lld-forge.vercel.app/](https://lld-forge.vercel.app/)
> - **Backend API**: [https://lld-forge-ksu8.onrender.com](https://lld-forge-ksu8.onrender.com)
> - **API Verification**: Verify live backend data by visiting [`/api/problems`](https://lld-forge-ksu8.onrender.com/api/problems), which returns the seeded LLD problems.

---

## ⚡ Core Features

- 🧩 **Real-World LLD Problems**: 4 curated classic problems with functional requirements, constraints, and difficulty ratings.
- ✍️ **Structured Design Submission**: Guided text-based design editor capturing requirements & assumptions, class responsibilities, relationships, trade-offs, and edge cases.
- 🤖 **AI-Powered Semantic Evaluation**: Deep architectural analysis powered by Google Gemini, evaluating designs against an 8-dimension rubric.
- 📐 **Deterministic Structural Validation**: Heuristic rule-based evaluator for fast input validation and offline testing.
- 📊 **Explainable Rubric Feedback**: Criterion-level scoring (1–5) paired with direct evidence citations from the learner's text, identified concerns, actionable suggestions, and confidence scores.
- ⏳ **Non-Blocking Asynchronous Processing**: Submissions return immediately (`SUBMITTED`) while background evaluators transition the state to `EVALUATING` and `COMPLETED` or `FAILED`.
- 🔄 **Try Again Workflow**: Seamless one-click re-attempt loop directly from the feedback view to encourage rapid design iteration.
- 📚 **Attempt History**: Complete longitudinal record of previous attempts, latest scores, and growth areas per learner without requiring a sign-up barrier.
- 🔌 **Extensible Strategy Architecture**: Pluggable `Evaluator` interface allowing seamless addition of new evaluation models or human-in-the-loop reviewers.

---

## 🔄 Core User Journey

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. Choose       │  ──►  │ 2. Think &      │  ──►  │ 3. Submit       │
│    Problem      │       │    Design       │       │    Design       │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                             │
                                                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 6. Try          │  ◄──  │ 5. Review       │  ◄──  │ 4. Asynchronous │
│    Again        │       │    Feedback     │       │    Evaluation   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Choose Problem**: The learner browses available problems in the catalog and selects a challenge matching their target focus or difficulty level.
2. **Think & Design**: The learner reviews detailed system requirements, boundary constraints, and drafts their solution across structured architectural sections.
3. **Submit Design**: The learner submits their design. The API instantly registers the attempt and transitions the submission into a state-tracked lifecycle.
4. **Asynchronous Evaluation**: The backend transitions the submission to `EVALUATING` and invokes the evaluator strategy (Rule-Based or Gemini AI) in the background without holding the client request open.
5. **Review Feedback**: The client polls the submission status. Once `COMPLETED`, an interactive breakdown reveals scores, evidence quotes, identified concerns, and improvement advice across all 8 rubric criteria.
6. **Try Again**: The learner clicks "Try Again" to immediately reopen their design workspace with the same attempt context to address the identified weak points.

---

## 📚 Seeded Problems

LLD Forge includes four classic low-level design problems seeded in the production database:

| Problem | Difficulty | Key Architectural Concepts Tested |
|---|---|---|
| **Parking Lot** | `Medium` | Multi-floor spot allocation, spot size hierarchy (Motorcycle/Car/Truck), ticket lifecycle, hourly fee computation strategies. |
| **Vending Machine** | `Medium` | State pattern transitions (Idle, HasMoney, Dispensing, ReturnChange), inventory tracking, multi-denomination coin/cash handling. |
| **Elevator System** | `Hard` | Dispatcher algorithms, direction-based scheduling (SCAN/LOOK), concurrent floor requests, internal vs. external call arbitration. |
| **Rate Limiter** | `Hard` | Throttling algorithms (Token Bucket, Sliding Window Counter), per-client rate tracking, thread-safety, burst handling. |

---

## 🤖 AI Evaluation Engine

The platform integrates **Google Gemini** to analyze submissions against eight architectural dimensions. Rather than collapsing feedback into an arbitrary single grade or comparing against a single rigid reference solution, the AI Evaluator assesses the structural and design merits of the submitted text.

### The 8 Rubric Dimensions

1. **Requirement understanding**: Captures core use cases, clarifies scope, and states sensible assumptions.
2. **Class responsibilities**: Adheres to Single Responsibility Principle (SRP) with cohesive, well-defined class roles.
3. **Coupling & cohesion**: Minimizes tight coupling between components while maintaining high internal cohesion.
4. **Encapsulation & interfaces**: Hides internal state behind clean, well-abstracted interfaces.
5. **Appropriate abstraction & patterns**: Applies design patterns (e.g., State, Strategy, Factory) where problems demand them, avoiding over-engineering.
6. **Extensibility**: Permits additions (new vehicle types, new payment methods, new algorithms) with minimal code modification (Open/Closed Principle).
7. **Edge cases & testability**: Identifies edge conditions (capacity limits, concurrent access, invalid inputs) and defines testable boundaries.
8. **Quality of explanation**: Communicates rationale clearly with structured formatting and logical flow.

### Structured Feedback Schema

For every criterion, the AI returns a strictly validated JSON structure:

```json
{
  "criterion": "Class responsibilities",
  "score": 4,
  "evidence": "ParkingLot delegates ticket generation to TicketDispenser and fee calculation to FeeCalculator.",
  "concern": "SpotManager holds references to both spot allocation and payment validation.",
  "suggestion": "Extract payment validation into a dedicated BillingService to maintain Single Responsibility.",
  "confidence": 0.95
}
```

- **Application-Side Guardrails**: The raw LLM response is parsed and checked against a strict domain schema. If scores exceed bounds (1–5), criteria are missing, or the JSON is malformed, the system catches the failure and safely marks the submission as `FAILED` rather than persisting corrupt state.
- **Asynchronous Execution**: Model latency (typically 3–8 seconds) never blocks HTTP responses; the client receives a `201 SUBMITTED` status immediately and monitors progress via polling.

---

## 🏗️ Architecture & Engineering Design

```text
┌─────────────────────────────────────────────────────────────┐
│                 React + Vite Frontend (SPA)                 │
│              Hosted on Vercel (Edge CDN)                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ /api/* (Vercel Transparent Rewrite)
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
│               Relational Models & Transactions              │
└──────────────────────────────┬──────────────────────────────┘
                               │ TLS / MySQL Protocol
┌──────────────────────────────▼──────────────────────────────┐
│                   TiDB Cloud (Serverless)                   │
│                  MySQL-Compatible Database                  │
└─────────────────────────────────────────────────────────────┘
```

### 1. Strategy Pattern for Evaluators

The evaluation subsystem relies on a clean Strategy Pattern. The application service layer only depends on the `Evaluator` interface:

```typescript
export interface Evaluator {
  evaluate(submission: Submission): Promise<Omit<Evaluation, 'id' | 'submissionId' | 'createdAt'>>;
}
```

Two concrete strategies are implemented:
- **`RuleBasedEvaluator`**: Fast, deterministic heuristics that check character thresholds and section markers (used for offline development and instant guard checking).
- **`AIEvaluator`**: Semantic analysis using `GeminiProvider` implementing the `LLMProvider` contract.

Switching strategies is controlled via the `EVALUATOR_MODE` environment variable (`ai` or `rule`) without changing business logic.

### 2. Submission State Machine

Submissions follow a strict three-state lifecycle:

```text
      ┌───────────┐
      │ SUBMITTED │
      └─────┬─────┘
            │ Worker begins evaluation
            ▼
      ┌───────────┐
      │ EVALUATING│
      └─────┬─────┘
            │
     ┌──────┴──────┐
     ▼             ▼
┌───────────┐ ┌────────┐
│ COMPLETED │ │ FAILED │
└───────────┘ └────────┘
```

- **`SUBMITTED`**: Record created; HTTP request returns promptly to the client.
- **`EVALUATING`**: Acquired by the evaluation runner; prevents concurrent redundant evaluations.
- **`COMPLETED`**: Evaluation and 8 criterion results atomically committed inside a database transaction.
- **`FAILED`**: Caught evaluation failures (e.g., API timeout or validation errors) transition cleanly, enabling user inspection and retry.

### 3. Extensible Submission Domain

The domain defines `Submission` as an extensible base abstraction, with `TextSubmission` as the concrete MVP implementation. This architecture allows future submission formats (e.g., diagram ASTs, PlantUML scripts, or GitHub repository links) to be introduced without breaking the core evaluation pipeline.

---

## 🚀 Production Infrastructure & Routing

### Hosting Breakdown

| Tier | Service | Technology | Details |
|---|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | React 18, Vite, TypeScript | Global Edge CDN hosting static client bundle |
| **Backend** | [Render](https://render.com) | Node.js 20, Express, TypeScript | Containerized web service running `ts-node` |
| **Database** | [TiDB Cloud](https://tidbcloud.com) | MySQL 8.0 Compatible Serverless | Distributed relational storage with TLS enforcement |
| **AI Engine** | [Google AI Studio](https://ai.google.dev) | Gemini API (`@google/genai`) | Server-side prompt execution & structured parsing |

> **Security Note**:
> - The browser never contacts the database or the Gemini API directly.
> - All LLM requests and database queries originate strictly from the backend service on Render.

### Vercel Edge API Routing

The frontend utilizes **relative API paths** (`/api/problems`, `/api/attempts`, etc.). In production, Vercel proxies these requests to Render using [`client/vercel.json`](./client/vercel.json):

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://lld-forge-ksu8.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

- **Zero CORS Issues**: Browser requests remain same-origin with the Vercel domain; Vercel proxies requests server-to-server to Render.
- **SPA Client Routing**: The fallback rewrite sends deep links (e.g., `/problems/1`, `/history`) to `/index.html` to allow React Router to resolve pages without 404s.
- **Local Dev Proxy**: During local development, `client/vite.config.ts` proxies `/api` requests to `http://localhost:3000`.

---

## 💻 Run Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- A running MySQL instance or TiDB Cloud cluster

### 1. Clone the Repository
```bash
git clone https://github.com/karan-jack/LLD-Forge.git
cd LLD-Forge
```

### 2. Install Frontend Dependencies
```bash
cd client
npm install
```

### 3. Install Backend Dependencies
```bash
cd ../server
npm install
```

### 4. Configure Backend Environment Variables
Create a `.env` file in the `server/` directory:

```bash
cd ../server
cp .env.example .env   # or create server/.env manually
```

Populate `server/.env` with your credentials:
```env
PORT=3000
DATABASE_URL="mysql://<user>:<password>@<host>:<port>/<database>?sslaccept=strict"
GEMINI_API_KEY="your-gemini-api-key-here"
EVALUATOR_MODE="ai"   # set to "rule" for offline deterministic evaluation
```

### 5. Generate Prisma Client
```bash
# Inside server/
npx prisma generate
```

### 6. Apply Database Schema
Push the schema to your target MySQL or TiDB instance:
```bash
# Inside server/
npx prisma db push
```

### 7. Seed the Database
Populate the 4 default LLD problems:
```bash
# Inside server/
npx prisma db seed
```

### 8. Start Backend Service
```bash
# Inside server/
npm run dev
# Server will start on http://localhost:3000
```

### 9. Start Frontend Service
In a separate terminal window:
```bash
cd client
npm run dev
# Frontend will start on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser. All API requests made to `/api/*` will automatically proxy to `http://localhost:3000`.

---

## 🗄️ Database Setup

The backend uses **Prisma ORM** coupled with a MySQL-compatible database. The production deployment runs on **TiDB Cloud Serverless**.

### Schema Definition
The database schema is defined in [`server/prisma/schema.prisma`](./server/prisma/schema.prisma):
- `problem`: Stores challenge title, requirements, description, and difficulty.
- `attempt`: Tracks learner attempts per problem.
- `submission`: Records submission text, status enum (`SUBMITTED`, `EVALUATING`, `COMPLETED`, `FAILED`), and timestamps.
- `evaluation`: Stores evaluator metadata (`evaluatorType`, `createdAt`) linked 1:1 to a submission.
- `criterionresult`: Stores criterion breakdown, scores (1–5), evidence citations, concerns, and suggestions linked to an evaluation.

### Connecting to TiDB Cloud or Local MySQL
For TiDB Cloud, SSL parameters must be included in your `DATABASE_URL`:
```text
DATABASE_URL="mysql://<user>.<prefix>:<password>@gateway01.<region>.prod.aws.tidbcloud.com:4000/<dbname>?sslaccept=strict"
```
For local MySQL installations:
```text
DATABASE_URL="mysql://root:password@localhost:3306/lld_forge"
```

---

## 🧪 Testing & Verification

The test suite is built with **Vitest** and **Supertest**, featuring unit tests for evaluators, end-to-end integration tests for Express routes, and mocked Gemini providers for deterministic testing.

### Run All Backend Tests
```bash
cd server
npm test
```

### Verified Test Results (24/24 Passing)
```text
 RUN  v0.34.6 D:/LLD Forge/server

 ✓ tests/RuleBasedEvaluator.test.ts  (5 tests)
 ✓ tests/AIEvaluator.test.ts         (5 tests)
 ✓ tests/EvaluationService.test.ts   (2 tests)
 ✓ tests/api.test.ts                 (12 tests)

 Test Files  4 passed (4)
      Tests  24 passed (24)
   Duration  1.02s
```

### Test Coverage Highlights
- **`RuleBasedEvaluator.test.ts`**: Verifies input rejection on empty text, missing responsibilities section, and scoring bounds.
- **`AIEvaluator.test.ts`**: Validates JSON schema parsing, handles simulated network timeouts, and rejects missing rubric dimensions.
- **`EvaluationService.test.ts`**: Verifies concurrency guards (preventing simultaneous re-evaluation) and evaluator mode switching.
- **`api.test.ts`**: Full integration suite testing problem fetching, attempt creation, non-blocking submission polling, error flows, and learner history retrieval.

---

## 📁 Repository Structure

```text
LLD-Forge/
├── client/                           # React + Vite Frontend
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts              # Centralized API client helper
│   │   ├── pages/
│   │   │   ├── ProblemList.tsx       # Problem catalog view
│   │   │   ├── ProblemDetail.tsx     # Requirements & attempt launcher
│   │   │   ├── Attempt.tsx           # Structured design write-up form
│   │   │   ├── Feedback.tsx          # Interactive rubric evaluation view
│   │   │   └── History.tsx           # Past attempts & weakness review
│   │   ├── App.tsx                   # React Router definition
│   │   └── main.tsx                  # Client bootstrap
│   ├── package.json
│   ├── tsconfig.json
│   ├── vercel.json                   # Production proxy rewrites & SPA routing
│   └── vite.config.ts                # Local dev proxy configuration
│
├── server/                           # Express + TypeScript Backend
│   ├── prisma/
│   │   ├── schema.prisma             # Relational data models
│   │   └── seed.ts                   # Seeds 4 initial LLD problems
│   ├── src/
│   │   ├── domain/                   # Core domain entities & interfaces
│   │   │   ├── Problem.ts
│   │   │   ├── Attempt.ts
│   │   │   ├── Submission.ts
│   │   │   ├── TextSubmission.ts
│   │   │   ├── Evaluation.ts
│   │   │   ├── Criterion.ts
│   │   │   ├── CriterionResult.ts
│   │   │   └── Rubric.ts
│   │   ├── evaluators/               # Evaluator Strategy implementations
│   │   │   ├── Evaluator.ts          # Strategy interface
│   │   │   ├── RuleBasedEvaluator.ts # Deterministic heuristic evaluator
│   │   │   └── AIEvaluator.ts        # Gemini-backed semantic evaluator
│   │   ├── providers/                # External provider abstractions
│   │   │   ├── LLMProvider.ts        # Provider contract
│   │   │   └── GeminiProvider.ts     # Google Gemini SDK implementation
│   │   ├── routes/                   # REST API controllers
│   │   │   ├── problems.ts
│   │   │   ├── attempts.ts
│   │   │   ├── submissions.ts
│   │   │   └── learners.ts
│   │   ├── services/                 # Application service orchestration
│   │   │   ├── AttemptService.ts
│   │   │   └── EvaluationService.ts
│   │   ├── app.ts                    # Express application setup
│   │   ├── server.ts                 # HTTP server listener
│   │   └── prisma.ts                 # Prisma Client singleton
│   ├── tests/                        # Vitest test suite
│   │   ├── RuleBasedEvaluator.test.ts
│   │   ├── AIEvaluator.test.ts
│   │   ├── EvaluationService.test.ts
│   │   └── api.test.ts
│   ├── package.json
│   └── tsconfig.json
│
├── AI_USAGE.md                       # Comprehensive log of AI tooling & decisions
├── DESIGN_NOTE.md                    # In-depth architectural & domain design document
├── PLAN.md                           # Original requirements, scope, & milestones
└── RESEARCH_NOTE.md                  # Competitive analysis & rubric research findings
```

---

## 📚 Project Documentation

The repository includes dedicated engineering notes documenting the research, architecture, and AI utilization behind the project:

- 📑 [**`DESIGN_NOTE.md`**](./DESIGN_NOTE.md): Complete domain modeling breakdown, evaluator design decisions, database schemas, and state machine transitions.
- 🔬 [**`RESEARCH_NOTE.md`**](./RESEARCH_NOTE.md): Analysis of existing LLD tools, the limitation of single-reference grading, and the case for multi-dimensional evidence-based rubrics.
- 🤖 [**`AI_USAGE.md`**](./AI_USAGE.md): Transparent account of AI assistance throughout the project, detailing human architectural corrections and verification steps.
- 📋 [**`PLAN.md`**](./PLAN.md): Initial requirement analysis, grading weights, milestone checklist, and feature roadmaps.

---

## ⚖️ Scope & Intentional MVP Trade-Offs

To maintain rigorous focus on domain modeling, rubric evaluation quality, and a reliable user journey, specific infrastructure components were deliberately omitted from this MVP:

- **No User Authentication**: Submissions use a lightweight demo learner identifier (`Learner MVP`). This removes sign-up friction while still persisting full attempt histories.
- **No Distributed Queue (Redis/BullMQ/Kafka)**: In-process asynchronous evaluation promises keep operational overhead minimal while satisfying the non-blocking UX contract.
- **No Diagram Visualizer**: The platform focuses strictly on structured text submissions. In real-world LLD interviews, candidates must clearly articulate responsibilities, trade-offs, and invariants in written form before sketching UML.
- **Monolithic Architecture**: Rather than introducing microservices or complex distributed communication, a clean, modular monolith was selected to maximize cohesion and simplicity.

---

## 🔮 Future Extensibility

The domain architecture was engineered to accommodate key production enhancements:

1. **Diagram & Code Submissions**: Extend the `Submission` base class to create `DiagramSubmission` (e.g., PlantUML or Mermaid AST) or `CodeSubmission` (Java/C++/TypeScript source).
2. **Hybrid & Human Evaluation**: Introduce a `HumanEvaluator` or `CompositeEvaluator` strategy that combines deterministic linting, AI semantic analysis, and peer mentor review.
3. **Longitudinal Weakness Analytics**: Query stored `CriterionResult` rows to identify recurring patterns (e.g., "Consistently scoring < 3 in Coupling & Cohesion") and suggest targeted follow-up problems.
4. **Distributed Task Queue**: Extract `EvaluationService` calls into a background worker queue (e.g., Redis + BullMQ) to scale evaluation workloads horizontally under heavy traffic.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
