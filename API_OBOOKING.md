# API d'intégration Obooking Gift ↔ obooking.tn

Documentation destinée à l'équipe technique de **obooking.tn** pour connecter le
site de l'agence de voyage au programme de fidélité **Obooking Gift** (points
merci + bons de réduction).

- **Version** : 1.0
- **Format** : REST, JSON (UTF-8)
- **Base URL (production)** : `https://gift.obooking.tn`
  *(en local/dev : `http://localhost:3000`)*

---

## 1. Vue d'ensemble du flux

```
┌──────────────┐   1. Paiement OK
│  obooking.tn │──────────────────────────┐
└──────┬───────┘                          ▼
       │ 2. POST /api/loyalty/purchase   Client
       │    (serveur → serveur)
       ▼
┌────────────────────────────────────────────────────────┐
│ Obooking Gift                                           │
│  • Enregistre l'achat (idempotent sur orderRef)         │
│  • Calcule les points = montant × taux                  │
│  • Si le client a un compte → crédite immédiatement     │
│    sinon → achat "en attente", crédité à l'inscription  │
│  • Renvoie pointsEarned + une URL d'inscription         │
└────────────────────────────────────────────────────────┘
       │ 3. obooking.tn affiche au client :
       │    « Créez votre compte pour gagner des points »
       │    + bouton → signupUrl
       ▼
Le client convertit ses points en BON de réduction (code) dans son espace.
       │
       │ 4. Au paiement suivant sur obooking.tn, le client saisit son code :
       │    POST /api/loyalty/voucher/validate  → vérifie + valeur
       │    POST /api/loyalty/voucher/redeem    → applique + consomme
       ▼
Réduction appliquée. Bon marqué comme utilisé.
```

---

## 2. Authentification

Tous les endpoints sont **serveur → serveur** et protégés par un **secret partagé**
(`SHARED_API_SECRET`, fourni séparément, jamais exposé côté navigateur).

Envoyez-le dans l'un de ces en-têtes (au choix) :

```
x-api-secret: <SHARED_API_SECRET>
```
ou
```
Authorization: Bearer <SHARED_API_SECRET>
```

Sans secret valide → **`401 Unauthorized`**.

> ⚠️ N'appelez ces endpoints **que depuis votre backend**. Ne mettez jamais le
> secret dans du code front / une page publique.

---

## 3. Endpoints

### 3.1. Enregistrer un achat (webhook) — crédite les points

`POST /api/loyalty/purchase`

À appeler **après chaque paiement réussi** sur obooking.tn.

**Corps de la requête (JSON) :**

| Champ | Type | Requis | Description |
|---|---|---|---|
| `orderRef` | string | ✅ | Référence **unique** de la commande (clé d'idempotence) |
| `email` | string | ✅ | Email du client (sert au rattachement du compte) |
| `amountTnd` | number | ✅ | Montant payé, en TND |
| `purchasedAt` | string (ISO 8601) | ⬜ | Date de l'achat (défaut : maintenant) |
| `description` | string | ⬜ | Libellé affiché au client (ex. « Séjour Djerba 3 nuits ») |
| `customerName` | string | ⬜ | Nom du client (réservé usage futur) |

**Exemple :**
```bash
curl -X POST https://gift.obooking.tn/api/loyalty/purchase \
  -H "x-api-secret: VOTRE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "orderRef": "OBK-2026-00123",
    "email": "client@example.com",
    "amountTnd": 500,
    "purchasedAt": "2026-07-24T10:00:00Z",
    "description": "Séjour Hammamet 4 nuits"
  }'
```

**Réponse `201 Created`** (client déjà inscrit) :
```json
{
  "orderRef": "OBK-2026-00123",
  "pointsEarned": 100,
  "status": "CREDITED",
  "customerExists": true,
  "signupUrl": "https://gift.obooking.tn/client/signup?email=client%40example.com"
}
```

**Réponse `201 Created`** (client pas encore inscrit) :
```json
{
  "orderRef": "OBK-2026-00123",
  "pointsEarned": 100,
  "status": "PENDING",
  "customerExists": false,
  "signupUrl": "https://gift.obooking.tn/client/signup?email=client%40example.com"
}
```
→ Affichez au client le message d'invitation + un bouton vers `signupUrl`.
Les points **en attente** seront **crédités automatiquement** dès qu'il crée son
compte avec le **même email**.

**Idempotence** : réappeler avec le même `orderRef` renvoie `200` avec
`"alreadyProcessed": true` — l'achat n'est **jamais** compté deux fois.

**Notes :**
- `pointsEarned` = `floor(amountTnd × taux)`. Le **taux** est réglé par le super
  admin dans Obooking Gift (ex. 1 point / TND).
- Si le programme de fidélité est **désactivé**, l'achat est enregistré mais
  `pointsEarned = 0`.

---

### 3.2. Vérifier un bon (au checkout)

`POST /api/loyalty/voucher/validate`

À appeler quand le client saisit un **code de réduction** au paiement.
**Lecture seule** — ne consomme pas le bon.

**Corps :**
| Champ | Type | Requis | Description |
|---|---|---|---|
| `code` | string | ✅ | Le code saisi par le client (ex. `OB-4MJ7-GX7R`) |

**Exemple :**
```bash
curl -X POST https://gift.obooking.tn/api/loyalty/voucher/validate \
  -H "x-api-secret: VOTRE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "code": "OB-4MJ7-GX7R" }'
```

**Réponse `200` — bon valide :**
```json
{
  "valid": true,
  "code": "OB-4MJ7-GX7R",
  "valueTnd": 5.55,
  "status": "ACTIVE",
  "expiresAt": "2026-10-19T00:00:00.000Z"
}
```
→ Appliquez une réduction de `valueTnd` TND.

**Réponse `200` — bon non valide :**
```json
{ "valid": false, "reason": "already_redeemed", "message": "Bon déjà utilisé." }
```
`reason` peut valoir : `not_found`, `already_redeemed`, `expired`.
*(`expiresAt: null` = bon sans expiration.)*

---

### 3.3. Utiliser un bon (consommer)

`POST /api/loyalty/voucher/redeem`

À appeler **une fois la réduction appliquée** au paiement, pour marquer le bon
comme **utilisé** (usage unique).

**Corps :**
| Champ | Type | Requis | Description |
|---|---|---|---|
| `code` | string | ✅ | Le code du bon |
| `orderRef` | string | ⬜ | Réf. de la commande où le bon est utilisé (traçabilité) |

**Exemple :**
```bash
curl -X POST https://gift.obooking.tn/api/loyalty/voucher/redeem \
  -H "x-api-secret: VOTRE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{ "code": "OB-4MJ7-GX7R", "orderRef": "OBK-2026-00456" }'
```

**Réponse `200` :**
```json
{
  "redeemed": true,
  "code": "OB-4MJ7-GX7R",
  "valueTnd": 5.55,
  "redeemedAt": "2026-07-24T03:34:34.928Z"
}
```

**Idempotence** : réappeler avec un code déjà utilisé renvoie `200` avec
`"alreadyRedeemed": true` (pas d'erreur).

**Erreurs :** `404` si code inconnu · `409` si bon expiré.

> **Ordre recommandé au checkout** : `validate` (afficher la réduction) →
> encaisser → `redeem` (consommer). Ne consommez le bon **qu'après** paiement
> confirmé.

---

## 4. Codes de réponse HTTP

| Code | Signification |
|---|---|
| `200` | OK (lecture, idempotence, ou état non-valide décrit dans le corps) |
| `201` | Achat créé |
| `400` | Requête invalide (champ manquant/mal formé) — voir `message` |
| `401` | Secret API invalide ou manquant |
| `404` | Ressource introuvable (code de bon inconnu) |
| `409` | Conflit (bon expiré) |

Toutes les erreurs renvoient un corps JSON : `{ "error": "...", "message": "..." }`.

---

## 5. Récapitulatif de l'intégration côté obooking.tn

1. **Après paiement** → `POST /api/loyalty/purchase` avec la commande.
2. Si `customerExists=false` → afficher l'invitation + bouton vers `signupUrl`.
3. **Au checkout, si un code est saisi** → `validate` pour la valeur, puis
   `redeem` après encaissement.

C'est tout : la conversion points → bon et l'espace client sont gérés
entièrement par Obooking Gift.

---

## 6. À confirmer ensemble (côté agence)

- Le **domaine de production** définitif (`gift.obooking.tn` ?) et l'`APP_BASE_URL`
  correspondant (pour construire `signupUrl` et les liens des emails).
- Rotation du `SHARED_API_SECRET` (le transmettre par un canal sécurisé).
- Facultatif : liste blanche d'IP côté Obooking Gift si souhaité.

*Contact technique : à définir.*
