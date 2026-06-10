# Plateforme de Gamification et Génération de Leads
## Agence de Voyage & Partenaires B2B

### 1. Contexte et Objectifs Business
L'objectif est de créer une "machine à leads" virale permettant à une agence de voyage de déployer des mécaniques de jeu (Roulette, Tirage au sort) chez des partenaires B2B (ex: supermarchés). 
- **Valeur :** Les utilisateurs obtiennent des lots attractifs en échange de leurs données (leads), partagées entre l'agence et le partenaire.
- **Mécanique :** Gamification, boucles de viralité (parrainage), validation de tâches (preuve d'achat, social) et widget d'intégration.

---

### 2. Logique Métier Critique : Gestion de la Concurrence
Pour gérer des scénarios à haute densité (ex: 500 utilisateurs pour 1 lot), le flux API `spinRoulette` suit un workflow strict :

1.  **Rate Limiting (Upstash Redis) :** Prévention du spam (blocage des clics < 2 secondes).
2.  **Éligibilité :** Vérification de la validité des jetons (`PlayTokens`) en BDD.
3.  **RNG Sécurisé :** Utilisation de `crypto.getRandomValues()` (JavaScript) pour garantir l'imprévisibilité.
4.  **Verrouillage Atomique (Redis) :** Utilisation de `DECR` sur la clé de stock du lot. Si `res < 0`, le lot est épuisé -> attribution d'un lot de consolation.
5.  **Persistance (Turso/Prisma) :** Enregistrement transactionnel du gain et mise à jour du crédit de tours.

---

### 3. Modèle de Données (Prisma)
Le schéma est optimisé pour les accès rapides (index sur `isActive`, `startDate`, `endDate`).

* **User :** Gestion des rôles (SUPERADMIN, PARTNER, PLAYER) et parrainage.
* **Partner :** Restriction par domaines autorisés (CORS).
* **Campaign :** Configuration des dates et stocks.
* **Prize :** Distinction `PHYSICAL` / `DIGITAL`, gestion des probabilités et fallback.
* **LeadCapture :** Index unique `@@unique([userId, campaignId])` pour éviter les doublons.

## 4. Stack Technique (Architecture Edge)
La stack est optimisée pour la latence, la sécurité des types et la montée en charge.
- **Front-end :** Next.js (App Router) pour le SSR et le SEO.
- **API :** Hono (Framework Edge) + tRPC (Typage bout en bout).
- **Base de données :** Turso (libSQL) + Prisma ORM.
- **Cache & Concurrence :** Upstash Redis (Gestion des stocks et Rate Limiting)[cite: 1].

## 5. Logique Métier Critique : API `spinRoulette`
Workflow sécurisé pour gérer la haute concurrence[cite: 1] :
1. **Rate Limiting :** Redis vérifie l'absence de spam (clics < 2s)[cite: 1].
2. **Éligibilité :** Vérification des `PlayTokens` en base[cite: 1].
3. **RNG Sécurisé :** Utilisation de `crypto.getRandomValues()` ou `crypto.randomInt()`[cite: 1].
4. **Verrouillage Atomique :** `DECR` sur la clé Redis du lot. Si résultat < 0, attribution d'un lot de consolation[cite: 1].
5. **Persistance :** Mise à jour transactionnelle via Prisma[cite: 1].

## 6. Background Jobs (Asynchronisme)
Pour garantir une latence de réponse < 100ms :
* **Upstash QStash :** File d'attente serverless pour les tâches lourdes (envoi d'emails, synchronisation CRM partenaire).
* **Webhooks :** Traitement en arrière-plan avec stratégie de "retry" automatique en cas d'échec d'API tierce.

---

## 7. Guide d'implémentation rapide
1.  **Installation :** `npm install @prisma/client @trpc/server @upstash/redis hono`
2.  **RNG :** Toujours utiliser `crypto.getRandomValues(new Uint32Array(1))` pour le tirage.
3.  **Redis Atomique :** Toujours valider la décrémentation avant de confirmer le gain dans la base de données SQL.
4.  **Widget :** Déployer le `widget.bundle.js` sur un CDN accessible pour permettre l'injection cross-domain.


// schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"] // Nécessaire pour Turso / libSQL
}

datasource db {
  provider = "sqlite" // Ou "postgresql" selon votre configuration
  url      = env("TURSO_DATABASE_URL")
}

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  phone        String?
  name         String?
  role         Role         @default(PLAYER)
  
  // Parrainage
  referralCode String       @unique @default(cuid())
  referredById String?
  referredBy   User?        @relation("Referrals", fields: [referredById], references: [id])
  referrals    User[]       @relation("Referrals")

  // Relations
  playTokens   PlayToken[]
  wonPrizes    UserPrize[]
  leads        LeadCapture[]
  
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

enum Role {
  SUPERADMIN
  PARTNER
  PLAYER
}

model Partner {
  id             String        @id @default(cuid())
  name           String
  allowedDomains String        // Ex: "supermarche.com,boutique.fr"
  campaigns      Campaign[]
  capturedLeads  LeadCapture[]
}

model Campaign {
  id          String        @id @default(cuid())
  partnerId   String?
  partner     Partner?      @relation(fields: [partnerId], references: [id])
  title       String
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean       @default(true)
  prizes      Prize[]
  leads       LeadCapture[]
  tokens      PlayToken[]

  @@index([isActive, startDate, endDate])
}

model Prize {
  id               String      @id @default(cuid())
  campaignId       String
  campaign         Campaign    @relation(fields: [campaignId], references: [id])
  name             String
  type             PrizeType
  totalStock       Int         // -1 pour illimité
  remainingStock   Int         // Doit être synchronisé avec Redis
  winProbability   Float       // Ex: 0.05
  fallbackPrizeId  String?     // ID du lot de consolation
  winners          UserPrize[]
}

enum PrizeType {
  PHYSICAL
  DIGITAL
}

model UserPrize {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  prizeId   String
  prize     Prize    @relation(fields: [prizeId], references: [id])
  claimedAt DateTime @default(now())
  status    String   @default("PENDING") // PENDING, DELIVERED
}

model PlayToken {
  id         String      @id @default(cuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id])
  campaignId String
  campaign   Campaign    @relation(fields: [campaignId], references: [id])
  status     TokenStatus @default(UNUSED)
  earnedVia  EarnMethod
  createdAt  DateTime    @default(now())
}

enum TokenStatus {
  UNUSED
  USED
  EXPIRED
}

enum EarnMethod {
  SIGNUP
  REFERRAL
  RECEIPT_UPLOAD
  ADMIN_GRANT
}

model LeadCapture {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  partnerId  String
  partner    Partner  @relation(fields: [partnerId], references: [id])
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  source     String   // "WIDGET", "QR_CODE", "LINK"
  createdAt  DateTime @default(now())

  @@unique([userId, campaignId]) // Garantit un seul lead par utilisateur et par campagne
}