# Design — Obooking Gift

Système de design verrouillé pour toute l'application (back-office admin et
partenaire, portail joueur, espace client, pages d'authentification). Chaque
refonte de page lit ce fichier avant d'écrire du code. On ne le régénère pas
page par page : on l'amende quand le système doit évoluer.

## Genre
modern-minimal — thème « Coral » : papier gris chaud, un seul accent corail
(la couleur de marque), une seule famille sans-serif, bordures fines plutôt
qu'ombres lourdes, beaucoup d'espace.

## Familles de mise en page
- **App (back-office, espace client)** : Workbench — barre latérale claire,
  barre supérieure fine, contenu sur grille régulière, surfaces cartes à
  bordure fine. Aucun décor : la fonction porte la page.
- **Public (accueil, page partenaire)** : hero deux colonnes (titre à gauche,
  texte + action à droite) puis catalogue de campagnes en liste/grille
  régulière. Pas d'étiquette « eyebrow » ni de soulignement décoratif sous
  les titres de section.
- **Auth (connexion, inscription, réinitialisation)** : formulaire seul,
  centré, largeur 400 px, sans icône décorative au-dessus du titre.

## Thème (tokens dans `src/app/globals.css`)
- `--paper`        oklch(98.4% 0.004 70)  fond de page
- `--paper-2`      oklch(96.2% 0.006 70)  fond secondaire (barre latérale, zones)
- `--surface`      oklch(99.7% 0.002 70)  cartes, champs
- `--rule`         oklch(91.5% 0.007 70)  bordures
- `--rule-strong`  oklch(85% 0.009 70)    séparateurs forts, boutons secondaires
- `--field`        oklch(64% 0.01 60)     contour des champs de saisie (3.3:1)
- `--ink-900`      oklch(21% 0.012 45)    texte principal, bouton primaire app
- `--ink-700`      oklch(38% 0.012 45)    texte secondaire
- `--ink-500`      oklch(52% 0.012 45)    texte tertiaire (≥ 4.5:1 sur paper)
- `--brand-500`    oklch(70% 0.185 38)    corail de marque (#FF6B47) — décor, focus
- `--brand-600`    oklch(57% 0.19 36)     corail des boutons (texte blanc, 4.9:1)
- `--brand-700`    oklch(50% 0.165 35)    corail pour du texte sur fond clair
- `--focus`        = brand-500, anneau 2 px + décalage 2 px

L'accent occupe ≤ 5 % d'un écran : élément de navigation actif, anneau de
focus, bouton d'action joueur, petites marques. Jamais en fond de section,
jamais en dégradé décoratif, jamais en texte dégradé.

## Typographie
- Display : Geist 600, interlettrage -0.025em, toujours romain (pas d'italique)
- Corps : Geist 400 / 500
- Mono : Geist Mono 400 (codes, références, montants alignés)
- Poids maximal 700 : `font-black` et `font-extrabold` sont remappés.
- Échelle : 12 / 13 / 14 / 16 / 20 / 24 / 32 / clamp(2.25rem, 4vw, 3.5rem)

## Espacement
Échelle Tailwind de 4 px. Sections publiques : 96 px de respiration verticale
(64 px sur mobile). Cartes : 20–24 px de padding.

## Rayons
- Cartes : 14 px · Champs : 10 px · Boutons : pilule (999 px) · Badges : 6 px
- `rounded-3xl`, `rounded-2xl` remappés pour rester dans cette échelle.

## Ombres
Une seule élévation pour les cartes (`--shadow-premium-sm`, quasi invisible) ;
les menus et fenêtres modales prennent `--shadow-premium-lg`. Pas de halo
coloré.

## Mouvement
- Easing unique `cubic-bezier(0.16, 1, 0.3, 1)` (`--ease-out`), 150–220 ms.
- Pas de révélations au scroll dans l'app ; transitions de page en fondu court.
- `prefers-reduced-motion: reduce` → opacité seule, ≤ 150 ms.
- Retirés : curseur personnalisé, barre de progression de scroll, halos
  animés en arrière-plan, ligne d'avion.

## Micro-interactions
- Succès silencieux (toast court, pas de confettis hors gain réel à la roue).
- Survol : changement de fond/bordure 150 ms ; focus : anneau instantané.
- La roue de la roulette et l'animation de gain restent l'unique moment
  « spectacle » du produit.

## Voix des boutons
- Primaire app : fond `ink-900`, texte paper, pilule, hauteur 40 px.
- Primaire joueur : fond `brand-600`, texte blanc 600, pilule, hauteur 48 px.
- Secondaire : fond `surface`, bordure `rule-strong`, texte `ink-900`.
- Libellés : verbe + objet (« Créer la campagne », « Tourner la roue »).

## Contenu honnête
Aucun lot, chiffre ou promesse inventé : les titres du portail joueur sont
construits à partir des vrais lots de la campagne affichée.

## Ce que toutes les pages partagent
Le logotype, l'accent corail et sa discipline, Geist, la voix des boutons,
les rayons, la couleur des bordures.
