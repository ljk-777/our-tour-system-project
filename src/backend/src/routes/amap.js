const express = require('express');
const amapService = require('../services/amapService');

const router = express.Router();

router.get('/geocode', async (req, res, next) => {
  try {
    const { address, city } = req.query;
    if (!address) {
      return res.status(400).json({ success: false, message: 'address is required' });
    }
    const data = await amapService.geocode(address, city);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/regeo', async (req, res, next) => {
  try {
    const { lng, lat } = req.query;
    if (!lng || !lat) {
      return res.status(400).json({ success: false, message: 'lng and lat are required' });
    }
    const data = await amapService.reverseGeocode(lng, lat);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/poi/tips', async (req, res, next) => {
  try {
    const { keywords, city } = req.query;
    if (!keywords) {
      return res.status(400).json({ success: false, message: 'keywords is required' });
    }
    const data = await amapService.poiTips({ keywords, city });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/poi/search', async (req, res, next) => {
  try {
    const { keywords, city, types, page = 1, pageSize = 10 } = req.query;
    if (!keywords) {
      return res.status(400).json({ success: false, message: 'keywords is required' });
    }
    const data = await amapService.searchPoi({
      keywords,
      city,
      types,
      page: Number(page),
      pageSize: Number(pageSize),
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/route', async (req, res, next) => {
  try {
    const { originLng, originLat, destLng, destLat, mode } = req.query;
    if (!originLng || !originLat || !destLng || !destLat) {
      return res.status(400).json({ success: false, message: 'origin and destination coordinates are required' });
    }
    const data = await amapService.route({ originLng, originLat, destLng, destLat, mode });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/weather', async (req, res, next) => {
  try {
    const { city } = req.query;
    if (!city) {
      return res.status(400).json({ success: false, message: 'city is required' });
    }
    const data = await amapService.weather(city);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
