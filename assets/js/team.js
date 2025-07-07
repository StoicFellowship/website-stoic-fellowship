fetch('assets/json/team.json')
  .then((res) => res.json())
  .then((data) => {
    const container = document.getElementById('team-container')
    data.forEach((member) => {
      const card = document.createElement('div')
      card.classList.add('team-card')
      card.innerHTML = `
        <img src="${member.photo}" alt="${member.name}" />
        <h3>${member.name}</h3>
        <p><strong>${member.role}</strong></p>
        <p>${member.title}</p>
        <div class="team-location">
            <i class="fas fa-map-marker-alt"></i> ${member.location}
        </div>
            ${
              member.link
                ? `
            <div class="team-link">
                <i class="fas fa-globe"></i> 
                <a href="${member.link}" target="_blank">
                ${member.link.replace(/^https?:\/\//, '')}
                </a>
            </div>
            `
                : ''
            }
                    `

      card.addEventListener('click', () => {
        document.getElementById('modal-name').textContent = member.name
        document.getElementById('modal-role').textContent = member.role
        document.getElementById('modal-bio').innerHTML = member.bio
        document.querySelector('.team-modal').classList.add('show')
      })
      container.appendChild(card)
    })
  })

document.querySelector('.team-modal').addEventListener('click', (e) => {
  if (e.target.classList.contains('team-modal')) {
    e.target.classList.remove('show')
  }
})

document.querySelector('.close-button').addEventListener('click', () => {
  document.querySelector('.team-modal').classList.remove('show')
})

function escapeForJson(bio) {
  return bio
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .trim()
}
