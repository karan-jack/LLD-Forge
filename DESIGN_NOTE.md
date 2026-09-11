# Design Note — LLD Practice Platform

## 1. Overview

The LLD Practice Platform is a focused MVP that helps learners practice Low-Level Design problems, submit their designs, receive explainable feedback, and review previous attempts.

The core practice loop is:

**Choose Problem → Start Attempt → Design → Submit → Evaluate → Review Feedback → Try Again**

The platform is intentionally designed as a simple monolith. The goal is to demonstrate strong domain modelling, clear responsibilities, extensibility, and a useful evaluation approach rather than solve large-scale infrastructure problems.

### MVP Problems

The initial problem bank contains four LLD problems:

1. Parking Lot
2. Vending Machine
3. Elevator System
4. Rate Limiter

---

## 2. MVP Scope

### Learner experience

A learner can:

1. Browse the available LLD problems.
2. Open a problem and read its requirements.
3. Start an attempt.
4. Submit a structured text-based design.
5. See the submission's evaluation status.
6. Receive rubric-based feedback.
7. Review previous attempts.

### Submission format

The MVP uses a **structured text design write-up** rather than code or diagrams.

A submission is expected to communicate the learner's understanding of the problem through sections such as:

* Requirements / assumptions
* Classes and responsibilities
* Relationships
* Interfaces / abstractions
* Design patterns, where applicable
* Important flows or behaviour
* Edge cases
* Design trade-offs

#### Why text instead of code or diagrams?

LLD can be expressed through code, diagrams, or written design. Supporting all formats would add significant implementation complexity without improving the core practice loop enough for a two-day MVP.

Structured text provides enough evidence to evaluate:

* requirement understanding
* responsibilities
* coupling and cohesion
* abstraction
* extensibility
* edge cases
* reasoning and trade-offs

It also allows the evaluation pipeline to remain simple and consistent.

The domain model deliberately keeps `Submission` abstract so that other formats, such as diagrams, can be introduced later without redesigning the practice flow.

---

## 3. Architecture

The application uses a layered monolithic architecture.

```text
                    ┌───────────────────┐
                    │    React + Vite   │
                    └─────────┬─────────┘
                              │
                            REST
                              │
                    ┌─────────▼─────────┐
                    │   Express API     │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Application Layer │
                    │                   │
                    │ AttemptService    │
                    │ EvaluationService │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Domain Layer    │
                    │                   │
                    │ Problem           │
                    │ Attempt           │
                    │ Submission        │
                    │ Evaluation        │
                    │ Rubric            │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼────────────────┐
              │                                │
      ┌───────▼────────┐              ┌────────▼────────┐
      │ Rule Validator │              │    Evaluator     │
      │                │              │                  │
      │ structure      │              │ AIEvaluator      │
      │ required fields│              │ HumanEvaluator*  │
      └────────────────┘              └────────┬─────────┘
                                               │
                                        ┌──────▼───────┐
                                        │ LLMProvider  │
                                        │              │
                                        │ Gemini       │
                                        └──────────────┘

                              * Future
```

### Layer responsibilities

#### Presentation layer

**React + Vite**

Responsible for:

* displaying problems
* collecting learner submissions
* displaying evaluation status
* showing feedback
* displaying attempt history

The frontend does not contain core evaluation or submission-state business rules.

#### API layer

**Express**

Responsible for:

* HTTP request handling
* input validation at the API boundary
* invoking application services
* returning appropriate responses

#### Application layer

The application layer coordinates use cases without owning the detailed domain rules.

Important services include:

* `AttemptService`
* `EvaluationService`

`AttemptService` handles starting attempts and retrieving attempt history.

`EvaluationService` coordinates the evaluation lifecycle and evaluator selection.

#### Domain layer

The domain layer contains the important concepts and behaviours of the product:

* `Problem`
* `Attempt`
* `Submission`
* `TextSubmission`
* `Evaluation`
* `CriterionResult`
* `Rubric`
* `Criterion`
* `Evaluator`

This is the most important layer from an LLD perspective.

#### Infrastructure

Persistence is handled using MySQL through Prisma.

The Gemini implementation is isolated behind an `LLMProvider` abstraction so that the domain/application logic does not depend directly on a particular AI SDK.

---

# 4. Domain Model

## 4.1 Problem

A `Problem` represents an LLD challenge that a learner can attempt.

### Responsibilities

* Identify the problem.
* Provide the problem description.
* Provide requirements and constraints.
* Define difficulty.
* Act as the context against which a submission is evaluated.

### Example

```text
Problem
- id
- title
- description
- requirements
- difficulty
```

A problem does not evaluate submissions itself.

---

## 4.2 Attempt

An `Attempt` represents a learner's practice session for a particular problem.

### Responsibilities

* Associate a learner with a `Problem`.
* Keep the learner's submissions for that problem.
* Provide the historical context of the practice session.

```text
Attempt
- id
- problem
- learnerName
- createdAt
- submissions
```

An `Attempt` does not perform evaluation. Evaluation is a separate responsibility handled by the evaluation flow.

This keeps the practice model independent from how feedback is generated.

---

## 4.3 Submission

`Submission` represents a learner's submitted design.

It is intentionally an **abstract submission concept** rather than tying the domain directly to text.

```text
Submission
- id
- attempt
- content / submission data
- status
- createdAt
- updatedAt
```

The MVP provides:

```text
TextSubmission extends Submission
```

A text submission contains the learner's structured design write-up.

The submission owns its lifecycle state because evaluation happens after submission and may succeed or fail independently of the learner's original submission.

---

## 4.4 Submission Status

A submission follows an explicit state machine:

```text
SUBMITTED
    │
    ▼
EVALUATING
   / \
  /   \
 ▼     ▼
COMPLETED  FAILED
```

### Valid transitions

```text
SUBMITTED → EVALUATING
EVALUATING → COMPLETED
EVALUATING → FAILED
```

The application does not allow arbitrary state changes.

For example:

* `COMPLETED → EVALUATING` is not a normal valid transition.
* `FAILED → COMPLETED` does not happen directly.
* A retry creates a controlled new evaluation attempt rather than silently corrupting the existing result.

### Why model the state explicitly?

AI evaluation may take time or fail due to:

* rate limits
* timeout
* unavailable provider
* malformed model output
* temporary infrastructure errors

The learner should therefore be able to see whether their submission is still being evaluated or whether evaluation failed.

Most importantly, the submission is **persisted before evaluation starts**. The learner's work is therefore not lost if the evaluator fails.

---

# 5. Evaluation Model

## 5.1 Evaluator

`Evaluator` is an interface representing an evaluation strategy.

```text
Evaluator
+ evaluate(problem, submission, rubric)
    → EvaluationResult
```

The MVP has two evaluation components:

```text
Evaluator
├── RuleBasedEvaluator
└── AIEvaluator
```

The application selects either the rule-based evaluator or the AI evaluator based on configuration (`EVALUATOR_MODE`). They act as alternative strategies rather than a sequential pipeline for the MVP. A two-stage pipeline could be implemented as a future extension.

### Why an interface?

Evaluation is one of the areas most likely to change.

Today:

* deterministic validation
* Gemini-based evaluation

Future possibilities include:

* another LLM
* human review
* a stricter domain-specific evaluator
* code analysis
* organization-specific evaluation

The practice flow should not need to know which evaluator is being used.

---

# 6. Strategy Pattern

The `Evaluator` abstraction uses the **Strategy design pattern**.

```text
                    ┌─────────────────┐
                    │    Evaluator    │
                    │    interface    │
                    └────────┬────────┘
                             │
               ┌─────────────┴──────────────┐
               │                            │
     ┌─────────▼─────────┐        ┌─────────▼────────┐
     │ RuleBasedEvaluator│        │   AIEvaluator     │
     └───────────────────┘        └─────────┬────────┘
                                           │
                                    ┌──────▼──────┐
                                    │ LLMProvider │
                                    └─────────────┘
```

`EvaluationService` depends on the `Evaluator` abstraction rather than directly depending on Gemini.

This means a new evaluator can be introduced by implementing the interface rather than rewriting the practice flow.

For example:

```text
Evaluator
├── RuleBasedEvaluator
├── AIEvaluator
├── HumanEvaluator       ← future
└── AlternativeAIEvaluator ← future
```

This directly addresses **Change Test B** from the assignment.

---

# 7. Rule-Based Evaluation

The deterministic evaluator performs inexpensive checks to validate the submission.

It checks things such as:

* required sections are present
* submission is not empty
* submission meets the minimum useful length
* basic submission structure is valid

The rule-based evaluator is deliberately limited.

It does **not** attempt to decide whether the learner's class design is objectively good. That requires contextual judgement.

### Usage as a Strategy

In the MVP, the rule-based evaluator acts as an alternative evaluation strategy (when `EVALUATOR_MODE=rule`) rather than running sequentially before the AI evaluator. This allows testing the core evaluation flow without incurring AI costs or latency.

For example, a submission containing only:

```text
"I would create classes for the parking lot."
```

would fail rule-based validation, immediately informing the learner that they have not provided enough design evidence.

---

# 8. AI Evaluation

When configured as the active strategy (`EVALUATOR_MODE=ai`), the submission is evaluated by `AIEvaluator`.

The MVP uses Gemini through an `LLMProvider`.

The AI is given:

* the problem requirements
* the learner's submission
* the fixed evaluation rubric
* strict structured-output instructions

The AI is **not** asked:

> "Is this a good design?"

and it is not asked to produce only a single score.

Instead, it evaluates each defined criterion independently.

---

# 9. Evaluation Rubric

The fixed MVP rubric contains eight dimensions:

1. **Requirement understanding**
2. **Class responsibilities**
3. **Coupling / cohesion**
4. **Encapsulation and interfaces**
5. **Appropriate use of abstraction / patterns**
6. **Extensibility**
7. **Edge cases and testability**
8. **Quality of explanation**

Each criterion produces:

```text
Criterion
→ score
→ evidence
→ concern
→ suggestion
→ confidence
```

### Why this structure?

LLD does not have one universally correct implementation.

Two learners might use different class structures while both producing reasonable designs.

Therefore, the evaluation should focus on **design qualities and evidence**, rather than comparing the learner against one reference implementation.

For example:

```text
Criterion:
Class responsibilities

Score:
4 / 5

Evidence:
The submission separates parking allocation from payment handling.

Concern:
The parking spot selection logic is still coupled to the parking lot service.

Suggestion:
Introduce a parking allocation strategy so different allocation policies can be substituted.
```

This makes feedback actionable instead of merely telling the learner that their design received a score.

---

# 10. Evaluation and Persistence

An `Evaluation` represents the result of evaluating one submission.

```text
Evaluation
- id
- submission
- evaluatorType
- createdAt
- criterionResults
```

Each evaluation contains multiple `CriterionResult` objects.

```text
CriterionResult
- criterion
- score
- evidence
- concern
- suggestion
- confidence
```

This structure allows the feedback UI to display each design dimension separately.

It also allows future analytics, such as identifying a learner's recurring weaknesses.

---

# 11. Rubric as a Domain Concept

The rubric is represented independently rather than embedding evaluation criteria directly into an evaluator.

```text
Rubric
 └── Criterion[]
```

This separation means that evaluators consume the same conceptual rubric.

For example:

```text
RuleBasedEvaluator → Rubric
AIEvaluator        → Rubric
HumanEvaluator     → Rubric (future)
```

The rubric therefore defines **what should be evaluated**, while an evaluator defines **how it is evaluated**.

This is an important separation of responsibilities.

---

# 12. End-to-End Practice Flow

## Step 1 — Choose a problem

The learner sees the four available problems:

* Parking Lot
* Vending Machine
* Elevator System
* Rate Limiter

The learner opens a problem to see its requirements and context.

## Step 2 — Start an attempt

The learner provides a simple identifier/name and starts an attempt.

No authentication system is required for the MVP.

This avoids spending development time on login/session infrastructure that does not improve the core practice loop.

## Step 3 — Submit design

The learner submits a structured text design.

The server immediately persists the submission with:

```text
status = SUBMITTED
```

The submission is therefore stored before any external evaluation takes place.

## Step 4 — Begin evaluation

The application transitions the submission to:

```text
EVALUATING
```

Evaluation is performed synchronously within the same HTTP request. The application invokes the selected evaluator strategy (`RuleBasedEvaluator` or `AIEvaluator`).

## Step 5 — Evaluation processing

If `EVALUATOR_MODE=ai`, the `AIEvaluator` sends the problem requirements and submission to Gemini using the fixed rubric.

If `EVALUATOR_MODE=rule`, the `RuleBasedEvaluator` performs deterministic structural validation instead.

## Step 6 — Successful evaluation

On valid output:

```text
EVALUATING → COMPLETED
```

The evaluation and its criterion results are persisted.

## Step 7 — Evaluation failure

If the evaluator fails (e.g., due to rate limiting, timeout, malformed JSON, or rule validation failure):

```text
EVALUATING → FAILED
```

The original submission remains stored.

The learner can retry evaluation rather than losing their work.

## Step 8 — Request completion

The HTTP request completes, returning the fully evaluated submission back to the client. No status polling is required.

## Step 9 — Review

The learner sees criterion-by-criterion feedback containing:

* score
* evidence
* concern
* suggestion
* confidence

## Step 10 — Try again

The learner can return to the problem and create another submission.

Previous attempts remain available so the learner can compare progress.

---

# 13. Attempt History

History allows the learner to view their past submissions and see feedback for previous attempts.

```text
Recent attempts

Parking Lot
Class responsibilities: 4/5
Coupling/cohesion:      2/5
Extensibility:          3/5
```

Currently, the API returns the raw attempt history along with the latest evaluation criteria.

*(Future Extension: Aggregating criterion results across recent attempts to identify and surface recurring weaknesses, such as identifying the lowest-scoring criterion across the learner's recent completed evaluations. This is NOT IMPLEMENTED in the current MVP).*

---

# 14. Change Test A — Text to Class Diagram

### Requirement

Today the learner submits text.

Tomorrow the platform supports a class diagram.

### Design response

The core domain does not model an attempt as specifically containing text.

Instead:

```text
Submission
    │
    └── TextSubmission
```

A future implementation can introduce:

```text
Submission
    ├── TextSubmission
    └── DiagramSubmission
```

`Attempt` continues to work with the abstract `Submission`.

The evaluation flow can continue to operate on the submission abstraction, while evaluators can decide how to interpret the specific submission format.

Therefore, adding diagram submissions would primarily require:

1. a new `DiagramSubmission` implementation in the domain model
2. diagram-specific input/storage handling
3. evaluator support for diagram evidence

It should **not require rewriting the core practice flow or `Attempt` model**.

### Practical Architectural Trade-off (Domain Abstraction vs. Persistence)

To maintain good engineering judgement in a 2-day assignment, it is important to be candid about what changes:
* **Domain & Application Level**: `Submission` is decoupled from text at the interface level (`Submission.ts` vs `TextSubmission.ts`). The `AttemptService`, `EvaluationService`, and practice lifecycle interact with `Submission` and `Attempt` rather than hardcoding text everywhere.
* **Concrete MVP Scope**: In the current MVP, `TextSubmission` is the sole concrete submission type needed to prove the end-to-end learner practice loop.
* **Future Diagram Persistence**: While domain-level changes are isolated, **database schema changes would genuinely be required** to store diagram payloads (e.g., adding diagram storage columns like `diagramUrl`/`diagramData` or introducing a polymorphic table structure in Prisma).
* **Intentional MVP Decision**: We deliberately avoided over-engineering a polymorphic database persistence layer for an unbuilt diagram feature in a 2-day hiring assignment. The domain abstraction provides a clean architectural seam without premature database complexity.

---

# 15. Change Test B — One Evaluator to Multiple Evaluators

### Requirement

Today feedback comes from one evaluation approach.

Tomorrow the platform adds rule-based evaluation or human review.

### Design response

The evaluation flow depends on:

```text
Evaluator
```

rather than a concrete evaluator implementation.

Current implementations include:

```text
RuleBasedEvaluator
AIEvaluator
```

A future implementation can be:

```text
HumanEvaluator
```

without rewriting `AttemptService` or the learner's practice flow.

For example:

```text
EvaluationService
       │
       ▼
    Evaluator
       │
 ┌─────┼─────────────┐
 ▼     ▼             ▼
Rule   AI          Human
```

The evaluator can therefore be selected or composed by the application layer.

### Result

Adding a new evaluation approach requires a new strategy implementation and its integration/configuration, rather than changing the core domain behaviour.

This is the primary reason for using the Strategy pattern.

---

# 16. Failure Handling

Evaluation depends partly on an external AI provider, so failure is expected rather than exceptional from a system-design perspective.

The design therefore separates **submission persistence** from **evaluation success**.

The important rule is:

> Persist the learner's submission before starting evaluation.

This prevents the following failure scenario:

```text
Learner submits
      ↓
Gemini called
      ↓
Gemini times out
      ↓
Submission lost
```

Instead:

```text
Learner submits
      ↓
Submission persisted
      ↓
SUBMITTED
      ↓
EVALUATING
      ↓
Gemini fails
      ↓
FAILED
      ↓
Learner retries
```

This is sufficient for the scale of the assignment and avoids introducing queues, microservices, or distributed infrastructure.

---

# 17. Idempotency (Known Limitation)

In the current MVP, each request to the submit endpoint synchronously creates a brand new submission before evaluating it.

Consequently, if a learner double-clicks the submit button, they will generate multiple distinct submissions, resulting in duplicate evaluation requests to Gemini. The MVP does **not** currently prevent this double-submission behavior.

The existing submission status guard (`if submission.status === 'EVALUATING'`) protects state transitions for an *existing* submission (which would be relevant if an async retry mechanism existed), but it does not prevent duplicate submissions on double-click.

*(Future Extension: Implement a true idempotency mechanism, such as a client-provided idempotency key or a submission lock, to prevent duplicate evaluation requests. This is NOT IMPLEMENTED in the current MVP).*

---

# 18. Persistence Model

The MVP uses MySQL through Prisma.

The main persistence relationships are:

```text
Problem
   │
   └──< Attempt
            │
            └──< Submission
                       │
                       └── Evaluation
                              │
                              └──< CriterionResult
```

This maps closely to the domain model and keeps the persistence structure understandable.

Prisma's schema also acts as a readable representation of the persisted domain relationships.

---

# 19. API Responsibilities

The backend exposes a small REST API.

| Method | Endpoint                        | Responsibility                               |
| ------ | ------------------------------- | -------------------------------------------- |
| GET    | `/api/problems`                 | List available problems                      |
| GET    | `/api/problems/:id`             | Get problem details                          |
| POST   | `/api/attempts`                 | Start an attempt                             |
| POST   | `/api/attempts/:id/submissions` | Create a submission and begin evaluation     |
| GET    | `/api/submissions/:id`          | Get submission status and feedback           |
| GET    | `/api/learners/:name/attempts`  | Get attempt history                          |

The API is intentionally small and maps directly to the learner journey.

---

# 20. Key Design Trade-offs

## Text submission instead of code + diagrams

**Chosen:** Structured text.

**Reason:** It gives enough evidence for evaluating LLD reasoning while keeping the MVP achievable in two days.

**Trade-off:** The platform cannot directly inspect executable code or visual class relationships.

**Future:** Add specialized submission types without changing the core `Attempt` model.

---

## No authentication

**Chosen:** Simple learner name/identifier.

**Reason:** Authentication does not contribute meaningfully to the core LLD practice loop for this prototype.

**Trade-off:** Identity and access control are intentionally simplified.

---

## Monolith instead of microservices

**Chosen:** React frontend + Express backend + MySQL.

**Reason:** The assignment explicitly prioritizes LLD/domain design over HLD. A monolith reduces operational complexity and development time.

**Trade-off:** The architecture is not independently scalable per component.

For a future larger system, the evaluation worker would be the most natural component to separate first because AI evaluation is slower and externally dependent.

---

## Synchronous evaluation without background workers

The submission is stored and evaluated synchronously within the same HTTP request. The API blocks until evaluation succeeds or fails.

**Reason:** Implementing asynchronous evaluation would require a distributed job-processing system and frontend polling, which adds significant architectural complexity.

**Trade-off:** The MVP avoids complex infrastructure (queues, background workers) and polling logic, making it easier to build in two days. However, the HTTP request duration is longer, especially when waiting for the Gemini API.

---

## Configurable Evaluator Strategies

**Chosen:** Alternative evaluation strategies toggled via configuration (`EVALUATOR_MODE`).

```text
RuleBasedEvaluator  OR  AIEvaluator
```

**Reason:** Deterministic checks are cheap and predictable for testing the pipeline, while AI is required for actual reasoning about responsibilities, abstraction, trade-offs, and extensibility.

**Trade-off:** The MVP does not use a two-stage pipeline where rule-based validation acts as an explicit gate before AI evaluation. A submission evaluated by `AIEvaluator` goes directly to Gemini, incurring external dependency, latency, and quota limits even if structurally poor.

---

# 21. AI Evaluation Consistency

LLD evaluation is inherently subjective, so the MVP does not attempt to eliminate judgement.

Instead, it makes the judgement more structured by providing the AI with:

* fixed problem requirements
* fixed rubric
* fixed output schema
* evidence requirement
* confidence score

The AI must produce:

```text
criterion
score
evidence
concern
suggestion
confidence
```

This makes feedback easier to inspect, compare, and store than an unconstrained response.

The platform therefore treats AI as an evaluator within a defined product contract rather than as the product's entire source of truth.

---

# 22. Extensibility

The design deliberately isolates the areas most likely to change.

### Submission format

```text
Submission
├── TextSubmission
└── DiagramSubmission     ← future
```

### Evaluation strategy

```text
Evaluator
├── RuleBasedEvaluator
├── AIEvaluator
└── HumanEvaluator        ← future
```

### LLM provider

```text
LLMProvider
└── GeminiProvider
```

A different model/provider can be introduced behind `LLMProvider` without coupling the rest of the application to Gemini-specific code.

This gives the MVP useful extension points without creating unnecessary abstractions elsewhere.

---

# 23. What Is Intentionally Not Built

The MVP intentionally excludes:

* user authentication and authorization
* code execution/submission
* diagram editor
* live collaborative editing
* peer-to-peer interviews
* Kubernetes/microservices
* distributed queues
* multi-region infrastructure
* advanced analytics
* large-scale LMS functionality

These are not omitted because they are unimportant products. They are omitted because they do not improve the core practice loop enough to justify their complexity within a two-day assignment.

The architecture leaves reasonable extension points for some of them without implementing them prematurely.

---

# 24. Testing Strategy

The tests focus on domain behaviour and failure cases rather than only testing HTTP endpoints.

Important behaviours include:

### Submission lifecycle

```text
SUBMITTED → EVALUATING → COMPLETED
```

when evaluation succeeds.

### Evaluation failure

```text
SUBMITTED → EVALUATING → FAILED
```

when the evaluator fails.

### Rule validation

When configured, a rule-based evaluation rejects submissions missing required sections or with insufficient length.

### Idempotency

A submission already being evaluated must not start another concurrent evaluation.

### AI evaluator

The Gemini call is mocked during tests so the test suite does not depend on live API availability or quota.

### End-to-end flow

At least one test covers:

```text
Create attempt
    ↓
Submit design & Evaluate (Synchronous)
    ↓
Receive feedback
```

This combination verifies both domain behaviour and the core learner journey.

---

# 25. Summary of Design Principles

The design follows a small number of deliberate principles:

1. **Model the learner's practice journey explicitly.**
2. **Keep the domain independent of the frontend and AI provider.**
3. **Use abstractions only where meaningful variation is expected.**
4. **Treat evaluation as a strategy rather than hard-coding one evaluator.**
5. **Treat submission lifecycle as an explicit state machine.**
6. **Persist learner work before external evaluation.**
7. **Separate deterministic validation from subjective AI judgement via strategies.**
8. **Provide evidence-linked feedback rather than one overall score.**
9. **Prefer a simple monolith over unnecessary infrastructure.**

The central design decision is that the platform should not determine whether a learner has reproduced one "correct" LLD solution. Instead, it evaluates the learner's design across explicit dimensions and provides evidence-based suggestions for improvement.

That supports the intended learning loop:

**Practice → Feedback → Identify weakness → Improve → Try again.**
