const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  getClients, getDetailedStats, exportCSV, refundReservation,
  getPlanning, getNotifications, markNotificationRead,
} = require('../controllers/admin.controller');

router.use(authenticate, requireAdmin);

router.get('/clients', getClients);
router.get('/stats/detailed', getDetailedStats);
router.get('/stats/export', exportCSV);
router.post('/reservations/:id/refund', refundReservation);
router.get('/planning', getPlanning);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);

module.exports = router;
