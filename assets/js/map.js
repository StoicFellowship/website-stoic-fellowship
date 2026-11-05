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

// Stoas and stoa seekers are geocoded from a free-text location (city-level,
// not a street address), so it's common for several entries to land on the
// exact same coordinate. Left alone, Mapbox just stacks one marker on top of
// another and the rest are invisible. GROUP_PRECISION groups entries that are
// within ~45m of each other (plenty to catch "same city" geocodes without
// merging two genuinely distinct nearby towns) so they render as a single
// badge showing a count, which "spiderfies" into individual markers on click.
// Stoas and seekers are grouped separately, so a stoa and a seeker sharing a
// spot never get merged into one ambiguous badge.
const GROUP_PRECISION = 0.0004

function groupByProximity(items) {
  const groups = []
  items.forEach((item) => {
    const group = groups.find(
      (g) => Math.abs(g.lat - item.lat) < GROUP_PRECISION && Math.abs(g.lng - item.lng) < GROUP_PRECISION
    )
    if (group) group.items.push(item)
    else groups.push({ lat: item.lat, lng: item.lng, items: [item] })
  })
  return groups
}

function buildStoaMarker(stoa) {
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

  return new mapboxgl.Marker(el)
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
}

function buildSeekerMarker(seeker) {
  const el = document.createElement('div')
  el.className = 'custom-marker seeker-marker'
  el.style.cursor = 'pointer'
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12">
      <circle cx="12" cy="12" r="10" fill="#008080" />
    </svg>
  `

  return new mapboxgl.Marker(el)
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
}

// A grouped marker shown in place of 2+ overlapping stoas/seekers. Clicking it
// "spiderfies" the group: the badge is swapped for the individual markers,
// fanned out around the shared point with thin leg lines back to it, so each
// one keeps its normal icon and popup. Clicking empty map collapses it again.
function buildClusterMarker(group, kind) {
  const count = group.items.length
  const isStoa = kind === 'stoa'
  const hasMember = isStoa && group.items.some((item) => item.status === 'Member Stoa')
  const fill = isStoa ? (hasMember ? '#880E4F' : '#E65100') : '#008080'

  const el = document.createElement('div')
  el.className = `custom-marker cluster-marker ${isStoa ? 'stoa-marker' : 'seeker-marker'}`
  el.style.cursor = 'pointer'
  el.title = isStoa
    ? `${count} stoas here — click to see each one`
    : `${count} stoics seeking a stoa here — click to see each one`
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34">
      <circle cx="12" cy="12" r="11" fill="${fill}" stroke="#fff" stroke-width="1.5" />
      <text x="12" y="16" text-anchor="middle" font-family="Dosis, sans-serif" font-size="11" font-weight="700" fill="#fff">${count}</text>
    </svg>
  `

  return new mapboxgl.Marker(el).setLngLat([group.lng, group.lat])
}

// Fan-out positions for a spiderfied group, worked out in screen pixels (not
// degrees) so the ring looks the same size at any zoom level.
function spiderfyOffsets(count) {
  const radius = count <= 4 ? 34 : count <= 8 ? 46 : 58
  const offsets = []
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    offsets.push([Math.cos(angle) * radius, Math.sin(angle) * radius])
  }
  return offsets
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

    // Grouping/spiderfying needs map.project()/unproject() and a layer to draw
    // the spider legs, so markers are built once the style has finished
    // loading rather than as soon as fetch() resolves.
    map.on('load', () => {
      map.addSource('spider-legs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'spider-legs',
        type: 'line',
        source: 'spider-legs',
        paint: { 'line-color': '#999', 'line-width': 1, 'line-dasharray': [2, 2] },
      })

      let expanded = [] // currently spiderfied groups: { clusterMarker, markers, legs }

      function updateLegs() {
        const features = expanded.flatMap((g) => g.legs)
        map.getSource('spider-legs').setData({ type: 'FeatureCollection', features })
      }

      function collapseAll() {
        if (!expanded.length) return
        expanded.forEach((g) => {
          g.markers.forEach((m) => m.remove())
          g.clusterMarker.addTo(map)
        })
        expanded = []
        updateLegs()
      }

      function expandGroup(group, clusterMarker, buildMarkerFn) {
        collapseAll()

        clusterMarker.remove()
        const origin = map.project([group.lng, group.lat])
        const offsets = spiderfyOffsets(group.items.length)

        const markers = []
        const legs = []
        group.items.forEach((item, i) => {
          const [dx, dy] = offsets[i]
          const point = map.unproject([origin.x + dx, origin.y + dy])
          const marker = buildMarkerFn(item).setLngLat(point)
          marker.addTo(map)
          markers.push(marker)
          legs.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [group.lng, group.lat],
                [point.lng, point.lat],
              ],
            },
          })
        })

        expanded.push({ clusterMarker, markers, legs })
        updateLegs()
      }

      // Clicking empty map (not a marker) collapses any open spiderfied group.
      map.on('click', () => collapseAll())

      function renderGroups(groups, kind, buildMarkerFn) {
        groups.forEach((group) => {
          if (group.items.length === 1) {
            buildMarkerFn(group.items[0]).addTo(map)
            return
          }

          const clusterMarker = buildClusterMarker(group, kind).addTo(map)
          clusterMarker.getElement().addEventListener('click', (e) => {
            e.stopPropagation() // don't let this reach the map's own click handler and collapse it right back
            expandGroup(group, clusterMarker, buildMarkerFn)
          })
        })
      }

      fetch('/.netlify/functions/get-map-data')
        .then((r) => r.json())
        .then(({ stoas = [], seekers = [] }) => {
          renderGroups(groupByProximity(stoas), 'stoa', buildStoaMarker)
          renderGroups(groupByProximity(seekers), 'seeker', buildSeekerMarker)
        })
        .catch((error) => console.error('Error loading map data:', error))
    })
  } catch (err) {
    console.error('Failed to initialize map:', err)
  }
})()
