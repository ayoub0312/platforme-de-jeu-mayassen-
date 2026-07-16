# Espace Client final Obooking — document de cadrage

**Statut : document de conception uniquement. Aucun code, migration ou changement de schéma n'a été effectué pour cette partie.** Objectif : poser un cadrage suffisamment précis pour qu'une implémentation puisse démarrer une fois validée, sans avoir deviné à la place du superviseur sur les points qui ne peuvent pas l'être depuis le code existant.

## 0. Rappel du besoin

Un espace où un client final Obooking (le voyageur, pas l'agence partenaire) peut :
- créer lui-même un compte (email + mot de passe de son choix) ;
- consulter ses achats et son activité sur le site Obooking ;
- consulter ses points de fidélité gagnés après un achat d'offre ;
- accéder aux jeux (roulette, tirage au sort) des campagnes Obooking.

Cet espace est lié au site Obooking d'un côté et à la plateforme de jeu de l'autre, mais reste indépendant des deux — ce n'est ni une page du site vitrine, ni une extension de l'espace partenaire.

---

## 1. Frontière avec l'existant

### Ce qui existe aujourd'hui (vérifié dans le code, pas supposé)

Le modèle `User` actuel sert **deux usages très différents** qui se ressemblent en surface mais n'ont presque rien en commun techniquement :

- **Comptes admin** (`SUPERADMIN` / `PARTNER` / `READONLY`) : `passwordHash` obligatoire en pratique, connexion via `loginAdmin` (bcrypt + token de session signé HMAC, cookie `admin_session`), accès au back-office.
- **Comptes `PLAYER`** : créés par `captureLead` (`src/server/routers/_app.ts`) à la simple saisie d'un email dans le widget de jeu — **sans mot de passe, sans session, sans notion de connexion**. Un `User` en rôle PLAYER n'est identifié que par son email, transmis explicitement à chaque appel (`spinRoulette` prend `{ campaignId, email }` en clair, pas de cookie). C'est un enregistrement de lead/participation, pas un compte avec lequel on se connecte.

Un client final avec "email + mot de passe qu'il choisit, connexion, session" est donc une **capacité d'authentification qui n'existe pas du tout aujourd'hui pour un profil non-admin**. Réutiliser le rôle `PLAYER` du modèle `User` ne ferait économiser qu'une table — toute la logique d'auth (inscription, hash, session, reset) serait de toute façon à écrire intégralement, et en la construisant DANS le même modèle/mêmes chemins de code que `loginAdmin`, on réintroduit exactement le risque que la Phase 2 vient de fermer : mélanger l'auth admin (qui porte `role`/`partnerId`, vérifiée à chaque procédure sensible) avec une auth grand public, dans les mêmes tables et le même cookie.

### Option recommandée : nouveau modèle `Customer`, lié à `User` (PLAYER) par référence

- **`Customer`** : nouveau modèle dédié — email unique, `passwordHash` (bcrypt), son propre cookie de session (ex: `customer_session`, distinct de `admin_session`), sa propre mutation `registerCustomer` / `loginCustomer` / `resetCustomerPassword`. Aucune des procédures/middlewares de la Phase 2 (`adminProcedure`, `partnerProcedure`, `superAdminProcedure`) n'a besoin d'être touchée : c'est un système d'auth parallèle, pas une extension du même.
- Quand un `Customer` joue à un jeu, on relie/crée un `User` (rôle `PLAYER`) avec le même email — exactement le flux `captureLead` actuel, inchangé — pour que tout le système existant (leads, `PlayToken`, `UserPrize`, tableaux de bord partenaires en Phase 3/4) continue de fonctionner sans le savoir. `Customer.userId` pointe vers ce `User`.
- Achats/points de fidélité (données Obooking, sans rapport avec les campagnes) s'accrochent à `Customer`, jamais à `User` — `User`/`Campaign`/`Partner` n'ont pas à connaître l'existence des achats.

**Argument central** : ça isole complètement trois surfaces d'auth qui ont des niveaux de confiance et des propriétaires différents (admin interne, activité de jeu quasi-anonyme, compte client avec des données financières/fidélité) sans faire porter à `loginAdmin` ou aux procédures partenaires un risque qu'elles n'ont pas aujourd'hui. Le coût : un peu de duplication (une deuxième notion de "session"), jugé largement préférable à un couplage entre l'auth admin et l'auth grand public.

**Alternative rejetée** : étendre `User` (ajouter `passwordHash` utilisable par un rôle `CUSTOMER` dans l'enum `Role`, sa propre procédure de login). Plus rapide à écrire, mais mélange dans un seul modèle/enum des comptes qui n'ont ni le même cycle de vie, ni le même niveau de sensibilité, ni le même propriétaire fonctionnel — et complique irrémédiablement toute vérification future de type "seuls SUPERADMIN/PARTNER peuvent faire X" puisqu'il faudrait alors aussi exclure CUSTOMER partout. À proposer au superviseur comme option connue, pas comme recommandation.

---

## 2. Source des achats et des points — question ouverte, rien n'est confirmé

**Aucune hypothèse ci-dessous n'est un acquis.** Le code de ce dépôt ne contient aucune intégration avec un système de réservation/achat Obooking — impossible de savoir depuis ce repo où vivent réellement ces données.

Hypothèses possibles, à trancher avec le superviseur avant d'écrire une seule ligne :

1. **Base de données séparée** (le moteur de réservation Obooking a sa propre base) → il faudrait soit une réplication/lecture directe (couplage fort, risqué), soit une API.
2. **API exposée par le site Obooking** → ce dépôt ferait des appels sortants pour récupérer achats/points à la demande ou périodiquement (webhook, cron). C'est l'option la plus saine côté isolation, mais suppose que cette API existe ou peut être créée côté Obooking.
3. **Import/export périodique** (fichier CSV, batch nocturne) → simple à mettre en œuvre mais introduit un délai (les points/achats ne seraient pas "temps réel").
4. **Saisie manuelle par un admin** → seulement plausible comme solution temporaire/MVP, pas comme cible.

**À confirmer avant de coder** :
- Où vivent réellement les données d'achat aujourd'hui (nom du système, technologie) ?
- Existe-t-il déjà une API/un export quelconque, ou faut-il le faire créer ?
- Le calcul des points de fidélité est-il fait côté Obooking (on ne fait qu'afficher un nombre reçu) ou faut-il le recalculer ici (règles métier à obtenir) ?
- Fréquence de fraîcheur attendue (temps réel ? une fois par jour ?).
- Ces données peuvent-elles transiter/être stockées dans la base de ce projet (Turso), ou doivent-elles rester dans le système Obooking pour des raisons de conformité/propriété des données ?

Tant que ces réponses ne sont pas là, le modèle de données ci-dessous (§3) reste volontairement un **cache local optionnel** plutôt qu'une source de vérité, pour ne pas préjuger de la réponse.

---

## 3. Modèle de données proposé (Prisma, non appliqué)

```prisma
model Customer {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  name            String?
  phone           String?
  userId          String?   @unique   // lien vers le User (PLAYER) utilisé par le système de jeu existant
  user            User?     @relation(fields: [userId], references: [id])
  emailVerifiedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  passwordResetTokens CustomerPasswordReset[]
  loyaltyCache        CustomerLoyaltyCache?
  purchaseCache       CustomerPurchase[]
}

// Jetons de réinitialisation de mot de passe — courte durée de vie, à usage unique.
model CustomerPasswordReset {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  tokenHash  String   @unique   // jamais le token en clair, même ici
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())
}

// Cache local des points de fidélité tels que rapportés par le système Obooking
// (source de vérité = Obooking, pas ce champ — voir §2). Une seule ligne par
// client, écrasée à chaque synchronisation.
model CustomerLoyaltyCache {
  customerId   String   @id
  customer     Customer @relation(fields: [customerId], references: [id])
  pointsBalance Int
  syncedAt     DateTime @default(now())
}

// Idem pour l'historique d'achats — cache d'affichage, pas la source de vérité.
model CustomerPurchase {
  id            String   @id @default(cuid())
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id])
  externalRef   String   // identifiant de la réservation/commande côté Obooking
  label         String   // ex: "Séjour Hammamet 4 nuits"
  amount        Float?
  currency      String?
  purchasedAt   DateTime
  pointsEarned  Int?
  syncedAt      DateTime @default(now())

  @@unique([customerId, externalRef])
}
```

Notes :
- `User.customer` (relation inverse) serait ajoutée sur le modèle `User` existant — champ optionnel, aucun impact sur les comptes admin/partner ni sur l'isolation de la Phase 2.
- Les deux modèles `CustomerLoyaltyCache`/`CustomerPurchase` sont délibérément conçus comme des **caches remplaçables**, pas comme la vérité — cohérent avec le fait que la source (§2) n'est pas encore confirmée. Si la réponse est "API en temps réel", ces tables pourraient même devenir inutiles (lecture à la demande sans stockage local).
- Migration réelle : à faire en local uniquement (`prisma migrate dev`), jamais en prod, exactement selon la même règle que `MIGRATION_PROD.md`.

---

## 4. Auth

- **Inscription** : `registerCustomer` (procédure publique) — email + mot de passe (règles de robustesse minimales à définir, ex: 8 caractères), hash bcrypt (même lib `bcryptjs` déjà utilisée, cohérent avec le reste du projet), vérification d'unicité de l'email. Envoi d'un email de confirmation via le même mécanisme Resend déjà en place (`src/lib/mailer.ts`) plutôt qu'une nouvelle intégration.
- **Connexion** : `loginCustomer` — vérifie bcrypt, émet un token de session signé, posé dans un cookie **`customer_session`** (jamais `admin_session` — walls étanches). Réutiliser le même mécanisme HMAC de `src/lib/auth.ts` (`createSessionToken`/`verifySessionToken`) est raisonnable techniquement, mais avec un **type de payload distinct** (`CustomerSession { customerId, email, exp }`, sans `role` ni `partnerId`) pour qu'il soit structurellement impossible de confondre les deux tokens même en cas de bug de lecture de cookie.
- **Réinitialisation de mot de passe** : lien à usage unique envoyé par email (`CustomerPasswordReset.tokenHash`, jamais le token en clair stocké — même logique que pour tout secret dans ce projet), expiration courte (ex: 1h).
- **Cohabitation avec `loginAdmin`** : aucun chevauchement de code si les deux systèmes restent séparés comme proposé — `loginAdmin` continue de ne gérer que `SUPERADMIN`/`PARTNER`, `loginCustomer` ne gère que `Customer`. Le seul risque à surveiller : ne jamais faire lire à une procédure customer le cookie `admin_session` ou vice-versa (à couvrir par un test explicite en Phase de durcissement, sur le modèle des tests de cloisonnement déjà faits en Phase 2).

---

## 5. Accès aux jeux

Bonne nouvelle constatée en lisant le code : le système de jeu actuel identifie déjà un joueur **par email transmis explicitement à chaque appel** (`captureLead({ email, campaignId, partnerId, ... })`, `spinRoulette({ campaignId, email })`) — pas par cookie, pas par session. Un `Customer` connecté peut donc **réutiliser tel quel** tout le flux existant : le front pré-remplit `email` depuis la session `Customer` au lieu de demander à l'utilisateur de le retaper. **Aucune modification des procédures `captureLead`/`spinRoulette`/tirage n'est nécessaire pour le "jouer".**

Ce qui manque réellement, et qui est nouveau :

- **`getMyGameActivity`** (nouvelle procédure, authentifiée `Customer`) : renvoie les participations/gains du client connecté — `PlayToken`, `UserPrize`, `LeadCapture` — filtrés par `ctx.customerSession.email` (jamais par un email fourni en paramètre, exactement le même principe que le cloisonnement partenaire de la Phase 2 : ne jamais faire confiance à un id/email transmis par le client quand une session authentifiée existe). Garde-fou : cette procédure ne doit jamais accepter un email en `input` — uniquement lire celui de la session, pour qu'un client ne puisse pas consulter l'activité d'un autre en modifiant la requête.
- Le lien `Customer.userId → User.id` (créé/retrouvé au premier jeu, par correspondance d'email) est ce qui permet à cette procédure de savoir quel `User` interroger.
- Aucun changement nécessaire aux procédures admin/partenaires déjà cloisonnées en Phase 2 — un client final n'appelle jamais `adminProcedure`/`partnerProcedure`.

---

## 6. Direction UI

Pages envisagées : `/mon-compte` (tableau de bord : activité récente, solde de points), `/mon-compte/achats` (historique), `/mon-compte/points`, `/mon-compte/jeux` (campagnes actives auxquelles participer/rejouer), `/connexion`, `/inscription`, `/mot-de-passe-oublie`.

**Tension à ne pas trancher unilatéralement** : la demande décrit un style "esprit Notion — sobre, beaucoup de blanc, typographie soignée, peu de couleur", alors que le design system actuel du projet est construit autour d'une identité colorée et affirmée (`--brand-500: #ff6b47` Corail, `--lagon-500: #0ea5a0` Lagon, dégradés `bg-gradient-brand`, ombres "premium" multi-couches) — cohérent avec une page de jeu/campagne, mais à l'opposé d'un rendu minimaliste blanc. Deux façons de résoudre ça, à choisir avec le superviseur :

1. **Sous-marque cohérente mais adoucie** : garder `Inter` (déjà le corps de texte du site) et `Clash Display` (déjà les titres) pour la continuité de marque, mais réserver Corail/Lagon à des accents ponctuels (un lien actif, un badge de points) sur un fond très majoritairement blanc/gris clair — pas de dégradés ni d'ombres "glow". C'est une interprétation "Notion-like" qui reste reconnaissable comme Obooking.
2. **Rupture volontaire** : traiter l'espace client comme une expérience à part avec sa propre palette neutre (gris/noir/blanc quasi exclusifs), qui ne cherche pas à ressembler au reste du site — au prix d'une incohérence de marque assumée entre "jouer" (coloré, festif) et "gérer mon compte" (sobre, utilitaire).

Aucune des deux n'est évidemment supérieure sans arbitrage produit — noté ici plutôt que décidé.

---

## 7. Découpage en sous-phases

- **Sous-phase 0 — Confirmation** : réponses du superviseur au §2 (source des achats/points) et choix d'orientation UI (§6). Aucun code avant ça.
- **Sous-phase 1 — Modèle de données + migration locale** : `Customer`, `CustomerPasswordReset`, et les modèles de cache retenus après le §2. Migration `prisma migrate dev` en local uniquement, jamais en prod. ARRÊT : schéma + migration à valider.
- **Sous-phase 2 — Auth self-service** : inscription, connexion, session, reset de mot de passe, email de confirmation (Resend). Tests explicites de non-collision avec `admin_session`/`loginAdmin`. ARRÊT : compte-rendu + démonstration du parcours inscription → connexion → reset.
- **Sous-phase 3 — Achats & points** : implémentation selon la réponse du §2 (API, import, ou autre). C'est la phase la plus incertaine en durée tant que la source n'est pas confirmée. ARRÊT avant d'aller plus loin si la réponse implique une dépendance externe non encore prête.
- **Sous-phase 4 — Accès aux jeux depuis l'espace client** : `getMyGameActivity`, pages `/mon-compte/jeux`, pré-remplissage de l'email depuis la session `Customer` dans les flux `captureLead`/`spinRoulette` existants (sans les modifier). ARRÊT : test de cloisonnement (un client ne voit que sa propre activité, vérifié comme en Phase 2).
- **Sous-phase 5 — UI/finitions** : pages complètes selon la direction choisie au §6, états vides/chargement/erreur, responsive. `npm run build` sans erreur. Vidéo hero non touchée (aucune des pages de cet espace n'en a besoin de toute façon).

---

## 8. Questions ouvertes (nécessitent une décision superviseur/client)

1. Source et fraîcheur des données d'achat/points (§2) — bloquant pour la sous-phase 3.
2. `Customer` séparé vs extension de `User` (§1) — recommandation donnée, mais reste un choix d'architecture à valider explicitement avant la sous-phase 1.
3. Orientation UI Notion-like vs identité colorée actuelle (§6) — impacte tout le travail front de la sous-phase 5.
4. Un client peut-il s'inscrire avec un email déjà présent comme `User` PLAYER (ayant déjà joué sans compte) ? Faut-il proposer une fusion/rattachement automatique par email, ou traiter comme deux identités à relier manuellement ?
5. Vérification d'email obligatoire avant de jouer/voir ses points, ou compte utilisable immédiatement après inscription ?
6. Politique de mot de passe (longueur, complexité) et durée de vie de la session client — alignée sur celle des comptes admin (7 jours, `createSessionToken`) ou différente ?
7. RGPD / conservation des données d'achat mises en cache localement (si le §2 aboutit à un stockage local) — durée de rétention, droit à l'export/suppression.
