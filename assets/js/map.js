async function fetchMapboxToken() {
  const res = await fetch('/.netlify/functions/get-mapbox-token')
  if (!res.ok) throw new Error('Failed to load Mapbox token')
  const { token } = await res.json()
  return token
}

function escape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

;(async function initializeMap() {
  try {
    mapboxgl.accessToken = await fetchMapboxToken()

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v10',
      center: [-25, 20],
      zoom: 1.6,
      attributionControl: false,
    })

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Search for a Stoa',
      marker: false,
    })

    map.addControl(geocoder, 'top-left')
    map.scrollZoom.disable()
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.touchZoomRotate.enable({ touchZoom: true, rotate: false })

    fetch('/.netlify/functions/get-map-data')
      .then((r) => r.json())
      .then(({ stoas = [], seekers = [] }) => {
        stoas.forEach((stoa) => {
          const el = document.createElement('div')
          el.className = 'custom-marker'
          el.style.cursor = 'pointer'

          if (stoa.status === 'Member Stoa') {
            el.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                <circle cx="12" cy="12" r="10" fill="#880E4F" />
                <path d="M12 4.5l1.76 5.44h5.72l-4.63 3.37 1.76 5.44-4.63-3.37-4.63 3.37 1.76-5.44-4.63-3.37h5.72L12 4.5z" fill="white"/>
              </svg>
            `
          } else {
            el.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <circle cx="12" cy="12" r="10" fill="#FF8C00" />
              </svg>
            `
          }

          new mapboxgl.Marker(el)
            .setLngLat([stoa.lng, stoa.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div>
                  <h3>${escape(stoa.name)}</h3>
                  <p>${escape(stoa.location)}</p>
                  ${stoa.language ? `<p><strong>Language:</strong> ${escape(stoa.language)}</p>` : ''}
                  ${stoa.website ? `<a href="${escape(stoa.website)}" target="_blank" rel="noopener">Visit Website</a>` : ''}
                </div>
              `)
            )
            .addTo(map)
        })

        seekers.forEach((seeker) => {
          const el = document.createElement('div')
          el.className = 'custom-marker'
          el.style.cursor = 'pointer'
          el.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12">
              <circle cx="12" cy="12" r="10" fill="#008080" />
            </svg>
          `

          new mapboxgl.Marker(el)
            .setLngLat([seeker.lng, seeker.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div>
                  <p><strong>Stoic seeking a stoa</strong></p>
                  <p>${escape(seeker.location)}</p>
                  ${seeker.language ? `<p><strong>Language preference:</strong> ${escape(seeker.language)}</p>` : ''}
                </div>
              `)
            )
            .addTo(map)
        })
      })
      .catch((error) => console.error('Error loading map data:', error))
  } catch (err) {
    console.error('Failed to initialize map:', err)
  }
})()
