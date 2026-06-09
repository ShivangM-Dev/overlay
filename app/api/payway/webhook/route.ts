// app/api/payway/webhook/route.ts
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client with the Service Role Key to bypass RLS policies on the server
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // ABA PayWay sends the signature in the headers
    const receivedSignature = req.headers.get('x-payway-hmac-sha512');
    const secretKey = process.env.PAYWAY_SECRET_KEY!;

    // 1. Sort the payload keys alphabetically (Required by PayWay spec)
    const sortedKeys = Object.keys(payload).sort();
    
    // 2. Concatenate all values into a single string
    let b4hash = '';
    for (const key of sortedKeys) {
      let value = payload[key];
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      b4hash += value;
    }

    // 3. Generate the HMAC-SHA512 hash
    const signature = crypto
      .createHmac('sha512', secretKey)
      .update(b4hash)
      .digest('base64');

    // 4. Verify authenticity
    if (signature !== receivedSignature) {
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
    }

    // 5. If valid, insert the transaction into Supabase
    // Map PayWay's payload fields to your database schema
    const { error } = await supabase
      .from('donations')
      .insert({
        donor_name: payload.firstname || 'Anonymous Viewer',
        amount: parseFloat(payload.amount),
        message: 'Thanks for the stream!', // Or pull from custom PayWay fields if configured
      });

    if (error) throw error;

    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}