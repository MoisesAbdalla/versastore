<!--
Sync Impact Report
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: N/A (first fill of template placeholders)
Added sections:
  - I. Code Quality & Maintainability
  - II. Testing Standards
  - III. User Experience Consistency
  - IV. Performance Requirements
  - Technology & Design Constraints
  - Development Workflow & Quality Gates
  - Governance
Removed sections: none
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes required (Constitution Check section already reads from this file dynamically)
  - .specify/templates/spec-template.md ✅ no changes required (principle-agnostic)
  - .specify/templates/tasks-template.md ✅ no changes required (Polish phase already covers perf/tests/docs)
  - .specify/templates/checklist-template.md ✅ no changes required
Follow-up TODOs:
  - TODO(BACKEND_STACK): backend/ is currently empty aside from a root venv/, implying a Python
    service is planned but no framework has been chosen yet. Confirm framework (FastAPI/Flask/etc.)
    and update Technology & Design Constraints once decided.
-->

# Versa Store Constitution

## Core Principles

### I. Code Quality & Maintainability

Code MUST be readable, consistent, and reviewed before it merges. Concretely:

- All frontend code MUST pass `oxlint` (`npm run lint` in `frontend/`) with zero errors before
  merge; warnings MUST be justified in the PR description or fixed.
- Functions and components MUST be small and single-purpose; if a React component mixes data
  fetching, business logic, and presentation, it MUST be split (e.g., hook + presentational
  component) before merge.
- No dead code, commented-out blocks, or unused exports MUST be committed. Delete rather than
  disable.
- Naming MUST reflect domain vocabulary already used in the codebase (`Product`, `Order`, `Cart`,
  `User`, matching `docs/design-system.md` and existing Firebase collections) rather than inventing
  parallel terms.
- Every non-trivial change MUST go through code review (self-review is insufficient); reviewers
  MUST verify the change against this constitution, not just "does it run."

**Rationale**: Versa Store is a small team moving fast on an e-commerce product; without an
enforced quality bar, ad hoc scripts and one-off components accumulate into an unmaintainable
frontend and an unpredictable backend before either has stabilized.

### II. Testing Standards

Automated tests are the primary safety net for a store handling orders, payments status, and
inventory, so they are NON-NEGOTIABLE for logic that touches money, stock, or auth:

- Any function or endpoint that changes order state, payment status, or stock levels MUST have
  automated test coverage before it is considered done. No such logic ships untested.
- Frontend: component and hook tests MUST use Vitest + React Testing Library (to be added under
  `frontend/`); backend: tests MUST use `pytest` once the backend framework is established.
- Bug fixes MUST include a regression test that fails without the fix and passes with it.
- Tests MUST be deterministic (no reliance on live Firebase/network state); external services
  (Firebase, payment providers) MUST be mocked or run against emulators in CI.
- Test coverage is not a numeric target to game — the bar is "every user-facing bug class in this
  principle's scope has a test that would have caught it," not a percentage.

**Rationale**: The cost of a silent bug in checkout, stock, or auth flows (lost orders, overselling,
account takeover) is far higher than the cost of writing the test, and manual QA does not scale as
the catalog and team grow.

### III. User Experience Consistency

The storefront and admin surfaces MUST feel like one product, not a patchwork of screens:

- All UI MUST use the tokens defined in `docs/design-system.md` (primary `#1E3A8A`, secondary
  `#F97316`, success `#22C55E`, error `#EF4444`, 12px border radius, the defined spacing scale, and
  Poppins as the base font) via the MUI theme — hardcoded colors, spacing, or fonts outside the
  theme MUST NOT be introduced.
- Interactive components (buttons, inputs, cards) MUST reuse the shared variants (Primary,
  Secondary, Outlined, Danger, Success for buttons; the defined Product/Category/Order/User card
  patterns) rather than one-off styled elements.
- Every user-facing action that can fail or take time (add to cart, checkout, login) MUST show
  explicit loading, success, and error states — silent failures or unstyled browser defaults are
  not acceptable.
- New screens or components that deviate from `docs/design-system.md` MUST update that document in
  the same PR, so the design system stays the single source of truth instead of drifting from the
  implementation.

**Rationale**: Inconsistent UI erodes the "confiança, tecnologia, elegância" identity the design
system is built to convey, and directly increases cart abandonment on a storefront.

### IV. Performance Requirements

User-facing performance is a feature, not an afterthought, especially for storefront pages that
drive conversion:

- Storefront pages (home, category, product, cart, checkout) MUST reach interactive state in under
  3 seconds on a throttled "Fast 3G"/mid-tier mobile profile; regressions against this budget MUST
  block merge unless explicitly justified in the PR.
- Firebase/API reads MUST be scoped and paginated — unbounded collection reads or N+1 query
  patterns (e.g., fetching each product individually in a loop) MUST NOT be introduced.
- Route-level code splitting (`React.lazy`/dynamic import) MUST be used for non-critical routes
  (admin, account settings) so the initial storefront bundle stays lean.
- Expensive client-side computation (filtering/sorting large product lists, image processing) MUST
  be memoized or moved off the main render path; components MUST avoid unnecessary re-renders
  (stable keys, memoized callbacks/selectors) once profiling shows a measurable cost.
- Any change suspected of impacting performance MUST be checked with the Vite build/bundle output
  and, for perceptible interactions, browser profiling — "it feels fine" is not sufficient evidence
  for a contested change.

**Rationale**: Store conversion is directly sensitive to load and interaction latency; performance
debt is expensive to retrofit once catalog size and traffic grow, so budgets are enforced from the
start.

## Technology & Design Constraints

- Frontend: React 19 + Vite, MUI (`@mui/material`, `@mui/icons-material`, `@mui/lab`) with Emotion
  for styling, `react-router-dom` for routing, `axios` for HTTP calls, Firebase SDK for
  auth/data/storage as applicable.
- Design source of truth: `docs/design-system.md`. Any visual change MUST be traceable to (or
  update) that document.
- Backend: a Python service is planned (root `venv/` present) but the framework is not yet chosen —
  see the Sync Impact Report TODO. Until a framework is selected, no backend code MUST assume a
  specific web framework's conventions.
- Linting: `oxlint` is the enforced linter for `frontend/`; its ruleset MUST NOT be weakened to
  silence violations without a documented reason.

## Development Workflow & Quality Gates

- Every PR MUST pass lint and the full automated test suite before merge; a red pipeline MUST NOT
  be merged around.
- Every PR touching UI MUST include a screenshot or short clip of the affected screen(s) in both
  its default and error/loading states where applicable.
- Every PR touching order/payment/stock logic MUST call out, in the PR description, which tests
  cover the new behavior.
- Reviewers MUST check new/changed code against all four Core Principles above, not only
  correctness; a PR that is correct but violates a principle (e.g., hardcoded colors, missing
  regression test) MUST be revised before merge, not merged with a follow-up TODO.

## Governance

This constitution supersedes ad hoc conventions and prior undocumented practice. Where this
document and existing code disagree, new/changed code MUST follow this document; existing
violations MUST be tracked and are not grandfathered in for the file being touched.

**Amendment procedure**: Amendments are proposed via PR to this file, MUST include a Sync Impact
Report (as an HTML comment at the top of the file, per the template's convention) describing what
changed and why, and MUST update any dependent template (`plan-template.md`, `spec-template.md`,
`tasks-template.md`, `checklist-template.md`) that references a changed principle. Amendments
require review and explicit approval before merge — no self-merging constitution changes.

**Versioning policy**: Semantic versioning applies to this document —
MAJOR for backward-incompatible governance/principle removals or redefinitions, MINOR for new
principles or materially expanded guidance, PATCH for wording/clarification fixes with no
normative change.

**Compliance review**: The Development Workflow & Quality Gates section above is the enforcement
mechanism for this constitution; PR review is the compliance checkpoint. Any exception MUST be
documented inline in the PR (what principle, why it doesn't apply, what the follow-up plan is)
rather than silently ignored.

**Version**: 1.0.0 | **Ratified**: 2026-07-09 | **Last Amended**: 2026-07-09
