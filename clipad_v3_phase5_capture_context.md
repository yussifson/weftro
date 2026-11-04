# Weftro V3 Phase 5: Capture System + Context Sessions

## Architecture

This phase introduces a robust Capture System and Context Session model to manage user-captured information (notes, clips, screens) and their organizational context.

### Capture Lifecycle
A captured piece of information traverses the following lifecycle:
1. \`CREATED\`: Initial capture state.
2. \`PROCESSING\`: Background metadata extraction via AI.
3. \`CONTEXTUALIZED\`: Links and organizational memory candidates are generated.
4. \`INGESTED\`: (Optional) Promoted to full organizational memory.
5. \`ARCHIVED\` / \`FAILED\` / \`DISMISSED\`: Terminal states based on user actions or processing errors.

### Context Session Model
A \`Context Session\` acts as a bounded container answering "What was the user working on?".
It groups multiple captures and metadata into a unified context (e.g., "Q4 Planning"). 
Captures created during an active Context Session are associated with it via \`context_session_id\`.

### Permission & Visibility Model
RLS is heavily enforced directly in the database (\`clipad_v3_captures\`, \`clipad_v3_context_sessions\`).
- **Personal**: Accessible only to the creator. Enforced automatically if the source is private.
- **Team**: Accessible to the creator and team members (via \`clipad_teams\` & \`clipad_team_members\` relationship checks).
- **Organizational**: Company-wide accessibility, bounded by the tenant (\`company_id\`).

## Processing Pipeline
The contextualization pipeline is handled by \`clipadContextualizationService\`.
- **Idempotency**: Processing marks the status as \`PROCESSING\` to avoid duplicates.
- **AI Extraction**: Uses the Phase 1 AI provider (\`cloudflareAI\`) to extract entities, decisions, and memory candidates.
- **Memory Integration**: Only candidates from \`ORGANIZATIONAL\` captures create organizational memories via \`clipadMemoryService\`.
- **Knowledge Graph Integration**: Extracts entities and creates nodes via \`clipadEntityService\`.

## Security & Failure Handling
- **Isolation**: Tenant-isolation (\`company_id\`) and user-isolation (\`user_id\`) are strictly enforced via PostgreSQL Row Level Security policies.
- **Failure**: Captures that fail processing move to the \`FAILED\` status safely. Their partial memory extraction does not pollute the graph since processing halts gracefully.

## Future Phases
- **Browser Extension Integration (Phase 6)**: The REST API foundation is ready for remote captures (e.g., link, text, clip) to stream into the \`CREATED\` state.
- **Desktop Capture (Phase 6)**: The same endpoints and DB schema accommodate screenshot or window capture inputs.
