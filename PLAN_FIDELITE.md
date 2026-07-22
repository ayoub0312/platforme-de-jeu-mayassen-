# Programme de Fidélité « Points Merci » — Plan d'implémentation

> Document de référence. À valider **avant tout code**.
> Plateforme : **Obooking Gift** — connectée au site de l'agence de voyage **obooking.tn**.

---

## 1. Vision en une phrase

Quand un client paie un service sur **obooking.tn**, il gagne des **« points merci »**.
Il crée un compte sur **Obooking Gift**, y consulte son **historique d'achats**, son **solde de points**,
**convertit ses points en bons de réduction TND** utilisables sur obooking.tn, et découvre les **nouveaux jeux**
publiés par obooking pour tenter de gagner des lots.

---

## 2. Décisions validées

| Décision | Choix retenu |
|---|---|
| **Gagner des points** | Proportionnel au montant : `points = montant_TND × taux` (taux configurable par le super admin) |
| **Utiliser les points** | Conversion en **bon de réduction TND** utilisable sur obooking.tn |
| **Intégration obooking.tn** | **Webhook** (enregistre l'achat en arrière-plan) **+ redirection** (amène le client à créer son compte) |
| **Démarrage** | Ce plan écrit d'abord, puis implémentation par phases |

---

## 3. Ce qui existe déjà (à réutiliser)

| Élément | Rôle actuel | Réutilisation |
|---|---|---|
| `Customer` | Compte client final (email, mot de passe, nom, tél.) | ➕ on lui ajoute **points** + **partenaire d'origine** |
| `SiteSettings` (id `main`) | Config globale du back-office | ➕ on y ajoute les **taux de fidélité** |
| `SHARED_API_SECRET` (`.env`) | Secret partagé avec le site voyage | ✅ sécurise le **webhook** |
| `Partner` (obooking, …) | Partenaires / clients de l'agence | ✅ rattachement des joueurs par partenaire |
| `Campaign` / `Prize` / `PlayToken` | Système de jeux existant | ✅ « nouveaux jeux » + conversion points→lancers (option future) |

---

## 4. Nouveaux modèles de données (Prisma)

### 4.1. Ajouts sur `Customer`
```prisma
model Customer {
  // ... champs existants ...
  points     Int      @default(0)   // Solde courant (cache ; vérité = somme des PointTransaction)
  partnerId  String?                // Partenaire d'origine (obooking par défaut)
  partner    Partner? @relation(fields: [partnerId], references: [id])

  purchases     LoyaltyPurchase[]
  pointTxns     PointTransaction[]
  vouchers      LoyaltyVoucher[]
}
```

### 4.2. `LoyaltyPurchase` — historique d'achats venant d'obooking.tn
```prisma
model LoyaltyPurchase {
  id           String    @id @default(cuid())
  orderRef     String    @unique         // Réf. commande obooking.tn → IDEMPOTENCE
  email        String                     // Email fourni par obooking.tn (rattachement)
  customerId   String?                    // Rempli quand le compte est créé/relié
  customer     Customer? @relation(fields: [customerId], references: [id])
  amountTnd    Float                      // Montant payé (TND)
  pointsEarned Int                        // Points calculés au moment de l'achat
  status       String    @default("PENDING") // PENDING (compte pas encore créé) / CREDITED
  description  String?                    // Ex: "Séjour Djerba 3 nuits"
  purchasedAt  DateTime
  creditedAt   DateTime?
  createdAt    DateTime  @default(now())

  @@index([email])
  @@index([customerId])
}
```
> **PENDING → CREDITED** : si le client n'a pas encore de compte au moment du webhook,
> l'achat est stocké en attente ; à la création du compte (même email), les points sont crédités.

### 4.3. `PointTransaction` — grand livre des points (source de vérité)
```prisma
model PointTransaction {
  id           String   @id @default(cuid())
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id])
  delta        Int                        // + gagné, - utilisé
  type         String                     // EARN_PURCHASE / REDEEM_VOUCHER / ADMIN_ADJUST
  reason       String?
  balanceAfter Int                        // Solde après cette opération (audit)
  purchaseId   String?                    // Lien si EARN_PURCHASE
  voucherId    String?                    // Lien si REDEEM_VOUCHER
  createdAt    DateTime @default(now())

  @@index([customerId, createdAt])
}
```

### 4.4. `LoyaltyVoucher` — bon de réduction généré à la conversion
```prisma
model LoyaltyVoucher {
  id          String    @id @default(cuid())
  customerId  String
  customer    Customer  @relation(fields: [customerId], references: [id])
  code        String    @unique          // Code à saisir sur obooking.tn
  pointsSpent Int
  valueTnd    Float                       // Valeur du bon (TND)
  status      String    @default("ACTIVE") // ACTIVE / REDEEMED / EXPIRED
  redeemedAt  DateTime?
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())

  @@index([customerId])
}
```

### 4.5. Ajouts sur `SiteSettings` — config super admin
```prisma
model SiteSettings {
  // ... champs existants ...
  loyaltyEnabled      Boolean @default(false) // Activer/désactiver le programme
  pointsPerTnd        Float   @default(1)      // GAIN : points par 1 TND dépensé
  redeemPointsPerTnd  Int     @default(100)    // CONVERSION : points pour 1 TND de bon
  minRedeemPoints     Int     @default(500)    // Seuil minimum pour convertir
  voucherValidityDays Int     @default(90)     // Durée de validité d'un bon (jours)
}
```

**Exemple concret avec les valeurs par défaut :**
- Achat de **500 TND** → `500 × 1` = **500 points gagnés**
- Conversion : **100 points = 1 TND** → 500 points = **5 TND de bon** (au-dessus du seuil de 500 pts ✅)

---

## 5. Flux d'intégration obooking.tn (webhook + redirection)

```
┌─────────────┐   1. Paiement OK    ┌────────────────────────────────┐
│ obooking.tn │────────────────────▶│ Client                          │
└─────┬───────┘                     └────────────────────────────────┘
      │
      │ 2. WEBHOOK (serveur→serveur, header x-api-secret)
      │    POST /api/loyalty/purchase
      │    { orderRef, email, amountTnd, purchasedAt, description }
      ▼
┌────────────────────────────────────────────────────────────────┐
│ Obooking Gift                                                    │
│  • Crée LoyaltyPurchase (idempotent sur orderRef)               │
│  • Calcule pointsEarned = floor(amountTnd × pointsPerTnd)       │
│  • Si Customer(email) existe → crédite points (CREDITED)        │
│    sinon → reste PENDING                                        │
│  • Retourne { redirectUrl } = /client/bienvenue?token=<JWT>    │
└────────────────────────────────────────────────────────────────┘
      │
      │ 3. obooking.tn affiche : « Créez un compte pour gagner ! »
      │    + bouton → redirectUrl
      ▼
┌────────────────────────────────────────────────────────────────┐
│ /client/bienvenue?token=<JWT signé>                             │
│  • Vérifie le token (contient orderRef + email + montant)      │
│  • Pré-remplit l'email, propose de créer le compte             │
│  • À la création : relie le LoyaltyPurchase PENDING → crédite  │
└────────────────────────────────────────────────────────────────┘
```

### Utilisation d'un bon sur obooking.tn (retour)
```
Client saisit son code bon au checkout obooking.tn
      │  POST /api/loyalty/voucher/validate { code }      → { valid, valueTnd }
      │  POST /api/loyalty/voucher/redeem   { code, orderRef } → marque REDEEMED
      ▼
obooking.tn applique la réduction valueTnd
```

---

## 6. API & procédures backend

### 6.1. REST sécurisé par `SHARED_API_SECRET` (appelé par obooking.tn)
| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/loyalty/purchase` | POST | Enregistre un achat + crédite/attend les points ; renvoie l'URL de redirection |
| `/api/loyalty/voucher/validate` | POST | Vérifie qu'un code bon est valide + sa valeur |
| `/api/loyalty/voucher/redeem` | POST | Marque un bon comme utilisé (idempotent) |

### 6.2. tRPC client (`customerProcedure`)
| Procédure | Rôle |
|---|---|
| `getMyLoyalty` | Solde de points + historique des transactions |
| `getMyPurchases` | Historique des achats obooking.tn |
| `getMyVouchers` | Mes bons de réduction (actifs / utilisés) |
| `redeemPointsToVoucher` | Convertit un montant de points en bon TND |
| `getNewGames` | Nouveaux jeux/campagnes publiés (feed) |

### 6.3. tRPC admin (`superAdminProcedure`)
| Procédure | Rôle |
|---|---|
| `getLoyaltyConfig` / `updateLoyaltyConfig` | Lire / modifier les taux + activation |
| `getAllPurchases` | Superviser tous les achats (filtrable par partenaire) |
| `getAllVouchers` | Superviser les bons émis |
| `adjustCustomerPoints` | Ajuster manuellement le solde d'un client (geste commercial) |
| `getPlayersByPartner` | Diviser/filtrer les joueurs par partenaire (obooking / autres) |

---

## 7. Interface CLIENT (espace fidélité)

Extension de `src/app/client/(app)/` :

| Écran | Contenu |
|---|---|
| **Accueil `/client`** | Solde de points en évidence + feed « Nouveaux jeux obooking » |
| **Mes points** (`/client/mes-points`) | Solde, historique des transactions (gagné/utilisé), **bouton « Convertir en bon »** |
| **Mes achats** (`/client/mes-achats`) | Historique des achats obooking.tn (date, montant, points gagnés) |
| **Mes bons** (`/client/mes-bons`) *(nouveau)* | Liste des bons : code, valeur TND, statut, expiration |
| **`/client/bienvenue`** *(nouveau)* | Page d'atterrissage depuis obooking.tn (création de compte pré-remplie) |

**Modale de conversion :** le client choisit un nombre de points (≥ `minRedeemPoints`),
voit la valeur en TND en temps réel (`points / redeemPointsPerTnd`), confirme → un bon avec code est généré.

---

## 8. Interface ADMIN (nouvel onglet « Fidélité »)

Dans `PartnerDashboard.tsx`, ajout d'un onglet **Fidélité** :

| Section | Contenu |
|---|---|
| **Configuration** | Activer le programme · taux `pointsPerTnd` · `redeemPointsPerTnd` · seuil min · validité des bons. Avec **simulateur** (« 500 TND → X points → Y TND de bon ») |
| **Achats** | Tableau de tous les achats (filtrable par partenaire, date, statut) + export CSV/Excel |
| **Bons émis** | Tableau des bons (code, client, valeur, statut) |
| **Ajustement points** | Rechercher un client, créditer/débiter manuellement (avec motif → `ADMIN_ADJUST`) |

---

## 9. Division des joueurs par partenaire

**Objectif** : distinguer les joueurs jouant aux jeux **obooking** de ceux d'**autres partenaires**.

- Un `Customer` porte désormais un `partnerId` (partenaire d'origine — obooking par défaut).
- Les participations aux jeux sont déjà reliées à un partenaire via `Campaign.partnerId`.
- **Admin** : filtre « par partenaire » sur la liste des joueurs (comme déjà fait sur l'onglet Utilisateurs),
  + statistiques par partenaire (nb joueurs, points distribués, bons émis).

---

## 10. Sécurité & points d'attention

- **Webhook** : vérifier `x-api-secret` en **timing-safe** ; refuser sinon. Idempotence stricte via `orderRef`.
- **Token de redirection** : JWT **signé + court** (ex. 24 h), contient `orderRef` + `email` uniquement.
- **Points = argent** : la **source de vérité** est la somme des `PointTransaction` (le champ `Customer.points`
  n'est qu'un cache). Toute opération points dans une **transaction DB** pour éviter les soldes négatifs/incohérents.
- **Anti-fraude** : un bon est **à usage unique** (statut `REDEEMED`), non transférable, avec expiration.
- **Réplique Turso** : les écritures (achats, points) passent par le primaire ; `readYourWrites` garantit
  la cohérence immédiate côté serveur.

---

## 11. Phases de livraison

| Phase | Contenu | Testable / livrable |
|---|---|---|
| **0. Plan** | Ce document | ✅ FAIT |
| **1. Fondations** | Migration schéma (nouveaux modèles + config) · onglet **Fidélité** admin avec les taux + simulateur | ✅ FAIT — migration `20260721161333_loyalty_phase1` appliquée à Turso, onglet Fidélité opérationnel |
| **2. Webhook achats** | `/api/loyalty/purchase` + calcul & crédit des points + historique | obooking.tn (ou un test) enregistre un achat → points crédités |
| **3. Redirection & bienvenue** | JWT signé + page `/client/bienvenue` (création compte depuis achat) | Un lien de test crée un compte et crédite l'achat en attente |
| **4. Espace fidélité client** | Solde, historique, mes achats, **conversion en bon**, feed nouveaux jeux | ✅ FAIT — pages `mes-points` (solde + conversion + historique), `mes-bons`, `mes-achats` (réel), `mes-jeux` (nouveaux jeux) ; procédures `getMyLoyaltyPoints/getMyPointsHistory/getMyVouchers/redeemMyPoints/getNewGames/getLoyaltyPublicConfig` |
| **5. Bons côté obooking.tn** | `validate` + `redeem` + onglet admin « Bons » | Génération côté client FAITE ; reste l'API `validate`/`redeem` pour obooking.tn |
| **6. Finitions** | Division joueurs par partenaire · feed nouveaux jeux · stats par partenaire · exports | Tableaux filtrables, feed client |

---

## 12. À clarifier côté obooking.tn (leur équipe technique)

Ces points dépendent du site voyage — à confirmer avant les phases 2/3/5 :

1. Peuvent-ils **appeler notre webhook** après un paiement réussi (serveur→serveur, header secret) ?
2. Quelles **données de commande** peuvent-ils envoyer ? (réf, montant TND, email, description)
3. Peuvent-ils **rediriger** le client après paiement vers une URL que nous fournissons ?
4. Peuvent-ils **valider/appliquer un code bon** au checkout via notre API ?
5. Y a-t-il déjà un **identifiant client commun** (email suffit-il pour rattacher les achats) ?

---

## 13. Récapitulatif des fichiers impactés

| Fichier | Changement |
|---|---|
| `prisma/schema.prisma` | +4 modèles, +2 champs `Customer`, +5 champs `SiteSettings` |
| `src/lib/` (nouveau `loyalty.ts`) | Calcul points, génération/validation bons, JWT redirection |
| `src/app/api/loyalty/purchase/route.ts` (nouveau) | Webhook achat |
| `src/app/api/loyalty/voucher/*/route.ts` (nouveaux) | Validate / redeem |
| `src/server/routers/_app.ts` | Procédures client + admin fidélité |
| `src/app/client/(app)/mes-points`, `mes-achats`, `mes-bons` (nouveau), `bienvenue` (nouveau) | Écrans client |
| `src/components/PartnerDashboard.tsx` | Onglet **Fidélité** (config + supervision) |

---

*Prochaine étape : valide ce plan (ou ajuste les points 4, 5, 12), puis je démarre la **Phase 1**.*
