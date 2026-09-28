// Stoa registration form (/register).
// Posts to /.netlify/functions/submit-stoa, which writes a row to the Notion
// stoa database. Field names sent here must match what submit-stoa.js reads.

const form = document.forms['existing-stoa']
const submitButton = form.querySelector('input[type="submit"]')
const submitHint = document.getElementById('submit-hint')
const termsBox = document.getElementById('terms-agreement')
const termsCheckbox = document.getElementById('terms-accepted')
const termsHint = document.getElementById('terms-hint')
const openTermsLink = document.getElementById('open-terms')
const termsDialog = document.getElementById('terms-dialog')
const termsDialogBody = document.getElementById('terms-dialog-body')
const termsAgreeButton = document.getElementById('terms-agree')
const locationError = document.getElementById('location-error')
const timezoneSelect = document.getElementById('timezone')

const MEMBER = 'Member Stoa'
const LIST_ONLY = 'Map Listing Only'

let termsOpened = false
let termsAcceptedAt = null
let termsLoaded = false

const selectedType = () =>
  (form.querySelector('input[name="registration_type"]:checked') || {}).value ||
  ''

// ---- Branching: enable/disable submit based on the registration choice ----
function updateState() {
  const type = selectedType()
  const isMember = type === MEMBER

  termsBox.hidden = !isMember
  if (!isMember) {
    termsCheckbox.checked = false
    termsAcceptedAt = null
  }
  termsCheckbox.disabled = !termsOpened
  termsHint.hidden = termsOpened

  let ready = false
  if (type === LIST_ONLY) {
    ready = true
    submitButton.value = 'Register Listing'
    submitHint.textContent = ''
  } else if (isMember) {
    ready = termsCheckbox.checked
    submitButton.value = 'Register as a Member Stoa'
    submitHint.textContent = ready
      ? ''
      : termsOpened
      ? 'Agree to the Terms and Conditions to register as a member stoa, or choose a map listing only.'
      : 'Read the Terms and Conditions to register as a member stoa, or choose a map listing only.'
  } else {
    submitButton.value = 'Register'
    submitHint.textContent = "Choose how you'd like to register to continue."
  }
  submitButton.disabled = !ready
  submitHint.hidden = ready
}

form
  .querySelectorAll('input[name="registration_type"]')
  .forEach((r) => r.addEventListener('change', updateState))

termsCheckbox.addEventListener('change', () => {
  termsAcceptedAt = termsCheckbox.checked ? new Date().toISOString() : null
  updateState()
})

// ---- Terms popup (content loaded live from the Terms and Conditions page) ----
async function loadTerms() {
  if (termsLoaded) return
  try {
    const res = await fetch('/terms-and-conditions')
    if (!res.ok) throw new Error(res.status)
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
    const section = doc.querySelector('section.wrapper') || doc.querySelector('main')
    if (!section) throw new Error('Terms content not found')
    section.querySelectorAll('script, header-template, footer-template').forEach((n) => n.remove())
    termsDialogBody.innerHTML = section.innerHTML
    termsLoaded = true
  } catch (err) {
    console.error('Could not load terms:', err)
    termsDialogBody.innerHTML =
      '<p>We couldn\'t load the Terms and Conditions here. Please ' +
      '<a href="/terms-and-conditions" target="_blank">open them in a new tab</a> ' +
      'and read them before agreeing.</p>'
  }
}

function markTermsOpened() {
  termsOpened = true
  updateState()
}

openTermsLink.addEventListener('click', (e) => {
  // Browsers without <dialog> support fall back to opening the page in a new tab.
  if (!termsDialog || typeof termsDialog.showModal !== 'function') {
    markTermsOpened()
    return
  }
  e.preventDefault()
  termsDialog.showModal()
  termsDialogBody.scrollTop = 0
  loadTerms()
  markTermsOpened()
})

termsAgreeButton.addEventListener('click', () => {
  termsCheckbox.checked = true
  termsAcceptedAt = new Date().toISOString()
  termsDialog.close()
  updateState()
})

termsDialog.querySelectorAll('[data-close]').forEach((b) =>
  b.addEventListener('click', () => termsDialog.close())
)
// Click on the backdrop closes the popup
termsDialog.addEventListener('click', (e) => {
  if (e.target === termsDialog) termsDialog.close()
})

// ---- Time zone: prefill from the visitor's browser (they can change it) ----
function prefillTimezone() {
  if (!timezoneSelect || timezoneSelect.value) return
  let tz
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (e) {
    return
  }
  if (!tz) return
  const match = Array.from(timezoneSelect.options).find((o) => o.value === tz)
  if (match) {
    match.selected = true
    return
  }
  const opt = document.createElement('option')
  opt.value = tz
  opt.textContent = `${tz.replace(/_/g, ' ')} (detected)`
  opt.dataset.detected = 'true'
  timezoneSelect.insertBefore(opt, timezoneSelect.options[1] || null)
  opt.selected = true
}

// ---- Location: required, but it lives in hidden inputs filled by the geocoder ----
function hookGeocoder(tries = 0) {
  const g = window.geocoder
  if (g && typeof g.on === 'function') {
    g.on('result', () => {
      locationError.hidden = true
    })
    g.on('clear', () => {
      form.location.value = ''
      form.latitude.value = ''
      form.longitude.value = ''
    })
  } else if (tries < 40) {
    setTimeout(() => hookGeocoder(tries + 1), 250)
  }
}

// ---- Submit ----
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  if (!form.location.value.trim()) {
    locationError.hidden = false
    document
      .getElementById('form-geocoder-container')
      .scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  const type = selectedType()
  const isMember = type === MEMBER
  if (!type || (isMember && !termsCheckbox.checked)) {
    updateState()
    return
  }

  const data = {
    stoa_name: form.stoa.value,
    stoa_type: form.meeting_preference.value,
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
    registration_type: type,
    terms_accepted: isMember && termsCheckbox.checked,
    terms_accepted_at: isMember ? termsAcceptedAt || new Date().toISOString() : null,
    submitted_at: new Date().toISOString(), // timestamp for traceability
  }

  const originalLabel = submitButton.value
  const spinner = document.createElement('span')
  spinner.classList.add('loading-spinner')

  try {
    submitButton.disabled = true
    submitButton.value = 'Submitting...'
    submitButton.parentNode.appendChild(spinner)

    const res = await fetch('/.netlify/functions/submit-stoa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json().catch(() => ({}))

    if (!res.ok || result.error) {
      throw new Error(result.error || `Submission failed (${res.status})`)
    }

    form.reset()
    termsAcceptedAt = null
    spinner.remove()
    updateState()
    prefillTimezone()
    if (window.geocoder && typeof window.geocoder.clear === 'function') {
      window.geocoder.clear()
    }
    swal(
      'Thanks!',
      isMember
        ? "We've received your registration as a member stoa. We'll be in touch soon."
        : "We've received your registration. We'll be in touch soon.",
      'success'
    )
  } catch (err) {
    console.error(err)
    swal(
      'Oops!',
      `Something went wrong submitting the form. Please try again, or email hello@stoicfellowship.com for help.\n\nDetails: ${err.message || 'unknown error'}`,
      'error'
    )
    spinner.remove()
    submitButton.value = originalLabel
    updateState()
  }
})

updateState()
prefillTimezone()
hookGeocoder()
