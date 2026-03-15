# Sumatra Gardens Factory Operations System — MCP (Post-Stitch Freeze)

## Purpose
This document defines the implementation constraints, component boundaries, and product-truth guardrails for Claude or Opus during a fresh rebuild.

## Stack
- Frontend: **Svelte**
- Persistence: **SQLite**
- Goal: internal factory operations system for a small kratom extraction facility

## Source-of-Truth Order
1. PRD
2. MVP
3. This MCP + Master Prompt + Implementation Plan
4. Frozen Stitch-12 screens as visual reference only

If Stitch conflicts with product truth, the docs win.

## Product Truth Guardrails
### 1. This is not a generic ERP
Do not implement generic enterprise dashboards, generic admin pages, or enterprise planning modules that are disconnected from real process execution.

### 2. Official stage names are locked
Use these exact names everywhere in visible UI:
1. Raw Leaf to Powder
2. Ethanol Extraction
3. Acid/Base Extraction and Partitioning
4. Back Extraction, Precipitation, Drying, and Final Product

### 3. Stage 3 must not be reframed
Do not describe Stage 3 as limonene recovery.
Stage 3 remains Acid/Base Extraction and Partitioning.

### 4. Limonene is real, but subordinate to process truth
Limonene is a real tracked process material.
It can appear in:
- inventory
- costing
- process accounting
- stage material inputs/outputs
- loss accounting
- stage 3 partitioning context
- stage 4 back extraction context

But it must not replace the stage identity.

### 5. Small facility assumptions only
Design for approximately 100 kg/month.
Do not assume a large team, massive throughput, or enterprise complexity.

### 6. No invented process steps
Only implement process steps that match the actual workflow and docs.

### 7. Frozen Stitch screens are visual only
Use frozen Stitch-12 screens for:
- composition
- visual hierarchy
- card/table/form direction
- page layout ideas

Do not reuse:
- shortened stage names
- wrong alternate process models
- wrong PDF content
- generic cross-industry wording

## Architecture Rules
Separate these concerns cleanly:
- **UI components**: pages, cards, tables, forms, widgets
- **domain models**: batches, stages, materials, deviations, machines, etc.
- **calculation logic**: yield, recovery, loss, cost, cost/kg, balances
- **validation logic**: required fields, finalization checks, stage gating
- **data access**: SQLite schema, seed data, repositories/services

## Suggested Folder Structure
```text
src/
  lib/
    components/
      dashboard/
      batches/
      stages/
      costing/
      inventory/
      machines/
      deviations/
      analytics/
      solvent/
      lab/
      export/
    domain/
      batches/
      stages/
      materials/
      machines/
      deviations/
      lab/
      costing/
    calculations/
      yield.ts
      solvent.ts
      costing.ts
      balances.ts
    validation/
      batch.ts
      stage1.ts
      stage2.ts
      stage3.ts
      stage4.ts
    data/
      schema.ts
      seed.ts
      repositories/
    constants/
      stageNames.ts
      stitchFreeze.ts
```

## Terminology Rules
- Never use visible S1 / S2 / S3 / S4 for stage identity.
- Avoid visible “Stage 1 / Stage 2 / Stage 3 / Stage 4” in places where the full official names should appear.
- If compact labels are needed, keep the official stage name readable.
- Deviations, dashboard cards, tables, and helper text must follow the same terminology rules.
- If a frozen Stitch screen uses a shortened label, correct it during implementation.

## Frozen Stitch-12 Reference Set
Use these as approved visual direction:
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

### Special caution
- pdf_batch_report_final = layout reference only
- yield_analytics_final_refinement = visual direction only; normalize any generic KPI language

## UI Lessons from Prior Attempt
### Keep
- dashboard pipeline showing batches across real stages
- operational cards for stalled batches and pending approvals
- batch detail as operational center
- stage forms with structured inputs/calculated result sidebars
- analytics focused on yield, solvent, cost, and duration
- machine cards with operational state and stage relevance
- solvent accounting with ledger views and loss values

### Avoid
- generic KPI dashboards without process flow
- old labels like Grinding & Sieving or Drying & Final Product as stage names
- empty locked stage pages
- shorthand stage labels in deviations and compact widgets
- letting limonene redefine Stage 3
- awkward truncation of official stage names
- generic warehouse/logistics framing for inventory
- alternate chemistry workflow names in analytics

## Data Model Outline
### Core Tables
- batches
- batch_stages
- stage1_records
- stage2_records
- stage3_records
- stage4_records
- materials
- material_movements
- machines
- machine_status_events
- deviations
- lab_results
- approvals
- unit_rates
- batch_costs

## Required Seed Data
Seed enough realistic data to render:
- at least one draft batch
- multiple in-progress batches across different official stages
- one pending review batch
- one completed batch
- one rejected batch
- deviations for solvent recovery and mass balance
- limonene records tied to partitioning/back extraction context
- at least one batch with TLC/HPLC placeholders/results

## Claude / Opus Implementation Behavior
When making changes:
1. audit terminology first
2. preserve good process-aware structures
3. make narrow changes when possible
4. do not drift into redesigns unless asked
5. keep official naming and process truth as the primary constraint
6. correct any frozen Stitch wording that conflicts with product truth
