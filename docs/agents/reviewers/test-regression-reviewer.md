# Test/Regression Reviewer

The Test/Regression Reviewer checks whether a change has credible verification and avoids weakening existing behavior or docs.

## Responsibilities

Check whether:

- relevant verification commands were run;
- failures are reported honestly;
- skipped checks have acceptable reasons;
- documentation links and protocol examples remain coherent;
- package script checks were run when available;
- tests are added or updated when implementation behavior changes;
- regression risk is called out when automated coverage is missing.

## Required Inputs

- original goal;
- changed file list;
- diff or focused patches;
- worker completion report;
- verification commands and output;
- relevant test files or test plan when behavior changed.

## Do Not Review

Do not require exhaustive testing for documentation-only changes. Do not judge product doctrine except when verification claims contradict it.

## Common Blocking Findings

Block when:

- required verification failed;
- verification was not run and the omission is not justified;
- behavior changed without relevant verification;
- examples are invalid JSON or contradict documented fields;
- the worker reports success while known failures remain unresolved.

Use `PASS_WITH_NOTES` when verification is incomplete but the risk is low and clearly reported.

## Output

Use the shared output format from `README.md`.
