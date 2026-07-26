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

const DEFAULT_VIEW = { center: [-25, 20], zoom: 1.6 }

// Framing is overridable so the embed (embed/map.html) can zoom out to suit a
// short iframe without changing how the map looks on the site itself. A page
// can set window.TSF_MAP_VIEW, and the URL wins over that so the framing can be
// tuned straight from the embed's src without a deploy. See CLAUDE.md.
function resolveView() {
  const view = { ...DEFAULT_VIEW, ...(window.TSF_MAP_VIEW || {}) }
  const params = new URLSearchParams(window.location.search)

  const zoom = Number(params.get('zoom'))
  if (params.get('zoom') && Number.isFinite(zoom)) view.zoom = zoom

  const center = (params.get('center') || '').split(',').map(Number)
  if (center.length === 2 && center.every(Number.isFinite)) view.center = center

  return view
}

;(async function initializeMap() {
  try {
    mapboxgl.accessToken = await fetchMapboxToken()

    const { center, zoom } = resolveView()

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v10',
      center,
      zoom,
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
          el.className = 'custom-marker stoa-marker'
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
                <circle cx="12" cy="12" r="10" fill="#E65100" />
                <rect x="9.5" y="9.5" width="5" height="5" fill="white"/>
              </svg>
            `
          }

          const isMember = stoa.status === 'Member Stoa'
          const popupClass = isMember ? 'popup-member' : 'popup-active'
          const typeLabel = isMember ? 'Member Stoa' : 'Other Active Stoa'
          const popupOffset = isMember ? 18 : 14

          new mapboxgl.Marker(el)
            .setLngLat([stoa.lng, stoa.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: popupOffset, className: popupClass, closeButton: false }).setHTML(`
                <div class="popup-body">
                  <span class="popup-type">${typeLabel}</span>
                  <h3 class="popup-name">${escape(stoa.name)}</h3>
                  <p class="popup-location">${escape(stoa.location)}</p>
                  ${stoa.language ? `<span class="popup-tag">${escape(stoa.language)}</span>` : ''}
                  ${stoa.website ? `<div><a class="popup-cta" href="${escape(stoa.website)}" target="_blank" rel="noopener">Visit Website</a></div>` : ''}
                </div>
              `)
            )
            .addTo(map)
        })

        seekers.forEach((seeker) => {
          const el = document.createElement('div')
          el.className = 'custom-marker seeker-marker'
          el.style.cursor = 'pointer'
          el.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12">
              <circle cx="12" cy="12" r="10" fill="#008080" />
            </svg>
          `

          new mapboxgl.Marker(el)
            .setLngLat([seeker.lng, seeker.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 9, className: 'popup-seeker', closeButton: false }).setHTML(`
                <div class="popup-body">
                  <span class="popup-type">Stoic Seeking a Stoa</span>
                  <p class="popup-location">${escape(seeker.location)}</p>
                  ${seeker.language ? `<span class="popup-tag">${escape(seeker.language)}</span>` : ''}
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
