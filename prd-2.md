# Sumatra Gardens Factory Operations System — PRD (Post-Stitch Freeze)

## 1. Product Summary
Sumatra Gardens needs an internal factory operations system for a small but growing kratom extraction facility. The system must support structured batch execution, operator data entry, process traceability, solvent/material accounting, costing, quality records, deviations, and PDF batch reporting.

This is **not** a generic ERP and must not be implemented as one. The product is a process-first internal operations tool centered on real batch execution.

## 2. Product Context
Current scale is approximately **100 kg/month**. Design decisions must match a small facility with a compact team, practical workflows, and per-batch accountability.

The system should help the factory:
- track every batch through all four stages
- reduce solvent loss and process loss
- improve yield visibility and process control
- capture reagent and machine usage
- calculate stage-by-stage cost build-up and final cost per kg
- track deviations, reviews, approvals, and lab results

## 3. Source-of-Truth Order
1. This PRD
2. MVP
3. MCP / Master Prompt / Implementation Plan
4. Frozen Stitch-12 screens as visual reference only

Stitch does not override product truth.

## 4. Official Stage Names
These exact names must be used everywhere in the product with no abbreviations, no alternate labels, and no shortened visible variants:
1. **Raw Leaf to Powder**
2. **Ethanol Extraction**
3. **Acid/Base Extraction and Partitioning**
4. **Back Extraction, Precipitation, Drying, and Final Product**

### Stage Naming Rules
- Do not use “Grinding & Sieving” as the visible stage name.
- Do not use “Acid/Base Extraction” as a shortened stage name.
- Do not use “Drying & Final Product” as a shortened stage name.
- Do not use visible shorthand such as Stage 1 / Stage 2 / Stage 3 / Stage 4 where the official stage names should appear.
- Do not use S1 / S2 / S3 / S4 in visible UI for stage identity.

## 5. Critical Process Truth
### Stage 3
Stage 3 is **Acid/Base Extraction and Partitioning**.
It is about:
- acid/base extraction
- partitioning
- phase transfer efficiency
- aqueous vs organic losses
- reagent usage
- pH control
- process control

**Do not frame Stage 3 as limonene recovery.**

### Limonene
Limonene is a **real tracked process material**.
- It is the non-polar material used during partitioning.
- Material in limonene is then back extracted later.
- Limonene can appear in inventory, costing, solvent/material accounting, issue/return/recovery logs, and product-loss accounting.
- Limonene may contribute to process loss and retained product loss.

However:
- limonene must **not** redefine the identity of Stage 3
- limonene must **not** replace the official stage name
- sections involving limonene should still be framed under the official stage/process context

## 6. Frozen Stitch-12 Package
The final Stitch package is approved as **visual reference only**.
It can guide:
- composition
- hierarchy
- card/table/form style
- dashboard density
- stage-page layout
- report layout

### Caution
- the PDF Stitch screen is **layout reference only**, not content truth
- any shortened stage names or generic KPI wording from Stitch must be corrected during implementation

## 7. Users
### Primary Users
- Operators entering stage data
- Supervisors reviewing batch progress and deviations
- Management reviewing yield, solvent, and cost trends

### User Needs
Operators need fast, structured entry with clear required fields and calculations.
Supervisors need visibility into active batches, stuck batches, missing reviews, machine availability, and deviations.
Management needs cost, yield, solvent, and loss visibility without enterprise complexity.

## 8. Goals
### Business Goals
- improve traceability and process control
- reduce solvent loss and product loss
- improve yield monitoring and comparison
- understand stage-level and final cost per kg
- support consistent batch records and review flow

### Product Goals
- structured operator workflows
- process-aware dashboard
- clean batch detail as operational center
- stage-specific forms with calculations and validation
- stage-by-stage cost accumulation
- material and solvent accounting
- deviations and approvals
- PDF export of batch records

## 9. Non-Goals
- no generic ERP features unrelated to the extraction workflow
- no large-enterprise planning assumptions
- no broad warehouse, procurement, HR, or accounting suite
- no assumed 500 kg batch design decisions
- no invented process steps not supported by actual workflow

## 10. Core Functional Requirements
### 10.1 Dashboard
The dashboard must feel like a factory operations screen.
It should emphasize:
- active batches
- four-stage process visibility
- stalled batches
- pending approvals/reviews
- recent deviations
- machine status
- solvent/process balance

### 10.2 Batch Queue
The batch list must show:
- batch number
- current official stage name
- status
- operator/owner where relevant
- age / days in process
- created date

### 10.3 Batch Detail
Batch detail is the operational center of a batch.
It must show:
- batch identity and status
- progress through the 4 official stages
- next recommended action
- stage progress/status
- cost build-up
- activity log
- review / approval context
- lab results access
- export access

### 10.4 Stage Pages
Each stage page must clearly communicate:
- inputs
- process settings
- outputs
- losses / balance
- calculated results
- operator entry
- finalized/locked status

Locked stages must still show structured information. They must not collapse into blank placeholders.

### 10.5 Quality
The system must track:
- in-house TLC records
- third-party HPLC records
- status of results and review
- lab-related batch references

### 10.6 Deviations
Track:
- batch-linked deviations
- stage-linked deviations
- severity
- parameter/issue
- expected vs actual where relevant
- status
- review / resolution workflow

### 10.7 Inventory and Material Accounting
Track key materials and movements, including where process-truth-correct:
- dried leaf
- ethanol 96%
- DI water
- HCl
- NaOH
- limonene

Inventory must support:
- on-hand quantity
- issued quantity
- recovered / returned quantity where applicable
- material movements by batch
- reorder thresholds
- stage/process relevance

### 10.8 Solvent / Process Accounting
Track:
- ethanol issued, recovered, lost
- limonene issued, recovered where applicable, and process loss
- solvent-associated product loss
- per-batch and trend views

### 10.9 Costing
Support:
- unit rates
- stage-by-stage cost build-up
- batch total cost
- final cost per kg
- process-material cost contribution
- labor, electricity, solvent/material, and reagent costs

## 11. UX Principles
- process-first, not admin-first
- official terminology everywhere
- compact and practical for operators
- traceability-first
- calculations visible but not cluttered
- preserve readability of long official stage names
- avoid awkward truncation of stage names
- maintain desktop-first layouts that translate well to iPad landscape reference height

## 12. Technical Requirements
The new implementation will use:
- **Svelte** for UI scaffolding
- **SQLite** for local relational persistence in the initial build

Architecture should separate:
- UI components
- domain logic
- calculation logic
- validation logic
- persistence/data access

## 13. Data Model Themes
At minimum, the system should model:
- batches
- batch stages
- stage records
- materials
- material movements
- machines
- machine status / maintenance
- deviations
- lab results
- approvals/reviews
- costing inputs and computed cost outputs

## 14. Success Criteria
A successful MVP will allow the team to:
- create and track batches through all 4 stages
- enter stage data in structured forms
- view yields, recovery, loss, and cost at batch level
- see operational pipeline on dashboard
- review deviations and approvals
- export batch records to PDF
- use the frozen Stitch package as visual reference without inheriting its content errors
