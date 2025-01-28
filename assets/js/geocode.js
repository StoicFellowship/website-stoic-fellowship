window.mapboxgl.accessToken = document.addEventListener(
  'DOMContentLoaded',
  function () {
    // Ensure Mapbox token is set
    mapboxgl.accessToken =
      'pk.eyJ1Ijoic3RvaWNmZWxsb3dzaGlwIiwiYSI6ImNtNmdtcWlwdjAyd3Myam9vam5jb3RzZHYifQ.c6Z3uBQJenaRFtKSU9jG1w'
    //   'pk.eyJ1Ijoic3RvaWNmZWxsb3dzaGlwIiwiYSI6ImNtNmZiOTR6eTAzNW0ybG9yN3ExeWNkeTkifQ.YrdYpBftjfd0pBVjgUKRgw'

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
  }
)
