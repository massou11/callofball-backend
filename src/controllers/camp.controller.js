const prisma = require('../lib/prisma');

// Liste tous les camps (actifs uniquement pour les clients)
async function getCamps(req, res) {
  const isAdmin = req.user?.role === 'ADMIN';
  const camps = await prisma.camp.findMany({
    where: isAdmin ? {} : { isActive: true },
    orderBy: { startDate: 'asc' },
    include: {
      _count: { select: { reservations: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } } },
    },
  });

  const campsWithPlaces = camps.map(c => ({
    ...c,
    placesReservees: c._count.reservations,
    placesRestantes: Math.max(0, c.places - c._count.reservations),
  }));

  res.json(campsWithPlaces);
}

// Détail d'un camp
async function getCampById(req, res) {
  const camp = await prisma.camp.findUnique({
    where: { id: req.params.id },
    include: {
      _count: { select: { reservations: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } } },
    },
  });
  if (!camp) return res.status(404).json({ error: 'Camp introuvable' });
  res.json({
    ...camp,
    placesReservees: camp._count.reservations,
    placesRestantes: Math.max(0, camp.places - camp._count.reservations),
  });
}

// Créer un camp (admin)
async function createCamp(req, res) {
  const { name, description, startDate, endDate, minAge, maxAge, price, places } = req.body;
  if (!name || !startDate || !endDate || !price || !places) {
    return res.status(400).json({ error: 'Champs requis : name, startDate, endDate, price, places' });
  }
  const camp = await prisma.camp.create({
    data: {
      name,
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      minAge: minAge ? parseInt(minAge) : null,
      maxAge: maxAge ? parseInt(maxAge) : null,
      price: parseFloat(price),
      places: parseInt(places),
      isActive: true,
    },
  });
  res.status(201).json(camp);
}

// Modifier un camp (admin)
async function updateCamp(req, res) {
  const { name, description, startDate, endDate, minAge, maxAge, price, places, isActive } = req.body;
  const camp = await prisma.camp.findUnique({ where: { id: req.params.id } });
  if (!camp) return res.status(404).json({ error: 'Camp introuvable' });

  const updated = await prisma.camp.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(minAge !== undefined && { minAge: minAge ? parseInt(minAge) : null }),
      ...(maxAge !== undefined && { maxAge: maxAge ? parseInt(maxAge) : null }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(places !== undefined && { places: parseInt(places) }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  res.json(updated);
}

// Supprimer un camp (admin)
async function deleteCamp(req, res) {
  const camp = await prisma.camp.findUnique({ where: { id: req.params.id } });
  if (!camp) return res.status(404).json({ error: 'Camp introuvable' });
  await prisma.camp.delete({ where: { id: req.params.id } });
  res.json({ message: 'Camp supprimé' });
}

// Inscription à un camp (client)
async function registerToCamp(req, res) {
  const { notes } = req.body;
  const camp = await prisma.camp.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { reservations: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } } } } },
  });
  if (!camp || !camp.isActive) return res.status(404).json({ error: 'Camp introuvable ou inactif' });
  if (camp._count.reservations >= camp.places) return res.status(409).json({ error: 'Camp complet' });

  // Vérifier si déjà inscrit
  const existing = await prisma.campReservation.findFirst({
    where: { campId: camp.id, userId: req.user.id, status: { not: 'CANCELLED' } },
  });
  if (existing) return res.status(409).json({ error: 'Vous êtes déjà inscrit à ce camp' });

  const reservation = await prisma.campReservation.create({
    data: { campId: camp.id, userId: req.user.id, notes: notes || null },
    include: { camp: true },
  });
  res.status(201).json(reservation);
}

// Liste des inscrits à un camp (admin)
async function getCampRegistrations(req, res) {
  const registrations = await prisma.campReservation.findMany({
    where: { campId: req.params.id },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(registrations);
}

module.exports = { getCamps, getCampById, createCamp, updateCamp, deleteCamp, registerToCamp, getCampRegistrations };
