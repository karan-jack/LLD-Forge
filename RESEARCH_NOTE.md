# Research Note — LLD Practice Platform

## 1. The learner problem

Practicing Low-Level Design (LLD) is easy to start and hard to self-evaluate. A learner can design a Parking Lot or an Elevator System and still have no reliable way to know whether their responsibilities, abstractions, and trade-offs are actually good — because unlike algorithms, LLD problems rarely have one correct answer. The core question this product needs to answer is: **what does useful, trustworthy feedback look like when more than one valid design exists?**

## 2. Existing approaches researched

| Source | What it offers | Key limitation |
|---|---|---|
| **LeetCode discuss & community GitHub repos** (e.g. `awesome-low-level-design`) | Curated lists of LLD problems (Parking Lot, Elevator, Splitwise) and reference material on OOP/SOLID/design patterns | Pure reading material — no submission mechanism, no feedback, no way to test your own design |
| **HackerRank / "machine coding round" discussions** | Discussions describe a distinct interview format where candidates write a full working app under OOD principles in 90–120 minutes | Candidate discussions note scarce preparation material compared to DSA or high-level system design — a named, real gap |
| **Educative — "Grokking the Low-Level Design Interview Using OOD Principles"** | 215 lessons, 19 mock interviews, worked class/sequence/activity diagrams for 20+ systems in 5 languages | A content-consumption product — you study a model answer rather than submit your own design and get it critiqued |
| **AlgoMaster.io — "Low Level Design Practice"** | Structured problem stages scored by an AI interviewer against a single reference solution, storing stage scores to history | Evaluation is anchored to **one reference solution** and collapses feedback into a **single numeric score per stage** — an anti-pattern for open-ended design |
| **"Low Level Design Mastery"** (independent project) | In-browser playground evaluating code correctness, complexity, and visual relationships | Feedback centers on code correctness and runtime complexity, not on design quality dimensions like coupling, abstraction fit, or extensibility |
| **Pramp / Exponent** | Peer-to-peer 60-minute mock interviews with unstructured end-of-session feedback | Feedback quality depends entirely on peer skill; no persistent rubric, no attempt history, requires scheduling a live partner rather than solo practice |

## 3. Key gaps

1. **No structured, multi-dimensional feedback.** Existing tools either provide no feedback (repos, Educative), collapse results into a single score against one reference answer (AlgoMaster), or rely on variable peer commentary (Pramp). None evaluate across named design dimensions (responsibilities, coupling, abstraction, extensibility) with concrete evidence.
2. **Reference-solution bias.** The closest existing competitor (AlgoMaster) grades against a single correct answer, which fails the core premise of LLD: multiple valid designs can look very different.
3. **No recurring-weakness tracking.** Existing history tools record raw scores rather than tracking which design dimensions a learner repeatedly struggles with across attempts.
4. **Submission format gap.** Existing tools divide between full code implementations or passive theory reading. None provide a structured-text design format optimized for clear rubric evaluation.
5. **No on-demand solo practice with consistent feedback.** Pramp requires scheduling a live peer session; other tools provide static content or single-shot reference scores rather than on-demand/solo practice without requiring a live peer session.

## 4. Product direction

Build a focused practice loop — choose problem → attempt → submit a structured text design → get rubric-based, evidence-linked feedback (not a single AI score against one reference answer) → review → retry. Persist discrete `CriterionResult` records for each attempt, allowing the current history view to show criterion-level feedback and providing the underlying data model for future longitudinal weakness tracking. This directly targets the gap no existing tool fills: consistent, explainable, dimension-by-dimension feedback that treats "more than one valid answer" as the default case rather than an edge case.

## 5. Deterministic vs. AI evaluation

A central architectural question is: *which parts of evaluation should be deterministic, and which parts benefit from an LLM?*

* **Deterministic evaluation** is ideal for objective structural validation: minimum submission length, presence of required sections, and immediate rejection of incomplete inputs. These checks are fast, predictable, reproducible, and zero-cost. However, rule-based heuristics cannot reliably evaluate whether responsibilities are cohesive or abstractions are leaky.
* **LLM evaluation** excels at semantic, judgment-heavy analysis: evaluating responsibility distribution, coupling/cohesion, pattern fit, extensibility trade-offs, edge cases, and explanation clarity. However, unconstrained LLM output is non-deterministic and prone to drift.
* **Engineering trade-off**: The platform treats both approaches as complementary strategies under a common `Evaluator` abstraction. Rather than assuming AI is universally superior or relying on brittle heuristics, the MVP isolates them into selectable strategies via `EVALUATOR_MODE`, pairing AI evaluation with strict application-side schema validation.

## 6. Research → Architecture decisions

| Research finding | Design decision |
|---|---|
| LLD has multiple valid solutions, so single-reference-answer comparison is problematic | `Evaluator` Strategy abstraction evaluates designs through independent rubric criteria rather than reference-answer diffing |
| Existing tools fragment code, diagram, and discussion formats | Abstract `Submission` model with `TextSubmission` as the MVP format, allowing future submission types without changing the core `Attempt` lifecycle |
| Different evaluation concerns require different approaches | Pluggable `Evaluator` Strategy with `RuleBasedEvaluator` and `AIEvaluator` as alternative strategies selected through `EVALUATOR_MODE` |
| LLM feedback can be inconsistent or difficult to consume programmatically | Strict structured JSON contract with exactly 8 rubric criteria, 1–5 scores, evidence, concerns, suggestions, and confidence, validated before persistence |

## Sources

- https://github.com/nikhilkumawat03/awesome-low-level-design
- https://github.com/ashishps1/awesome-low-level-design/wiki
- https://leetcode.com/discuss/interview-question/1181205/how-do-you-prepare-for-machine-coding-rounds/
- https://www.educative.io/courses/grokking-the-low-level-design-interview-using-ood-principles
- https://algomaster.io/interview/low-level-design
- https://peerlist.io/vdsanku/project/lowleveldesign-mastery
- https://igotanoffer.com/en/advice/pramp-alternatives
