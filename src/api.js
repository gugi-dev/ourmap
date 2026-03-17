const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

export function getProfiles() {
  return request('/profiles')
}

export function updateProfile(id, data) {
  return request(`/profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function getVisits(profileId) {
  return request(`/profiles/${profileId}/visits`)
}

export function addVisit(profileId, countryCode, countryName) {
  return request(`/profiles/${profileId}/visits`, {
    method: 'POST',
    body: JSON.stringify({ country_code: countryCode, country_name: countryName }),
  })
}

export function removeVisit(profileId, countryCode) {
  return request(`/profiles/${profileId}/visits/${countryCode}`, {
    method: 'DELETE',
  })
}

export function clearVisits(profileId) {
  return request(`/profiles/${profileId}/visits`, {
    method: 'DELETE',
  })
}
