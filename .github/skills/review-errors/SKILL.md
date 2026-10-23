---
name: review-errors
description: 'Review and fix coding errors, diagnostics, lint failures, and runtime issues. Use when the project has build errors, test failures, editor warnings, Python exceptions, TypeScript issues, or runtime regressions that need root-cause investigation and verification.'
argument-hint: 'Review the current errors in this project and fix the failing path.'
user-invocable: true
---

# Review Errors

## When to Use
- Editor diagnostics or compiler errors appear in the workspace
- A build, lint, or test command fails
- Runtime exceptions or broken behavior need investigation
- A bug report points to a failing feature or stack trace

## Procedure

1. Capture the exact evidence
   - Read the full error message, stack trace, file, and line number
   - Note which command or action triggered it
   - Separate symptoms from the actual root cause

2. Narrow the affected scope
   - Identify the subsystem involved: frontend, backend, database, test, or config
   - Check the smallest relevant file or call path first
   - Avoid broad cleanup until the root cause is understood

3. Trace the root cause
   - Inspect the failing code and nearby call sites
   - Validate assumptions against real inputs, config, and dependencies
   - If the issue is ambiguous, reproduce it or check the relevant logs before changing code

4. Apply the minimal valid fix
   - Change only the code necessary to correct the root cause
   - Keep behavior and compatibility in mind for surrounding code
   - Prefer a precise fix over a broad refactor

5. Verify with the smallest relevant check
   - Run the narrowest command that checks the changed behavior
   - Prefer the exact failing test, lint target, or runtime path over a full suite
   - Confirm the error is resolved with fresh evidence

6. Record the outcome
   - Summarize what failed, why it failed, and what was changed
   - Include any remaining risks or follow-up actions if complete verification was not possible

## Completion Criteria
- The root cause is identified and explained
- The fix addresses the actual failure mode, not just the symptom
- Relevant validation passes with evidence
- No unrelated code is modified without reason
- Remaining issues are clearly documented if they are out of scope

## Good Review Habits
- Prefer the failing stack trace or diagnostic as the source of truth
- Check recent changes or config drift before guessing at a fix
- For ambiguous problems, reproduce the issue in a controlled way before patching
- Validate end-to-end behavior after the fix, not only syntax

## Example Prompts
- Review the current project errors and fix the failing frontend import
- Investigate the backend test failure and identify the root cause
- Check the lint and TypeScript errors in the changed files and resolve them
- Trace the runtime exception and fix the underlying issue with minimal change

## Related Customizations
- Create a lint-focused skill for frontend or Python quality checks
- Create a test-debugging skill for reproducing and isolating failing tests
- Create a project-specific instruction file for environment and validation commands
