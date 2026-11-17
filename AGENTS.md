# Repository work instructions

## Town maps (Kussoon / SVG)

**MANDATORY before reading or changing any town-map code, UI, quiz, label, source data or tests:**
1. Read the full authoritative specification: `v2/docs/town-map/TOWN_MAP_MASTER_SPEC.md` (ID `TOWNMAP-SSOT-001`).
2. Check current `main`, existing accepted implementations, relevant older PRs and regression tests for the same issue. Do **not** discard previously accepted changes by copying an older pilot or recreating the app.
3. In the PR description include the exact marker `Town-map spec: TOWNMAP-SSOT-001`, impacted `R-TOWN-` rules, prior fixes checked, intentional differences, and test evidence.
4. For changes in behavior, build an isolated comparison and get acceptance before changing formal pages. Run the affected regression suite. For bug fixes, add a reproducing regression test. Update the master specification/change log only when a normative behavior changes.
5. Do not replace/delete old formal URLs or silently migrate navigation. Use SVG as the common implementation for future town maps; old Leaflet/C versions are historical references only.

The master specification is the **only normative source**. Prior specs, draft PRs and chat summaries are history, not an alternate source of truth. If something is uncertain, record it as unverified rather than improvise.
