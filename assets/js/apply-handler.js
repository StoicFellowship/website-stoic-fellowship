document
  .getElementById('volunteer-application')
  .addEventListener('submit', async (e) => {
    e.preventDefault()

    const form = e.target
    const submitBtn = form.querySelector('button[type="submit"]')

    // Disable and show spinner
    submitBtn.disabled = true
    submitBtn.textContent = 'Submitting...'
    const spinner = document.createElement('span')
    spinner.classList.add('loading-spinner')
    submitBtn.parentNode.appendChild(spinner)

    const data = {
      role_slug: form.role_slug.value,
      role_title: form.role_title.value,
      full_name: form.full_name.value,
      email: form.email.value,
      location: form.location.value,
      latitude: parseFloat(form.latitude.value),
      longitude: parseFloat(form.longitude.value),
      linkedin_url: form.linkedin.value,
      portfolio_url: form.website.value,
      why_interested: form.why_interested.value,
      hopes: form.gain_from_experience.value,
      start_date: form.start_date.value,
      hours_per_month: form.hours_per_month.value,
      user_ip: form.user_ip.value,
      timezone_offset: form.timezone_offset.value,
      browser_language: form.browser_language.value,
      user_agent: form.user_agent.value,
      // Resume fields removed for now
    }

    try {
      const res = await fetch('/.netlify/functions/submit-volunteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorMsg = await res.text()
        console.error('Volunteer submission failed:', errorMsg)
        throw new Error(errorMsg)
      }

      form.reset()
      swal(
        'Thanks!',
        'Your volunteer application has been submitted.',
        'success'
      )
      window.location.href = '/volunteer/thank-you.html'
    } catch (err) {
      console.error('Submit error:', err.message, err.stack)
      swal('Oops!', 'Something went wrong. Please try again.', 'error')
    } finally {
      spinner.remove()
      submitBtn.disabled = false
      submitBtn.textContent = 'Submit Application'
    }
  })
