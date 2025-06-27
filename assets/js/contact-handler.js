document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault()

  const form = e.target
  const data = {
    name: form.name.value,
    email: form.email.value,
    message: form.message.value,
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

    await fetch('/.netlify/functions/submit-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    form.reset()
    swal('Thanks!', "We'll be in touch soon.", 'success')
    // remove spinner
    spinner.remove()
    // re-enable the button
    submitButton.disabled = false
    submitButton.value = 'Submit'
  } catch (err) {
    console.error(err)
    swal('Oops!', 'Something went wrong. Please try again later.', 'error')
    // remove spinner
    spinner.remove()
    // re-enable the button
    submitButton.disabled = false
    submitButton.value = 'Submit'
  }
})
