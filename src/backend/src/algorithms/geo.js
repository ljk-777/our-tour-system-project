/**
 * Calculate great-circle distance between two coordinates using Haversine.
 * Time complexity: O(1).
 *
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 * @returns {number} Distance in kilometers.
 */
function haversineDistance(a, b) {
  const lat1 = Number(a?.lat);
  const lng1 = Number(a?.lng);
  const lat2 = Number(b?.lat);
  const lng2 = Number(b?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

/**
 * Find the nearest distance from one target to a list of origins.
 * Time complexity: O(M), where M is the number of origins.
 *
 * @param {{ lat: number, lng: number }} target
 * @param {Array<{ lat: number, lng: number }>} origins
 * @returns {number|null}
 */
function nearestDistance(target, origins = []) {
  let best = null;
  for (const origin of origins) {
    const dist = haversineDistance(target, origin);
    if (dist !== null && (best === null || dist < best)) best = dist;
  }
  return best;
}

module.exports = { haversineDistance, nearestDistance };
