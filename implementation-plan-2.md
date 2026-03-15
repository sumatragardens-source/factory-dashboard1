# Sumatra Gardens Factory Operations System — Implementation Plan (Post-Stitch Freeze)

## Phase 0 — Setup
### Objective
Create a clean fresh project using Svelte and SQLite with the right product constraints baked in before UI work starts.

### Deliverables
- Svelte project scaffolded and running
- SQLite database initialized
- domain constants file for locked stage names
- seed data strategy
- base layout and routing
- frozen Stitch-12 screens cataloged as visual reference only

### Required First Step
Create a single source of truth for official stage names and use it across all pages/components.

## Phase 1 — Foundation and Data Model
### Build
- SQLite schema for batches, stages, materials, movements, machines, deviations, lab results, approvals, unit rates, and costs
- seed data with representative factory states
- repository/data access layer
- calculation modules for yield, solvent, cost, balances
- validation modules for stage completion/finalization
- constants/mappings for frozen visual reference names to real page routes (without importing wrong Stitch wording)

### Acceptance Criteria
- seed data can populate every MVP page
- calculations are not embedded directly inside page markup
- stage names are not hardcoded inconsistently across pages
- Stitch-derived layouts do not override product truth

## Phase 2 — App Shell and Navigation
### Build
- main app shell
- left navigation
- top header
- route structure for all MVP pages

### Navigation Labels
- Operations
- Batches
- Inventory
- Machines
- Batch Costing
- Solvent Economics
- Yield & Analytics
- Deviations

### Note
Navigation wording must remain aligned to product docs even if frozen Stitch screens contain more generic labels.

## Phase 3 — Core Operations Flow
### 3.1 Dashboard
Build first major operations screen.
Must include:
- active batch pipeline across the 4 official stages
- active/completed/solvent/deviation summary
- stalled batches
- pending approvals
- recent batches
- recent deviations
- machine snapshot
- solvent/process balance snapshot

Use frozen Stitch dashboard layout direction, but correct any wording/content mismatches.

### 3.2 Batch Queue
Build searchable/filterable queue with official stage names.

### 3.3 Batch Detail
Build as operational center.
Must include:
- official stage progress strip
- next action CTA
- stage progress list
- cost build-up
- activity log
- overview/lab/export tabs

## Phase 4 — Stage Forms
### Stage 1 — Raw Leaf to Powder
Build structured form + calculated results sidebar.
Use the refined Stitch page as a layout base, but keep the page title exactly **Raw Leaf to Powder**.

### Stage 2 — Ethanol Extraction
Build structured form + recovery/loss calculation support.
Use the refined Stitch page as layout inspiration, but expand it to full operator form depth from product docs.

### Stage 3 — Acid/Base Extraction and Partitioning
Build structured form with:
- acid/base settings
- pH controls
- partitioning context
- limonene as tracked material
- phase/process losses

### Stage 4 — Back Extraction, Precipitation, Drying, and Final Product
Build structured form with:
- back extraction details
- precipitation
- drying
- final product outputs
- retained product / process loss where relevant

### Important Rule
If a stage is locked or blocked, still show a structured page with fields/sections/status context rather than a blank placeholder.

## Phase 5 — Process Support Pages
### Build
- Batch Costing
- Solvent Economics
- Inventory
- Machines
- Deviations
- Yield & Analytics

### Notes
- Batch Costing must be stage-cost-centric
- Solvent Economics must feel like process accounting
- Inventory must show traceable movements and real materials
- Machines must feel operational rather than registry-only
- Analytics must stay within MVP and focus on useful comparisons
- Yield & Analytics must use the actual 4-stage process, not alternate chemistry stage names

## Phase 6 — PDF Export and Quality Records
### Build
- PDF-ready batch summary/export
- TLC/HPLC result summary linkage in batch detail

### PDF Caution
Use the frozen PDF screen for layout inspiration only.
Do not copy any wrong cross-industry wording or alternate process model content from Stitch.

## Phase 7 — Verification Pass
### Run a full regression check for:
- exact stage naming everywhere
- dashboard process visibility
- limonene framed correctly as tracked process material, not stage identity
- no visible stage shorthand
- locked stage pages still structured
- consistency across deviations, inventory, machines, analytics, solvent pages, and lab pages
- no wrong text inherited from frozen Stitch screens

## Delivery Approach for Claude / Opus Collaboration
The collaborating model should work in this order:
1. set up constants, schema, seed data, architecture
2. build dashboard, queue, batch detail
3. build stage pages
4. build process-support pages
5. add export/lab integration points
6. run terminology/product-truth verification pass

## Definition of Done
The implementation is done when:
- all MVP pages render from seed data
- official stage names are consistent everywhere
- batch execution flow works from dashboard to batch detail to stages
- cost, solvent, inventory, lab, deviation, and analytics pages reflect process truth
- no generic ERP drift remains
- no Stitch wording conflicts remain unresolved
