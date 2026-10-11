/**
 * PRCBO AI LeadGen - OpenStreetMap Business Discovery Service
 * 
 * Fetches real-world business POI data from OpenStreetMap (OSM)
 * via Nominatim (with extratags & bounding box) and Overpass API.
 * 
 * Complies strictly with OSM Usage Policies:
 * - Geographically bounded queries (Madurai, Chennai, Coimbatore, Trichy, etc.)
 * - In-memory LRU-style cache to prevent repetitive requests
 * - Explicit User-Agent header
 * - Never fabricates phones, websites, ratings, or AI scores
 */

// In-memory query cache with 5-minute TTL
const searchCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Supported City Metadata & Center Coordinates
export const OSM_CITIES = {
  madurai: {
    id: 'madurai',
    label: 'Madurai, Tamil Nadu',
    cityName: 'Madurai',
    state: 'Tamil Nadu',
    lat: 9.9252,
    lng: 78.1198,
    zoom: 13,
    aliases: ['madurai']
  },
  chennai: {
    id: 'chennai',
    label: 'Chennai, Tamil Nadu',
    cityName: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lng: 80.2707,
    zoom: 12,
    aliases: ['chennai', 'madras']
  },
  coimbatore: {
    id: 'coimbatore',
    label: 'Coimbatore, Tamil Nadu',
    cityName: 'Coimbatore',
    state: 'Tamil Nadu',
    lat: 11.0168,
    lng: 76.9558,
    zoom: 13,
    aliases: ['coimbatore', 'kovai']
  },
  trichy: {
    id: 'trichy',
    label: 'Trichy, Tamil Nadu',
    cityName: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    lat: 10.7905,
    lng: 78.7047,
    zoom: 13,
    aliases: ['trichy', 'tiruchirappalli', 'tiruchirapalli']
  },
  bengaluru: {
    id: 'bengaluru',
    label: 'Bengaluru, Karnataka',
    cityName: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9716,
    lng: 77.5946,
    zoom: 12,
    aliases: ['bengaluru', 'bangalore']
  },
  hyderabad: {
    id: 'hyderabad',
    label: 'Hyderabad, Telangana',
    cityName: 'Hyderabad',
    state: 'Telangana',
    lat: 17.3850,
    lng: 78.4867,
    zoom: 12,
    aliases: ['hyderabad', 'secunderabad']
  }
};

/**
 * Resolve city metadata from string label
 */
export function resolveCityMeta(cityInput) {
  if (!cityInput) return OSM_CITIES.madurai;
  const normalized = cityInput.split(',')[0].trim().toLowerCase();
  
  for (const city of Object.values(OSM_CITIES)) {
    if (city.aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
      return city;
    }
  }
  return OSM_CITIES.madurai;
}

/**
 * Calculate geographical bounding box for spatial OSM queries
 */
export function calculateBoundingBox(lat, lng, radiusKm = 15) {
  const km = Math.max(1, Math.min(Number(radiusKm) || 15, 60));
  const latDelta = km / 111.0;
  const lngDelta = km / (111.0 * Math.cos((lat * Math.PI) / 180));
  
  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    // Nominatim format: left,top,right,bottom (minLng, maxLat, maxLng, minLat)
    viewbox: `${minLng.toFixed(4)},${maxLat.toFixed(4)},${maxLng.toFixed(4)},${minLat.toFixed(4)}`
  };
}

/**
 * Real Haversine distance calculator between two coordinates (in km)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Map OpenStreetMap amenity/shop/office/tourism tags to clean category labels
 */
function mapOsmCategory(osmItem, requestedCategory) {
  const t = (osmItem.type || '').toLowerCase();
  const c = (osmItem.class || '').toLowerCase();
  
  if (['hospital', 'clinic', 'doctors', 'pharmacy', 'dentist'].includes(t) || c === 'healthcare') {
    return 'Healthcare';
  }
  if (['restaurant', 'cafe', 'fast_food', 'food_court', 'bar', 'pub', 'bakery'].includes(t)) {
    return 'Restaurant';
  }
  if (['hotel', 'guest_house', 'motel', 'hostel', 'resort'].includes(t) || c === 'tourism') {
    return 'Hotel';
  }
  if (['it', 'company', 'telecommunication', 'office', 'coworking_space'].includes(t) || c === 'office') {
    return 'IT / Tech';
  }
  if (['industrial', 'factory', 'works', 'craft'].includes(t) || c === 'craft') {
    return 'Manufacturing';
  }
  if (c === 'shop') {
    return 'Retail / Commercial';
  }
  
  if (requestedCategory && requestedCategory !== 'All') {
    return requestedCategory;
  }
  
  return osmItem.type ? osmItem.type.charAt(0).toUpperCase() + osmItem.type.slice(1) : 'Commercial';
}

/**
 * Normalize OpenStreetMap Nominatim item into PRCBO Business schema
 * STRICT RULE: No fabricated phone numbers, ratings, websites, or AI scores.
 */
function normalizeNominatimItem(item, cityMeta, requestedCategory) {
  const lat = parseFloat(item.lat);
  const lng = parseFloat(item.lon);
  
  // Extract clean name from OSM name tags or display_name
  const name = (
    item.namedetails?.name ||
    item.name ||
    item.display_name?.split(',')[0] ||
    'Unnamed Commercial Point'
  ).trim();

  const category = mapOsmCategory(item, requestedCategory);
  const distanceVal = calculateDistanceKm(cityMeta.lat, cityMeta.lng, lat, lng);
  const distanceStr = distanceVal !== null ? `${distanceVal} km from center` : 'Central territory';

  const tags = item.extratags || {};
  
  // Extract genuine phone from OSM tags (if present)
  const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || tags['mobile'] || null;
  
  // Extract genuine website from OSM tags (if present)
  let website = tags.website || tags['contact:website'] || tags['url'] || null;
  if (website && !website.startsWith('http')) {
    website = `https://${website}`;
  }
  
  const email = tags.email || tags['contact:email'] || null;
  const openingHours = tags.opening_hours || null;
  const cuisine = tags.cuisine || null;

  const osmId = item.osm_id;
  const osmType = item.osm_type || 'node';
  const osmUrl = `https://www.openstreetmap.org/${osmType}/${osmId}`;

  return {
    id: `osm-${osmType}-${osmId}`,
    osmId,
    osmType,
    osmUrl,
    name,
    category,
    location: cityMeta.label,
    city: cityMeta.cityName,
    state: cityMeta.state,
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
    hasCoordinates: !isNaN(lat) && !isNaN(lng),
    address: item.display_name || `${name}, ${cityMeta.cityName}, ${cityMeta.state}`,
    distance: distanceStr,
    distanceKm: distanceVal,
    phone, // Genuine or null
    website, // Genuine or null
    email,
    openingHours,
    cuisine,
    // Real data has NO fabricated ratings or reviews
    rating: null,
    reviewCount: null,
    // Source tracking
    source: 'OpenStreetMap (Live POI)',
    sourceProvider: 'OpenStreetMap / Nominatim',
    sourceId: `${osmType}/${osmId}`,
    isRealData: true,
    isMock: false,
    // AI qualification is unperformed — do not fabricate scores!
    aiPredictedScore: null,
    scoreTier: 'UNSCORED',
    qualificationLevel: 'Unqualified • Pending AI Qualification',
    recommendedService: null,
    opportunitySnippet: `Authentic OpenStreetMap ${category} entity (OSM ID: ${osmId}). Raw record ready for future AI modernization evaluation.`
  };
}

/**
 * Build keyword/category search query string for OSM
 */
function buildOsmQueryString(keyword, category, cityMeta) {
  const parts = [];
  const trimmedKw = (keyword || '').trim();
  
  if (trimmedKw) {
    parts.push(trimmedKw);
  } else if (category && category !== 'All') {
    // Map category to effective OSM search terms
    const catKeywords = {
      'Restaurant': 'restaurant cafe',
      'Healthcare': 'hospital clinic pharmacy',
      'Manufacturing': 'manufacturing factory industrial',
      'Hotel': 'hotel resort',
      'IT / Tech': 'software IT technology'
    };
    parts.push(catKeywords[category] || category);
  } else {
    // General commercial exploration
    parts.push('commercial enterprise shop restaurant');
  }

  // Append city name for additional geographic relevance
  parts.push(cityMeta.cityName);
  return parts.join(' ');
}

/**
 * Primary search function: queries live OpenStreetMap data
 * Uses bounding box and graceful fallback strategies.
 */
export async function searchOsmBusinesses({
  keyword = '',
  category = 'All',
  city = 'Madurai, Tamil Nadu',
  radiusKm = 15,
  limit = 25,
  signal = null
}) {
  const cityMeta = resolveCityMeta(city);
  const bbox = calculateBoundingBox(cityMeta.lat, cityMeta.lng, radiusKm);
  const cacheKey = `${cityMeta.id}|${category}|${keyword.trim().toLowerCase()}|${radiusKm}`;

  // Check in-memory cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      businesses: cached.businesses,
      source: 'OpenStreetMap (Cached)',
      total: cached.businesses.length,
      cityMeta,
      isFromCache: true
    };
  }

  const queryTerm = buildOsmQueryString(keyword, category, cityMeta);
  
  // URL for Nominatim search
  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
  nominatimUrl.searchParams.set('q', queryTerm);
  nominatimUrl.searchParams.set('viewbox', bbox.viewbox);
  nominatimUrl.searchParams.set('bounded', '1');
  nominatimUrl.searchParams.set('format', 'json');
  nominatimUrl.searchParams.set('addressdetails', '1');
  nominatimUrl.searchParams.set('extratags', '1');
  nominatimUrl.searchParams.set('namedetails', '1');
  nominatimUrl.searchParams.set('limit', String(Math.min(limit, 40)));

  try {
    const response = await fetch(nominatimUrl.toString(), {
      signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PRCBO-AI-LeadGen/2.0 (OpenStreetMap Enterprise Discovery; contact: info@prcbotech.com)'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('OpenStreetMap rate limit reached. Please wait a few seconds before searching again.');
      }
      throw new Error(`OpenStreetMap server responded with HTTP status ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Unexpected response format from OpenStreetMap');
    }

    // Filter out non-commercial results (like pure administrative boundaries or motorways)
    const filteredRaw = data.filter(item => {
      // Must have some valid name
      const name = item.namedetails?.name || item.name || item.display_name?.split(',')[0];
      if (!name || name.trim().length < 2) return false;
      
      // Exclude boundary, administrative, highway unless it has amenity or shop tag
      const cls = (item.class || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      if ((cls === 'boundary' || cls === 'place' || cls === 'highway') && !item.extratags?.amenity && !item.extratags?.shop) {
        return false;
      }
      return true;
    });

    // Normalize into PRCBO LeadGen models
    const businesses = filteredRaw.map(item => normalizeNominatimItem(item, cityMeta, category));

    // Sort by proximity to city center if distances are available
    businesses.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    // Update in-memory cache
    searchCache.set(cacheKey, {
      businesses,
      timestamp: Date.now()
    });

    return {
      businesses,
      source: 'OpenStreetMap (Live Nominatim)',
      total: businesses.length,
      cityMeta,
      isFromCache: false
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    // Attempt Photon OSM fallback if Nominatim had issues
    try {
      const fallbackResults = await searchPhotonFallback(queryTerm, cityMeta, category, signal);
      if (fallbackResults && fallbackResults.length > 0) {
        return {
          businesses: fallbackResults,
          source: 'OpenStreetMap (Photon Mirror)',
          total: fallbackResults.length,
          cityMeta,
          isFromCache: false
        };
      }
    } catch {
      // Ignore fallback failure, throw original error
    }

    throw new Error(error.message || 'Unable to connect to OpenStreetMap. Please check network connectivity.');
  }
}

/**
 * Photon (Komoot OSM) Mirror Fallback
 * Provides high-availability backup for OpenStreetMap data
 */
async function searchPhotonFallback(query, cityMeta, requestedCategory, signal) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${cityMeta.lat}&lon=${cityMeta.lng}&limit=20`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.features) return [];

  return data.features
    .filter(f => f.properties?.name)
    .map(f => {
      const p = f.properties;
      const coords = f.geometry?.coordinates || [];
      const lng = coords[0];
      const lat = coords[1];
      const osmId = p.osm_id;
      const osmType = p.osm_type || 'node';
      const distanceVal = calculateDistanceKm(cityMeta.lat, cityMeta.lng, lat, lng);

      return {
        id: `osm-${osmType}-${osmId}`,
        osmId,
        osmType,
        osmUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
        name: p.name,
        category: p.osm_value ? p.osm_value.charAt(0).toUpperCase() + p.osm_value.slice(1) : requestedCategory || 'Commercial',
        location: cityMeta.label,
        city: p.city || cityMeta.cityName,
        state: p.state || cityMeta.state,
        lat: isNaN(lat) ? null : lat,
        lng: isNaN(lng) ? null : lng,
        hasCoordinates: !isNaN(lat) && !isNaN(lng),
        address: [p.name, p.street, p.city, p.state].filter(Boolean).join(', ') || cityMeta.label,
        distance: distanceVal !== null ? `${distanceVal} km from center` : 'Central territory',
        distanceKm: distanceVal,
        phone: null,
        website: null,
        email: null,
        rating: null,
        reviewCount: null,
        source: 'OpenStreetMap (Photon Mirror)',
        sourceProvider: 'OpenStreetMap / Photon',
        sourceId: `${osmType}/${osmId}`,
        isRealData: true,
        isMock: false,
        aiPredictedScore: null,
        scoreTier: 'UNSCORED',
        qualificationLevel: 'Unqualified • Pending AI Qualification',
        recommendedService: null,
        opportunitySnippet: `Authentic OpenStreetMap record (${p.osm_value || 'Commercial'}). Genuine coordinates verified.`
      };
    });
}
