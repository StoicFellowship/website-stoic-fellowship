document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search)
  const slug = params.get('slug')

  fetch('/assets/json/volunteer-opportunities.json')
    .then((res) => res.json())
    .then((roles) => {
      const role = roles.find((r) => r.slug === slug)

      if (!role) {
        document.getElementById('role-container').innerHTML =
          '<p>Role not found. <a href="/volunteer">Back to Volunteer Page</a></p>'
        return
      }

      document.title = `${role.title} – Volunteer Role – The Stoic Fellowship`
      document.getElementById('role-title').textContent = role.title
      document.getElementById(
        'role-category'
      ).textContent = `Category: ${role.category}`

      // Fetch and render markdown content
      console.log('Fetching markdown from:', role.content)
      fetch(role.content)
        .then((res) => {
          if (!res.ok)
            throw new Error(`Markdown file not found: ${role.content}`)
          return res.text()
        })
        .then((markdown) => {
          document.getElementById('role-details').innerHTML =
            marked.parse(markdown)
        })
        .catch((err) => {
          console.error('Markdown fetch error:', err)
          document.getElementById('role-details').innerHTML =
            '<p>Unable to load role description.</p>'
        })

      // Apply CTA
      const applyLink = document.getElementById('apply-button')
      applyLink.href = `/volunteer/apply.html?slug=${role.slug}`
      applyLink.textContent = `Apply for ${role.title}`
    })
    .catch((err) => {
      console.error('Error loading role:', err)
      document.getElementById('role-container').innerHTML =
        '<p>Error loading this role. Please try again later.</p>'
    })
})
