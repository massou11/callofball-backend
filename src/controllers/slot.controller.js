const prisma = require('../lib/prisma');

// Horaires d'ouverture Call of Ball
const OPENING_HOURS = {
  1: { open: 15, close: 22 }, // Lundi
  2: { open: 15, close: 22 }, // Mardi
  3: { open: 10, close: 22 }, // Mercredi
  4: { open: 15, close: 22 }, // Jeudi
  5: { open: 15, close: 22 }, // Vendredi
  6: { open: 10, close: 17 }, // Samedi
  0: { open: 10, close: 17 }, // Dimanche
};

const SLOT_DURATION_MINUTES = 60; // Créneaux d'1 heure

/**
 * Calcule si un créneau est en heure pleine ou creuse
 * Lun/Mar/Jeu/Ven : creuse 15h-18h, pleine 18h-22h
 * Mer / Sam / Dim  : toujours pleine
 */
function getIsPeakHour(startTime) {
  const date = new Date(startTime);
  const day = date.getDay();   // 0=dim, 1=lun, ..., 6=sam
  const hour = date.getHours();

  // Mercredi, Samedi, Dimanche → toujours heure pleine
  if (day === 3 || day === 6 || day === 0) return true;

  // Lun, Mar, Jeu, Ven : pleine à partir de 18h
  return hour >= 18;
}

/**
 * Génère les créneaux pour tous les terrains sur N jours
 * POST /api/slots/generate  (admin uniquement)
 */
async function generateSlots(req, res) {
  const { days = 14 } = req.body; // Par défaut 2 semaines

  const venues = await prisma.venue.findMany({ where: { isActive: true } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let created = 0;
  let skipped = 0;

  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dayOfWeek = date.getDay();
    const hours = OPENING_HOURS[dayOfWeek];

    if (!hours) continue;

    for (const venue of venues) {
      for (let h = hours.open; h < hours.close; h++) {
        const startTime = new Date(date);
        startTime.setHours(h, 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(h + 1, 0, 0, 0);

        // Vérifier si ce créneau existe déjà
        const existing = await prisma.slot.findFirst({
          where: { venueId: venue.id, startTime },
        });

        if (existing) { skipped++; continue; }

        await prisma.slot.create({
          data: { venueId: venue.id, startTime, endTime },
        });
        created++;
      }
    }
  }

  res.json({ message: `${created} créneaux créés, ${skipped} déjà existants.`, created, skipped });
}

/**
 * Récupère les créneaux disponibles par terrain et date
 * GET /api/slots?venueId=xxx&date=2024-01-15
 */
async function getSlots(req, res) {
  const { venueId, date } = req.query;
  if (!date) return res.status(400).json({ error: 'date requise (YYYY-MM-DD)' });

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const where = {
    startTime: { gte: start, lte: end },
  };
  if (venueId) where.venueId = venueId;

  const slots = await prisma.slot.findMany({
    where,
    include: { venue: true },
    orderBy: { startTime: 'asc' },
  });

  res.json(slots.map(s => ({ ...s, isPeakHour: getIsPeakHour(s.startTime) })));
}

/**
 * Récupère les créneaux disponibles groupés par terrain
 * GET /api/slots/by-venue?date=2024-01-15
 */
async function getSlotsByVenue(req, res) {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date requise (YYYY-MM-DD)' });

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const venues = await prisma.venue.findMany({ where: { isActive: true } });

  const result = await Promise.all(venues.map(async (venue) => {
    const slots = await prisma.slot.findMany({
      where: { venueId: venue.id, startTime: { gte: start, lte: end } },
      orderBy: { startTime: 'asc' },
    });
    return {
      venue,
      slots: slots.map(s => ({ ...s, isPeakHour: getIsPeakHour(s.startTime) })),
    };
  }));

  res.json(result);
}

module.exports = { generateSlots, getSlots, getSlotsByVenue };
