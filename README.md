# SVBR® — Portfolio Arthur Ho-Wan

Portfolio 2026 — directeur artistique, motion & UX·UI designer, Paris.

Site statique (HTML / CSS / JS + GSAP + Three.js), aucun build nécessaire.

- **Hero WebGL** (`js/gl/hero.js`) : transition « liquide » en shader entre les projets,
  profondeur à la souris, grain et vignette. Repli CSS automatique sans WebGL.
- **Planches de présentation** (`images/boards/<planche>/`) : planches de branding à plat
  (logo, palette, typo, visuels réels) découpées en pièces ; au scroll, la planche se
  construit pièce par pièce (révélations par masque, nuancier qui se remplit).
- **Projets privés** : `data/projects.local.json` + `images/private/` (ignorés par git) sont
  chargés en local seulement — ex. ANESIA, sous NDA jusqu'au lancement.
- **Récit** : chaque projet raconte son histoire via `story` dans `data/projects.json`
  (chapitres, visuels, scène 3D). Lien direct : `#projet-2gzr`, `#projet-yokai`…

## Structure

- `index.html` — le site (vues Featured / Index / Projet / About / Contact)
- `data/projects.json` — les projets (éditable via le CMS `/admin` — Decap CMS)
- `images/uploads/` — visuels optimisés pour le web
- `css/styles.css`, `js/main.js` — styles et animations
- `netlify.toml` — config de déploiement Netlify

## Projets

| Projet | Statut |
|---|---|
| 2GZR | ✅ en ligne — planche système |
| YOKAI | ✅ en ligne — planche système |
| Monopoly × Arcane | ✅ en ligne — planche système |
| INDA | ✅ en ligne  |
| À la bonne croquette | ✅ en ligne  |
| ANESIA | 🔒 local uniquement (NDA, lancement nov. 2026) |

## Déploiement

Connecter ce dépôt à Netlify (publish directory : `.`). Activer Netlify
Identity + Git Gateway pour le CMS `/admin`.
