document
  .getElementById('join-a-stoa-form')
  .addEventListener('submit', async (e) => {
    e.preventDefault()

    const form = e.target

    // grab values
    const data = {
      name: form.name.value,
      email: form.email.value,
      location: form.location.value,
      latitude: form.latitude.value,
      longitude: form.longitude.value,
      preferred_language: form.preferred_language.value,
      meeting_preference: form.meeting_preference.value,
      additional_details: form.details.value,
      consent: form.consent.checked,
    }

    // handle the submit button
    const submitButton = form.querySelector('input[type="submit"]')
    submitButton.disabled = true
    submitButton.value = 'Submitting...'

    const spinner = document.createElement('span')
    spinner.classList.add('loading-spinner')
    submitButton.parentNode.appendChild(spinner)

    try {
      await fetch('/.netlify/functions/submit-join-stoa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      form.reset()
      submitButton.disabled = false
      submitButton.value = 'Submit'
      spinner.remove()
      swal('Thanks!', "We'll connect you to a Stoa soon.", 'success')
    } catch (err) {
      console.error(err)
      submitButton.disabled = false
      submitButton.value = 'Submit'
      spinner.remove()
      swal('Oops!', 'Something went wrong. Please try again later.', 'error')
    }
  })
