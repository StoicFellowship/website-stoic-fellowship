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

// Month + year only (no numeric day) sidesteps the MM/DD vs DD/YY mix-up
// entirely, and letting the browser's own locale pick the month name/order
// means every visitor sees their own locale's month name automatically,
// without us having to guess who's looking.
function formatMonthYear(isoDate) {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long' }).format(date)
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
// Stoas and seekers are grouped together here — a spot with both shows one
// badge with the combined count (see buildClusterMarker for how its color
// reflects what's actually inside it), and clicking it spiderfies into every
// individual marker with its own icon, color and popup, so nothing is
// actually ambiguous once you open the group.
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

// The category an item counts as for cluster-coloring/labeling purposes:
// a seeker has no sub-status, while a stoa is either a member or other
// active stoa.
function categoryOf(item) {
  if (item.kind === 'seeker') return 'seeker'
  return item.status === 'Member Stoa' ? 'member' : 'active'
}

function buildStoaMarker(stoa) {
  const el = document.createElement('div')
  el.className = 'custom-marker stoa-marker'
  el.style.cursor = 'pointer'

  if (stoa.status === 'Member Stoa') {
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <circle cx="12" cy="12" r="10" fill="#66023C" />
        <path d="M12 4.5l1.76 5.44h5.72l-4.63 3.37 1.76 5.44-4.63-3.37-4.63 3.37 1.76-5.44-4.63-3.37h5.72L12 4.5z" fill="white"/>
      </svg>
    `
  } else {
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22">
        <circle cx="12" cy="12" r="10" fill="#C45A20" />
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
      <circle cx="12" cy="12" r="10" fill="#247A78" />
    </svg>
  `

  return new mapboxgl.Marker(el)
    .setLngLat([seeker.lng, seeker.lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 9, className: 'popup-seeker', closeButton: false }).setHTML(`
        <div class="popup-body">
          <span class="popup-type">Stoic Seeking a Stoa</span>
          <p class="popup-location">${escape(seeker.location)}</p>
          ${formatMonthYear(seeker.submittedAt) ? `<p class="popup-meta">Looking since ${escape(formatMonthYear(seeker.submittedAt))}</p>` : ''}
          ${seeker.language ? `<span class="popup-tag">${escape(seeker.language)}</span>` : ''}
        </div>
      `)
    )
}

// Dispatches to the right marker builder for an item coming out of a
// (possibly mixed) group — tagged with kind: 'stoa' or 'seeker' when the
// combined list was built.
function buildMarkerForItem(item) {
  return item.kind === 'seeker' ? buildSeekerMarker(item) : buildStoaMarker(item)
}

function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || `${singular}s`
}

// A grouped marker shown in place of 2+ overlapping stoas/seekers. Clicking it
// "spiderfies" the group: the badge is swapped for the individual markers,
// fanned out around the shared point with thin leg lines back to it, so each
// one keeps its normal icon and popup. Clicking empty map collapses it again.
function buildClusterMarker(group) {
  const count = group.items.length

  // A cluster badge takes on the color of what it contains: the single
  // category's color when every item in the group agrees (all member stoas,
  // all other active stoas, or all seekers), or the "mixed" slate color as
  // soon as the group spans more than one of those three categories —
  // including a stoa and a seeker sharing a spot, not just two stoa statuses.
  const categories = new Set(group.items.map(categoryOf))
  const fill =
    categories.size > 1
      ? '#505D6B'
      : categories.has('member')
      ? '#66023C'
      : categories.has('active')
      ? '#C45A20'
      : '#247A78'

  const memberCount = group.items.filter((item) => categoryOf(item) === 'member').length
  const activeCount = group.items.filter((item) => categoryOf(item) === 'active').length
  const seekerCount = group.items.filter((item) => categoryOf(item) === 'seeker').length

  const parts = []
  if (memberCount) parts.push(`${memberCount} ${pluralize(memberCount, 'member stoa')}`)
  if (activeCount) parts.push(`${activeCount} other active ${pluralize(activeCount, 'stoa')}`)
  if (seekerCount) parts.push(`${seekerCount} ${pluralize(seekerCount, 'stoic')} seeking a stoa`)

  const el = document.createElement('div')
  el.className = `custom-marker cluster-marker ${categories.size > 1 ? 'mixed-marker' : categories.has('seeker') ? 'seeker-marker' : 'stoa-marker'}`
  el.style.cursor = 'pointer'
  el.title = `${parts.join(', ')} here — click to see each one`
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
function spiderfyRadius(count) {
  return count <= 4 ? 34 : count <= 8 ? 46 : 58
}

function spiderfyOffsets(count) {
  const radius = spiderfyRadius(count)
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

    // Grouping/spiderfying needs map.project()/unproject(), so markers are
    // built once the map has finished loading rather than as soon as fetch()
    // resolves.
    map.on('load', () => {
      let expanded = [] // currently spiderfied groups: { group, clusterMarker, markers, halo }

      const ANIM_MS = 240

      // Backdrop + leg lines for a fanned-out group. A DOM marker (not a map
      // layer) so it can sit in the marker z-order: above the cluster badges
      // and single markers around it (z-index 4) but below this group's own
      // markers (5). Everything is in screen pixels around the group's point.
      function buildHalo(group, offsets, radius) {
        const size = radius * 2
        const c = radius
        const el = document.createElement('div')
        el.className = 'spider-halo'
        el.style.width = `${size}px`
        el.style.height = `${size}px`
        const lines = offsets
          .map(([dx, dy]) => `<line x1="${c}" y1="${c}" x2="${c + dx}" y2="${c + dy}" />`)
          .join('')
        el.innerHTML = `
          <div class="spider-halo-disc"></div>
          <svg class="spider-halo-legs" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${lines}</svg>
        `
        return new mapboxgl.Marker({ element: el }).setLngLat([group.lng, group.lat])
      }

      function collapseAll() {
        if (!expanded.length) return
        const closing = expanded
        expanded = []
        closing.forEach((g) => {
          // Fold the markers back into the badge point while fading the halo.
          g.markers.forEach((m) => {
            m.getElement().classList.add('spider-animating', 'spider-closing')
            m.setLngLat([g.group.lng, g.group.lat])
          })
          g.halo.getElement().classList.remove('spider-open')
          g.clusterMarker.addTo(map)
          setTimeout(() => {
            g.markers.forEach((m) => m.remove())
            g.halo.remove()
          }, ANIM_MS)
        })
      }

      function expandGroup(group, clusterMarker) {
        collapseAll()

        clusterMarker.remove()
        const origin = map.project([group.lng, group.lat])
        const offsets = spiderfyOffsets(group.items.length)
        const haloRadius = spiderfyRadius(group.items.length) + 28

        const halo = buildHalo(group, offsets, haloRadius).addTo(map)

        const markers = []
        const finalPoints = []
        group.items.forEach((item, i) => {
          const [dx, dy] = offsets[i]
          finalPoints.push(map.unproject([origin.x + dx, origin.y + dy]))
          // Start folded into the group's point and animate out to the ring.
          const marker = buildMarkerForItem(item).setLngLat([group.lng, group.lat])
          // Lifted above the halo (and every other marker) with a drop
          // shadow, via the spiderfied-marker CSS class.
          marker.getElement().classList.add('spiderfied-marker', 'spider-animating', 'spider-closing')
          marker.addTo(map)
          markers.push(marker)
        })

        // Commit the starting state, then move to the final state so the CSS
        // transitions run.
        halo.getElement().offsetWidth
        halo.getElement().classList.add('spider-open')
        markers.forEach((m, i) => {
          m.getElement().classList.remove('spider-closing')
          m.setLngLat(finalPoints[i])
        })
        // The transition is only wanted for the fan-out itself; leaving it on
        // would make markers lag behind the map while panning.
        setTimeout(() => markers.forEach((m) => m.getElement().classList.remove('spider-animating')), ANIM_MS)

        expanded.push({ group, clusterMarker, markers, halo })
      }

      // The ring is laid out in screen pixels at the zoom it was opened at, so
      // collapse when the zoom changes rather than let it drift out of shape.
      map.on('zoomstart', collapseAll)

      // Mapbox's own Marker toggles its popup through this same map 'click'
      // event (bound internally when the marker is added to the map), so we
      // can't stop the click from reaching the map without also breaking
      // popups. Instead, only collapse when the click didn't land on any
      // marker — mirroring how Mapbox itself decides whether a click was
      // "on" a marker. A click on an open group's backdrop circle also keeps
      // the group open; the map click still closes any open popup (Mapbox's
      // closeOnClick), which is the intended "dismiss the callout" behavior.
      map.on('click', (e) => {
        if (e.originalEvent.target.closest('.custom-marker, .spider-halo')) return
        collapseAll()
      })

      function renderGroups(groups) {
        groups.forEach((group) => {
          if (group.items.length === 1) {
            buildMarkerForItem(group.items[0]).addTo(map)
            return
          }

          const clusterMarker = buildClusterMarker(group).addTo(map)
          clusterMarker.getElement().addEventListener('click', () => {
            expandGroup(group, clusterMarker)
          })
        })
      }

      fetch('/.netlify/functions/get-map-data')
        .then((r) => r.json())
        .then(({ stoas = [], seekers = [] }) => {
          const items = [
            ...stoas.map((stoa) => ({ ...stoa, kind: 'stoa' })),
            ...seekers.map((seeker) => ({ ...seeker, kind: 'seeker' })),
          ]
          renderGroups(groupByProximity(items))
        })
        .catch((error) => console.error('Error loading map data:', error))
    })
  } catch (err) {
    console.error('Failed to initialize map:', err)
  }
})()
