# Modifier les textes du site (Decap CMS)

Les gérants modifient les textes dans l'interface `/admin/` (Decap CMS). Chaque enregistrement crée un
commit sur la branche `main` ; à chaque déploiement, le script `scripts/build-i18n.js` régénère
`assets/js/i18n.js`, que les pages chargent comme avant.

## Où sont les fichiers

| Chemin | Rôle |
|---|---|
| `content/editable/<page>.json` | Textes **modifiables dans le CMS**, un fichier par page (la page Accueil en a huit : `accueil-banniere.json`, `accueil-activites.json`…) : `{ "fr": {clé: texte}, "en": {clé: texte} }` |
| `content/fixed/fr.json`, `content/fixed/en.json` | Textes **non modifiables dans le CMS** : formules, prix, libellés de formulaires, messages d'erreur et de succès, navigation. À modifier à la main. |
| `assets/js/i18n.js` | Logique de traduction + dictionnaire **généré** entre `BEGIN GENERATED` et `END GENERATED`. Ne pas modifier le dictionnaire à la main. |
| `scripts/build-i18n.js` | Génère le dictionnaire à partir de `content/`. |
| `admin/index.html`, `admin/config.yml` | Interface Decap (version épinglée) et description des champs. |
| `netlify.toml` | Commande de build, en-têtes de cache et 404 forcé sur `/scripts/*`, `/docs/*`, `/archive/*`, `/content/*` (ces dossiers restent dans le dépôt mais ne sont pas servis). |

Les clés gardent leur nom d'origine (`hero.title`, `faq.acc1_q`…) : c'est ce qu'on met dans `data-i18n="…"`.

## Générer `i18n.js`

```
node scripts/build-i18n.js           # génère
node scripts/build-i18n.js --check   # vérifie sans écrire (échoue si i18n.js n'est pas à jour)
```

Le script s'arrête avec un message en français, sans rien modifier, si :
- un JSON est invalide, un texte est vide, ou une traduction FR/EN manque ;
- une clé est dupliquée entre deux fichiers ;
- une page utilise `data-i18n="…"` avec une clé qui n'existe pas ;
- un texte contient du HTML hors liste blanche.

**HTML autorisé dans les textes** : `<strong>`, `<em>`, `<br>`, `<span class="plus-sign">`, et
`<strong style="white-space: nowrap;">` (ce style exactement). `<li>` n'est accepté que dans `content/fixed/`.
Tout le reste est refusé : autres balises, autres attributs, `on*`, `javascript:`.
Pour changer la liste, modifier les constantes en haut de `scripts/build-i18n.js`.

## Ajouter un texte modifiable

1. Dans le fichier `content/editable/` de la section concernée, ajouter la clé **dans `fr` et dans `en`**. Tout fichier `content/editable/*.json` est lu automatiquement par le générateur.
2. Dans `admin/config.yml`, ajouter un champ dans le `files` correspondant (une collection par page, un ou plusieurs fichiers par collection), avec `name` **identique à la clé** :
   `- { label: "Page › Section › Élément", name: "page.cle", widget: string, i18n: true }`
   (`widget: text` pour un long texte ; ajouter un `hint` si le texte contient du HTML).
3. Dans la page HTML, utiliser `data-i18n="page.cle"` avec le texte français en repli.
4. `node scripts/build-i18n.js`, puis committer `content/`, `admin/config.yml` et `assets/js/i18n.js`.

Pour un texte **non modifiable** (prix, formule, libellé de formulaire) : l'ajouter dans `content/fixed/fr.json`
et `content/fixed/en.json`, sans toucher à `admin/config.yml`.

## Tester en local

```
# Terminal 1 — à la racine du projet. BIND_HOST est indispensable avec decap-server 3.11.5 :
# sans lui, le serveur écoute sur tout le réseau local, sans mot de passe.
$env:BIND_HOST = "127.0.0.1"; npx decap-server@3.11.5      # PowerShell
BIND_HOST=127.0.0.1 npx decap-server@3.11.5                # Git Bash

# Terminal 2
npx serve .
```
Ouvrir `http://localhost:3000/admin/`, « Se connecter », modifier, publier : le fichier de `content/` est
modifié sur le disque. Lancer ensuite `node scripts/build-i18n.js`. Arrêter `decap-server` après le test.
`local_backend: true` n'agit que sur `localhost` ; en ligne, c'est la connexion GitHub qui est utilisée.

## Mettre à jour Decap

La version est épinglée dans `admin/index.html` (`decap-cms@3.17.1`) avec une empreinte `integrity`.
Pour changer de version : choisir une version publiée depuis au moins 14 jours, télécharger
`https://cdn.jsdelivr.net/npm/decap-cms@<version>/dist/decap-cms.js`, calculer
`openssl dgst -sha384 -binary decap-cms.js | openssl base64 -A`, puis mettre à jour l'URL **et** `integrity`.

## À savoir

- Le français de repli écrit dans les pages HTML ne se met pas à jour tout seul : seuls les moteurs de recherche
  et les visiteurs sans JavaScript le voient.
- Le corps de `article.html` et les noms des témoins sont écrits en dur : ils ne sont pas dans le CMS.
- Le russe n'est plus géré : une langue mémorisée inconnue retombe sur le français.
- Decap réécrit un fichier de `content/editable/` avec ses propres conventions (indentation de 2 espaces) et, pour les fichiers de plus de 8 clés, **dans son propre ordre de clés**. Les fichiers sont déjà dans cet ordre : un enregistrement ne modifie que les lignes éditées. Si on **ajoute ou retire une clé** dans un fichier, la première sauvegarde suivante réordonnera ce fichier (diff plus long, sans effet sur le site). Pour l'éviter : enregistrer une fois dans le CMS juste après l'ajout, et committer ce résultat seul.
- La page Accueil est découpée en 8 fichiers de 4 à 40 champs (bannière, activités, questions fréquentes, comment ça marche, carnet, pourquoi nous choisir, histoire, appel à l'action), dans l'ordre de la page, pour garder des formulaires rapides.
- Le script de génération fonctionne avec Node 20, 22 et 24 (testé) : aucune version de Node n'est imposée dans `netlify.toml`.
