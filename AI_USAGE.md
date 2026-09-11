# AI Usage

## 1. How AI Was Used

AI was utilized as an engineering copilot during this 2-day assignment to accelerate development across the full lifecycle:
* **Planning and requirement breakdown**: Translating problem statements and evaluation criteria into structured work items.
* **Architecture and design discussion**: Exploring design patterns (Strategy, Provider abstraction, domain models) and database schemas.
* **Project scaffolding**: Bootstrapping the Node.js/Express TypeScript backend and React/Vite frontend.
* **Implementation assistance**: Writing boilerplate for Express REST controllers, Prisma repositories, and React UI components.
* **Test generation and test auditing**: Drafting unit and integration test cases across domain models, evaluators, and API routes.
* **Debugging**: Troubleshooting runtime failures and model integration issues.
* **Documentation auditing**: Cross-referencing architectural documentation with the actual codebase.
* **Gemini integration**: Implementing the `@google/genai` SDK wrapper and structured JSON parsing.

All AI suggestions, generated code, and diagnostic conclusions were actively reviewed, audited, and verified by the developer before acceptance.

## 2. Planning and Architecture

AI assisted in transforming the assignment requirements into foundational documentation and architectural specifications:
* [PLAN.md](./PLAN.md) (execution roadmap and milestone checklist)
* [RESEARCH_NOTE.md](./RESEARCH_NOTE.md) (technology evaluation and architectural alternatives)
* [DESIGN_NOTE.md](./DESIGN_NOTE.md) (domain model, state machine, evaluator architecture)
* Initial domain model (`Problem`, `Attempt`, `Submission`, `Evaluation`, `CriterionResult`)
* Initial application layout separating presentation, business logic, persistence, and external providers.

Throughout implementation, `PLAN.md` was maintained as the strict source of truth for scope and architectural alignment.

### Concrete Human Correction: Database Selection
* **Initial Proposal**: Early AI-assisted scaffolding proposed SQLite for rapid prototyping.
* **Human Direction**: The developer identified that MySQL was the preferred/required standard for the assignment and explicitly instructed the implementation to target MySQL.
* **Resolution**: The developer directed the Prisma schema to use MySQL, configured environment variables, generated migrations, and verified persistence against a live MySQL instance. This migration was human-directed, not an autonomous AI decision.

## 3. Core Implementation

AI assistance accelerated the concrete implementation of:
* Express REST API endpoints (`/api/problems`, `/api/attempts`, `/api/attempts/:id/submissions`)
* Prisma ORM schema and relational persistence (`AttemptRepository`, `SubmissionRepository`, `EvaluationRepository`)
* Domain entities and state-machine transitions (`SUBMITTED → EVALUATING → COMPLETED / FAILED`)
* [AttemptService](./server/src/services/AttemptService.ts) and [EvaluationService](./server/src/services/EvaluationService.ts)
* Deterministic [RuleBasedEvaluator](./server/src/evaluators/RuleBasedEvaluator.ts)
* React/Vite frontend single-page application with split-pane problem description, submission editor, and structured feedback display
* Automated test suites

The developer reviewed all generated code against `PLAN.md` and `DESIGN_NOTE.md`.

### Concrete Human Correction: RuleBasedEvaluator Scaffolding Overlap
* **Discovery**: During testing and auditing of the `RuleBasedEvaluator`, the developer noticed that the frontend submission template pre-populated markdown headings containing rubric terminology (such as "System Responsibilities", "Entities", and "API & Interface Contracts").
* **Risk**: A blank or low-effort submission containing only boilerplate headings could artificially trigger keyword matches in the rule-based evaluator and pass checks without real learner content.
* **Human Direction & Resolution**: The developer modified the frontend template headings to neutral labels (e.g., "1. Core Requirements & Scope", "2. Class & Object Structure", "3. Interfaces & Contracts"). This ensured the heuristic evaluator evaluates actual learner content rather than UI template boilerplate. This was identified through developer-led verification rather than blindly accepting generated code.

## 4. AI Evaluator and Gemini Integration

AI assistance was used to formulate and implement the evaluation architecture:
* **Strategy Pattern**: Decoupling evaluation execution via the `Evaluator` interface, selectable via `EVALUATOR_MODE` (`rule` vs `ai`).
* **AIEvaluator**: Formulating structured prompts enforcing the 8 assignment rubric criteria (System Responsibilities, Entities, Relationships, Design Patterns, API Contracts, Extensibility, Constraints, Concurrency/Scale).
* **LLMProvider Abstraction**: Decoupling model invocation through an interface, implemented by `GeminiProvider`.
* **GeminiProvider**: Encapsulating the official `@google/genai` SDK with strict JSON output configuration (`responseMimeType: "application/json"`).
* **Output Validation**: Application-side schema validation checking that the model output contains exactly the 8 expected criteria, valid 1–5 integer scores, actionable strengths, and specific feedback.
* **Error Handling**: Graceful error handling that transitions submissions to `FAILED` with an evaluation error record rather than crashing the process.

The evaluator requires exactly the eight rubric criteria defined by the assignment. Correctness is not assumed from the LLM itself; instead, strict application-side validation inspects and validates the returned structure before persisting results to the database.

## 5. Test Isolation and Verification

AI-assisted test generation was followed by rigorous developer-led test auditing and isolation:
* **GeminiProvider Mocking**: In API integration tests (`server/tests/api.test.ts`), `GeminiProvider` is mocked using Vitest (`vi.mock`), returning synthetic evaluation output.
* **AIEvaluator Unit Isolation**: `server/tests/evaluators/AIEvaluator.test.ts` uses an in-memory `MockProvider` implementing `LLMProvider`, completely bypassing external network calls.
* **Zero API Quota Consumption**: Automated test runs make zero network calls to Google Gemini and execute without requiring a `GEMINI_API_KEY`.
* **Determinism**: Test suites execute rapidly and reliably without network dependency or quota exhaustion.

### Test Results
* **24 passing backend tests** across unit, domain, evaluator, and API suites.
* **TypeScript compilation passes** (`npx tsc --noEmit` completes with 0 errors).
* Coverage includes:
  * Problem retrieval and boundary conditions (HTTP 404 for invalid IDs)
  * Attempt creation and retrieval
  * Submission creation and input validation (empty submission rejection, non-existent attempt rejection)
  * Evaluator Strategy selection (`rule` vs `ai`)
  * State-machine lifecycle (`SUBMITTED → EVALUATING → COMPLETED`, `SUBMITTED → EVALUATING → FAILED`) and invalid transition guards
  * Deterministic scoring and boundary conditions in `RuleBasedEvaluator`
  * JSON validation, criterion completeness, score range enforcement, and error paths in `AIEvaluator`

*(Note: Automated tests are executed locally via test runner scripts; no automated CI/CD pipeline is configured.)*

## 6. Human-in-the-Loop Live Verification

Automated isolated testing was deliberately separated from live Gemini integration testing:
* The developer configured and ran the live backend server with `EVALUATOR_MODE=ai`.
* A real submission for Problem 1 (*Parking Lot*) was created through the running application.
* The real `GeminiProvider` invoked the Gemini API.
* Gemini evaluation completed successfully:
  * All 8 criterion results were returned and parsed.
  * Application-side validation verified the structured JSON and 1–5 score boundaries.
  * Results were persisted in MySQL.
  * The frontend displayed the complete rubric breakdown, scores, strengths, and recommendations correctly.

*(No API keys, database credentials, or secrets are exposed or committed.)*

## 7. Debugging and Model Selection

The integration with live Gemini endpoints followed a specific debugging and verification sequence:
* The first live model attempt with `gemini-2.5-flash` failed with an HTTP 404/model availability error.
* A subsequent attempt using `gemini-3.6-flash` returned HTTP 503 due to service demand and capacity constraints.
* During troubleshooting, an AI-generated diagnostic incorrectly concluded that newer Flash models did not support `generateContent`.
* The developer did not accept this conclusion blindly and checked the official Google documentation.
* The official documentation confirmed that `generateContent` was supported for the relevant Gemini Flash models.
* The developer then directed the implementation to use `gemini-3.5-flash`.
* The final real end-to-end integration succeeded: evaluation completed, structured JSON was validated, and the results were persisted and displayed.

This progression highlights the necessity of human verification and critical evaluation of AI output during debugging.

## 8. Documentation Verification

AI-generated documentation was not assumed to reflect the actual implementation. A read-only audit of [DESIGN_NOTE.md](./DESIGN_NOTE.md) against the actual codebase identified several claims that did not match the code:
* **Two-Stage Pipeline Overclaim**: Documentation claimed a sequential pipeline where `RuleBasedEvaluator` runs before `AIEvaluator`. The actual implementation uses a Strategy pattern where `EvaluationService` selects either `RuleBasedEvaluator` or `AIEvaluator` based on `EVALUATOR_MODE`.
* **External Queue Overclaim**: Early drafts described heavyweight external message brokers (Redis/BullMQ/Kafka). In accordance with the 2-day scope boundaries and assignment scale recommendations, the platform implements in-process asynchronous evaluation with client-side polling, avoiding unnecessary distributed complexity.
* **Idempotency Overclaim**: Documentation claimed comprehensive submission idempotency keys not yet present in the codebase.
* **Weakness Summary Overclaim**: Documentation claimed recurring-weakness aggregation across attempts that was not implemented.

`DESIGN_NOTE.md` was updated to accurately describe the current implementation rather than intended or future architecture, validating documentation directly against code.

## 9. Developer Responsibility

AI was used as an effective copilot to accelerate exploration, implementation, testing, and documentation. However, the responsibility boundary remained clear:
* Architectural decisions, requirement compliance, schema migrations, and evaluation boundaries were set by the developer.
* AI suggestions were critically audited, catching and correcting flawed assumptions (such as SQLite usage, template keyword leakage into heuristic evaluation, incorrect API diagnostic conclusions, and aspirational documentation overclaims).
* Final validation, verification against assignment goals, and operational testing remained under developer direction.
