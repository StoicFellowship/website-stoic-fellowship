const log = require('logToConsole')
const setDefaultConsentState = require('setDefaultConsentState')
const updateConsentState = require('updateConsentState')
const setInWindow = require('setInWindow')
const copyFromWindow = require('copyFromWindow')
const injectScript = require('injectScript')
const gtagSet = require('gtagSet')
const createQueue = require('createQueue')
const getCookieValues = require('getCookieValues')

const dataLayerPush = createQueue('dataLayer')

const CONSENT_KEYS = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'personalization_storage',
  'functionality_storage',
  'security_storage',
]

const isConsentEqual = (lhs, rhs) => {
  for (const key of CONSENT_KEYS) {
    if (lhs[key] !== rhs[key]) {
      return false
    }
  }

  return true
}

let lastConsent = null

const ezUpdateConsentState = (consentState) => {
  const isDuplicate =
    lastConsent !== null && isConsentEqual(lastConsent, consentState)
  if (consentState && !isDuplicate) {
    updateConsentState(consentState)
    dataLayerPush({ event: 'enzuzo_consent_update' })
    lastConsent = consentState
  }
}

const setConsentStateFromWindow = () => {
  const consentState = copyFromWindow('enzuzoGtmConsentObj')
  ezUpdateConsentState(consentState)
}

const getWaitForUpdateTime = () => {
  return data.waitForUpdateTime || 1000
}

const getConsentCookie = (name) => {
  const values = getCookieValues(name)

  for (const v of values) {
    if (v === 'true') {
      return true
    }
    if (v === 'false') {
      return false
    }
  }

  return null
}

const getCookieConsentState = () => {
  const functional = getConsentCookie('cookies-functional')
    ? 'granted'
    : 'denied'
  const marketing = getConsentCookie('cookies-marketing') ? 'granted' : 'denied'
  const analytics = getConsentCookie('cookies-analytics') ? 'granted' : 'denied'
  const preferences = getConsentCookie('cookies-preferences')
    ? 'granted'
    : 'denied'

  return {
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    analytics_storage: analytics,
    personalization_storage: preferences,
    functionality_storage: functional,
    security_storage: functional,
  }
}

const getDefaultConsentState = () => {
  return {
    ad_storage: data.default_ad_storage || 'denied',
    ad_user_data: data.default_ad_user_data || 'denied',
    ad_personalization: data.default_ad_personalization || 'denied',
    analytics_storage: data.default_analytics_storage || 'denied',
    personalization_storage: data.default_personalization_storage || 'denied',
    functionality_storage: data.default_functionality_storage || 'granted',
    security_storage: data.default_security_storage || 'granted',
    wait_for_update: getWaitForUpdateTime(),
  }
}

const getRegionalOverride = (override) => {
  return {
    ad_storage: override.ad_storage,
    ad_user_data: override.ad_user_data,
    ad_personalization: override.ad_personalization,
    analytics_storage: override.analytics_storage,
    personalization_storage: override.personalization_storage,
    functionality_storage: override.functionality_storage,
    security_storage: override.security_storage,
    region: [override.region],
    wait_for_update: getWaitForUpdateTime(),
  }
}

setDefaultConsentState(getDefaultConsentState())

if (data.regionalOverrides) {
  for (const override of data.regionalOverrides) {
    setDefaultConsentState(getRegionalOverride(override))
  }
}

const cookieConsentPresent = getConsentCookie('cookies-functional') !== null
if (cookieConsentPresent) {
  ezUpdateConsentState(getCookieConsentState())
}

if (!data.noScriptInject) {
  injectScript(data.scriptUrl)
}

setInWindow('enzuzoGtmConsent', () => {
  setConsentStateFromWindow()
})

setInWindow('enzuzoGtmTemplateVersion', 2)

gtagSet('developer_id.dNTg2Nz', true)
gtagSet('url_passthrough', data.urlPassthrough)
gtagSet('ads_data_redaction', data.adRedaction)

// Call data.gtmOnSuccess when the tag is finished.
data.gtmOnSuccess()
