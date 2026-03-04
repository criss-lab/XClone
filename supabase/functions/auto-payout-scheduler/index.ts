import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending payouts scheduled for today or earlier
    const { data: pendingPayouts, error: fetchError } = await supabaseClient
      .from('scheduled_payouts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${pendingPayouts?.length || 0} pending payouts to process`);

    const results = {
      processed: 0,
      failed: 0,
      total: pendingPayouts?.length || 0,
      errors: [] as string[]
    };

    // Process each payout
    for (const payout of pendingPayouts || []) {
      try {
        // Update status to processing
        await supabaseClient
          .from('scheduled_payouts')
          .update({ status: 'processing' })
          .eq('id', payout.id);

        if (payout.payment_method === 'paypal') {
          // Process PayPal payout
          const paypalResult = await processPayPalPayout(payout);
          
          if (paypalResult.success) {
            // Mark as completed
            await supabaseClient
              .from('scheduled_payouts')
              .update({
                status: 'completed',
                processed_at: new Date().toISOString()
              })
              .eq('id', payout.id);

            // Add funds back to wallet (they were deducted when scheduled)
            // Actually, we already deducted, so create completion transaction
            await supabaseClient
              .from('wallet_transactions')
              .insert({
                wallet_id: (await supabaseClient
                  .from('user_wallets')
                  .select('id')
                  .eq('user_id', payout.user_id)
                  .single()).data?.id,
                user_id: payout.user_id,
                type: 'withdrawal',
                amount: payout.amount,
                payment_method: 'paypal',
                status: 'completed',
                description: `PayPal payout completed - ${payout.paypal_email}`,
                metadata: {
                  payout_id: payout.id,
                  paypal_transaction_id: paypalResult.transactionId
                }
              });

            results.processed++;
          } else {
            throw new Error(paypalResult.error);
          }
        } else if (payout.payment_method === 'mpesa') {
          // Process M-Pesa payout
          const mpesaResult = await processMPesaPayout(payout);
          
          if (mpesaResult.success) {
            await supabaseClient
              .from('scheduled_payouts')
              .update({
                status: 'completed',
                processed_at: new Date().toISOString()
              })
              .eq('id', payout.id);

            results.processed++;
          } else {
            throw new Error(mpesaResult.error);
          }
        }
      } catch (error: any) {
        console.error(`Payout ${payout.id} failed:`, error);
        
        // Mark as failed
        await supabaseClient
          .from('scheduled_payouts')
          .update({
            status: 'failed',
            error_message: error.message,
            processed_at: new Date().toISOString()
          })
          .eq('id', payout.id);

        // Return funds to wallet
        await supabaseClient.rpc('add_to_wallet', {
          user_id_param: payout.user_id,
          amount_param: payout.amount,
          type_param: 'refund',
          description_param: `Payout failed - ${error.message}`
        });

        results.failed++;
        results.errors.push(`Payout ${payout.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Auto-payout scheduler error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function processPayPalPayout(payout: any) {
  try {
    // Get platform PayPal credentials from settings
    // In production, you'd call PayPal Payouts API here
    // const paypalResponse = await fetch('https://api-m.paypal.com/v1/payments/payouts', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${accessToken}`
    //   },
    //   body: JSON.stringify({
    //     sender_batch_header: {
    //       sender_batch_id: payout.id,
    //       email_subject: 'You have a payout!',
    //     },
    //     items: [{
    //       recipient_type: 'EMAIL',
    //       amount: {
    //         value: payout.amount.toString(),
    //         currency: 'USD'
    //       },
    //       receiver: payout.paypal_email,
    //       note: 'T Social monetization payout',
    //     }]
    //   })
    // });

    // For now, simulate success
    console.log(`PayPal payout: $${payout.amount} to ${payout.paypal_email}`);
    
    return {
      success: true,
      transactionId: `PAYPAL_${payout.id.substring(0, 8)}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function processMPesaPayout(payout: any) {
  try {
    // In production, integrate with M-Pesa API
    console.log(`M-Pesa payout: $${payout.amount} to ${payout.mpesa_phone}`);
    
    return {
      success: true,
      transactionId: `MPESA_${payout.id.substring(0, 8)}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
