# Sumatra Gardens Factory Operations System — MVP (Post-Stitch Freeze)

## MVP Objective
Deliver a working internal operations application using **Svelte + SQLite** that supports real batch execution and review for Sumatra Gardens without drifting into generic ERP patterns.

## Visual Reference Note
Use frozen Stitch-12 screens as visual/layout reference only.
Do not copy incorrect wording from Stitch when it conflicts with product truth.
The PDF Stitch screen is layout reference only.

## MVP Scope
### Included
- dashboard
- batch queue
- batch detail
- stage 1 form
- stage 2 form
- stage 3 form
- stage 4 form
- batch costing
- solvent economics
- inventory
- machines
- deviations
- yield & analytics
- batch PDF export
- TLC / HPLC summary blocks or linked records

### Excluded for MVP
- advanced scheduling engine
- multi-site support
- full purchasing / procurement workflows
- finance/accounting system integration
- mobile-first optimization beyond responsive desktop/admin-style layouts
- predictive analytics or ML optimization features

## Official Stage Names
Use these exact visible names everywhere:
1. Raw Leaf to Powder
2. Ethanol Extraction
3. Acid/Base Extraction and Partitioning
4. Back Extraction, Precipitation, Drying, and Final Product

## MVP Pages and Intent
### 1. Dashboard
Purpose: immediate operational visibility.
Must include:
- active batch count
- completed count
- solvent recovery signal
- open deviations
- active batch pipeline across all 4 stages
- stalled batches
- pending approvals
- recent batches
- recent deviations
- machine status snapshot
- solvent/process balance snapshot

### 2. Batch Queue
Purpose: find and manage batches.
Must include:
- new batch creation
- current stage using official stage names
- status filters
- created date
- days in process
- operator/owner where relevant

### 3. Batch Detail
Purpose: operational center of a batch.
Must include:
- progress strip using official stage names
- next action CTA
- stage progress list
- batch details summary
- cost build-up block
- activity log
- overview / lab results / export tabs

### 4. Stage 1 — Raw Leaf to Powder
Must support:
- leaf batch ID
- supplier
- receipt and processing dates
- grinder selection
- machine/process settings
- moisture content
- gross weight / net weight / powder weight / dust loss
- calculated powder yield, retention, mass balance error
- operator and finalize state

### 5. Stage 2 — Ethanol Extraction
Must support:
- dry mass
- ethanol volume and ratio context
- input density where relevant
- set temperature
- stir and settle times
- agitation RPM
- DE added if used
- separation/recovery details
- recovered ethanol volume
- solvent loss
- recovery rate
- operator and finalize state

### 6. Stage 3 — Acid/Base Extraction and Partitioning
Must support:
- feed from previous stage
- acid/base process settings
- pH targets/actuals
- phase split inputs and results
- limonene as tracked non-polar process material where relevant
- aqueous / organic phase volumes or mass where relevant
- partition transfer losses
- reagent usage
- calculated outputs and losses
- operator and finalize state

### 7. Stage 4 — Back Extraction, Precipitation, Drying, and Final Product
Must support:
- back extraction details
- limonene-associated retained product / process loss where relevant
- precipitation details
- drying parameters
- final product weight
- cumulative yield context
- final mass balance and stage outputs
- operator and finalize state

### 8. Batch Costing
Must support:
- unit rates
- stage-by-stage cost build-up
- total batch cost
- final kg and cost/kg
- material, reagent, labor, electricity, and solvent contributions

### 9. Solvent Economics
Must support:
- ethanol totals used/recovered/lost
- average recovery rate
- ethanol ledger by batch
- limonene/process-material accounting where relevant
- process loss values
- batch-level and trend views

### 10. Inventory
Must support:
- current stock levels
- stage/process relevance of materials
- recent movements
- received / issued / recovered / returned style entries where relevant
- limonene as tracked material

### 11. Machines
Must support:
- machine cards or list with operational status
- maintenance/offline state
- location
- stage/process role
- rough batch usage context

### 12. Deviations
Must support:
- severity
- status
- batch linkage
- stage linkage using official stage names
- parameter / expected / actual fields where relevant

### 13. Yield & Analytics
Must support:
- status breakdown
- average yield
- average solvent recovery
- average cost per kg
- batch yield comparison
- solvent performance comparison
- duration analysis
- stage yield comparison
- cost trend
- alkaloid composition using:
  - 7-hydroxymitragynine
  - mitragynine
  - paynantheine
  - speciogynine
  - speciociliatine
  - non-alkaloids

## MVP UX Rules
- no visible stage abbreviations
- preserve long official stage names legibly
- no blank locked pages
- keep dashboard process-first
- keep batch detail practical and centered on action
- maintain desktop-first layouts sized responsibly for iPad landscape reference

## MVP Data Persistence
Use SQLite with seed/sample data to support full UI walkthroughs.
Sample data should include:
- batches at different stages/statuses
- at least one stalled batch
- at least one pending approval
- at least one deviation
- solvent/material movement data
- one fully completed batch for analytics/costing
- lab result placeholders or sample records
