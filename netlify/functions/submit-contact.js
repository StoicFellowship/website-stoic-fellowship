const fetch = require('node-fetch')

const txt = (val) => [{ text: { content: String(val ?? '').slice(0, 2000) } }]

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const { name, email, message } = JSON.parse(event.body)

  const ip = event.headers['x-nf-client-connection-ip'] || 'unknown'

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const NOTION_API_KEY = process.env.NOTION_API_KEY
  const NOTION_CONTACT_DB_ID = process.env.NOTION_CONTACT_DB_ID

  try {
    // Save to Notion (primary store)
    if (!NOTION_API_KEY || !NOTION_CONTACT_DB_ID) {
      throw new Error('Notion not configured')
    }
    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_CONTACT_DB_ID },
        properties: {
          Name: { title: txt(name) },
          Email: { email: email || null },
          Message: { rich_text: txt(message) },
          'IP Address': { rich_text: txt(ip) },
          'Created At': { date: { start: new Date().toISOString() } },
        },
      }),
    })
    if (!notionRes.ok) {
      throw new Error(`Notion error: ${await notionRes.text()}`)
    }

    // Save to Supabase (non-fatal mirror)
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
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
            body: JSON.stringify({
              name,
              email,
              message,
              ip_address: ip,
            }),
          }
        )
        if (!supabaseRes.ok) {
          console.warn('Supabase error (non-fatal):', await supabaseRes.text())
        }
      } catch (supabaseErr) {
        console.warn('Supabase error (non-fatal):', supabaseErr.message)
      }
    }

    // Send Email via Brevo (non-fatal)
    if (BREVO_API_KEY) {
      try {
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'The Stoic Fellowship',
              email: 'noreply@stoicfellowship.com',
            },
            to: [{ email: 'hello@stoicfellowship.com', name: 'TSF Board' }],
            subject: 'New Contact Form Submission',
            htmlContent: `
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong><br>${message}</p>
              <p><strong>IP:</strong> ${ip}</p>
            `,
          }),
        })
        if (!brevoRes.ok) {
          console.warn('Brevo error (non-fatal):', await brevoRes.text())
        }
      } catch (brevoErr) {
        console.warn('Brevo error (non-fatal):', brevoErr.message)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    }
  } catch (err) {
    console.error('Function error:', err.message, err.stack)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
