import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_FEEDBACK_EMAIL = 'navisingh210@gmail.com';
const BREVO_VERIFIED_SENDER = 'naveenofficial210@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, category = 'general', userName, userEmail, userId } = body;

    const cleanMessage = message?.trim();
    if (!cleanMessage) {
      return NextResponse.json({ success: false, error: 'Feedback message cannot be empty' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'flatsync-psi.vercel.app';
    const origin = host.includes('localhost') ? 'http://localhost:3000' : `https://${host}`;

    // 1. Try sending email to navisingh210@gmail.com via FormSubmit AJAX service
    try {
      await fetch(`https://formsubmit.co/ajax/${ADMIN_FEEDBACK_EMAIL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': origin,
          'Referer': `${origin}/`,
        },
        body: JSON.stringify({
          _subject: `[GrocerySync Feedback] ${category.toUpperCase()} from ${userName || 'User'}`,
          _captcha: 'false',
          _template: 'table',
          'User Name': userName || 'Anonymous',
          'User Email': userEmail || 'Not provided',
          'Category': category,
          'Feedback Message': cleanMessage,
          'Submitted At': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        }),
      });
    } catch (mailErr) {
      console.warn('FormSubmit email forwarding warning:', mailErr);
    }

    // 1b. Send via Brevo API if key is available
    const brevoKey = process.env.BREVO_API_KEY;
    if (brevoKey) {
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': brevoKey,
            'accept': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'GrocerySync', email: BREVO_VERIFIED_SENDER },
            to: [{ email: ADMIN_FEEDBACK_EMAIL, name: 'Admin' }],
            subject: `[GrocerySync Feedback] ${category.toUpperCase()} from ${userName || 'User'}`,
            htmlContent: `
              <h2>New GrocerySync Feedback</h2>
              <p><strong>From:</strong> ${userName || 'Anonymous'} (${userEmail || 'No email'})</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Message:</strong></p>
              <blockquote style="background:#f4f4f5;padding:12px;border-radius:8px;">${cleanMessage.replace(/\n/g, '<br/>')}</blockquote>
              <p style="color:#71717a;font-size:12px;">Submitted at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
            `,
          }),
        });
      } catch (brevoErr) {
        console.warn('Brevo email error:', brevoErr);
      }
    }

    // 2. If RESEND_API_KEY is configured, dispatch direct email via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'GrocerySync Feedback <onboarding@resend.dev>',
            to: [ADMIN_FEEDBACK_EMAIL],
            subject: `[GrocerySync Feedback] ${category.toUpperCase()} from ${userName || 'User'}`,
            html: `
              <h2>New GrocerySync Feedback</h2>
              <p><strong>From:</strong> ${userName || 'Anonymous'} (${userEmail || 'No email'})</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Message:</strong></p>
              <blockquote style="background:#f4f4f5;padding:12px;border-radius:8px;">${cleanMessage.replace(/\n/g, '<br/>')}</blockquote>
              <p style="color:#71717a;font-size:12px;">Submitted at ${new Date().toISOString()}</p>
            `,
          }),
        });
      } catch (resendErr) {
        console.warn('Resend email error:', resendErr);
      }
    }

    // 3. Backup to Supabase 'feedback' table if exists
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const supabase = createClient(url, key, { auth: { persistSession: false } });
        await supabase.from('feedback').insert({
          user_id: userId || null,
          user_name: userName || null,
          user_email: userEmail || null,
          category,
          message: cleanMessage,
        });
      }
    } catch (_) {
      // Table might not exist yet; silent ignore
    }

    // Return success without disclosing admin email to the client
    return NextResponse.json({ success: true, message: 'Successfully submitted' });
  } catch (err: any) {
    console.error('Feedback submission error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to submit feedback' }, { status: 500 });
  }
}
