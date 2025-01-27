// Replace 'YOUR_MAPBOX_ACCESS_TOKEN' with your actual Mapbox token
mapboxgl.accessToken =
  'pk.eyJ1Ijoic3RvaWNmZWxsb3dzaGlwIiwiYSI6ImNtNmZiOTR6eTAzNW0ybG9yN3ExeWNkeTkifQ.YrdYpBftjfd0pBVjgUKRgw'

// Function to fetch user's location based on their IP
async function fetchUserLocation() {
  try {
    const response = await fetch('https://ipinfo.io/json?token=551116e4378685') // Replace with your token
    if (!response.ok) throw new Error('Failed to fetch location')
    const data = await response.json()

    const [lat, lng] = data.loc.split(',') // Extract latitude and longitude from 'loc'

    // Log the user's perceived location
    console.log(`User's perceived location: Latitude ${lat}, Longitude ${lng}`)

    return { lat: parseFloat(lat), lng: parseFloat(lng) }
  } catch (error) {
    console.error('Error fetching user location:', error)
    return { lat: 37.8, lng: -96 } // Fallback to a default location (e.g., the center of the U.S.)
  }
}

// Initialize the map
;(async function initializeMap() {
  // Fetch the user's location
  const userLocation = await fetchUserLocation()

  // Initialize the map with user's location as the center
  const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/light-v10', // Choose a map style
    center: [userLocation.lng, userLocation.lat], // Set the user's location as the center
    zoom: 4, // Initial zoom level
    attributionControl: false,
  })

  // Add search bar (Geocoder) to the map
  const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken, // Your Mapbox access token
    mapboxgl: mapboxgl, // Reference to the Mapbox GL JS library
    placeholder: 'Search for a Stoa', // Placeholder text in the search bar
    marker: false, // Disable the default marker that Geocoder adds
  })

  // Add the Geocoder to the top-left corner of the map
  map.addControl(geocoder, 'top-left')

  // Disable scroll zoom
  map.scrollZoom.disable()

  // Add zoom controls to the map
  map.addControl(new mapboxgl.NavigationControl(), 'top-right') // 'top-right' places it in the top-right corner

  // Enable zooming with two fingers (on touch devices)
  map.touchZoomRotate.enable({
    touchZoom: true, // Allow pinch-to-zoom
    rotate: false, // Disable rotate
  })

  // Load GeoJSON data and add markers
  fetch('assets/locations.geojson') // Adjust the URL if hosting GeoJSON elsewhere
    .then((response) => response.json())
    .then((data) => {
      data.features.forEach((feature) => {
        // Create a custom SVG marker element
        const el = document.createElement('div')
        el.className = 'custom-marker'

        // Check the "type" property to decide which SVG to use
        if (feature.properties['Stoa Membership Type'] === 'Network') {
          el.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
              <circle cx="12" cy="12" r="10" fill="#ff7066" />
              <path
                  d="M12 4.5l1.76 5.44h5.72l-4.63 3.37 1.76 5.44-4.63-3.37-4.63 3.37 1.76-5.44-4.63-3.37h5.72L12 4.5z"
                  fill="white"
              />
              </svg>
          `
        } else {
          el.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <circle cx="12" cy="12" r="10" fill="#096c80" />
              <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-family="Arial" font-weight="bold"></text>
            </svg>
          `
        }

        el.style.cursor = 'pointer'

        // Create the marker with the custom element
        new mapboxgl.Marker(el)
          .setLngLat(feature.geometry.coordinates) // Set marker position
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }) // Add a popup with details
              .setHTML(`
              <div>
                  <h3>${feature.properties['Stoa Name']}</h3>
              <p style="margin: 0 0 5px;"><strong>City:</strong> ${feature.properties['Stoa City']}</p>
              <p style="margin: 0 0 5px;"><strong>State:</strong> ${feature.properties['Stoa State']}</p>
              <p style="margin: 0 0 5px;"><strong>Country:</strong> ${feature.properties['Stoa Country']}</p>
              <p style="margin: 0 0 5px;"><strong>Primary Language:</strong> ${feature.properties['Stoa Primary Language']}</p>
              <a href="${feature.properties['Stoa Website']}" target="_blank">Visit Website</a>
              </div>
            `)
          )
          .addTo(map)
      })
    })
    .catch((error) => console.error('Error loading GeoJSON data:', error))
})()
