const prisma = require('../lib/prisma');

// ─── LISTE DES CLIENTS ────────────────────────────────────────────────────────
async function getClients(req, res) {
  const clients = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true,
      _count: { select: { reservations: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(clients);
}

// ─── STATISTIQUES DÉTAILLÉES ──────────────────────────────────────────────────
async function getDetailedStats(req, res) {
  const { from, to } = req.query;
  const start = from ? new Date(from) : new Date(new Date().setDate(1)); // début du mois
  start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);

  const [total, pending, confirmed, cancelled, revenue, byService, byDay] = await Promise.all([
    prisma.reservation.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.reservation.count({ where: { status: 'PENDING', createdAt: { gte: start, lte: end } } }),
    prisma.reservation.count({ where: { status: 'CONFIRMED', createdAt: { gte: start, lte: end } } }),
    prisma.reservation.count({ where: { status: 'CANCELLED', createdAt: { gte: start, lte: end } } }),
    prisma.reservation.aggregate({
      where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, createdAt: { gte: start, lte: end } },
      _sum: { totalPrice: true },
    }),
    // Réservations par service
    prisma.reservation.groupBy({
      by: ['serviceId'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    // Réservations par jour (30 derniers jours)
    prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count, SUM("totalPrice") as revenue
      FROM "Reservation"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
  ]);

  // Enrichir byService avec les noms
  const services = await prisma.service.findMany({ select: { id: true, name: true, type: true } });
  const byServiceEnriched = byService.map(s => ({
    ...s,
    service: services.find(sv => sv.id === s.serviceId),
  }));

  res.json({
    period: { from: start, to: end },
    total, pending, confirmed, cancelled,
    revenue: revenue._sum.totalPrice || 0,
    byService: byServiceEnriched,
    byDay,
  });
}

// ─── EXPORT CSV COMPTABILITÉ ──────────────────────────────────────────────────
async function exportCSV(req, res) {
  const { from, to } = req.query;
  const start = from ? new Date(from) : new Date(new Date().setDate(1));
  start.setHours(0, 0, 0, 0);
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);

  const reservations = await prisma.reservation.findMany({
    where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, createdAt: { gte: start, lte: end } },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      service: { select: { name: true, type: true } },
      venue: { select: { name: true } },
      slot: { select: { startTime: true, endTime: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Génération CSV
  const header = ['Date', 'Client', 'Email', 'Service', 'Terrain', 'Créneau', 'Participants', 'Montant (€)', 'Statut'];
  const rows = reservations.map(r => [
    new Date(r.createdAt).toLocaleDateString('fr-FR'),
    `${r.user.firstName} ${r.user.lastName}`,
    r.user.email,
    r.service.name,
    r.venue?.name || '-',
    r.slot ? `${new Date(r.slot.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(r.slot.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '-',
    r.participants,
    r.totalPrice.toFixed(2),
    r.status,
  ]);

  const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(';')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="callofball_export_${new Date().toISOString().slice(0,10)}.csv"`);
  res.send('﻿' + csv); // BOM UTF-8 pour Excel
}

// ─── REMBOURSEMENT ────────────────────────────────────────────────────────────
async function refundReservation(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { service: true, user: { select: { firstName: true, lastName: true, email: true } } },
  });
  if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
  if (reservation.status === 'CANCELLED') return res.status(400).json({ error: 'Déjà annulée' });

  // Annuler la réservation
  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  // Libérer le créneau si applicable
  if (reservation.slotId) {
    await prisma.slot.update({ where: { id: reservation.slotId }, data: { isBooked: false } });
  }

  // Créer une notification de remboursement
  await prisma.notification.create({
    data: {
      type: 'REFUND',
      title: 'Remboursement traité',
      body: `Réservation de ${reservation.user.firstName} ${reservation.user.lastName} (${reservation.service.name}) remboursée. Montant : ${reservation.totalPrice}€${reason ? ` — Motif : ${reason}` : ''}`,
      reservationId: id,
      isRead: false,
    },
  });

  res.json({ ...updated, refunded: true });
}

// ─── PLANNING ─────────────────────────────────────────────────────────────────
async function getPlanning(req, res) {
  const { date } = req.query;
  const day = date ? new Date(date) : new Date();
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(day); end.setHours(23, 59, 59, 999);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        { slot: { startTime: { gte: start, lte: end } } },
        { AND: [{ slot: null }, { createdAt: { gte: start, lte: end } } ] },
      ],
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      service: { select: { name: true, type: true } },
      venue: { select: { name: true, type: true } },
      slot: true,
    },
    orderBy: [{ slot: { startTime: 'asc' } }, { createdAt: 'asc' }],
  });

  res.json(reservations);
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
async function getNotifications(req, res) {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { isRead: false } });
  res.json({ notifications, unreadCount });
}

async function markNotificationRead(req, res) {
  const { id } = req.params;
  if (id === 'all') {
    await prisma.notification.updateMany({ data: { isRead: true } });
    return res.json({ message: 'Toutes les notifications marquées comme lues' });
  }
  const notif = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  res.json(notif);
}

module.exports = { getClients, getDetailedStats, exportCSV, refundReservation, getPlanning, getNotifications, markNotificationRead };
