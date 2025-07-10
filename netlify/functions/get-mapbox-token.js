exports.handler = async function () {
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: MAPBOX_TOKEN }),
  }
}
