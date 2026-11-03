# Design — Obooking Gift

Système de design verrouillé pour toute l'application (back-office admin et
partenaire, portail joueur, espace client, pages d'authentification). Chaque
refonte de page lit ce fichier avant d'écrire du code. On ne le régénère pas
page par page : on l'amende quand le système doit évoluer.

Historique : une première version « modern-minimal » (sobre, encre et blanc)
a été refusée — jugée pas assez « jeu », avec une typo et des boutons noirs
qui ne plaisaient pas. Direction validée : **ludique et colorée**, puis
enrichie d'un **thème aviation** (la plateforme appartient à une agence de
voyage) : vidéo hero plein écran, tableau des départs, cartes d'embarquement,
itinéraire de vol.

## Genre
playful — thème « Hum » adapté à la marque, version aviation : fond ciel brume, corail de marque
en couleur principale, jaune soleil et turquoise en accents, bleu nuit pour
le texte. Vivant, festif, jamais enfantin.

## Familles de mise en page
- **Accueil** : hero plein écran — la vidéo hero (téléversée dans le
  back-office, onglet Page d'accueil) sous un voile bleu nuit, ou à défaut
  une scène de ciel au crépuscule avec un avion qui suit sa trajectoire.
  En bas du hero, le **tableau des départs** (élément signature) : les vrais
  jeux qui se terminent bientôt, jours restants en tuiles à volets, statut
  « Embarquement » ou « Dernier appel ». Ensuite le catalogue en **cartes
  d'embarquement** (talon perforé, bouton « Embarquer »), puis l'itinéraire
  en trois escales sur fond bleu nuit.
- **Page partenaire (joueur)** : hero en grande carte d'embarquement
  (bandeau corail, compagnie = partenaire, talon jaune « À gagner »).
- **App (back-office, espace client)** : barre latérale bleu nuit, élément
  actif en pilule corail ; contenu sur fond ciel brume, cartes blanches arrondies.
- **Auth** : écran partagé — panneau ciel au crépuscule avec l'avion à
  gauche (grand écran uniquement), formulaire à droite.

## Couleurs (tokens dans `src/app/globals.css`)
- `--paper` oklch(95.8% 0.012 240) ciel brume · `--paper-2` oklch(92.5% 0.02 240)
- `--surface` oklch(99.6% 0.003 240) cartes et champs
- `--rule` oklch(89% 0.018 240) · `--rule-strong` oklch(82% 0.025 240)
- `--field` oklch(64% 0.03 265) contour des champs (≥ 3:1)
- `--ink-900` oklch(26% 0.055 265) bleu nuit · `--ink-700` · `--ink-500`
- `--brand-500` oklch(70% 0.19 38) corail de marque (#FF6B47) — fonds vifs
- `--brand-600` oklch(57% 0.19 36) corail des boutons (texte blanc 4.9:1)
- `--brand-700` oklch(49% 0.165 34) corail pour du texte sur fond clair
- `--ambre-400` oklch(84% 0.16 85) jaune soleil (texte bleu nuit 9.5:1)
- `--lagon-400` oklch(74% 0.12 190) turquoise (texte bleu nuit)

Règles de contraste : sur `brand-500`, le texte est **bleu nuit** (5.4:1),
jamais blanc (2.9:1). Le blanc n'est utilisé que sur `brand-600` et plus
foncé. Le jaune et le turquoise portent toujours du texte bleu nuit.

L'accent n'est pas limité à 5 % ici (exception assumée du genre) : le hero
et les panneaux d'auth sont en corail plein. En revanche, pas de dégradé
décoratif ni de texte en dégradé.

## Typographie
- Titres (h1–h3) : Clash Display 600, interlettrage -0.01em, romain
- Texte : Plus Jakarta Sans 400 / 600 / 700
- Mono : Geist Mono (codes, références)
- Poids maximal : 800.

## Rayons
Cartes 18–28 px · champs 16 px · boutons et badges en pilule.

## Voix des boutons
Boutons « à presser » : relief de 4 px sous le bouton, qui s'écrase au clic.
- `.btn-game` : corail `brand-600`, texte blanc — action principale.
- `.btn-game-pop` : jaune, contour et relief bleu nuit — action principale
  posée sur un fond corail (hero).
- `.btn-game-sun` : jaune sans contour · `.btn-game-light` : clair, secondaire.
- Libellés : verbe + objet (« Voir les jeux », « Obtenir mes lancers »).

## Mouvement
- Ressort (`--ease-spring`) réservé aux boutons à presser.
- Avion du ciel : suit sa trajectoire en 14 s (SVG animateMotion) ; figé à
  mi-parcours avec `prefers-reduced-motion`.
- Tuiles du tableau des départs : bascule « volet » à l'affichage (une fois).
- La vraie roue (jeu) reste le seul moment « spectacle » interactif.
- Cartes : léger soulèvement au survol. Pas de curseur personnalisé, pas de
  barre de progression de scroll.

## À éviter (tics d'interfaces générées)
Flèches accolées aux libellés de boutons, métadonnées séparées par des
points médians, étiquettes en majuscules, un seul mot surligné dans un titre.

## Contenu honnête
Aucun lot, chiffre ou promesse inventé : les titres et listes « à gagner »
sont construits à partir des vrais lots de la base.

## Ce que toutes les pages partagent
Le logotype, Clash Display + Plus Jakarta Sans, la palette, la voix des
boutons, les rayons.
