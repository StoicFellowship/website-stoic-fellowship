const fetch = require('node-fetch')

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY
  const BREVO_API_KEY = process.env.BREVO_API_KEY

  const ip = event.headers['x-nf-client-connection-ip'] || 'unknown'

  try {
    const applicantData = JSON.parse(event.body)

    // Save to Supabase
    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/volunteer_applications`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          ...applicantData,
          user_ip: ip,
        }),
      }
    )

    if (!supabaseRes.ok) {
      const err = await supabaseRes.text()
      throw new Error(`Supabase error: ${err}`)
    }

    // Format HTML email content
    const fields = Object.entries(applicantData)
      .map(
        ([key, val]) =>
          `<li><strong>${key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())}:</strong> ${val}</li>`
      )
      .join('')

    const htmlContent = `
      <h2>New Volunteer Application</h2>
      <ul>
        ${fields}
        <li><strong>User IP:</strong> ${ip}</li>
      </ul>
    `

    // Send via Brevo
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
        subject: 'New Volunteer Application Submission',
        htmlContent,
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
    console.error('Volunteer submit error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
