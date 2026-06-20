const fetch = require('node-fetch')

const txt = (val) => [{ text: { content: String(val ?? '').slice(0, 2000) } }]

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  const NOTION_API_KEY = process.env.NOTION_API_KEY
  const NOTION_VOLUNTEER_DB_ID = process.env.NOTION_VOLUNTEER_DB_ID

  const ip = event.headers['x-nf-client-connection-ip'] || 'unknown'

  try {
    const applicantData = JSON.parse(event.body)

    // Save to Notion (primary store)
    if (!NOTION_API_KEY || !NOTION_VOLUNTEER_DB_ID) {
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
        parent: { database_id: NOTION_VOLUNTEER_DB_ID },
        properties: {
          Name: { title: txt(applicantData.full_name) },
          Email: { email: applicantData.email || null },
          'Role Title': { rich_text: txt(applicantData.role_title) },
          Location: { rich_text: txt(applicantData.location) },
          Latitude: { number: applicantData.latitude ?? null },
          Longitude: { number: applicantData.longitude ?? null },
          'LinkedIn URL': { url: applicantData.linkedin_url || null },
          'Portfolio URL': { url: applicantData.portfolio_url || null },
          'Why Interested': { rich_text: txt(applicantData.why_interested) },
          Hopes: { rich_text: txt(applicantData.hopes) },
          'Start Date': { date: applicantData.start_date ? { start: applicantData.start_date } : null },
          'Hours Per Month': { rich_text: txt(applicantData.hours_per_month) },
          'Timezone Offset': { rich_text: txt(applicantData.timezone_offset) },
          'Browser Language': { rich_text: txt(applicantData.browser_language) },
          'User Agent': { rich_text: txt(applicantData.user_agent) },
          'User IP': { rich_text: txt(ip) },
          'Submitted At': { date: { start: new Date().toISOString() } },
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
          console.warn('Supabase error (non-fatal):', await supabaseRes.text())
        }
      } catch (supabaseErr) {
        console.warn('Supabase error (non-fatal):', supabaseErr.message)
      }
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

    // Send via Brevo (non-fatal)
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
            subject: 'New Volunteer Application Submission',
            htmlContent,
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
    console.error('Volunteer submit error:', err.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
