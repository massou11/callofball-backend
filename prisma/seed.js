const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Terrains
  const terrain5x5 = await prisma.venue.upsert({
    where: { id: 'terrain-5x5' },
    update: {},
    create: { id: 'terrain-5x5', name: 'Grand Terrain 5x5', type: 'TERRAIN_5X5', capacity: 10, description: 'Terrain de basket complet 5 contre 5' },
  });

  const demiTerrain = await prisma.venue.upsert({
    where: { id: 'demi-terrain-5x5' },
    update: {},
    create: { id: 'demi-terrain-5x5', name: 'Demi-Terrain 5x5', type: 'DEMI_TERRAIN_5X5', capacity: 5, description: 'Moitié du grand terrain 5x5' },
  });

  await prisma.venue.upsert({
    where: { id: 'terrain-3x3-a' },
    update: {},
    create: { id: 'terrain-3x3-a', name: 'Terrain 3x3 A', type: 'TERRAIN_3X3', capacity: 6, description: 'Terrain 3 contre 3' },
  });

  await prisma.venue.upsert({
    where: { id: 'terrain-3x3-b' },
    update: {},
    create: { id: 'terrain-3x3-b', name: 'Terrain 3x3 B', type: 'TERRAIN_3X3', capacity: 6, description: 'Terrain 3 contre 3' },
  });

  await prisma.venue.upsert({
    where: { id: 'cage-1v1' },
    update: {},
    create: { id: 'cage-1v1', name: 'La Cage', type: 'CAGE_1V1', capacity: 2, description: 'Cage 1 contre 1' },
  });

  // Services
  const pickup = await prisma.service.upsert({
    where: { id: 'pickup-game' },
    update: {},
    create: { id: 'pickup-game', name: 'Pickup Game', type: 'PICKUP_GAME', description: 'Rejoignez un match libre avec d\'autres joueurs' },
  });
  await prisma.pricingRule.createMany({
    data: [
      { serviceId: pickup.id, label: 'En ligne', price: 8, unit: 'par personne', isOnline: true },
      { serviceId: pickup.id, label: 'Sur place', price: 10, unit: 'par personne', isOnline: false },
    ],
    skipDuplicates: true,
  });

  const cage = await prisma.service.upsert({
    where: { id: 'cage-service' },
    update: {},
    create: { id: 'cage-service', name: 'La Cage (1vs1)', type: 'MATCH_AMIS', description: 'Réservez la cage pour un duel 1 contre 1' },
  });
  await prisma.pricingRule.createMany({
    data: [
      { serviceId: cage.id, label: 'Heure creuse - en ligne', price: 6, unit: 'par personne', isOnline: true, isPeakHour: false },
      { serviceId: cage.id, label: 'Heure pleine - en ligne', price: 8, unit: 'par personne', isOnline: true, isPeakHour: true },
      { serviceId: cage.id, label: 'Heure creuse - sur place', price: 8, unit: 'par personne', isOnline: false, isPeakHour: false },
      { serviceId: cage.id, label: 'Heure pleine - sur place', price: 10, unit: 'par personne', isOnline: false, isPeakHour: true },
    ],
    skipDuplicates: true,
  });

  const match5x5 = await prisma.service.upsert({
    where: { id: 'match-5x5' },
    update: {},
    create: { id: 'match-5x5', name: 'Match Entre Amis 5x5', type: 'MATCH_AMIS', description: 'Réservez le grand terrain pour votre équipe' },
  });
  await prisma.pricingRule.createMany({
    data: [
      { serviceId: match5x5.id, label: 'En ligne', price: 75, unit: 'par session', isOnline: true },
      { serviceId: match5x5.id, label: 'Sur place', price: 95, unit: 'par session', isOnline: false },
    ],
    skipDuplicates: true,
  });

  const match3x3 = await prisma.service.upsert({
    where: { id: 'match-3x3' },
    update: {},
    create: { id: 'match-3x3', name: 'Match Entre Amis 3x3', type: 'MATCH_AMIS', description: 'Réservez un terrain 3x3' },
  });
  await prisma.pricingRule.createMany({
    data: [
      { serviceId: match3x3.id, label: 'En ligne', price: 40, unit: 'par session', isOnline: true },
      { serviceId: match3x3.id, label: 'Sur place', price: 60, unit: 'par session', isOnline: false },
    ],
    skipDuplicates: true,
  });

  const machine = await prisma.service.upsert({
    where: { id: 'machine-shoot' },
    update: {},
    create: { id: 'machine-shoot', name: 'Machine à Shoot', type: 'MACHINE_SHOOT', description: 'Entraînement intensif avec la machine à tirs' },
  });
  await prisma.pricingRule.createMany({
    data: [
      { serviceId: machine.id, label: '30 min - en ligne', price: 15, unit: 'par session', isOnline: true },
      { serviceId: machine.id, label: '1h - en ligne', price: 25, unit: 'par session', isOnline: true },
      { serviceId: machine.id, label: '30 min - sur place', price: 20, unit: 'par session', isOnline: false },
      { serviceId: machine.id, label: '1h - sur place', price: 30, unit: 'par session', isOnline: false },
    ],
    skipDuplicates: true,
  });

  const anniAllStar = await prisma.service.upsert({
    where: { id: 'anniversaire-all-star' },
    update: {},
    create: { id: 'anniversaire-all-star', name: 'Anniversaire All-Star', type: 'ANNIVERSAIRE', description: '10 personnes, 2h de jeu + animation' },
  });
  await prisma.pricingRule.createMany({
    data: [{ serviceId: anniAllStar.id, label: 'Formule All-Star', price: 220, unit: 'forfait 10 pers.', isOnline: true }],
    skipDuplicates: true,
  });

  const anniStar = await prisma.service.upsert({
    where: { id: 'anniversaire-star' },
    update: {},
    create: { id: 'anniversaire-star', name: 'Anniversaire Star', type: 'ANNIVERSAIRE', description: '10 personnes, 1h de jeu' },
  });
  await prisma.pricingRule.createMany({
    data: [{ serviceId: anniStar.id, label: 'Formule Star', price: 190, unit: 'forfait 10 pers.', isOnline: true }],
    skipDuplicates: true,
  });

  const anniRookie = await prisma.service.upsert({
    where: { id: 'anniversaire-rookie' },
    update: {},
    create: { id: 'anniversaire-rookie', name: 'Anniversaire Rookie', type: 'ANNIVERSAIRE', description: '10 personnes, 1h de jeu formule entrée de gamme' },
  });
  await prisma.pricingRule.createMany({
    data: [{ serviceId: anniRookie.id, label: 'Formule Rookie', price: 150, unit: 'forfait 10 pers.', isOnline: true }],
    skipDuplicates: true,
  });

  console.log('Données de départ créées avec succès !');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
