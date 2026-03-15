# Claude Master Prompt — Sumatra Gardens Rebuild (Post-Stitch Freeze)

You are building a fresh implementation of the Sumatra Gardens factory operations system.

## Stack
- Frontend scaffolding: **Svelte**
- Local persistence / demo data layer: **SQLite**

## Source-of-Truth Order
Use this priority order whenever sources conflict:
1. **Product docs (PRD + MVP + MCP + Implementation Plan)**
2. **Process truth and hard rules in this prompt**
3. **Frozen Stitch-12 screens as visual reference only**

Important:
- Stitch-12 is **not** product truth
- do **not** copy wrong wording from Stitch when it conflicts with the docs
- the PDF Stitch screen is **layout reference only**, not content truth
- if a frozen Stitch screen shortens a stage name, the docs win

## Product Summary
Sumatra Gardens is a kratom extraction facility. This application is an internal factory operations system for a **small but growing facility operating at about 100 kg/month**.

This is **not** a generic ERP.
Do not design or drift toward a generic enterprise admin product.

## Primary Product Priorities
- batch traceability
- structured operator data entry
- process-aware dashboard
- solvent/material accounting
- yield and loss tracking
- stage-by-stage cost accumulation
- final cost per kg
- deviations, reviews, and approvals
- TLC in-house and HPLC third-party result tracking
- exportable batch records

## Official Stage Names
Use these exact visible names everywhere with no abbreviations, no alternates, and no shortened visible substitutes:
1. Raw Leaf to Powder
2. Ethanol Extraction
3. Acid/Base Extraction and Partitioning
4. Back Extraction, Precipitation, Drying, and Final Product

## Hard Rules
- do not use old labels like Grinding & Sieving or Drying & Final Product as stage names
- do not use visible S1/S2/S3/S4 for stage identity
- do not use visible Stage 1 / Stage 2 / Stage 3 / Stage 4 where the full official stage names should appear
- do not frame Stage 3 as limonene recovery
- do not rename Stage 3
- do not invent process steps not supported by workflow
- do not assume large-enterprise needs
- do not assume 500 kg batches
- do not let frozen Stitch screens override product truth

## Process Truth
### Stage 3
Stage 3 is Acid/Base Extraction and Partitioning.
It covers acid/base work, partitioning, transfer efficiency, pH control, reagent usage, aqueous vs organic losses, and phase/process losses.

### Limonene
Limonene is a real tracked process material.
- it is the non-polar material used during partitioning
- material in limonene is then back extracted later
- limonene may appear in inventory, costing, stage forms, issue/return/recovery logs, and process-loss accounting
- limonene must not redefine the stage identity

## Frozen Stitch-12 Screens (Visual Reference Only)
Treat these as approved visual direction unless they conflict with product truth:
- operations_dashboard_fixed_charts
- batch_detail_view_final_refinement
- raw_leaf_to_powder_refined
- ethanol_extraction_refined
- 3._acid_base_extraction_and_partitioning_refined
- 4._back_extraction_precipitation_drying_and_final_product_refined
- batch_costing_refined
- machine_operations_refined
- solvent_economics_refined
- inventory_stock_levels_final_refinement
- yield_analytics_final_refinement
- lab_results_final
- pdf_batch_report_final

## Stitch Caution Notes
### Use as visual reference, not truth
- pdf_batch_report_final: layout only; do not reuse its wrong cross-industry content if present
- yield_analytics_final_refinement: normalize any generic KPI wording or shorthand to Sumatra Gardens terminology
- any screen that shortens stage names must be corrected to full official names

## UX Direction
Build a process-first factory operations product.
The best traits to preserve from prior iterations are:
- a visible active batch pipeline on the dashboard
- operational dashboard blocks such as stalled batches and pending approvals
- batch detail as an operational center with next action, stage progress, cost build-up, and activity log
- structured stage forms with calculated result sidebars
- machine views that feel operational, not registry-only
- solvent economics that feel like process accounting
- analytics focused on yield, solvent, cost, and duration
- desktop-first layouts that respect **maximum iPad landscape height discipline**

Avoid these failures from prior iterations:
- generic KPI dashboard without process flow
- inconsistent stage names
- shorthand stage labels in deviations/cards/widgets
- empty locked stage pages
- letting limonene become the name/identity of Stage 3
- awkward truncation of long official stage names
- generic warehouse/logistics framing in inventory
- generic alternate chemistry stage models in analytics

## Architecture Rules
Keep these separated:
- UI components
- domain models
- calculation logic
- validation logic
- data access / SQLite interactions

Do not bury calculation or validation logic directly inside page markup unless trivial.

## Build Order
1. set up project structure, schema, seed data, and constants
2. build app shell and navigation
3. build dashboard
4. build batch queue and batch detail
5. build Stage 1–4 pages
6. build Batch Costing, Solvent Economics, Inventory, Machines, Deviations, Yield & Analytics
7. add batch export and quality-result hooks
8. run a full terminology and product-truth verification pass

## Working Style
Before implementing each major section:
1. briefly restate what you are building
2. list the files/components you will change
3. implement narrowly and preserve good existing work if present
4. after each major milestone, verify terminology and stage naming

## Verification Checklist
Before considering a pass complete, confirm:
1. Are the exact official stage names used everywhere?
2. Is the dashboard clearly process-first with the 4-stage pipeline?
3. Does batch detail function as the operational center of a batch?
4. Do stage pages show structure even when locked?
5. Is limonene treated as a tracked material without redefining Stage 3?
6. Do inventory, costing, solvent accounting, analytics, and lab pages reflect product truth?
7. Is the app still grounded in a small facility rather than a generic ERP?
8. Were any wrong labels inherited from Stitch instead of corrected?
