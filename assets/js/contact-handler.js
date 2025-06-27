const SUPABASE_URL = 'https://stoic-fellowship.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZmZpeHBwYWt2d3ZpeWx5d3Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzM2MDUsImV4cCI6MjA2NjU0OTYwNX0.md7vm--TLrnVr4KP4ghVAQS8b3URpqr_80ePlYF_u9M'

document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault()

  const form = e.target
  const data = {
    name: form.name.value,
    email: form.email.value,
    message: form.message.value,
  }

  try {
    await fetch('/.netlify/functions/submit-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    form.reset()
    swal('Thanks!', "We'll be in touch soon.", 'success')
  } catch (err) {
    console.error(err)
    swal('Oops!', 'Something went wrong. Please try again later.', 'error')
  }
})
