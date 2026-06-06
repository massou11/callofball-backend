const prisma = require('../lib/prisma');

async function getServices(req, res) {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: { pricingRules: true },
  });
  res.json(services);
}

async function getVenues(req, res) {
  const venues = await prisma.venue.findMany({
    where: { isActive: true },
  });
  res.json(venues);
}

module.exports = { getServices, getVenues };
