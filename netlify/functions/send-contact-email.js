const fetch = require('node-fetch')

exports.handler = async (event) => {
  const { name, email, message } = JSON.parse(event.body)

  const apiKey = process.env.BREVO_API_KEY
  const brevoEndpoint = 'https://api.brevo.com/v3/smtp/email'

  const emailData = {
    sender: { name: 'Stoic Fellowship', email: 'noreply@stoicfellowship.com' },
    to: [{ email: 'nick@stoicfellowship.com' }],
    subject: 'New Contact Form Submission',
    htmlContent: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
  }

  try {
    const res = await fetch(brevoEndpoint, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    if (!res.ok) throw new Error(`Brevo error: ${res.status}`)

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully!' }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
