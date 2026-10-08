# Clipad V3 - Phase 9: Analytics + Organizational Learning + Automation

## Architecture Overview

Phase 9 transforms Clipad from a passive recording system into a proactive, learning intelligence layer. It strictly operates on top of the Phase 8 Governance Service, ensuring that **no user receives insights derived from information they cannot access**.

### 1. Organizational Analytics (`clipadOrganizationalAnalyticsService.js`)
Aggregates memory and smart moment metadata into quantitative metrics and a qualitative Execution Health score. 
- Filters the input data dynamically based on `resolveIntelligenceContext`.
- Calculates activity volume (new memories, decisions, blockers) over rolling time windows.

### 2. Organizational Learning (`clipadOrganizationalLearningService.js`)
Analyzes the authorized dataset to detect repeating organizational patterns.
- Currently identifies **Recurring Blockers** by semantically grouping `BLOCKER` and `RISK` smart moments.
- Upserts the findings into `clipad_v3_organizational_insights` with an `evidence_count` and `source_ids` for complete provenance and deduplication.

### 3. Controlled Automation (`clipadAutomationService.js`)
An event-driven rule engine reacting to organizational activity.
- Retrieves rules from `clipad_v3_automation_rules`.
- Evaluates constraints (e.g. status matches).
- **Security Check:** Strictly whitelists allowed actions (`create_recommendation`, `notify_manager`). No destructive actions (e.g., DELETE, change permissions, external broadcast) are permitted.

### 4. User Interface
Integrated directly into the existing `CliPadDashboard.jsx` via the `OrganizationalInsights` component. Surfaces the Execution Health, key activity metrics, and top non-resolved recommendations derived from the learning service.

## Security & Governance Integration

**Rule 1:** Analytics never aggregate unauthorized data and then attempt to hide the result. The data is pruned *before* aggregation via `filterAuthorizedMemories` and `filterAuthorizedMoments`.
**Rule 2:** Automation runs conservatively. It observes and recommends rather than acting autonomously on sensitive systems. 

## Feature Flags

Gated entirely behind:
- `ORGANIZATIONAL_ANALYTICS_ENABLED`
- `ORGANIZATIONAL_LEARNING_ENABLED`
- `AUTOMATION_V3_ENABLED`

## Deferred Items
- Advanced ML Forecasting (out of scope for Phase 9).
- Heavy enterprise DLP actions (out of scope).
- A standalone "Action Center" (we integrated into the Dashboard to minimize UI bloat, laying the groundwork for Phase 10).
