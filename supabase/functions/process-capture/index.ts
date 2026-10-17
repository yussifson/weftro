import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Memory Taxonomy Constants matching Weftro V3 Schema
const MEMORY_TIERS = {
  PERSONAL: 'personal',
  TEAM: 'team',
  ORGANIZATIONAL: 'organizational',
};

const MEMORY_TYPES = {
  FACT: 'FACT',
  DECISION: 'DECISION',
  COMMITMENT: 'COMMITMENT',
  PREFERENCE: 'PREFERENCE',
  PROCESS: 'PROCESS',
  POLICY: 'POLICY',
  PROJECT_CONTEXT: 'PROJECT_CONTEXT',
  INSIGHT: 'INSIGHT',
  SUMMARY: 'SUMMARY',
};

const ENTITY_TYPES = {
  PERSON: 'person',
  ORGANIZATION: 'organization',
  TEAM: 'team',
  PROJECT: 'project',
  KNOWLEDGE: 'knowledge',
};

/**
 * Execute Cloudflare AI request securely server-side using environment tokens.
 */
async function executeServerAI(messages: any[], model: string = 'moonshotai/kimi-k3') {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID') || '78b7b64f896a40f73928be7d40248fcc9793e94185e8ffb980cf243a6477ce8b';
  const apiToken = Deno.env.get('CLOUDFLARE_AI_TOKEN');

  if (!apiToken) {
    throw new Error('Server AI configuration missing (CLOUDFLARE_AI_TOKEN not set).');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Provider API failure (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  if (data.result?.response) {
    return data.result.response;
  }
  return typeof data.result === 'string' ? data.result : JSON.stringify(data.result || data);
}

/**
 * Robust JSON parser handling optional markdown formatting blocks.
 */
function parseExtractionJson(rawText: string) {
  try {
    const clean = (rawText || '').replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (_e) {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Supabase server environment unconfigured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── CALLER AUTHENTICATION & ACCESS CONTROL ──
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  let callerUser: any = null;
  let isServiceRoleCaller = false;

  if (token && token === supabaseServiceKey) {
    isServiceRoleCaller = true;
  } else if (token && supabaseAnonKey) {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (!userErr && user) {
      callerUser = user;
    }
  }

  // Reject callers who are neither verified authenticated users nor service-role
  if (!callerUser && !isServiceRoleCaller) {
    return new Response(JSON.stringify({ error: 'Unauthorized: valid user token or service key required.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const workerId = `worker_${crypto.randomUUID().slice(0, 8)}`;
  let activeJobId: string | null = null;

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const specificCaptureId = body.capture_id || null;

    // Optional: Recover abandoned/stale jobs older than 10 minutes
    await supabase.rpc('recover_abandoned_capture_jobs', { p_stale_threshold_interval: '10 minutes' }).catch(() => {});

    // Claim atomically via Postgres claim_next_capture_job RPC
    const { data: claimed, error: claimErr } = await supabase.rpc('claim_next_capture_job', {
      p_worker_id: workerId,
      p_batch_size: 1,
      p_specific_capture_id: specificCaptureId,
    });

    if (claimErr) {
      throw new Error(`Failed to claim job: ${claimErr.message}`);
    }

    if (!claimed || claimed.length === 0) {
      return new Response(JSON.stringify({ status: 'idle', message: 'No eligible queued capture jobs to process.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentJob = claimed[0];
    activeJobId = currentJob.job_id;
    const jobId = currentJob.job_id;
    const captureId = currentJob.job_capture_id;
    const companyId = currentJob.job_company_id;
    const userId = currentJob.job_user_id;

    // Non-service callers cannot trigger jobs belonging to a different tenant
    if (callerUser && !isServiceRoleCaller) {
      const userCompId = callerUser.user_metadata?.company_id || callerUser.company_id;
      if (userCompId && userCompId !== companyId) {
        // Unlock job and reject
        await supabase.from('clipad_v3_capture_queue').update({
          status: 'queued',
          locked_at: null,
          locked_by: null,
          updated_at: new Date().toISOString(),
        }).eq('id', jobId);

        return new Response(JSON.stringify({ error: 'Forbidden: caller does not belong to capture organization.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 1. Fetch Capture and verify tenant integrity
    const { data: capture, error: capErr } = await supabase
      .from('clipad_v3_captures')
      .select('*')
      .eq('id', captureId)
      .eq('company_id', companyId)
      .single();

    if (capErr || !capture) {
      const errMessage = `Capture ${captureId} not found or tenant company mismatch.`;
      await supabase.rpc('finalize_capture_job', {
        p_job_id: jobId,
        p_status: 'failed',
        p_worker_id: workerId,
        p_error_message: errMessage,
      });
      return new Response(JSON.stringify({ error: errMessage }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update capture status to PROCESSING
    await supabase.from('clipad_v3_captures').update({
      status: 'PROCESSING',
      updated_at: new Date().toISOString(),
    }).eq('id', captureId);

    // 2. Resolve content securely depending on source type
    let processingContent = capture.content || '';
    let processingTitle = capture.title || 'Untitled Capture';
    let teamSpaceId = capture.permission_info?.space_id || capture.permission_info?.team_space_id || null;
    let videoId = null;

    if (capture.source_type === 'clipad_videos' && capture.source_id) {
      videoId = capture.source_id;
      const { data: videoRecord } = await supabase
        .from('clipad_videos')
        .select('id, title, transcript, ai_summary, space_id')
        .eq('id', capture.source_id)
        .single();

      if (videoRecord) {
        processingTitle = videoRecord.title || processingTitle;
        teamSpaceId = teamSpaceId || videoRecord.space_id;
        if (videoRecord.transcript && videoRecord.transcript.trim().length > 0) {
          processingContent = `Video Title: ${processingTitle}\nTranscript:\n${videoRecord.transcript}`;
        }
      }
    }

    if (!processingContent || processingContent.trim().length === 0) {
      throw new Error(`Capture ${captureId} contains no text content or transcript to process.`);
    }

    // 3. Structured Server-Side AI Extraction
    const extractionPrompt = `
You are an intelligent enterprise organizational assistant. Analyze the following capture content.
Extract key entities, topics, potential decisions, action items, and evaluate organizational memory potential.
Respond ONLY in valid raw JSON matching this schema:
{
  "entities": [{"name": "Name", "type": "person|organization|project|topic"}],
  "relationships": [{"source": "Entity1Name", "target": "Entity2Name", "type": "relates_to"}],
  "topics": ["topic1"],
  "possible_decisions": ["decision1"],
  "possible_actions": ["action1"],
  "importance": 0.0-1.0,
  "confidence": 0.0-1.0,
  "memory_candidate": boolean,
  "memory_summary": "Concise summary for organizational memory"
}

Capture Title: ${processingTitle}
Content:
${processingContent.substring(0, 8000)}
    `;

    const aiMessages = [
      { role: 'system', content: 'You extract structured metadata and organizational intelligence from source context.' },
      { role: 'user', content: extractionPrompt },
    ];

    let extractedData: any = null;
    try {
      const rawAiText = await executeServerAI(aiMessages);
      extractedData = parseExtractionJson(rawAiText);
    } catch (aiErr: any) {
      console.warn(`[process-capture] AI extraction encountered error: ${aiErr.message}`);
    }

    if (!extractedData) {
      extractedData = {
        entities: [],
        relationships: [],
        topics: [],
        possible_decisions: [],
        possible_actions: [],
        importance: 0.5,
        confidence: 0.8,
        memory_candidate: false,
        memory_summary: processingTitle,
      };
    }

    // 4. Graph Entity & Relationship Persistence (Idempotent)
    const entityMap = new Map<string, string>();
    if (Array.isArray(extractedData.entities) && extractedData.entities.length > 0) {
      for (const ent of extractedData.entities) {
        if (!ent.name || !ent.name.trim()) continue;
        let entType = ENTITY_TYPES.KNOWLEDGE;
        if (ent.type === 'person') entType = ENTITY_TYPES.PERSON;
        if (ent.type === 'organization') entType = ENTITY_TYPES.ORGANIZATION;
        if (ent.type === 'project') entType = ENTITY_TYPES.PROJECT;

        const entityExternalId = `capture_${captureId}_${ent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

        const { data: upsertedEntity } = await supabase
          .from('clipad_v3_entities')
          .upsert({
            company_id: companyId,
            entity_type: entType,
            entity_id: entityExternalId,
            name: ent.name.trim(),
            metadata: { source_capture_id: captureId },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'company_id, entity_type, name' })
          .select('id')
          .single();

        if (upsertedEntity?.id) {
          entityMap.set(ent.name.toLowerCase(), upsertedEntity.id);
        }
      }
    }

    // 5. Memory Candidate Creation (Idempotent: checks existing before inserting)
    let createdMemoryId: string | null = null;
    let memoryTier = MEMORY_TIERS.ORGANIZATIONAL;
    if (capture.visibility === 'PERSONAL' || capture.permission_info?.is_private) {
      memoryTier = MEMORY_TIERS.PERSONAL;
    } else if (teamSpaceId || capture.visibility === 'TEAM') {
      memoryTier = MEMORY_TIERS.TEAM;
    }

    const { data: existingMemory } = await supabase
      .from('clipad_v3_memories')
      .select('id')
      .eq('company_id', companyId)
      .eq('source_type', 'capture')
      .eq('source_id', captureId)
      .single();

    if (existingMemory) {
      createdMemoryId = existingMemory.id;
    } else {
      const memTitle = extractedData.possible_decisions?.length > 0
        ? `Decision: ${extractedData.possible_decisions[0]}`
        : `Insight: ${processingTitle}`;

      const { data: newMemory, error: memErr } = await supabase
        .from('clipad_v3_memories')
        .insert({
          company_id: companyId,
          user_id: userId,
          team_space_id: teamSpaceId,
          memory_tier: memoryTier,
          memory_type: extractedData.possible_decisions?.length > 0 ? MEMORY_TYPES.DECISION : MEMORY_TYPES.FACT,
          title: memTitle,
          content: processingContent.substring(0, 4000),
          summary: extractedData.memory_summary || processingTitle,
          confidence_score: extractedData.confidence ?? 0.85,
          importance: extractedData.importance ?? 0.50,
          source_type: 'capture',
          source_id: captureId,
          source_url: capture.metadata?.url || null,
          permissions_policy: {
            visibility: capture.visibility,
            is_private: capture.permission_info?.is_private || false,
          },
          is_active: true,
          metadata: {
            capture_type: capture.capture_type,
            extracted_topics: extractedData.topics || [],
          },
        })
        .select('id')
        .single();

      if (!memErr && newMemory) {
        createdMemoryId = newMemory.id;
      }
    }

    // 6. Smart Moments Creation (Idempotent: only inserts if not already created for this video & content)
    const smartMomentsCreated: string[] = [];
    if (videoId && (extractedData.possible_decisions?.length > 0 || extractedData.possible_actions?.length > 0)) {
      for (const dec of (extractedData.possible_decisions || [])) {
        const { data: existingMoment } = await supabase
          .from('clipad_v3_smart_moments')
          .select('id')
          .eq('company_id', companyId)
          .eq('video_id', videoId)
          .eq('content', dec)
          .single();

        if (existingMoment) {
          smartMomentsCreated.push(existingMoment.id);
        } else {
          const { data: moment } = await supabase
            .from('clipad_v3_smart_moments')
            .insert({
              company_id: companyId,
              video_id: videoId,
              moment_type: 'DECISION',
              title: dec.substring(0, 120),
              description: dec,
              content: dec,
              confidence: 0.90,
              importance: 0.80,
              status: 'detected',
              created_by: userId,
            })
            .select('id')
            .single();
          if (moment?.id) smartMomentsCreated.push(moment.id);
        }
      }

      for (const act of (extractedData.possible_actions || [])) {
        const { data: existingMoment } = await supabase
          .from('clipad_v3_smart_moments')
          .select('id')
          .eq('company_id', companyId)
          .eq('video_id', videoId)
          .eq('content', act)
          .single();

        if (existingMoment) {
          smartMomentsCreated.push(existingMoment.id);
        } else {
          const { data: moment } = await supabase
            .from('clipad_v3_smart_moments')
            .insert({
              company_id: companyId,
              video_id: videoId,
              moment_type: 'ACTION',
              title: act.substring(0, 120),
              description: act,
              content: act,
              confidence: 0.85,
              importance: 0.70,
              status: 'detected',
              created_by: userId,
            })
            .select('id')
            .single();
          if (moment?.id) smartMomentsCreated.push(moment.id);
        }
      }
    }

    // 7. Finalize Queue Job with lease ownership verification
    const processingMetadata = {
      worker_id: workerId,
      memory_id: createdMemoryId,
      smart_moments: smartMomentsCreated,
      entities_extracted: Array.from(entityMap.keys()),
      topics: extractedData.topics || [],
      completed_at: new Date().toISOString(),
    };

    const { data: finalizedOk } = await supabase.rpc('finalize_capture_job', {
      p_job_id: jobId,
      p_status: 'completed',
      p_worker_id: workerId,
      p_processing_metadata: processingMetadata,
    });

    if (finalizedOk === false) {
      console.warn(`[process-capture] Lease lost for job ${jobId} (worker: ${workerId}); finalization skipped.`);
    }

    // Update capture metadata
    await supabase
      .from('clipad_v3_captures')
      .update({
        metadata: {
          ...capture.metadata,
          extracted_topics: extractedData.topics || [],
          memory_candidate_id: createdMemoryId,
          smart_moments_count: smartMomentsCreated.length,
        },
      })
      .eq('id', captureId);

    return new Response(
      JSON.stringify({
        status: 'success',
        job_id: jobId,
        capture_id: captureId,
        memory_id: createdMemoryId,
        smart_moments_count: smartMomentsCreated.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[process-capture] Worker Exception:', error);

    // If an active job was claimed, report failure with exponential backoff
    if (activeJobId) {
      await supabase.rpc('finalize_capture_job', {
        p_job_id: activeJobId,
        p_status: 'failed',
        p_worker_id: workerId,
        p_error_message: error.message || 'Worker execution failed',
        p_error_stack: error.stack || null,
      }).catch((rpcErr: any) => console.error('Failed to report job failure:', rpcErr));
    }

    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message || 'Capture worker execution failed.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
