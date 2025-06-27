export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const { name, email, message } = JSON.parse(event.body)

  const SUPABASE_URL = 'https://stoic-fellowship.supabase.co'
  const SUPABASE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZmZpeHBwYWt2d3ZpeWx5d3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzM2MDUsImV4cCI6MjA2NjU0OTYwNX0.md7vm--TLrnVr4KP4ghVAQS8b3URpqr_80ePlYF_u9M' // or service role key for secure inserts

  const BREVO_API_KEY = process.env.BREVO_API_KEY

  try {
    // Save to Supabase
    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/contact_submissions`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ name, email, message }),
      }
    )

    if (!supabaseRes.ok) {
      const err = await supabaseRes.text()
      throw new Error(`Supabase error: ${err}`)
    }

    // Send Brevo Email
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'The Stoic Fellowship',
          email: 'noreply@stoicfellowship.com',
        },
        to: [{ email: 'board@stoicfellowship.com', name: 'TSF Board' }],
        subject: 'New Contact Form Submission',
        htmlContent: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong><br>${message}</p>
        `,
      }),
    })

    if (!brevoRes.ok) {
      const err = await brevoRes.text()
      throw new Error(`Brevo error: ${err}`)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    }
  } catch (err) {
    console.error('Function error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
