const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getCamps, getCampById, createCamp, updateCamp, deleteCamp, registerToCamp, getCampRegistrations,
} = require('../controllers/camp.controller');

// Public / client
router.get('/', authenticate, getCamps);
router.get('/:id', authenticate, getCampById);
router.post('/:id/register', authenticate, registerToCamp);

// Admin
router.post('/', authenticate, requireAdmin, createCamp);
router.patch('/:id', authenticate, requireAdmin, updateCamp);
router.delete('/:id', authenticate, requireAdmin, deleteCamp);
router.get('/:id/registrations', authenticate, requireAdmin, getCampRegistrations);

module.exports = router;
