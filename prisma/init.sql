-- Call of Ball - Schéma de base de données
-- À coller dans Supabase > SQL Editor > New query

CREATE TYPE "Role" AS ENUM ('CLIENT', 'ADMIN');
CREATE TYPE "VenueType" AS ENUM ('TERRAIN_5X5', 'DEMI_TERRAIN_5X5', 'TERRAIN_3X3', 'CAGE_1V1');
CREATE TYPE "ServiceType" AS ENUM ('PICKUP_GAME', 'MATCH_AMIS', 'MACHINE_SHOOT', 'ANNIVERSAIRE', 'COACHING', 'TOURNOI', 'LEAGUE', 'ACADEMY', 'CORPORATE', 'CAMP');
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');
CREATE TYPE "SubscriptionType" AS ENUM ('ACADEMY_1J_6MOIS', 'ACADEMY_2J_6MOIS');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VenueType" NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "isPeakHour" BOOLEAN,
    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "venueId" TEXT,
    "serviceId" TEXT NOT NULL,
    "slotId" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "participants" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Reservation_slotId_key" ON "Reservation"("slotId");

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_reservationId_key" ON "Payment"("reservationId");

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SubscriptionType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- Clés étrangères
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Données initiales : Terrains
INSERT INTO "Venue" ("id", "name", "type", "capacity", "description") VALUES
('terrain-5x5',      'Grand Terrain 5x5',   'TERRAIN_5X5',      10, 'Terrain de basket complet 5 contre 5'),
('demi-terrain-5x5', 'Demi-Terrain 5x5',    'DEMI_TERRAIN_5X5', 5,  'Moitié du grand terrain 5x5'),
('terrain-3x3-a',    'Terrain 3x3 A',       'TERRAIN_3X3',      6,  'Terrain 3 contre 3'),
('terrain-3x3-b',    'Terrain 3x3 B',       'TERRAIN_3X3',      6,  'Terrain 3 contre 3'),
('cage-1v1',         'La Cage',             'CAGE_1V1',         2,  'Cage 1 contre 1');

-- Données initiales : Services
INSERT INTO "Service" ("id", "name", "type", "description") VALUES
('pickup-game',          'Pickup Game',              'PICKUP_GAME',   'Rejoignez un match libre avec d''autres joueurs'),
('cage-service',         'La Cage (1vs1)',            'MATCH_AMIS',    'Réservez la cage pour un duel 1 contre 1'),
('match-5x5',            'Match Entre Amis 5x5',     'MATCH_AMIS',    'Réservez le grand terrain pour votre équipe'),
('match-grand-3x3',      'Match Entre Amis Grand 3x3','MATCH_AMIS',   'Réservez le demi-terrain'),
('match-3x3',            'Match Entre Amis 3x3',     'MATCH_AMIS',    'Réservez un terrain 3x3'),
('machine-shoot',        'Machine à Shoot',          'MACHINE_SHOOT', 'Entraînement intensif avec la machine à tirs'),
('anniversaire-all-star','Anniversaire All-Star',     'ANNIVERSAIRE',  '10 personnes, 2h de jeu + animation'),
('anniversaire-star',    'Anniversaire Star',        'ANNIVERSAIRE',  '10 personnes, 1h de jeu'),
('anniversaire-rookie',  'Anniversaire Rookie',      'ANNIVERSAIRE',  '10 personnes, 1h de jeu formule entrée de gamme');

-- Données initiales : Tarifs
INSERT INTO "PricingRule" ("id", "serviceId", "label", "price", "unit", "isOnline", "isPeakHour") VALUES
(gen_random_uuid()::text, 'pickup-game',           'En ligne',                   8,   'par personne',    true,  null),
(gen_random_uuid()::text, 'pickup-game',           'Sur place',                  10,  'par personne',    false, null),
(gen_random_uuid()::text, 'cage-service',          'Heure creuse - en ligne',    6,   'par personne',    true,  false),
(gen_random_uuid()::text, 'cage-service',          'Heure pleine - en ligne',    8,   'par personne',    true,  true),
(gen_random_uuid()::text, 'cage-service',          'Heure creuse - sur place',   8,   'par personne',    false, false),
(gen_random_uuid()::text, 'cage-service',          'Heure pleine - sur place',   10,  'par personne',    false, true),
(gen_random_uuid()::text, 'match-5x5',             'En ligne',                   75,  'par session',     true,  null),
(gen_random_uuid()::text, 'match-5x5',             'Sur place',                  95,  'par session',     false, null),
(gen_random_uuid()::text, 'match-grand-3x3',       'En ligne',                   50,  'par session',     true,  null),
(gen_random_uuid()::text, 'match-grand-3x3',       'Sur place',                  70,  'par session',     false, null),
(gen_random_uuid()::text, 'match-3x3',             'En ligne',                   40,  'par session',     true,  null),
(gen_random_uuid()::text, 'match-3x3',             'Sur place',                  60,  'par session',     false, null),
(gen_random_uuid()::text, 'machine-shoot',         '30 min - en ligne',          15,  'par session',     true,  null),
(gen_random_uuid()::text, 'machine-shoot',         '1h - en ligne',              25,  'par session',     true,  null),
(gen_random_uuid()::text, 'machine-shoot',         '30 min - sur place',         20,  'par session',     false, null),
(gen_random_uuid()::text, 'machine-shoot',         '1h - sur place',             30,  'par session',     false, null),
(gen_random_uuid()::text, 'anniversaire-all-star', 'Formule All-Star',           220, 'forfait 10 pers.',true,  null),
(gen_random_uuid()::text, 'anniversaire-star',     'Formule Star',               190, 'forfait 10 pers.',true,  null),
(gen_random_uuid()::text, 'anniversaire-rookie',   'Formule Rookie',             150, 'forfait 10 pers.',true,  null);
