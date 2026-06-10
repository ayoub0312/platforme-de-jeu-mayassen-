# Description des Interfaces (UI/UX) - Plateforme de Gamification

Ce document détaille la structure des interfaces pour la plateforme de gamification "mobile-first". L'objectif est une expérience utilisateur fluide, rapide et à haute conversion, avec un thème "White & Orange" (Fond `#FFFFFF`, CTA `#FF8C00`).

## 1. Composants Widget (Shadow DOM)

### A. Déclencheur (Idle State)
- **Position :** Fixed, bas à droite.
- **Aspect :** Bouton flottant circulaire ou capsule, avec une ombre portée légère pour la profondeur.
- **Design :** Fond blanc, icône "cadeau" ou "roue" en orange, texte court "Tenter votre chance !" (optionnel).

### B. Hub de Jeu (Expanded State)
- **Mode :** Modal plein écran (mobile) ou Overlay avec `backdrop-blur` (desktop).
- **Structure :**
    - **Header :** Logo du partenaire (haut), bouton "Fermer" (X).
    - **Contenu Principal :** Roue de loterie centrée, design épuré, sections de la roue en nuances de blanc/gris avec accents orange.
    - **Action :** Bouton "SPIN" orange vif, largeur 80%, centré sous la roue.
    - **Footer :** Mentions légales, texte minimaliste.

### C. Capture de Lead & Résultat
- **État "Gagnant" :** Animation de confettis (orange/blanc).
- **Carte Résultat :** - Titre : "Félicitations !" (Orange).
    - Corps : "Vous avez gagné un iPhone !" (Gras, sombre).
    - Formulaire : Champ Email et Téléphone (Hauteur 48px, bordures grises épurées).
    - CTA : Bouton "Réclamer mon lot" (Orange, plein).

## 2. Directives Design (Design System)

| Élément | Spécification |
| :--- | :--- |
| **Couleur Fond** | `#FFFFFF` (White) |
| **Couleur Accent (CTA)** | `#FF8C00` (Electric Orange) |
| **Police** | Inter ou Geist (Sans-serif) |
| **Typographie** | Contraste fort (Dark Grey `#1A1A1A` sur blanc) |
| **Coins Arrondis** | `16px` (Boutons et cartes) |
| **Performance** | Skeleton Loaders (shimmer) pour les transitions |

## 3. Optimisations Mobile
- **Tactile :** Zones de clic (boutons, champs) >= 48px de hauteur.
- **Responsive :** Largeur fluide (100% du parent avec padding).
- **Isolation :** Styles encapsulés dans 