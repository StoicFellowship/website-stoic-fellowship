document.forms['existing-stoa'].addEventListener('submit', async (e) => {
  e.preventDefault()

  const form = e.target

  const data = {
    stoa_name: form.stoa.value,
    stoa_type: form.stoa_type.value,
    location: form.location.value,
    latitude: form.latitude.value,
    longitude: form.longitude.value,
    website: form.website.value,
    stoa_language: form.stoa_language.value,
    timezone: form.timezone.value,
    meeting_frequency: form.meeting_frequency.value,
    description: form.description.value,
    name: form.name.value,
    email: form.email.value,
    submitted_at: new Date().toISOString(), // timestamp for traceability
  }

  try {
    // get the submit button
    const submitButton = form.querySelector('input[type="submit"]')

    // disable the button to prevent multiple clicks
    submitButton.disabled = true
    submitButton.value = 'Submitting...'

    // create and add the spinner
    const spinner = document.createElement('span')
    spinner.classList.add('loading-spinner')
    submitButton.parentNode.appendChild(spinner)

    await fetch('/.netlify/functions/submit-stoa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    form.reset()
    swal('Thanks!', "We'll be in touch soon.", 'success')
    // remove spinner
    spinner.remove()
  } catch (err) {
    console.error(err)
    swal('Oops!', 'Something went wrong. Please try again later.', 'error')
  }
})
