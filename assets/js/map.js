// Fetch Mapbox and IPinfo tokens from Netlify functions
async function fetchTokens() {
  const [mapboxRes, ipinfoRes] = await Promise.all([
    fetch('/.netlify/functions/get-mapbox-token'),
    fetch('/.netlify/functions/get-ipinfo-token'),
  ])

  if (!mapboxRes.ok || !ipinfoRes.ok) {
    throw new Error('Failed to load one or more tokens')
  }

  const mapboxData = await mapboxRes.json()
  const ipinfoData = await ipinfoRes.json()

  return {
    mapboxToken: mapboxData.token,
    ipinfoToken: ipinfoData.token,
  }
}

// Fetch user location using IPinfo token
async function fetchUserLocation(ipinfoToken) {
  try {
    const response = await fetch(`https://ipinfo.io/json?token=${ipinfoToken}`)
    if (!response.ok) throw new Error('Failed to fetch location')
    const data = await response.json()

    const [lat, lng] = data.loc.split(',')

    console.log(`User's perceived location: Latitude ${lat}, Longitude ${lng}`)
    return { lat: parseFloat(lat), lng: parseFloat(lng) }
  } catch (error) {
    console.error('Error fetching user location:', error)
    return { lat: 37.8, lng: -96 }
  }
}

// Main map initialization
;(async function initializeMap() {
  try {
    const { mapboxToken, ipinfoToken } = await fetchTokens()
    mapboxgl.accessToken = mapboxToken

    const userLocation = await fetchUserLocation(ipinfoToken)

    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v10',
      center: [userLocation.lng, userLocation.lat],
      zoom: 4,
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

    fetch('assets/locations.geojson')
      .then((response) => response.json())
      .then((data) => {
        data.features.forEach((feature) => {
          const el = document.createElement('div')
          el.className = 'custom-marker'

          if (feature.properties['Stoa Membership Type'] === 'Member') {
            el.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                <circle cx="12" cy="12" r="10" fill="#ff7066" />
                <path d="M12 4.5l1.76 5.44h5.72l-4.63 3.37 1.76 5.44-4.63-3.37-4.63 3.37 1.76-5.44-4.63-3.37h5.72L12 4.5z" fill="white"/>
              </svg>
            `
          } else {
            el.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <circle cx="12" cy="12" r="10" fill="#66023C" />
                <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-family="Arial" font-weight="bold"></text>
              </svg>
            `
          }

          el.style.cursor = 'pointer'

          new mapboxgl.Marker(el)
            .setLngLat(feature.geometry.coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div>
                  <h3>${feature.properties['Stoa Name']}</h3>
                  <p><strong>City:</strong> ${feature.properties['Stoa City']}</p>
                  <p><strong>State:</strong> ${feature.properties['Stoa State']}</p>
                  <p><strong>Country:</strong> ${feature.properties['Stoa Country']}</p>
                  <p><strong>Primary Language:</strong> ${feature.properties['Stoa Primary Language']}</p>
                  <a href="${feature.properties['Stoa Website']}" target="_blank">Visit Website</a>
                </div>
              `)
            )
            .addTo(map)
        })
      })
      .catch((error) => console.error('Error loading GeoJSON data:', error))
  } catch (err) {
    console.error('Failed to initialize map:', err)
  }
})()
