/**
 * integrationIngestion.js
 * 
 * AI-powered pipeline that reads from connected third-party integrations,
 * generates summaries, flags actionable items, and stores them in
 * `integration_knowledge` for Orbit and the Knowledge Graph to use.
 * 
 * Supported sources: GitHub issues, Gmail, Notion, Jira, Google Drive, Slack
 * 
 * Privacy model:
 *   - Each record is tagged with connected_by_user_id
 *   - Visibility: 'private' (only that user), 'space', 'company'
 *   - Admins connecting company-wide integrations should set visibility='company'
 */

import { supabase } from '@/api/supabaseClient';
import { generateText } from '@/lib/cloudflareAI';

// ── AI summarizer for integration content ───────────────────────────────────
async function summarizeContent(title, content, integrationTypee) {
  const raw = await generateText([
    {
      role: 'system',
      content: 'You are an enterprise data analyst. Summarize the given content into 1-2 sentences. Identify if this requires user action. Respond with JSON only.',
    },
    {
      role: 'user',
      content: `Integration: ${integrationTypee}
Title: ${title}
Content: ${(content || '').substring(0, 2000)}

Return JSON with keys:
- "summary": 1-2 sentence summary (max 200 chars)
- "sentiment": one of "positive" | "neutral" | "negative" | "urgent"
- "tags": array of 2-4 topic tags
- "is_flagged": true if this needs immediate user attention
- "flagged_action": if flagged, what the user should do (max 80 chars), else null`,
    },
  ]);

  // Strip think tags before parsing
  const cleaned = (raw || '')
    .replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(think|thought)>[\s\S]*$/gi, '')
    .replace(/<\/(think|thought)>/gi, '')
    .replace(/```json|```/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || title,
      sentiment: parsed.sentiment || 'neutral',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      is_flagged: Boolean(parsed.is_flagged),
      flagged_action: parsed.flagged_action || null,
    };
  } catch {
    return { summary: title, sentiment: 'neutral', tags: [], is_flagged: false, flagged_action: null };
  }
}

// ── Write a record to integration_knowledge ──────────────────────────────────
async function upsertKnowledge(record) {
  try {
    const { error } = await supabase
      .from('integration_knowledge')
      .upsert(
        {
          ...record,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'connected_by_user_id,integration_type,source_id',
          ignoreDuplicates: false,
        }
      );
    if (error) {
      // Table may not exist yet (migration pending) — fall back to clipad_imported_knowledge
      console.warn('[Ingestion] integration_knowledge upsert failed, using fallback:', error.message);
      await supabase.from('clipad_imported_knowledge').upsert({
        company_id: record.company_id,
        provider: record.integration_type,
        content_type: 'auto_ingested',
        title: record.title,
        content: record.raw_content || '',
        ai_summary: record.summary,
        metadata: record.metadata || {},
        connected_by_user_id: record.connected_by_user_id,
        visibility: record.visibility || 'private',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: false });
    }
  } catch (e) {
    console.error('[Ingestion] Failed to upsert knowledge record:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  GITHUB — ingest open issues assigned to or involving the user
// ═══════════════════════════════════════════════════════════════════════════
export async function ingestGitHubIssues({ userId, companyId, accessToken, repos = [], visibility = 'private' }) {
  if (!accessToken) return { ingested: 0, flagged: 0 };
  let ingested = 0, flagged = 0;

  for (const repo of repos) {
    try {
      const resp = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=20`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'CliPad-Orbit' },
      });
      if (!resp.ok) continue;
      const issues = await resp.json();

      for (const issue of (issues || [])) {
        if (!issue.title) continue;
        const content = `${issue.title}\n\n${issue.body || ''}\nLabels: ${(issue.labels || []).map(l => l.name).join(', ')}\nAssignees: ${(issue.assignees || []).map(a => a.login).join(', ')}`;
        const ai = await summarizeContent(issue.title, content, 'github');

        await upsertKnowledge({
          company_id: companyId,
          connected_by_user_id: userId,
          integration_type: 'github',
          source_id: `${repo}#${issue.number}`,
          source_url: issue.html_url,
          title: `[GitHub] ${repo}#${issue.number}: ${issue.title}`,
          raw_content: content.substring(0, 5000),
          visibility,
          metadata: {
            repo,
            issue_number: issue.number,
            labels: (issue.labels || []).map(l => l.name),
            assignees: (issue.assignees || []).map(a => a.login),
            state: issue.state,
          },
          ...ai,
        });

        ingested++;
        if (ai.is_flagged) flagged++;
      }
    } catch (e) {
      console.warn(`[Ingestion] GitHub repo ${repo} failed:`, e.message);
    }
  }

  return { ingested, flagged };
}

// ═══════════════════════════════════════════════════════════════════════════
//  NOTION — ingest pages from a Notion database
// ═══════════════════════════════════════════════════════════════════════════
export async function ingestNotionPages({ userId, companyId, accessToken, databaseId, visibility = 'private' }) {
  if (!accessToken || !databaseId) return { ingested: 0, flagged: 0 };
  let ingested = 0, flagged = 0;

  try {
    const resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 20 }),
    });
    if (!resp.ok) return { ingested: 0, flagged: 0 };
    const data = await resp.json();

    for (const page of (data.results || [])) {
      const titleProp = Object.values(page.properties || {}).find(p => p.type === 'title');
      const title = titleProp?.title?.[0]?.plain_text || 'Untitled Notion Page';
      const content = `Notion page: ${title}\nURL: ${page.url || ''}\nLast edited: ${page.last_edited_time || ''}`;
      const ai = await summarizeContent(title, content, 'notion');

      await upsertKnowledge({
        company_id: companyId,
        connected_by_user_id: userId,
        integration_type: 'notion',
        source_id: page.id,
        source_url: page.url,
        title: `[Notion] ${title}`,
        raw_content: content,
        visibility,
        metadata: { database_id: databaseId, last_edited: page.last_edited_time },
        ...ai,
      });
      ingested++;
      if (ai.is_flagged) flagged++;
    }
  } catch (e) {
    console.warn('[Ingestion] Notion failed:', e.message);
  }

  return { ingested, flagged };
}

// ═══════════════════════════════════════════════════════════════════════════
//  JIRA — ingest open tickets assigned to the user
// ═══════════════════════════════════════════════════════════════════════════
export async function ingestJiraTickets({ userId, companyId, accessToken, domain, projectKey, visibility = 'private' }) {
  if (!accessToken || !domain) return { ingested: 0, flagged: 0 };
  let ingested = 0, flagged = 0;

  try {
    const jql = encodeURIComponent(`project=${projectKey} AND assignee=currentUser() AND status!=Done ORDER BY updated DESC`);
    const resp = await fetch(`https://${domain}/rest/api/3/search?jql=${jql}&maxResults=20`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!resp.ok) return { ingested: 0, flagged: 0 };
    const data = await resp.json();

    for (const issue of (data.issues || [])) {
      const title = issue.fields?.summary || 'Untitled Jira Issue';
      const content = `${title}\n${issue.fields?.description?.content?.[0]?.content?.[0]?.text || ''}\nStatus: ${issue.fields?.status?.name || 'Unknown'}\nPriority: ${issue.fields?.priority?.name || 'None'}`;
      const ai = await summarizeContent(title, content, 'jira');

      await upsertKnowledge({
        company_id: companyId,
        connected_by_user_id: userId,
        integration_type: 'jira',
        source_id: issue.key,
        source_url: `https://${domain}/browse/${issue.key}`,
        title: `[Jira] ${issue.key}: ${title}`,
        raw_content: content,
        visibility,
        metadata: {
          key: issue.key,
          status: issue.fields?.status?.name,
          priority: issue.fields?.priority?.name,
          project: projectKey,
        },
        ...ai,
      });
      ingested++;
      if (ai.is_flagged) flagged++;
    }
  } catch (e) {
    console.warn('[Ingestion] Jira failed:', e.message);
  }

  return { ingested, flagged };
}

// ═══════════════════════════════════════════════════════════════════════════
//  GMAIL — ingest recent important emails
// ═══════════════════════════════════════════════════════════════════════════
export async function ingestGmailThreads({ userId, companyId, accessToken, maxResults = 10, visibility = 'private' }) {
  if (!accessToken) return { ingested: 0, flagged: 0 };
  let ingested = 0, flagged = 0;

  try {
    // Fetch thread IDs
    const listResp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${maxResults}&q=is:important is:unread`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listResp.ok) return { ingested: 0, flagged: 0 };
    const listData = await listResp.json();

    for (const thread of (listData.threads || [])) {
      try {
        const threadResp = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!threadResp.ok) continue;
        const threadData = await threadResp.json();

        const firstMsg = threadData.messages?.[0];
        const headers = firstMsg?.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const snippet = threadData.messages?.[threadData.messages.length - 1]?.snippet || '';

        const content = `From: ${from}\nSubject: ${subject}\n\n${snippet}`;
        const ai = await summarizeContent(subject, content, 'gmail');

        await upsertKnowledge({
          company_id: companyId,
          connected_by_user_id: userId,
          integration_type: 'gmail',
          source_id: thread.id,
          source_url: `https://mail.google.com/mail/u/0/#inbox/${thread.id}`,
          title: `[Gmail] ${subject}`,
          raw_content: content,
          visibility,
          metadata: { thread_id: thread.id, from, subject, message_count: threadData.messages?.length || 1 },
          ...ai,
        });
        ingested++;
        if (ai.is_flagged) flagged++;
      } catch (e) {
        console.warn('[Ingestion] Gmail thread failed:', e.message);
      }
    }
  } catch (e) {
    console.warn('[Ingestion] Gmail failed:', e.message);
  }

  return { ingested, flagged };
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOAD FLAGGED ACTION ITEMS from integration_knowledge
//  Used by the Action Items page to surface cross-integration flags
// ═══════════════════════════════════════════════════════════════════════════
export async function loadIntegrationActionItems({ userId, companyId, spaceIds = [] }) {
  try {
    let query = supabase
      .from('integration_knowledge')
      .select('id, integration_type, title, summary, flagged_action, source_url, metadata, updated_at, sentiment, visibility, connected_by_user_id')
      .eq('is_flagged', true)
      .order('updated_at', { ascending: false })
      .limit(30);

    if (companyId) query = query.eq('company_id', companyId);

    // Privacy: only show records user can see
    if (userId) {
      query = query.or(
        `connected_by_user_id.eq.${userId},visibility.eq.company${spaceIds.length > 0 ? `,and(visibility.eq.space,space_id.in.(${spaceIds.join(',')}))` : ''}`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[Ingestion] loadIntegrationActionItems failed:', e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOAD ALL KNOWLEDGE for org context (privacy-scoped)
// ═══════════════════════════════════════════════════════════════════════════
export async function loadIntegrationKnowledge({ userId, companyId, spaceIds = [], userRole = 'member', limit = 40 }) {
  const isAdmin = ['super_admin', 'admin'].includes(userRole);
  try {
    let query = supabase
      .from('integration_knowledge')
      .select('id, integration_type, title, summary, tags, sentiment, source_url, metadata, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (companyId) query = query.eq('company_id', companyId);

    if (!isAdmin && userId) {
      query = query.or(
        `connected_by_user_id.eq.${userId},visibility.eq.company${spaceIds.length > 0 ? `,and(visibility.eq.space,space_id.in.(${spaceIds.join(',')}))` : ''}`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[Ingestion] loadIntegrationKnowledge failed:', e.message);
    return [];
  }
}
