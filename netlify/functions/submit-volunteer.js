const fetch = require('node-fetch')
const { Buffer } = require('buffer')

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY

  const ip = event.headers['x-nf-client-connection-ip'] || 'unknown'

  try {
    const {
      resume_base64,
      resume_filename,
      resume_mime_type,
      ...applicantData
    } = JSON.parse(event.body)

    // Decode the base64 file content
    const buffer = Buffer.from(resume_base64, 'base64')

    const storagePath = `resumes/${Date.now()}_${resume_filename}`

    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/resumes/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': resume_mime_type,
          'Content-Length': buffer.length,
          'x-upsert': 'false',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: buffer,
      }
    )

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      console.error('Upload error:', err)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Resume upload failed: ${err}` }),
      }
    }

    // Build public URL to uploaded file
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/resumes/${storagePath}`

    // Insert into volunteer_applications table
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
          resume_url: publicUrl,
          resume_filename,
          resume_mime_type,
        }),
      }
    )

    if (!supabaseRes.ok) {
      const err = await supabaseRes.text()
      console.error('Supabase insert error:', err)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Supabase insert failed: ${err}` }),
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    }
  } catch (err) {
    console.error('Volunteer submit error:', err.message)
    console.error('Stack:', err.stack)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
