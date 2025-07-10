// /netlify/functions/get-ipinfo-token.js
exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: process.env.IPINFO_TOKEN }),
  }
}
