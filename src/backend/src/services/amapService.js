const cacheRepo = require('../repositories/amapCacheRepository');

const WEB_API_BASE = 'https://restapi.amap.com';

function getWebApiKey() {
  const key = process.env.AMAP_WEB_API_KEY;
  if (!key) {
    const error = new Error('AMAP_WEB_API_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }
  return key;
}

async function requestAmap(path, params) {
  const key = getWebApiKey();
  const searchParams = new URLSearchParams({
    key,
    output: 'JSON',
    ...params,
  });
  const response = await fetch(`${WEB_API_BASE}${path}?${searchParams.toString()}`);
  if (!response.ok) {
    const error = new Error(`AMap request failed with status ${response.status}`);
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  if ((payload.status && payload.status !== '1') || payload.infocode === '10003') {
    const error = new Error(mapAmapErrorMessage(payload.info, payload.infocode));
    error.statusCode = 502;
    throw error;
  }

  return payload;
}

function mapAmapErrorMessage(info, infocode) {
  if (info === 'MISSING_REQUIRED_PARAMS') {
    return '当前路线方式所需参数不完整，请尝试步行、驾车或骑行模式';
  }
  if (info === 'INVALID_PARAMS') {
    return '路线规划参数无效，请重新选择起点和终点';
  }
  if (info === 'SERVICE_NOT_AVAILABLE') {
    return '高德路线服务暂时不可用，请稍后再试';
  }
  if (infocode === '10003') {
    return '高德地图密钥不可用，请检查配置';
  }
  return info || '高德地图服务暂时不可用';
}

function parseLocation(location) {
  const [lng, lat] = `${location || ''}`.split(',').map(Number);
  return { lng, lat };
}

function shouldRefreshRouteCache(cached) {
  return Boolean(cached && Number(cached.distance || 0) > 0 && Number(cached.duration || 0) <= 0);
}

function estimateDurationSeconds(mode, distance) {
  const meters = Number(distance || 0);
  if (meters <= 0) return 0;

  const averageSpeedMetersPerSecond = {
    walking: 1.2,
    cycling: 4.5,
    driving: 11,
    transit: 6,
  };

  const speed = averageSpeedMetersPerSecond[mode] || 4;
  return Math.max(60, Math.round(meters / speed));
}

function parseStepDistance(step) {
  return Number(step?.distance || step?.step_distance || 0);
}

function estimateStepDurationSeconds(stepDistance, totalDistance, totalDuration) {
  const distance = Number(stepDistance || 0);
  if (distance <= 0 || totalDistance <= 0 || totalDuration <= 0) return 0;
  return Math.max(30, Math.round((distance / totalDistance) * totalDuration));
}

async function geocode(address, city) {
  const payload = await requestAmap('/v3/geocode/geo', { address, city });
  const item = payload.geocodes?.[0];
  if (!item) return null;

  return {
    name: address,
    location: parseLocation(item.location),
    province: item.province,
    city: Array.isArray(item.city) ? item.city[0] : item.city,
    district: item.district,
    adcode: item.adcode,
    formattedAddress: item.formatted_address || address,
  };
}

async function reverseGeocode(lng, lat) {
  const payload = await requestAmap('/v3/geocode/regeo', {
    location: `${lng},${lat}`,
    extensions: 'base',
  });
  const result = payload.regeocode;
  if (!result) return null;

  const comp = result.addressComponent || {};
  return {
    formattedAddress: result.formatted_address,
    province: comp.province,
    city: Array.isArray(comp.city) ? comp.city[0] : comp.city,
    district: comp.district,
    township: comp.township,
    adcode: comp.adcode,
  };
}

async function poiTips({ keywords, city }) {
  const cached = await cacheRepo.findPoi(keywords, city, '', 'tips');
  if (cached) return cached;

  const payload = await requestAmap('/v3/assistant/inputtips', {
    keywords,
    city,
    datatype: 'poi',
  });
  const data = (payload.tips || [])
    .filter((item) => item.location)
    .map((item) => ({
      id: item.id,
      name: item.name,
      district: item.district,
      address: item.address,
      location: parseLocation(item.location),
    }));

  await cacheRepo.upsertPoi(keywords, city, '', data, 'tips');
  return data;
}

async function searchPoi({ keywords, city, types = '', page = 1, pageSize = 10 }) {
  const cached = await cacheRepo.findPoi(keywords, city, types, 'poi');
  if (cached) return cached;

  const payload = await requestAmap('/v5/place/text', {
    keywords,
    region: city,
    types,
    page_size: pageSize,
    page_num: page,
    city_limit: city ? 'true' : 'false',
    show_fields: 'business,photos',
  });

  const data = (payload.pois || []).map((item) => ({
    id: item.id,
    name: item.name,
    address: item.address,
    city: item.cityname || city,
    district: item.adname,
    type: item.type,
    location: parseLocation(item.location),
  }));

  await cacheRepo.upsertPoi(keywords, city, types, data, 'poi');
  return data;
}

function normalizeRoutePath(rawStep) {
  const segments = [];
  for (const chunk of `${rawStep || ''}`.split(';')) {
    if (!chunk) continue;
    const [lng, lat] = chunk.split(',').map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      segments.push([lng, lat]);
    }
  }
  return segments;
}

async function route({ originLng, originLat, destLng, destLat, mode = 'walking' }) {
  const origin = `${originLng},${originLat}`;
  const destination = `${destLng},${destLat}`;
  const cached = await cacheRepo.findRoute(origin, destination, mode);
  if (cached && !shouldRefreshRouteCache(cached)) return cached;

  const routePathMap = {
    walking: '/v5/direction/walking',
    driving: '/v5/direction/driving',
    cycling: '/v5/direction/bicycling',
    transit: '/v5/direction/transit/integrated',
  };
  const path = routePathMap[mode] || routePathMap.walking;
  const payload = await requestAmap(path, { origin, destination });

  let data;
  if (mode === 'transit') {
    const transit = payload.route?.transits?.[0];
    data = {
      mode,
      distance: Number(transit?.distance || 0),
      duration: Number(transit?.duration || 0),
      cost: Number(transit?.cost || 0),
      steps: (transit?.segments || []).map((segment, index) => ({
        instruction: segment.instruction || `公交换乘段 ${index + 1}`,
        distance: Number(segment.walking?.distance || 0),
        duration: Number(segment.walking?.duration || 0),
      })),
      polyline: [],
    };
  } else {
    const pathItem = payload.route?.paths?.[0];
    const steps = pathItem?.steps || [];
    const distance = Number(pathItem?.distance || 0);
    const rawDuration = Number(pathItem?.cost?.duration || pathItem?.duration || 0);
    const duration = rawDuration > 0 ? rawDuration : estimateDurationSeconds(mode, distance);
    const totalStepDistance = steps.reduce((sum, step) => sum + parseStepDistance(step), 0);

    data = {
      mode,
      distance,
      duration,
      strategy: pathItem?.strategy,
      tolls: Number(pathItem?.tolls || 0),
      polyline: steps.flatMap((step) => normalizeRoutePath(step.polyline)),
      steps: steps.map((step, index) => ({
        instruction: step.instruction || `导航步骤 ${index + 1}`,
        distance: parseStepDistance(step),
        duration: Number(step.duration || 0) || estimateStepDurationSeconds(parseStepDistance(step), totalStepDistance, duration),
      })),
    };
  }

  await cacheRepo.upsertRoute(origin, destination, mode, data);
  return data;
}

async function weather(city) {
  const cached = await cacheRepo.findWeather(city);
  if (cached) return cached;

  const payload = await requestAmap('/v3/weather/weatherInfo', { city, extensions: 'base' });
  const item = payload.lives?.[0];
  if (!item) return null;

  const data = {
    city: item.city,
    weather: item.weather,
    temperature: item.temperature,
    windDirection: item.winddirection,
    windPower: item.windpower,
    humidity: item.humidity,
    reportTime: item.reporttime,
  };

  await cacheRepo.upsertWeather(city, data);
  return data;
}

module.exports = {
  geocode,
  reverseGeocode,
  poiTips,
  searchPoi,
  route,
  weather,
};
