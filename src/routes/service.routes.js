const router = require('express').Router();
const { getServices, getVenues } = require('../controllers/service.controller');

router.get('/', getServices);
router.get('/venues', getVenues);

module.exports = router;
