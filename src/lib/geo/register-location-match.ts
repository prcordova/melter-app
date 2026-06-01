import { City, State } from 'country-state-city'
import type { ICity, ICountry, IState } from 'country-state-city'

function normalizeLocationText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function findCountryByIsoCode(
  countries: ICountry[],
  countryCode: string
): ICountry | undefined {
  const code = countryCode.trim().toUpperCase()
  return countries.find((c) => c.isoCode === code)
}

export function findStateInCountry(
  states: IState[],
  input: { regionCode?: string | null; regionName?: string | null }
): IState | undefined {
  if (!states.length) return undefined

  const code = input.regionCode?.trim().toUpperCase()
  if (code) {
    const byCode = states.find((s) => s.isoCode === code)
    if (byCode) return byCode
  }

  const nameKey = input.regionName ? normalizeLocationText(input.regionName) : ''
  if (nameKey) {
    return states.find((s) => normalizeLocationText(s.name) === nameKey)
  }

  return undefined
}

export function formatRegisterCityLabel(city: ICity): string {
  return `${city.name}${city.stateCode ? ` - ${city.stateCode}` : ''}`
}

export function findCityInList(
  cities: ICity[],
  cityName: string | null | undefined,
  stateCode?: string | null
): ICity | undefined {
  if (!cityName?.trim() || !cities.length) return undefined

  const target = normalizeLocationText(cityName)
  const uf = stateCode?.trim().toUpperCase()

  const inState = uf ? cities.filter((c) => c.stateCode === uf) : cities
  const pool = inState.length > 0 ? inState : cities

  const exact = pool.find((c) => normalizeLocationText(c.name) === target)
  if (exact) return exact

  return pool.find((c) => {
    const name = normalizeLocationText(c.name)
    return name.includes(target) || target.includes(name)
  })
}

export function filterRegisterCities(cities: ICity[], query: string, limit = 50): ICity[] {
  const q = normalizeLocationText(query)
  if (q.length < 2) return []
  return cities
    .filter((c) => normalizeLocationText(c.name).includes(q))
    .slice(0, limit)
}

export function isSameRegisterCity(a: ICity | null, b: ICity | null): boolean {
  if (!a || !b) return a === b
  return (
    a.name === b.name &&
    a.stateCode === b.stateCode &&
    a.countryCode === b.countryCode &&
    a.latitude === b.latitude
  )
}

/** Valor salvo em `user.city` — sufixo UF ajuda analytics BR (ex.: "Canoas - RS"). */
export function buildStoredCityValue(
  cityName: string,
  stateIsoCode?: string | null
): string | undefined {
  const name = cityName.trim()
  if (!name) return undefined
  const uf = stateIsoCode?.trim().toUpperCase()
  if (uf) return `${name} - ${uf}`
  return name
}

export function findCountryByStoredValue(
  countries: ICountry[],
  stored?: string | null
): ICountry | undefined {
  if (!stored?.trim()) return undefined
  const trimmed = stored.trim()
  const byIso = findCountryByIsoCode(countries, trimmed)
  if (byIso) return byIso
  const key = normalizeLocationText(trimmed)
  return (
    countries.find((c) => normalizeLocationText(c.name) === key) ??
    countries.find((c) => c.isoCode === trimmed.toUpperCase())
  )
}

/** Reidrata país/estado/cidade a partir dos valores salvos em `User.country` / `User.city`. */
export function resolveStoredLocationForForm(
  countryStored: string | null | undefined,
  cityStored: string | null | undefined,
  countries: ICountry[]
): {
  country: ICountry | null
  state: IState | null
  city: ICity | null
} {
  const country = findCountryByStoredValue(countries, countryStored) ?? null
  if (!country) {
    return { country: null, state: null, city: null }
  }

  const states = State.getStatesOfCountry(country.isoCode) || []
  const cityRaw = cityStored?.trim() ?? ''
  const ufMatch = cityRaw.match(/\s-\s*([A-Z]{2})\s*$/)
  const stateCodeFromCity = ufMatch?.[1] ?? null

  let state: IState | null = null
  if (stateCodeFromCity && states.length > 0) {
    state = states.find((s) => s.isoCode === stateCodeFromCity) ?? null
  }

  const cityName = ufMatch ? cityRaw.replace(/\s-\s*[A-Z]{2}\s*$/, '').trim() : cityRaw
  const cityPool = state
    ? City.getCitiesOfState(country.isoCode, state.isoCode) || []
    : City.getCitiesOfCountry(country.isoCode) || []

  let city = findCityInList(cityPool, cityName, state?.isoCode) ?? null

  if (!state && city?.stateCode && states.length > 0) {
    state = states.find((s) => s.isoCode === city?.stateCode) ?? null
  }

  if (!city && cityName && states.length > 0) {
    for (const candidateState of states) {
      const pool = City.getCitiesOfState(country.isoCode, candidateState.isoCode) || []
      const match = findCityInList(pool, cityName, candidateState.isoCode)
      if (match) {
        city = match
        state = candidateState
        break
      }
    }
  }

  return { country, state, city }
}

/** Aplica resultado do IP geo nos selects do formulário (cadastro / preferências). */
export function applyPendingGeoToLocationForm(
  pendingGeo: {
    countryCode: string
    region?: string | null
    regionName?: string | null
    city?: string | null
  },
  countries: ICountry[],
  setters: {
    setSelectedCountry: (country: ICountry | null) => void
    setSelectedState: (state: IState | null) => void
    setSelectedCity: (city: ICity | null) => void
    setStates: (states: IState[]) => void
  }
): boolean {
  const country = findCountryByIsoCode(countries, pendingGeo.countryCode)
  if (!country) return false

  setters.setSelectedCountry(country)
  const countryStates = State.getStatesOfCountry(country.isoCode) || []
  setters.setStates(countryStates)

  const matchedState = findStateInCountry(countryStates, {
    regionCode: pendingGeo.region,
    regionName: pendingGeo.regionName,
  })
  if (matchedState) {
    setters.setSelectedState(matchedState)
  }

  const cityPool = matchedState
    ? City.getCitiesOfState(country.isoCode, matchedState.isoCode) || []
    : City.getCitiesOfCountry(country.isoCode) || []

  const matchedCity = findCityInList(
    cityPool,
    pendingGeo.city,
    matchedState?.isoCode ?? pendingGeo.region
  )
  if (matchedCity) {
    setters.setSelectedCity(matchedCity)
  }

  return Boolean(matchedCity || matchedState || country)
}
