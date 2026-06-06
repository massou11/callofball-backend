-- Mise à jour des tarifs HC/HP pour les terrains
-- À coller dans Supabase > SQL Editor > New query

-- 1. Supprimer les anciens tarifs "en ligne" génériques des terrains
DELETE FROM "PricingRule"
WHERE "serviceId" IN ('match-5x5', 'match-grand-3x3', 'match-3x3')
AND "isOnline" = true;

-- 2. Ajouter HC et HP pour Match Entre Amis 5x5
INSERT INTO "PricingRule" ("id", "serviceId", "label", "price", "unit", "isOnline", "isPeakHour") VALUES
(gen_random_uuid()::text, 'match-5x5', 'Heure creuse', 75, 'par session', true, false),
(gen_random_uuid()::text, 'match-5x5', 'Heure pleine', 95, 'par session', true, true);

-- 3. Ajouter HC et HP pour Match Entre Amis Grand 3x3
INSERT INTO "PricingRule" ("id", "serviceId", "label", "price", "unit", "isOnline", "isPeakHour") VALUES
(gen_random_uuid()::text, 'match-grand-3x3', 'Heure creuse', 50, 'par session', true, false),
(gen_random_uuid()::text, 'match-grand-3x3', 'Heure pleine', 70, 'par session', true, true);

-- 4. Ajouter HC et HP pour Match Entre Amis 3x3
INSERT INTO "PricingRule" ("id", "serviceId", "label", "price", "unit", "isOnline", "isPeakHour") VALUES
(gen_random_uuid()::text, 'match-3x3', 'Heure creuse', 40, 'par session', true, false),
(gen_random_uuid()::text, 'match-3x3', 'Heure pleine', 60, 'par session', true, true);
