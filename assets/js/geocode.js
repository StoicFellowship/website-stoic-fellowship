document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Fetch Mapbox token from Netlify serverless function
    const response = await fetch('/.netlify/functions/get-mapbox-token')
    if (!response.ok) throw new Error('Failed to fetch Mapbox token')

    const data = await response.json()
    mapboxgl.accessToken = data.token

    // Initialize geocoder
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Search for a location...',
      types: 'place,region,country',
    })

    // Append geocoder to the form
    const geocoderContainer = document.getElementById('form-geocoder-container')
    if (geocoderContainer) {
      geocoderContainer.appendChild(geocoder.onAdd())
    } else {
      console.error('Geocoder container not found!')
    }

    // Capture geocoder selection
    geocoder.on('result', function (e) {
      const locationName = e.result.place_name
      const [longitude, latitude] = e.result.center

      console.log('Geocoder Result:', e.result)

      // Update hidden input fields
      document.getElementById('location').value = locationName
      document.getElementById('latitude').value = latitude
      document.getElementById('longitude').value = longitude
    })

    // Expose geocoder globally for debugging
    window.geocoder = geocoder
  } catch (error) {
    console.error('Error initializing geocoder:', error)
  }
})
