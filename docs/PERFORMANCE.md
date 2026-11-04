# Performance : polices, icônes et ressources externes

Ce document explique d'où viennent les polices et les icônes du site, et comment les mettre à jour.
Branche d'origine : `perf-head` (octobre 2026).

## Ce qui est hébergé sur le site (plus aucun appel à Google Fonts ni au CDN Tabler)

| Ressource | Fichiers | Origine |
|---|---|---|
| Polices Cormorant Garamond, Inter, Playfair Display | `assets/fonts/*.woff2` + `@font-face` en tête de `assets/css/style.css` | Copie des fichiers servis par Google Fonts (octobre 2026) |
| Icônes Tabler (sous-ensemble) | `assets/fonts/tabler-icons-subset.woff2` + `assets/css/tabler-subset.css` | Tabler Icons **3.49.0**, généré par `scripts/build-icons.js` |
| Licences | `assets/fonts/LICENSES/` | OFL (3 polices) + MIT (Tabler) |

Les pages n'ont plus de `<link>` vers `fonts.googleapis.com`, `fonts.gstatic.com` ni `tabler-icons.min.css`.
GLightbox (`galerie.html` uniquement) reste sur jsDelivr, **version épinglée 3.3.1** avec contrôle d'intégrité (SRI).
EmailJS reste sur jsDelivr sans version épinglée (hors périmètre de ce chantier).

## Polices : règles à respecter

- Les `@font-face` sont une **copie fidèle** de ceux de Google Fonts : mêmes graisses, mêmes styles, mêmes plages unicode, un bloc par graisse (Google sert un fichier variable partagé par plusieurs graisses : on garde les blocs séparés pour que le navigateur choisisse exactement les mêmes faces qu'avant, y compris l'épaississement artificiel de certaines graisses).
- Graisses disponibles :
  - Cormorant Garamond normal 300, 400, 500, 600 ; italique 300, 400, 500
  - Inter 300, 400, 500, 600
  - Playfair Display 400 uniquement (seule graisse utilisée : `.concept-carnet-labels li`)
- Sous-ensembles hébergés : `latin`, `latin-ext`, `cyrillic` (le mot « Русский » de `devis.html`). Les sous-ensembles `cyrillic-ext` et `vietnamese` ne sont pas hébergés : aucun caractère du site n'en dépend (vérifié sur tout le code et le texte rendu FR/EN). Les emojis, flèches `→` et symboles de dessin de boîtes ne sont dans aucun sous-ensemble Google : ils s'affichent avec la police système, comme avant.
- `font-display: swap` sur toutes les polices.
- **Ne pas ajouter une graisse « pour voir »** : une graisse disponible change le rendu de tous les textes qui la demandent déjà (le navigateur choisit aujourd'hui la graisse la plus proche).

### Ajouter un caractère d'un autre alphabet ou une nouvelle graisse
1. Récupérer le CSS Google avec un User-Agent de Chrome récent, par exemple  
   `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap` et `https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap` (seuls les blocs 400 sont gardés).
2. Télécharger le fichier `.woff2` de chaque bloc retenu dans `assets/fonts/` (nom : `famille-style-sousensemble.woff2`) et réécrire l'URL `src` en `../fonts/<nom>.woff2`.
3. Coller les blocs dans `style.css` (en tête), garder `unicode-range` et `font-display: swap`, puis **incrémenter** `?v=` de `style.css` dans toutes les pages.
4. Refaire la comparaison de captures (voir ci-dessous).

## Icônes Tabler : régénérer le sous-ensemble

Le CSS et la police du sous-ensemble sont générés : ne pas les modifier à la main.
Le script repère toutes les classes `ti-xxx` utilisées dans les `.html`, `.js` et `.css` du site (54 icônes à ce jour, y compris celles de `admin.html` et de `assets/js/admin.js`, qui ne sont pas dans le dépôt).

Outils : **Node 20 ou plus**, `subset-font@2.9.0` (HarfBuzz), Tabler Icons **3.49.0**.

```bash
# depuis la racine du dépôt
npm install --no-save subset-font@2.9.0
mkdir %TEMP%\tabler && cd %TEMP%\tabler
npm pack @tabler/icons-webfont@3.49.0 && tar xzf tabler-icons-webfont-3.49.0.tgz
cd <racine du dépôt>
node scripts/build-icons.js %TEMP%\tabler\package
```

Puis incrémenter le `?v=` de `tabler-subset.css` dans toutes les pages (`?v=1` aujourd'hui).
Quand on utilise une nouvelle icône (`<i class="ti ti-nom">`), relancer ces commandes : si le nom n'existe pas dans Tabler, le script s'arrête avec un message d'erreur.

Deux détails volontaires dans le script (ne pas les « simplifier ») :
- `unicode-range` limité aux icônes. Sans lui, la hauteur de ligne des icônes change d'une fraction de pixel et elles se décalent. Tabler fait de même dans son CSS d'origine.
- Métriques Windows (`winAscent 990`, `winDescent 100`) imposées, identiques à celles des fichiers Tabler servis jusque-là.

Pour changer de version de Tabler : choisir une version publiée depuis au moins 14 jours, relancer le script, puis refaire la comparaison de captures (les glyphes peuvent changer d'une version à l'autre).

## Vérifier qu'aucun rendu n'a changé

Les captures avant/après de ce chantier (11 pages × FR/EN × 1440 px et 390 px, 44 captures) étaient **identiques au pixel près** (0 pixel de différence) avec transitions et animations coupées, après avoir vérifié que deux captures successives de l'état d'origine étaient elles-mêmes identiques. Le texte rendu (`innerText`) était identique sur les 44 pages.

## Mesures Lighthouse (index.html, local, médiane de 3 passes)

| | Mobile avant | Mobile après | Ordinateur avant | Ordinateur après |
|---|---|---|---|---|
| Score | 64 | 80 | 86 | 99 |
| FCP | 4,7 s | 2,8 s | 1,4 s | 0,7 s |
| LCP | 6,9 s | 4,3 s | 1,9 s | 0,85 s |
| Speed Index | 5,3 s | 3,1 s | 1,4 s | 0,75 s |

Les écarts d'une passe à l'autre sont importants sur mobile (score de 74 à 90 après) : à lire comme un ordre de grandeur.
Un `<link rel="preload">` des deux polices principales a été testé sur l'accueil : gain visible sur ordinateur (premier affichage ~0,5 s au lieu de ~0,7 s) mais pas de gain mesurable sur le LCP ni de façon fiable sur mobile ; il n'a pas été retenu.

## Affichage des blocs (`.fade-*`) et chargement des scripts

- `<html>` reçoit la classe `js` par un petit script en ligne dans le `<head>` de chaque page. `animations.css` et `style.css` ne cachent `.fade-up`, `.fade-in`, `.fade-left` et `.fade-right` que sous `html.js` (sélecteur `:where(html.js)` : la spécificité des règles d'origine ne change pas). Sans JavaScript, tout est visible.
- Filet de sécurité : si `main.js` n'a pas démarré au bout de 1,5 s (`window.__fadeReady` posé par `initScrollReveal()`), les blocs proches de l'écran sont révélés, puis au défilement tant que `main.js` n'est pas là. Ne pas retirer `window.__fadeReady` de `main.js`.
- `i18n.js`, `main.js` et les scripts de page sont en `defer` (ordre du document conservé : `i18n.js`, `main.js`, puis le script de la page).
- EmailJS n'est chargé que sur `contact.html` et `devis.html`, en `async` avec `onload="emailjs.init('PUBLIC_KEY')"` (`defer` retarderait `DOMContentLoaded`, donc `main.js`, si jsDelivr ne répond pas). L'envoi vérifie `typeof emailjs`. Reste à faire avant la mise en ligne des formulaires : vraies clés EmailJS et version épinglée.
- `galerie.html` charge encore GLightbox (version épinglée, SRI) de façon synchrone : si jsDelivr est injoignable, `DOMContentLoaded` attend, mais le filet de sécurité révèle quand même les blocs.

## Images WebP

- `carnet-mockup` (FR et EN) : WebP q90, 760 × 940. `mael`, `nuit-catamaran` et 10 images des onglets d'activités de l'accueil : WebP q85, 600 px de large. `rhumerie.jpg` reste en JPEG (déjà léger). `chamarel.jpg` et `diner.jpg` restent aussi, car `about.html` et `concept.html` les citent.
- Les originaux sont conservés hors dépôt dans `TheLagoonTravel_originaux/images`, sous un nom daté (`nom.2026-11-01.ext`).
- Commande utilisée (ffmpeg, libwebp) : `ffmpeg -i original.jpg -vf scale=600:-2:flags=lanczos -c:v libwebp -quality 85 -compression_level 6 image.webp` (q90 sans redimensionnement pour `carnet-mockup`).
- Les `<img>` gardent `width` et `height` (même rapport) pour éviter tout décalage. `i18n.js` remplace `src` par `data-src-fr` / `data-src-en` : ces deux attributs doivent rester identiques à `src` en français.
