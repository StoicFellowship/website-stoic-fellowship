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

    form.reset()
    swal('Thanks!', "We'll be in touch soon.", 'success')
  } catch (err) {
    console.error(err)
    swal('Oops!', 'Something went wrong. Please try again later.', 'error')
  }
})
