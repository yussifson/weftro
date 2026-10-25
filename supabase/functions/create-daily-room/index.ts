import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Daily room names: 1-40 chars, alphanumeric + hyphens, no leading/trailing hyphens
function isValidDailyRoomName(name: string): boolean {
  if (!name || name.length < 1 || name.length > 40) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]$/.test(name) || /^[a-zA-Z0-9]$/.test(name);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      roomName, 
      privacy, 
      companyId, 
      dbId, 
      max_participants,
      action = 'create' // 'create' | 'token'
    } = await req.json()

    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY is missing')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Authenticate caller if token provided
    const authHeader = req.headers.get('Authorization')
    let callerUser = null
    let callerProfile = null

    if (authHeader && supabaseUrl && supabaseAnonKey) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user } } = await authClient.auth.getUser()
      callerUser = user

      if (callerUser && supabaseServiceKey) {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey)
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id, company_id, role')
          .eq('id', callerUser.id)
          .maybeSingle()
        callerProfile = profile
      }
    }

    // Workstream B: Meeting Access Token Issuance ('token' action)
    if (action === 'token') {
      if (!roomName || !isValidDailyRoomName(roomName)) {
        return new Response(JSON.stringify({ error: 'Valid roomName is required for token issuance' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      // Check room metadata in video_rooms to verify tenant boundary, privacy, and host status
      let roomRecord = null
      if (supabaseUrl && supabaseServiceKey) {
        const adminDb = createClient(supabaseUrl, supabaseServiceKey)
        const { data: dbRoom } = await adminDb
          .from('video_rooms')
          .select('id, company_id, host_id, privacy_type, status')
          .eq('daily_room_name', roomName)
          .maybeSingle()
        roomRecord = dbRoom
      }

      const isHost = Boolean(callerUser && roomRecord?.host_id && callerUser.id === roomRecord.host_id)
      const isPrivateRoom = roomRecord?.privacy_type === 'private' || privacy === 'private'

      // Tenant / Organization isolation check:
      // If room is attached to a company and marked private, caller must be authenticated and belong to the same company
      if (roomRecord?.company_id && isPrivateRoom) {
        if (!callerUser) {
          return new Response(JSON.stringify({ error: 'Unauthorized: Authentication required for this organization meeting' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          })
        }
        const isSuperAdmin = callerProfile?.role === 'super_admin'
        const isSameCompany = String(callerProfile?.company_id) === String(roomRecord.company_id)
        if (!isSuperAdmin && !isSameCompany) {
          return new Response(JSON.stringify({ error: 'Forbidden: You do not have access to this organization meeting' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          })
        }
      }

      // Token duration: 4 hours (14400s) for normal participants, host token bound strictly
      const tokenExp = Math.round(Date.now() / 1000) + 14400

      const meetingTokenPayload: Record<string, unknown> = {
        properties: {
          room_name: roomName,
          is_owner: isHost, // Least privilege: Only authenticated host receives is_owner=true
          exp: tokenExp,
          enable_screenshare: true,
          user_id: callerUser?.id || undefined,
          user_name: callerProfile?.full_name || callerUser?.email?.split('@')[0] || undefined
        }
      }

      const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify(meetingTokenPayload),
      })

      const tokenData = await tokenRes.json()
      if (tokenData.error) {
        console.error('Daily meeting-token error:', tokenData.error, tokenData.info)
        throw new Error(tokenData.info || tokenData.error || 'Failed to issue meeting token')
      }

      return new Response(JSON.stringify({ 
        token: tokenData.token, 
        is_owner: isHost,
        room_name: roomName,
        exp: tokenExp
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Workstream A: Room Provisioning ('create' action)
    // Security Gate: If companyId is targeted or room is private, enforce strict auth and company membership
    if (companyId || privacy === 'private') {
      if (!callerUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Authentication required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }
      if (companyId && callerProfile) {
        const isSuperAdmin = callerProfile.role === 'super_admin'
        const isSameCompany = String(callerProfile.company_id) === String(companyId)
        if (!isSuperAdmin && !isSameCompany) {
          return new Response(JSON.stringify({ error: 'Forbidden: Cannot create rooms for another company' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          })
        }
      }
    }

    // Rooms expire in 7 days so scheduled meetings always work
    const expirySeconds = Math.round(Date.now() / 1000) + 86400 * 7

    // Clean Daily room properties — only valid Daily.co API properties
    const properties: Record<string, unknown> = {
      enable_chat: true,
      enable_screenshare: true,
      enable_knocking: privacy === 'private',
      start_video_off: false,
      start_audio_off: false,
      exp: expirySeconds,
    }

    if (max_participants && typeof max_participants === 'number' && max_participants > 0) {
      properties.max_participants = max_participants;
    }

    const roomBody: Record<string, unknown> = {
      privacy: privacy === 'private' ? 'private' : 'public',
      properties,
    }

    if (roomName && isValidDailyRoomName(roomName)) {
      roomBody.name = roomName;
    }

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify(roomBody),
    })

    const room = await response.json()

    if (room.error) {
      console.error('Daily API error:', room.error, room.info)
      // If room already exists, fetch it and succeed instead of erroring!
      if (room.info && room.info.includes('already exists') && roomName) {
        const getRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
          headers: { Authorization: `Bearer ${DAILY_API_KEY}` }
        });
        const existingRoom = await getRes.json();
        if (existingRoom && existingRoom.name) {
          return new Response(JSON.stringify({ 
            url: existingRoom.url, 
            name: existingRoom.name,
            privacy: existingRoom.privacy || 'public'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
      throw new Error(room.info || room.error || 'Failed to create Daily room')
    }

    // Bypass offline mode and insert directly into Supabase using Service Role Key
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbId || '');
      const finalId = isUUID ? dbId : crypto.randomUUID()

      const insertPayload = {
        id: finalId,
        company_id: companyId || null,
        title: 'Meeting Room',
        daily_room_url: room.url,
        daily_room_name: room.name,
        host_id: callerUser?.id || null,
        status: 'active',
        privacy_type: privacy === 'private' ? 'private' : 'public',
        created_at: new Date().toISOString()
      }

      const { error: dbError } = await supabase
        .from('video_rooms')
        .upsert(insertPayload)

      if (dbError) {
        console.error('Failed to insert into video_rooms:', dbError)
      }
    }

    return new Response(JSON.stringify({ 
      url: room.url, 
      name: room.name,
      privacy: privacy === 'private' ? 'private' : 'public'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in create-daily-room:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
