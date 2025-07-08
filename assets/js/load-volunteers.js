fetch('assets/json/volunteer-opportunities.json')
  .then((res) => {
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`)
    }
    return res.json()
  })
  .then((roles) => {
    const container = document.getElementById('volunteer-container')

    if (!Array.isArray(roles)) {
      console.error('Expected an array of roles, got:', roles)
      return
    }

    // Group roles by category
    const grouped = {}
    roles.forEach((role) => {
      if (!grouped[role.category]) {
        grouped[role.category] = []
      }
      grouped[role.category].push(role)
    })

    // Render each category and its roles
    Object.entries(grouped).forEach(([category, categoryRoles]) => {
      const section = document.createElement('section')
      section.classList.add('volunteer-category')
      section.innerHTML = `<h2>${category}</h2>`

      const ul = document.createElement('ul')
      ul.classList.add('volunteer-list')

      categoryRoles.forEach((role) => {
        const li = document.createElement('li')

        const titleLink = document.createElement('a')
        titleLink.href = role.link
        titleLink.className = 'volunteer-title'
        titleLink.textContent = role.title

        const descriptionList = document.createElement('ul')
        descriptionList.className = 'volunteer-description'

        const descriptionItem = document.createElement('li')
        descriptionItem.textContent = role.description
        descriptionList.appendChild(descriptionItem)

        li.appendChild(titleLink)
        li.appendChild(descriptionList)
        ul.appendChild(li)
      })

      section.appendChild(ul)
      container.appendChild(section)
    })
  })
  .catch((err) => console.error('Error loading volunteer opportunities:', err))
