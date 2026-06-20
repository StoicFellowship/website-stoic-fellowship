const fetch = require('node-fetch')

async function queryAllPages(databaseId, filter, notionKey) {
  const results = []
  let cursor = undefined
  let hasMore = true

  while (hasMore) {
    const body = { filter, page_size: 100 }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error(`Notion query failed: ${await res.text()}`)

    const data = await res.json()
    results.push(...data.results)
    hasMore = data.has_more
    cursor = data.next_cursor
  }

  return results
}

const richText = (page, prop) => page.properties[prop]?.rich_text?.[0]?.plain_text || ''

async function geocodeLocation(query, mapboxToken) {
  if (!query || !mapboxToken) return null
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const [lng, lat] = data.features?.[0]?.center || []
    if (lat == null || lng == null) return null
    return { lat, lng }
  } catch {
    return null
  }
}

async function fillCoordinates(entries, mapboxToken) {
  await Promise.all(
    entries.map(async (e) => {
      if (e.lat != null && e.lng != null) return
      const coords = await geocodeLocation(e.location, mapboxToken)
      if (coords) Object.assign(e, coords)
    })
  )
  return entries.filter((e) => e.lat != null && e.lng != null)
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const NOTION_API_KEY = process.env.NOTION_API_KEY
  const NOTION_STOA_DB_ID = process.env.NOTION_STOA_DB_ID
  const NOTION_JOIN_STOA_DB_ID = process.env.NOTION_JOIN_STOA_DB_ID
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN

  if (!NOTION_API_KEY || !NOTION_STOA_DB_ID || !NOTION_JOIN_STOA_DB_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Notion configuration' }) }
  }

  if (event.queryStringParameters?.debug === 'schema') {
    try {
      const dbRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_STOA_DB_ID}`, {
        headers: { Authorization: `Bearer ${NOTION_API_KEY}`, 'Notion-Version': '2022-06-28' },
      })
      const db = await dbRes.json()
      const props = {}
      for (const [name, p] of Object.entries(db.properties || {})) {
        if (p.type === 'select') props[name] = { type: 'select', options: p.select.options.map((o) => o.name) }
        else if (p.type === 'status') props[name] = { type: 'status', options: p.status.options.map((o) => o.name) }
        else props[name] = { type: p.type }
      }
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(props, null, 2) }
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
  }

  try {
    const [stoaPages, seekerPages] = await Promise.all([
      queryAllPages(
        NOTION_STOA_DB_ID,
        {
          or: [
            { property: 'Status', status: { equals: 'Member Stoa' } },
            { property: 'Status', status: { equals: 'Active Stoa' } },
          ],
        },
        NOTION_API_KEY
      ),
      queryAllPages(
        NOTION_JOIN_STOA_DB_ID,
        { property: 'Status', status: { equals: 'Closed' } },
        NOTION_API_KEY
      ),
    ])

    const stoas = stoaPages.map((page) => ({
      name: page.properties['Name']?.title?.[0]?.plain_text || '',
      lat: page.properties['Latitude']?.number ?? null,
      lng: page.properties['Longitude']?.number ?? null,
      status: page.properties['Status']?.status?.name || '',
      location: richText(page, 'Location'),
      website: page.properties['Website']?.url || '',
      language: richText(page, 'Language'),
    }))

    const seekers = seekerPages.map((page) => ({
      lat: page.properties['Latitude']?.number ?? null,
      lng: page.properties['Longitude']?.number ?? null,
      location: richText(page, 'Location'),
      language: richText(page, 'Preferred Language'),
    }))

    const [resolvedStoas, resolvedSeekers] = await Promise.all([
      fillCoordinates(stoas, MAPBOX_TOKEN),
      fillCoordinates(seekers, MAPBOX_TOKEN),
    ])

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
      },
      body: JSON.stringify({ stoas: resolvedStoas, seekers: resolvedSeekers }),
    }
  } catch (err) {
    console.error('get-map-data error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load map data', detail: err.message }) }
  }
}
