const fetch = require('node-fetch')

const txt = (val) => [{ text: { content: String(val ?? '').slice(0, 2000) } }]

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Parse data from request
  const {
    name,
    email,
    location,
    latitude,
    longitude,
    preferred_language,
    meeting_preference,
    additional_details,
    consent,
  } = JSON.parse(event.body)

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const NOTION_API_KEY = process.env.NOTION_API_KEY
  const NOTION_JOIN_STOA_DB_ID = process.env.NOTION_JOIN_STOA_DB_ID

  // get submitter's IP from Netlify headers
  const ip_address =
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    'unknown'

  try {
    // Save to Supabase
    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/join_stoa_submissions`,
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
          location,
          latitude,
          longitude,
          preferred_language,
          meeting_preference,
          additional_details,
          consent,
          ip_address,
          submitted_at: new Date().toISOString(),
        }),
      }
    )

    if (!supabaseRes.ok) {
      const err = await supabaseRes.text()
      throw new Error(`Supabase error: ${err}`)
    }

    // Save to Notion (non-fatal)
    if (NOTION_API_KEY && NOTION_JOIN_STOA_DB_ID) {
      try {
        const notionRes = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent: { database_id: NOTION_JOIN_STOA_DB_ID },
            properties: {
              Name: { title: txt(name) },
              Email: { email: email || null },
              Location: { rich_text: txt(location) },
              Latitude: { number: latitude ?? null },
              Longitude: { number: longitude ?? null },
              'Preferred Language': { rich_text: txt(preferred_language) },
              'Meeting Preference': { rich_text: txt(meeting_preference) },
              'Additional Details': { rich_text: txt(additional_details) },
              Consent: { checkbox: !!consent },
              'IP Address': { rich_text: txt(ip_address) },
              'Submitted At': { date: { start: new Date().toISOString() } },
            },
          }),
        })
        if (!notionRes.ok) {
          const err = await notionRes.text()
          console.warn('Notion error (non-fatal):', err)
        }
      } catch (notionErr) {
        console.warn('Notion error (non-fatal):', notionErr.message)
      }
    }

    // send notification via Brevo
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
        subject: 'New Join a Stoa Submission',
        htmlContent: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Latitude:</strong> ${latitude}</p>
          <p><strong>Longitude:</strong> ${longitude}</p>
          <p><strong>Preferred Language:</strong> ${preferred_language}</p>
          <p><strong>Meeting Preference:</strong> ${meeting_preference}</p>
          <p><strong>Additional Details:</strong> ${additional_details}</p>
          <p><strong>Consent:</strong> ${consent ? 'Yes' : 'No'}</p>
          <p><strong>IP Address:</strong> ${ip_address}</p>
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
    console.error('Function error:', err.message, err.stack)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
