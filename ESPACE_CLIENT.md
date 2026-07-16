# Espace Client final Obooking

**Statut : implémenté (périmètre limité, sans dépendance obooking.tn) et testé en réel en local. Rien n'a été déployé, rien n'a touché la base de production.** Ce document a d'abord servi de cadrage avant tout code ; il documente maintenant ce qui existe réellement, ce qui reste un bouchon assumé, et ce qui reste à décider avant d'aller plus loin.

## 0. Rappel du besoin

Un espace où un client final Obooking (le voyageur, pas l'agence partenaire) peut :
- créer lui-même un compte (email + mot de passe de son choix) ;
- consulter ses achats et son activité sur le site Obooking ;
- consulter ses points de fidélité gagnés après un achat d'offre ;
- accéder aux jeux (roulette, tirage au sort) des campagnes Obooking.

Cet espace est lié au site Obooking d'un côté et à la plateforme de jeu de l'autre, mais reste indépendant des deux.

---

## 1. Frontière avec l'existant — implémenté tel que recommandé

Modèle `Customer` séparé de `User`/`Role`, comme proposé initialement (voir raisonnement complet plus bas, non modifié) :

- `Customer` (schema.prisma) : email unique, `passwordHash` (bcrypt), `name`/`phone` optionnels, `userId` optionnel (lien vers un `User` PLAYER existant).
- Session strictement séparée : cookie **`customer_session`** (jamais `admin_session`), type `CustomerSession { customerId, email, exp }` (src/lib/auth.ts, fonctions `createCustomerSessionToken`/`verifyCustomerSessionToken` — dupliquées depuis le mécanisme HMAC de `createSessionToken`/`verifySessionToken` plutôt que généralisées, pour ne jamais toucher au code utilisé par `loginAdmin`).
- `customerProcedure` (src/server/trpc.ts) : middleware qui ne lit que `ctx.customerSession`. **Vérifié en réel** (pas supposé) : un `Customer` authentifié appelant `partnerProcedure`/`superAdminProcedure` reçoit un refus d'accès, parce que ces middlewares ne lisent que `ctx.userSession` — qui reste `null` pour une requête n'ayant que le cookie `customer_session`, jamais `admin_session`. Le code retourné est `UNAUTHORIZED` et non `FORBIDDEN` (voir note dans le rapport de session correspondant) : le refus est réel, seul le code exact diffère de ce qui était anticipé — corriger ça demanderait de faire connaître les sessions client aux middlewares admin, ce qui aurait été une entorse à "ne pas affaiblir loginAdmin".
- Quand un `Customer` consulte "Mes jeux" et n'a pas encore de `userId` lié, l'API cherche un `User` existant avec le même email (quelqu'un ayant déjà joué avant de créer un compte) et le relie automatiquement. Le flux de jeu public (`captureLead`, `spinRoulette`) n'a pas été touché.

### Alternative rejetée (rappel)
Étendre `User` avec un rôle `CUSTOMER` dans l'enum `Role` — plus rapide, mais mélange dans un seul modèle/enum des comptes aux cycles de vie et niveaux de sensibilité différents, et complique toute vérification future "seuls SUPERADMIN/PARTNER peuvent faire X". Non retenu.

---

## 2. Source des achats et des points — **toujours une question ouverte, rien n'est confirmé**

**Aucune hypothèse ci-dessous n'est un acquis, et aucune table `Purchase`/`LoyaltyPoint` n'a été créée** — conformément à la consigne explicite de ne pas figer la forme des données obooking.tn. Le code de ce dépôt ne contient toujours aucune intégration avec un système de réservation/achat Obooking.

Hypothèses possibles, à trancher avec le superviseur avant de remplacer le bouchon :

1. **Base de données séparée** (le moteur de réservation Obooking a sa propre base) → réplication/lecture directe (couplage fort, risqué), ou API.
2. **API exposée par le site Obooking** → ce dépôt ferait des appels sortants à la demande ou périodiquement (webhook, cron). Option la plus saine côté isolation, si cette API existe ou peut être créée.
3. **Import/export périodique** (fichier CSV, batch nocturne) → simple, mais introduit un délai.
4. **Saisie manuelle par un admin** → seulement plausible comme solution temporaire/MVP.

**À confirmer avant de coder l'intégration réelle** :
- Où vivent réellement les données d'achat aujourd'hui (nom du système, technologie) ?
- Existe-t-il déjà une API/un export, ou faut-il le faire créer ?
- Le calcul des points de fidélité est-il fait côté Obooking (affichage d'un nombre reçu) ou faut-il le recalculer ici ?
- Fréquence de fraîcheur attendue (temps réel ? une fois par jour ?).
- Ces données peuvent-elles transiter/être stockées dans la base de ce projet (Turso), ou doivent-elles rester chez Obooking pour des raisons de conformité ?

## 2 bis. Couche d'abstraction — implémentée, bouchon actif

`src/lib/obookingDataSource.ts` :

```ts
export interface ObookingPurchase {
  id: string
  label: string
  amount: number
  currency: string
  purchasedAt: string // ISO date
}

export interface ObookingLoyaltyPoints {
  balance: number
  updatedAt: string // ISO date
}

export interface ObookingDataSource {
  getPurchases(customerId: string): Promise<ObookingPurchase[]>
  getLoyaltyPoints(customerId: string): Promise<ObookingLoyaltyPoints>
}

export class MockObookingDataSource implements ObookingDataSource { /* données factices */ }

export const obookingDataSource: ObookingDataSource = new MockObookingDataSource()
```

- Les procédures tRPC `getMyPurchases`/`getMyLoyaltyPoints` (src/server/routers/_app.ts) n'appellent que `obookingDataSource.getPurchases(...)`/`.getLoyaltyPoints(...)` — jamais `MockObookingDataSource` directement. Les pages `/client/mes-achats`, `/client/mon-activite`, `/client/mes-points` ne consomment que ces procédures.
- Le jour où l'intégration réelle est décidée (§2), remplacer uniquement la dernière ligne du fichier (`new ApiObookingDataSource(...)` ou équivalent) suffit — aucune procédure tRPC ni aucune page n'a besoin de changer, tant que la nouvelle implémentation respecte la même interface.
- Bandeau non masquable affiché sur les trois pages (`src/components/client/DemoBanner.tsx`) : "Données de démonstration — intégration obooking.tn en attente."
- `customerId` n'est même pas utilisé par le bouchon pour varier les données — volontaire, pour qu'il soit impossible de le confondre avec une vraie intégration même par accident.

---

## 3. Modèle de données réel (appliqué en local uniquement)

```prisma
model Customer {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  phone        String?
  userId       String?  @unique
  user         User?    @relation(fields: [userId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  passwordResetTokens CustomerPasswordReset[]
}

model CustomerPasswordReset {
  id         String    @id @default(cuid())
  customerId String
  customer   Customer  @relation(fields: [customerId], references: [id])
  tokenHash  String    @unique
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime  @default(now())

  @@index([customerId])
}
```

Différences par rapport à la proposition initiale : pas de `emailVerifiedAt` (vérification d'email non implémentée, non demandée explicitement) ; pas de `CustomerLoyaltyCache`/`CustomerPurchase` — remplacés par la couche d'abstraction (§2 bis), conformément à l'interdiction explicite de créer des tables d'achats/points tant que la source réelle n'est pas décidée.

Migration `20260716220440_partner_signup_and_customer_space` — appliquée uniquement sur `dev.db` local, jamais sur Turso production.

---

## 4. Auth — implémenté

- **Inscription** (`registerCustomer`, publique) : email + mot de passe (min 12 caractères + 3 types de caractères parmi minuscules/majuscules/chiffres/symboles, vérifié serveur), hash bcrypt. Rate limité (3/IP/heure, `authRatelimit`). Anti-énumération : réponse identique que l'email existe déjà ou non, aucune création en cas de collision.
- **Connexion** (`loginCustomer`) : bcrypt, token signé posé dans `customer_session` (jamais `admin_session`). Rate limité. Message d'erreur identique compte inexistant/mot de passe incorrect.
- **Déconnexion** (`logoutCustomer`) : trivial, le cookie est effacé côté client.
- **Réinitialisation de mot de passe** : `requestCustomerPasswordReset` (rate limité, réponse générique, envoi best-effort d'un email via Resend si un expéditeur par défaut est configuré dans Réglages — n'échoue jamais la mutation) + `resetCustomerPasswordWithToken` (token à usage unique, hashé en base — jamais en clair —, expiration 1h).
- **Changement de mot de passe connecté** (`changeMyPassword`, page Paramètres) : vérifie l'ancien mot de passe, distinct du flux de réinitialisation par email.
- **Cohabitation avec `loginAdmin`** : `loginAdmin` n'a pas été modifié pour cette partie B (seule la Partie A y a ajouté le contrôle de statut partenaire). Aucun chevauchement de code : fonctions dupliquées dans `auth.ts`, cookie distinct, middleware distinct.

---

## 5. Accès aux jeux — implémenté

`getMyGameActivity` (customerProcedure, sans aucun paramètre d'entrée) : résout `ctx.customerSession.customerId` → `Customer.userId` (lié automatiquement par email au premier accès si un `User` joueur existe déjà) → `PlayToken`/`UserPrize` de ce `User` uniquement. **Vérifié en réel** : impossible de lire les participations d'un autre client, puisque l'id n'est jamais pris ailleurs que dans la session.

La page "Mes jeux" combine cette activité réelle avec la liste des campagnes actives (réutilise la procédure publique existante `getCampaigns`, inchangée).

---

## 6. Direction UI — implémentée, tension non tranchée unilatéralement

Réalisé : `Inter` (corps, déjà la police globale du site) + `font-mono` (Geist Mono, déjà configuré) pour les données chiffrées (montants, points, dates). Fond blanc, bordures fines `border-black/[0.08]`, Corail `#FF6B47` réservé aux boutons primaires et liens actifs — aucun dégradé, aucune ombre "premium", densité d'information faible (listes simples, pas de cartes chargées).

**La tension notée dans la version précédente de ce document reste réelle et n'a pas été tranchée** : l'espace client (`/client/*`) a délibérément une identité visuelle plus sobre que le reste du site (roulette, portail campagnes, back-office partenaire), qui reste coloré et festif. C'est un choix d'implémentation (option 1 de l'ancienne section 6 : continuité de police, rupture de traitement visuel), pas une décision produit definitive — à valider avec le superviseur si une cohérence de marque plus forte est attendue.

---

## 7. Ce qui reste à faire / hors périmètre de cette implémentation

- **Intégration réelle obooking.tn** (§2) — bloquée tant que la source n'est pas décidée. Le bouchon reste en place indéfiniment jusque-là.
- **Vérification d'email** à l'inscription — non implémentée (pas explicitement demandée). Un compte est utilisable immédiatement après inscription.
- **RGPD / rétention** des données Customer — non traité, à voir si l'intégration obooking.tn introduit un jour un stockage local réel de données d'achat.
- **Rattachement multi-comptes** : si un client s'inscrit avec un email correspondant à un `User` PLAYER existant (a déjà joué anonymement), le rattachement se fait automatiquement au premier appel de "Mes jeux" — pas de flux de fusion explicite si les emails diffèrent.

---

## 8. Questions ouvertes (nécessitent une décision superviseur/client)

1. Source et fraîcheur réelles des données d'achat/points (§2) — bloquant pour remplacer le bouchon.
2. Cohérence de marque de l'espace client vs identité colorée du reste du site (§6) — choix actuel : sobre et distinct, à confirmer ou ajuster.
3. Vérification d'email obligatoire avant utilisation du compte — actuellement non implémentée.
4. RGPD / conservation si l'intégration obooking.tn introduit un stockage local un jour.
