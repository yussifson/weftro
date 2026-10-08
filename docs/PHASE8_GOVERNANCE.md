# Clipad V3 - Phase 8: Role-Aware Intelligence + Governance + Privacy

## Architecture Overview

Phase 8 introduces the **Intelligence Governance Layer** (`clipadIntelligenceGovernanceService.js`). This layer sits directly between the existing Supabase RLS database authorization and the AI context assembly pipeline. 

The core principle is:
> **The AI must never receive context the user is not authorized to access.**

### Authorization Flow

1. **User Identity & RLS**: The request begins with standard authentication. All queries inherently enforce tenant isolation (`company_id`).
2. **Context Resolution**: The governance service derives the user's intelligence context based on:
   - Canonical `profiles` (User ID, Company ID, Role)
   - Canonical `clipad_space_members` (Accessible Spaces, Managed Spaces)
3. **Data Retrieval**: Services (`clipadContextService`, `clipadConnectService`) fetch potentially relevant memories, smart moments, and graph entities.
4. **Context Filtering (Governance)**: The retrieved data is passed through `filterAuthorizedMemories`, `filterAuthorizedMoments`, and `filterAuthorizedGraph`. Anything marked as `PRIVATE` or `RESTRICTED` that the user does not own is stripped.
5. **AI Payload**: The minimized, strictly authorized data is formatted and sent to the AI Provider.

### Role Mapping & Privacy Model

- **OWNER / ADMIN**: Can read `ORGANIZATION` tier knowledge and `TEAM`/`SPACE` knowledge they manage.
- **MANAGER / TEAM LEAD**: Can read `TEAM` tier knowledge within their joined spaces.
- **MEMBER**: Can read `PERSONAL` and `ORGANIZATION` knowledge, plus `TEAM` knowledge in their joined spaces. 
- **PRIVATE / RESTRICTED**: Strictly limited to the `owner_id`. No other roles, not even admins, can view these directly as AI context unless specifically granted.

### Feature Integrations

#### AI Context Filtering
Integrated directly into `getGraphAwareContext` and `searchAuthorizedMemory`. Unauthorized rows are explicitly removed before prompt assembly.

#### Graph Filtering (Side-Channel Prevention)
Edges in the knowledge graph are strictly filtered. If an authorized node (e.g. `Project A`) links to an unauthorized node (e.g. `Private Meeting B`), both the target node AND the connecting edge are pruned from the returned graph. 

#### Smart Moment Privacy
Smart Moments inherit visibility tiers (`TEAM`, `ORGANIZATION`, `PRIVATE`). Context requests utilizing `clipadQueryIntelligence` filter moments based on the user's `team_space_id` memberships.

#### Connect / MCP Governance
External OAuth/MCP clients hit `clipadConnectService.js`. The requested scopes (e.g. `memory:read`) grant baseline endpoint access, but the returned data is fully routed through the governance filters. A token cannot bypass memory ownership rules.

### Security Decisions
- **No Secondary Permissions DB**: We do not duplicate the PostgreSQL RLS schema into an artificial node tree. We derive context dynamically from existing relationships.
- **Graceful Denials**: The AI Assistant simply omits restricted knowledge, stating "I don't have access to information matching that request." It does not reveal the existence of hidden files.
- **Data Minimization**: Full rows are never dumped into the prompt. Only the `title`, `content`, and `description` of authorized arrays are serialized.

### Deferred Functionality
- Advanced Enterprise DLP (Data Loss Prevention) rules.
- Automatic Employee Surveillance / granular HR governance dashboards.
- These components belong to future compliance extensions (Phase 9+).
