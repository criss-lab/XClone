import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Edge Function: send-push-notification
 * Sends FCM push notifications to one or multiple users.
 *
 * Body params:
 *   user_id?      - single recipient user UUID
 *   user_ids?     - array of recipient user UUIDs
 *   title         - notification title
 *   body          - notification body
 *   data?         - optional key-value payload
 *   image?        - optional image URL
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, user_ids, title, body, data = {}, image } = await req.json();

    const targetUserIds: string[] = user_ids ?? (user_id ? [user_id] : []);
    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No target users specified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch FCM tokens for all target users
    const { data: tokenRows, error: tokenError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token, user_id')
      .in('user_id', targetUserIds);

    if (tokenError) throw new Error(`DB error: ${tokenError.message}`);
    if (!tokenRows || tokenRows.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No FCM tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY');
    if (!FIREBASE_SERVER_KEY) throw new Error('FIREBASE_SERVER_KEY not configured');

    const tokens = tokenRows.map(r => r.token);

    // Build FCM payload (legacy HTTP API — supports both single & multi-cast)
    const fcmPayload = {
      registration_ids: tokens,
      notification: {
        title,
        body,
        ...(image ? { image } : {}),
        sound: 'default',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: 'default',
          notification_priority: 'PRIORITY_HIGH',
        },
      },
    };

    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmResult = await fcmResponse.json();
    console.log('[FCM] Result:', JSON.stringify(fcmResult));

    if (!fcmResponse.ok) {
      throw new Error(`FCM error: ${JSON.stringify(fcmResult)}`);
    }

    // Remove invalid/unregistered tokens
    if (fcmResult.results) {
      const invalidTokens: string[] = [];
      fcmResult.results.forEach((result: any, i: number) => {
        if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
          invalidTokens.push(tokens[i]);
        }
      });
      if (invalidTokens.length > 0) {
        await supabaseAdmin
          .from('fcm_tokens')
          .delete()
          .in('token', invalidTokens);
        console.log(`[FCM] Removed ${invalidTokens.length} invalid tokens`);
      }
    }

    return new Response(
      JSON.stringify({
        sent: fcmResult.success ?? 0,
        failed: fcmResult.failure ?? 0,
        tokens_count: tokens.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[send-push-notification] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
