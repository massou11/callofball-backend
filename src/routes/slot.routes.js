const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { generateSlots, getSlots, getSlotsByVenue } = require('../controllers/slot.controller');

router.get('/', authenticate, getSlots);
router.get('/by-venue', authenticate, getSlotsByVenue);
router.post('/generate', authenticate, requireAdmin, generateSlots);

module.exports = router;
