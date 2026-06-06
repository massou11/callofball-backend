const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getAvailableSlots,
  createReservation,
  getMyReservations,
  cancelReservation,
  getAllReservations,
  confirmReservation,
  getStats,
  getPickupAvailability,
} = require('../controllers/reservation.controller');

router.get('/slots', authenticate, getAvailableSlots);
router.post('/', authenticate, createReservation);
router.get('/mine', authenticate, getMyReservations);
router.patch('/:id/cancel', authenticate, cancelReservation);

// Pickup Game
router.get('/pickup/availability', authenticate, getPickupAvailability);

// Admin
router.get('/admin/all', authenticate, requireAdmin, getAllReservations);
router.patch('/admin/:id/confirm', authenticate, requireAdmin, confirmReservation);
router.get('/admin/stats', authenticate, requireAdmin, getStats);

module.exports = router;
