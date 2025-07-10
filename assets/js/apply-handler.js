document
  .getElementById('volunteer-application')
  .addEventListener('submit', async (e) => {
    e.preventDefault()

    const form = e.target
    const submitBtn = form.querySelector('button[type="submit"]')
    submitBtn.disabled = true
    submitBtn.textContent = 'Submitting...'

    // Add spinner
    const spinner = document.createElement('span')
    spinner.classList.add('loading-spinner')
    submitBtn.parentNode.appendChild(spinner)

    const formData = new FormData(form)
    const resumeFile = formData.get('resume')

    const reader = new FileReader()
    reader.onload = async function () {
      const base64String = reader.result.split(',')[1]

      const payload = {
        role_slug: formData.get('role_slug'),
        role_title: formData.get('role_title'),
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        location: formData.get('location'),
        latitude: parseFloat(formData.get('latitude')),
        longitude: parseFloat(formData.get('longitude')),
        linkedin_url: formData.get('linkedin'),
        portfolio_url: formData.get('website'),
        why_interested: formData.get('why_interested'),
        hopes: formData.get('gain_from_experience'),
        start_date: formData.get('start_date'),
        hours_per_month: formData.get('hours_per_month'),
        user_ip: formData.get('user_ip'),
        timezone_offset: formData.get('timezone_offset'),
        browser_language: formData.get('browser_language'),
        user_agent: formData.get('user_agent'),

        resume_base64: base64String,
        resume_filename: resumeFile.name,
        resume_mime_type: resumeFile.type,
      }

      try {
        const res = await fetch('/.netlify/functions/submit-volunteer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const errorMsg = await res.text()
          console.error('Volunteer submission failed:', errorMsg)
          throw new Error(errorMsg)
        }

        form.reset()
        alert('Application submitted successfully!')
        window.location.href = '/volunteer/thank-you.html'
      } catch (err) {
        console.error('Caught error:', err.message, err.stack)
        alert('Something went wrong. Please try again.')
      } finally {
        spinner.remove()
        submitBtn.disabled = false
        submitBtn.textContent = 'Submit Application'
      }
    }

    reader.readAsDataURL(resumeFile)
  })
