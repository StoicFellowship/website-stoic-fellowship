const fetch = require('node-fetch')

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

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY
  const BREVO_API_KEY = process.env.BREVO_API_KEY

  try {
    // Save to Supabase
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
        }),
      }
    )

    if (!supabaseRes.ok) {
      const err = await supabaseRes.json()
      throw new Error(`Supabase error: ${JSON.stringify(err)}`)
    }

    // Send Brevo notification
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
        to: [{ email: 'nick@stoicfellowship.com', name: 'TSF Board' }],
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
        `,
      }),
    })

    if (!brevoRes.ok) {
      const err = await brevoRes.json()
      throw new Error(`Brevo error: ${JSON.stringify(err)}`)
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
