const prisma = require('../lib/prisma');

async function getAvailableSlots(req, res) {
  const { venueId, date } = req.query;
  if (!venueId || !date) return res.status(400).json({ error: 'venueId et date requis' });

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const slots = await prisma.slot.findMany({
    where: { venueId, startTime: { gte: start, lte: end }, isBooked: false },
    orderBy: { startTime: 'asc' },
  });

  res.json(slots);
}

async function createReservation(req, res) {
  const { venueId, serviceId, slotId, participants, notes } = req.body;

  if (!serviceId) return res.status(400).json({ error: 'serviceId requis' });

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { pricingRules: true },
  });
  if (!service) return res.status(404).json({ error: 'Service introuvable' });

  if (slotId) {
    const slot = await prisma.slot.findUnique({ where: { id: slotId } });
    if (!slot || slot.isBooked) return res.status(409).json({ error: 'Créneau non disponible' });
  }

  const rule = service.pricingRules.find(r => r.isOnline) || service.pricingRules[0];
  const totalPrice = rule ? rule.price * (participants || 1) : 0;

  const reservation = await prisma.reservation.create({
    data: {
      userId: req.user.id,
      venueId: venueId || null,
      serviceId,
      slotId: slotId || null,
      participants: participants || 1,
      totalPrice,
      notes: notes || null,
      status: 'PENDING',
    },
    include: { service: true, venue: true, slot: true },
  });

  if (slotId) {
    await prisma.slot.update({ where: { id: slotId }, data: { isBooked: true } });
  }

  // Notification admin automatique
  const isCoaching = service.type === 'COACHING';
  await prisma.notification.create({
    data: {
      type: isCoaching ? 'COACHING_PACK' : 'NEW_RESERVATION',
      title: isCoaching ? '💪 Nouveau pack coaching !' : '📋 Nouvelle réservation',
      body: isCoaching
        ? `Pack coaching réservé par ${req.user.firstName || 'un client'} — ${totalPrice}€. Le coach doit les contacter.`
        : `Nouvelle réservation : ${service.name} — ${totalPrice}€`,
      reservationId: reservation.id,
      isRead: false,
    },
  }).catch(() => {}); // silencieux si erreur notif

  res.status(201).json(reservation);
}

async function getMyReservations(req, res) {
  const reservations = await prisma.reservation.findMany({
    where: { userId: req.user.id },
    include: { service: true, venue: true, slot: true, payment: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reservations);
}

async function cancelReservation(req, res) {
  const { id } = req.params;

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
  if (reservation.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Non autorisé' });
  }
  if (reservation.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Déjà annulée' });
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  if (reservation.slotId) {
    await prisma.slot.update({ where: { id: reservation.slotId }, data: { isBooked: false } });
  }

  res.json(updated);
}

// Admin : toutes les réservations
async function getAllReservations(req, res) {
  const { date, status } = req.query;
  const where = {};

  if (status) where.status = status;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, service: true, venue: true, slot: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reservations);
}

// Admin : confirmer une réservation
async function confirmReservation(req, res) {
  const { id } = req.params;
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
  if (reservation.status !== 'PENDING') return res.status(400).json({ error: 'Seules les réservations en attente peuvent être confirmées' });

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: 'CONFIRMED' },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, service: true, venue: true, slot: true },
  });
  res.json(updated);
}

// Admin : stats du tableau de bord
async function getStats(req, res) {
  const [total, pending, confirmed, todayCount, revenue] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: 'PENDING' } }),
    prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
    prisma.reservation.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0,0,0,0)),
          lte: new Date(new Date().setHours(23,59,59,999)),
        },
      },
    }),
    prisma.reservation.aggregate({
      where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
      _sum: { totalPrice: true },
    }),
  ]);

  res.json({
    total,
    pending,
    confirmed,
    todayCount,
    revenue: revenue._sum.totalPrice || 0,
  });
}

const PICKUP_MAX = 20;

// Disponibilité du Pickup Game pour une date donnée
async function getPickupAvailability(req, res) {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date requise' });

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const service = await prisma.service.findFirst({ where: { type: 'PICKUP_GAME' } });
  if (!service) return res.status(404).json({ error: 'Service Pickup introuvable' });

  // Nombre total de participants confirmés ou en attente ce jour
  const result = await prisma.reservation.aggregate({
    where: {
      serviceId: service.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      createdAt: { gte: start, lte: end },
    },
    _sum: { participants: true },
  });

  const taken = result._sum.participants || 0;
  const remaining = Math.max(0, PICKUP_MAX - taken);

  res.json({ date, taken, remaining, max: PICKUP_MAX, available: remaining > 0 });
}

module.exports = { getAvailableSlots, createReservation, getMyReservations, cancelReservation, getAllReservations, confirmReservation, getStats, getPickupAvailability };
