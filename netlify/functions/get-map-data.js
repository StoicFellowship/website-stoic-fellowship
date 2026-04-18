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

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const NOTION_API_KEY = process.env.NOTION_API_KEY
  const NOTION_STOA_DB_ID = process.env.NOTION_STOA_DB_ID
  const NOTION_JOIN_STOA_DB_ID = process.env.NOTION_JOIN_STOA_DB_ID

  if (!NOTION_API_KEY || !NOTION_STOA_DB_ID || !NOTION_JOIN_STOA_DB_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Notion configuration' }) }
  }

  try {
    const [stoaPages, seekerPages] = await Promise.all([
      queryAllPages(
        NOTION_STOA_DB_ID,
        {
          or: [
            { property: 'Status', select: { equals: 'Member' } },
            { property: 'Status', select: { equals: 'Non-member' } },
          ],
        },
        NOTION_API_KEY
      ),
      queryAllPages(
        NOTION_JOIN_STOA_DB_ID,
        { property: 'Status', select: { equals: 'Contacted' } },
        NOTION_API_KEY
      ),
    ])

    const stoas = stoaPages
      .map((page) => {
        const lat = page.properties['Latitude']?.number
        const lng = page.properties['Longitude']?.number
        if (lat == null || lng == null) return null
        return {
          name: richText(page, 'Stoa Name'),
          lat,
          lng,
          status: page.properties['Status']?.select?.name || '',
          location: richText(page, 'Location'),
          website: page.properties['Website']?.url || '',
          language: richText(page, 'Language'),
        }
      })
      .filter(Boolean)

    const seekers = seekerPages
      .map((page) => {
        const lat = page.properties['Latitude']?.number
        const lng = page.properties['Longitude']?.number
        if (lat == null || lng == null) return null
        return {
          lat,
          lng,
          location: richText(page, 'Location'),
          language: richText(page, 'Preferred Language'),
        }
      })
      .filter(Boolean)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stoas, seekers }),
    }
  } catch (err) {
    console.error('get-map-data error:', err.message)
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load map data' }) }
  }
}
