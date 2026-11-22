/**
 * AtmosQI — Geospatial & Distance Calculation Service
 * Includes universal pan-India geocoding via Photon / OpenStreetMap.
 */

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

export function findNearestStation(targetLat, targetLon, stations) {
  if (!stations || stations.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const station of stations) {
    if (station.latitude && station.longitude) {
      const dist = calculateDistanceKm(
        targetLat,
        targetLon,
        station.latitude,
        station.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = { ...station, distanceKm: dist };
      }
    }
  }

  return nearest;
}

/**
 * Universal Indian Geocoding Search (Google Maps-Style)
 * Searches CPCB Ground Stations and any Indian city, locality, pincode, or landmark.
 */
export async function searchUniversalLocations(query, cpcbStations = []) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();
  const results = [];

  // 1. Instant match against CPCB ground monitoring stations
  if (cpcbStations && cpcbStations.length > 0) {
    const stationMatches = cpcbStations.filter((s) => {
      const matchName = s.name?.toLowerCase().includes(cleanQuery);
      const matchCity = s.city?.toLowerCase().includes(cleanQuery);
      const matchState = s.state?.toLowerCase().includes(cleanQuery);
      const matchId = s.id?.toLowerCase().includes(cleanQuery);
      return matchName || matchCity || matchState || matchId;
    }).slice(0, 3);

    for (const s of stationMatches) {
      results.push({
        id: `station-${s.id}`,
        type: 'station',
        title: s.name,
        subtitle: `${s.city}, ${s.state} • CPCB Ground Monitor`,
        latitude: s.latitude,
        longitude: s.longitude,
        stationData: s
      });
    }
  }

  // 2. Query Photon Geocoding API bounded to Indian coordinates [68°E, 6°N, 98°E, 37°N]
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&bbox=68,6,98,37&limit=6`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      const features = data.features || [];

      for (const f of features) {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [];
        if (coords.length < 2) continue;

        const lon = coords[0];
        const lat = coords[1];

        // Bounding box filter for India
        if (lat < 6 || lat > 38 || lon < 67 || lon > 98) continue;

        const name = props.name || props.street || props.district || props.city || props.postcode;
        if (!name) continue;

        // Skip exact duplicate if station already added
        if (results.some(r => Math.abs(r.latitude - lat) < 0.005 && Math.abs(r.longitude - lon) < 0.005)) {
          continue;
        }

        const parts = [
          props.district,
          props.city,
          props.state,
          'India'
        ].filter(Boolean);

        const uniqueParts = parts.filter((p, i) => parts.indexOf(p) === i && p !== name);

        let type = 'place';
        if (props.type === 'city' || props.type === 'town') type = 'city';
        else if (props.type === 'street' || props.type === 'residential') type = 'street';
        else if (props.osm_key === 'amenity' || props.osm_key === 'tourism' || props.osm_key === 'historic') type = 'landmark';

        results.push({
          id: `osm-${props.osm_id || Math.random()}`,
          type,
          title: name,
          subtitle: uniqueParts.join(', ') || 'India',
          latitude: lat,
          longitude: lon
        });
      }
    }
  } catch (err) {
    console.warn("Geocoding lookup error:", err);
  }

  return results.slice(0, 8);
}
