const fetch = require('node-fetch')

const txt = (val) => [{ text: { content: String(val ?? '').slice(0, 2000) } }]

// Notion select options can't contain commas and must be non-empty.
const select = (val) => {
  const name = String(val ?? '').replace(/,/g, ' ').trim().slice(0, 100)
  return { select: name ? { name } : null }
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const {
    stoa_name,
    stoa_type,
    location,
    latitude,
    longitude,
    website,
    stoa_language,
    timezone,
    meeting_frequency,
    description,
    name,
    email,
    submitted_at,
  } = JSON.parse(event.body)

  const ip = event.headers['x-nf-client-connection-ip'] || 'unknown'

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const NOTION_API_KEY = process.env.NOTION_API_KEY
  const NOTION_STOA_DB_ID = process.env.NOTION_STOA_DB_ID

  try {
    // Save to Notion (primary store)
    if (!NOTION_API_KEY || !NOTION_STOA_DB_ID) {
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
        parent: { database_id: NOTION_STOA_DB_ID },
        properties: {
          Name: { title: txt(stoa_name) },
          'Stoa Type': select(stoa_type),
          Location: { rich_text: txt(location) },
          Latitude: { number: latitude !== '' && latitude != null ? parseFloat(latitude) : null },
          Longitude: { number: longitude !== '' && longitude != null ? parseFloat(longitude) : null },
          Website: { url: website || null },
          Language: { rich_text: txt(stoa_language) },
          Timezone: { rich_text: txt(timezone) },
          'Meeting Frequency': select(meeting_frequency),
          Description: { rich_text: txt(description) },
          Facilitator: { rich_text: txt(name) },
          Email: { email: email || null },
          'Submitted At': { date: { start: submitted_at || new Date().toISOString() } },
          'IP Address': { rich_text: txt(ip) },
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
          `${SUPABASE_URL}/rest/v1/stoa_submissions`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              stoa_name,
              stoa_type,
              location,
              latitude,
              longitude,
              website,
              stoa_language,
              timezone,
              meeting_frequency,
              description,
              name,
              email,
              submitted_at,
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

    // Send Email via Brevo (non-fatal notification)
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
            subject: 'New Stoa Submission',
            htmlContent: `
              <h2>New Stoa Application</h2>
              <p><strong>Stoa Name:</strong> ${stoa_name}</p>
              <p><strong>Type:</strong> ${stoa_type}</p>
              <p><strong>Location:</strong> ${location} (${latitude}, ${longitude})</p>
              <p><strong>Website:</strong> ${website}</p>
              <p><strong>Language:</strong> ${stoa_language}</p>
              <p><strong>Timezone:</strong> ${timezone}</p>
              <p><strong>Meeting Frequency:</strong> ${meeting_frequency}</p>
              <p><strong>Description:</strong> ${description}</p>
              <p><strong>Contact Name:</strong> ${name}</p>
              <p><strong>Contact Email:</strong> ${email}</p>
              <p><strong>Submitted At:</strong> ${submitted_at}</p>
              <p><strong>IP Address:</strong> ${ip}</p>
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
