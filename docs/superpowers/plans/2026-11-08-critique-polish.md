# Critique, Ponytail audit and polish

User requested Impeccable critique/polish and Ponytail. Two isolated assessments reviewed design and detector/browser evidence; Ponytail independently traced runtime behavior. Archived baseline: `.impeccable/critique/2026-11-08T06-18-06Z__src-app-tsx.md`, 26/40. User chose a compact mobile layout and Undo after plate replacement.

Preserve Inter Tight, mascot, scarlet/white, cool light palette, actual gentle gradient drift, shadows, four daily rings, restrictions/freshness/privacy, original trained model/data/collector/inference and existing macro allocation arithmetic. No new dependencies or redesign.

## Work

- Block calculator Apply outside the existing profile limit; validate storage writes without overwriting a valid profile with an invalid one. Share the existing limit rather than change model output.
- Keep station selection/filtering consistent after meal changes; distinguish unanswered allergy setup from actual conflicts; show an infeasible explanation instead of an empty successful result.
- Refresh public menu index on visibility return, retaining validated data after refresh failure.
- Focus direct Settings destinations, add contextual recovery buttons, label generated Week meals as suggestions, and provide one-step replacement Undo. Undo must not overwrite later manual edits or restore a plate after restrictions change.
- Compact mobile header, hero context and meal rows while preserving labels, tap targets, ordering and readable inputs. Reconcile the48px field contract with utility overrides.
- Remove the confirmed unused Atkinson package; retain self-hosted Inter Tight and its license.

## Ownership and verification

Target/storage worker owns TargetCalculator, profile-storage and focused tests. Menu worker owns MenuList, DishDialog, planner and focused tests. Data worker owns data hook and new mocked-fetch tests. Parent owns App, Settings, Suggestions, Week, CSS, navigation/Undo tests, manifest cleanup and docs. Workers do not commit.

Use tests-first regression checks for logic and existing Node24 tooling. Final full suite, TypeScript, direct Vite build, built-output secret check, protected-path and whitespace diff. Browser inspect real light/dark populated/blocked flows at desktop and320px, then at most one corrective verification round. Commit coherent steps; do not push until asked. Detector evidence is reused from AssessmentB, not rerun just to erase approved-style advisories.

Completed:197tests in17files, TypeScript, production build, built-output secret check and whitespace check pass. Browser verified direct setup focus, replacement Undo/focus, weekly suggestion wording and compact light/dark320px layout with48px fields. One corrective CSS batch widened the hall select and reduced native select padding so full values remain visible. Protected model/data/collector paths have no changes. No new dependency; one unused font dependency removed. No live deployment, real touch device, full screen-reader run or OS motion emulation was checked.
