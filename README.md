# Sauna Garden 3D

Application web 3D **paramétrique** pour concevoir un sauna extérieur de jardin.
Tout le modèle est généré par code à partir d'une configuration centralisée : aucune
géométrie n'est importée, aucune texture externe n'est utilisée.

- **TypeScript** + **Three.js** + **Vite**, sans framework d'interface.
- Orientation du bâtiment : façade avant côté piscine (porte), façade arrière côté
  jardin / vallée (baie panoramique), toit monopente descendant de l'avant vers l'arrière.

---

## Installation

```bash
npm install
```

## Lancement

```bash
npm run dev        # serveur de développement (http://localhost:5180)
npm run build      # vérification TypeScript + build de production dans dist/
npm run preview    # sert le build de production
npm run typecheck  # vérification TypeScript seule
```

---

## Architecture

```
src/
├─ config/
│  ├─ saunaConfig.ts        Configuration centrale : toutes les dimensions, en mm
│  ├─ derivedGeometry.ts    Géométrie dérivée : couches de paroi, hauteurs, placements, contraintes
│  └─ units.ts              Conversion mm -> unités Three.js (1 unité = 1 m)
├─ materials/
│  ├─ materialKeys.ts       Identifiants de matériaux (sans dépendance Three.js)
│  ├─ materialLibrary.ts    Matériaux simples, nuances de bois, échelle des ardoises
│  └─ slateTexture.ts       Texture d'ardoise et carte de normales dessinées par le code
├─ geometry/
│  ├─ woodPiece.ts          createWoodPiece() : la brique de base de tout le bois
│  ├─ wallBuilder.ts        Construction d'une paroi multicouche avec ouvertures
│  ├─ openingFrame.ts       Huisserie d'une ouverture (porte, baie)
│  ├─ benchBuilder.ts       Banc à lattes générique
│  ├─ rectangles.ts         Soustraction de rectangles, découpe en lames
│  └─ layout.ts             Répartition régulière d'entraxes
├─ components/             Un fichier par élément, indépendants les uns des autres
│  ├─ Walls.ts             FrontFacade.ts      RearFacade.ts
│  ├─ Door.ts              RearPanoramicWindow.ts
│  ├─ Roof.ts              StructuralFrame.ts  Platform.ts
│  ├─ MainBench.ts         SecondaryBench.ts   SaunaStove.ts
├─ model/
│  ├─ saunaModel.ts         Assemblage, reconstruction, modes de visualisation
│  ├─ buildContext.ts       Cache de géométries + registre du bois pour la nomenclature
│  ├─ viewModes.ts          Règles de visibilité Finished / Structure / Interior / Section
│  └─ tags.ts               Étiquettes de calque portées par chaque maillage
├─ bom/
│  └─ billOfMaterials.ts    generateBillOfMaterials() + export CSV
├─ environment/            Simulation du site : soleil, terrain, piscine, végétation
│  ├─ sun.ts               Position du soleil (NOAA), lever/coucher, formatage
│  ├─ siteConfig.ts        Paramètres du site et du lieu
│  ├─ terrain.ts           Terrain à pas progressif, pente et crêtes
│  ├─ pool.ts              Bassin, margelle, dallage
│  ├─ trees.ts             Arbres en volumes simples
│  ├─ shapes.ts            Contours arrondis posés à plat
│  └─ siteModel.ts         Assemblage du site et trajectoire solaire
├─ io/
│  ├─ configFile.ts         Enregistrement / ouverture du projet en JSON
│  └─ download.ts           Téléchargement de secours
├─ core/
│  ├─ viewer.ts             Scène, caméra, lumières, ombres, plan de coupe
│  └─ cameraViews.ts        Les 9 vues prédéfinies, calculées depuis les dimensions
├─ ui/
│  ├─ controlPanel.ts       Panneau de paramètres (déclaratif)
│  ├─ bomView.ts            Tableau de nomenclature
│  ├─ widgets.ts            Curseurs, groupes de boutons, helpers DOM
│  └─ styles.css
└─ main.ts                  Câblage : config -> modèle -> viewer -> interface
```

**Règle d'or** : aucune valeur dimensionnelle ne vit en dehors de `saunaConfig.ts`.
Les composants lisent `ctx.config` (les valeurs demandées) et `ctx.geometry` (les valeurs
calculées et validées), et convertissent en unités Three.js uniquement dans `createWoodPiece()`
et `createPanel()`.

---

## Modifier les paramètres

**Depuis l'interface** : chaque curseur du panneau de gauche modifie la configuration et
déclenche une reconstruction complète du modèle, au plus une fois par frame. Sont réglables :
largeur, profondeur, hauteur, largeur/profondeur/hauteur de la plateforme, pente et débord de
toit, largeur/hauteur de la porte, largeur/hauteur/allège de la baie,
longueur/profondeur/hauteur des deux bancs, puissance du poêle, épaisseur d'isolation et de
lambris, profilé et vitrage des menuiseries, module bois standard, position du plan de coupe,
et le mode de construction (*Solid wood* / *Insulated wall*).

**Depuis le code** : modifier `DEFAULT_SAUNA_CONFIG` dans
[`src/config/saunaConfig.ts`](src/config/saunaConfig.ts).

**Ajouter un paramètre** :

1. Ajouter le champ à l'interface `SaunaConfig` et sa valeur dans `DEFAULT_SAUNA_CONFIG`.
2. L'utiliser dans `deriveGeometry()` s'il demande un calcul ou une contrainte.
3. Ajouter une entrée dans `FIELD_GROUPS` de [`src/ui/controlPanel.ts`](src/ui/controlPanel.ts).

Aucun autre fichier n'a besoin d'être touché : le panneau est déclaratif.

---

## Enregistrer et rouvrir un projet

La section **Projet** du panneau contient trois boutons :

| Bouton | Effet |
|---|---|
| **Enregistrer…** | ouvre la boîte de dialogue native et écrit `sauna-projet.json` à l'endroit choisi |
| **Ouvrir…** | relit un fichier et applique tous les paramètres d'un coup |
| **Réinitialiser** | revient aux valeurs par défaut |

Le fichier contient le bâtiment **et** son site : les deux sont restaurés ensemble.

Le fichier est du JSON lisible et modifiable à la main :

```json
{
  "format": "sauna-garden-3d",
  "version": 2,
  "savedAt": "2026-09-21T09:01:11.981Z",
  "config": { "exteriorWidth": 2000, "exteriorDepth": 2500, "...": "..." },
  "site":   { "latitude": 40.6, "bayAzimuth": 135, "poolLength": 9000, "...": "..." }
}
```

La relecture est tolérante et sûre : les clés inconnues sont ignorées, une valeur absente ou
d'un type inattendu retombe sur la valeur par défaut, et une valeur hors de la plage d'un
curseur est ramenée dans cette plage. Un fichier qui ne contient aucun paramètre reconnu est
refusé avec un message. Un objet de configuration « nu » (sans l'enveloppe `format`/`config`)
est également accepté.

Les navigateurs qui n'implémentent pas la *File System Access API* (Firefox, Safari)
retombent automatiquement sur un téléchargement et sur un sélecteur de fichier classique ;
le format du fichier est identique.

---

## Simulation d'environnement

Le sauna est implanté à la place de la souche derrière la piscine : façade avant sur le
bassin et les terrasses, baie arrière sur la vallée.

**Héliodon.** La position du soleil est calculée avec les équations NOAA à partir du lieu,
de la date et de l'heure. Les curseurs **Date** et **Heure** déplacent le soleil, la lumière
et toutes les ombres portées en temps réel (0,13 ms par image : aucune géométrie n'est
reconstruite). Le panneau affiche azimut, hauteur, lever, coucher et midi solaire.
La couleur du ciel, l'intensité et la teinte du soleil sont graduées selon sa hauteur :
rasante et chaude au ras de l'horizon, neutre au zénith, nuit quand il est couché.

**Orientation.** Le modèle a une orientation locale fixe (−Z = baie arrière). Le paramètre
**Orientation de la baie** indique à quel azimut géographique cette direction pointe
réellement — 135° (sud-est) par défaut — ce qui suffit à faire tourner tout le ciel autour
du bâtiment. Lieu par défaut : 40,6° N / 4,0° O, Sierra de Madrid, UTC+2.

**Décor.** Terrain descendant vers la vallée puis remontant sur deux crêtes lointaines,
piscine à contour libre approché d'après la photo, margelle, dallage et arbres. Tout est
paramétrable : pente, replat derrière le sauna, dénivelé, distance et hauteur de crête,
dimensions du bassin.

**Implantation.** Le curseur **Décalage du sauna** place la piscine par rapport au bâtiment :
à 1500 mm, vu depuis la piscine face à la porte, le sauna est décalé de 1,50 m sur la gauche,
du côté des quatre cyprès.

**Masques solaires.** Le cèdre à droite, le rideau de cyprès à gauche et la haie arrière
sont des volumes simples dont la hauteur et l'écartement se règlent, et qui projettent leurs
ombres sur le sauna. Mettre la haie à 0 mm montre immédiatement ce qu'elle masque de la
vallée depuis le banc.

La vue **Site** cadre l'ensemble depuis la maison, la vue **Interior** place la caméra à
l'intérieur face à la baie — sans retirer la façade avant, pour que la lumière reste juste.

---

## Génération du modèle

```
SaunaConfig  ──▶  deriveGeometry()  ──▶  BuildContext  ──▶  composants  ──▶  THREE.Group
   (mm)            hauteurs, couches,       cache de          createWoodPiece()
                   placements, warnings     géométries        createPanel()
```

`SaunaModel.build(config)` reconstruit tout : il libère le contexte précédent (et donc toutes
les `BufferGeometry` allouées), dérive la géométrie, appelle chaque fabrique de composant dans
l'ordre déclaré par la constante `COMPONENTS`, puis recalcule la nomenclature.

**Ajouter un composant** : écrire `src/components/MonElement.ts` exportant
`createMonElement(ctx: BuildContext): THREE.Group`, puis l'ajouter au tableau `COMPONENTS` de
[`src/model/saunaModel.ts`](src/model/saunaModel.ts). Le composant est alors automatiquement
pris en compte par les modes de visualisation (via son `tag`) et par la nomenclature (via
`createWoodPiece`).

**Modes de visualisation** : chaque maillage porte un `tag` (`structure`, `exteriorCladding`,
`insulation`, `glazing`, `furniture`, `stove`…). Les modes ne manipulent que ces étiquettes :

| Mode | Contenu |
|---|---|
| Finished | Tout le bâtiment, matériaux et vitrage |
| Structure | Ossature bois et toiture seules (en mode bois massif, les parois sont l'ossature) |
| Interior | Façade avant et porte masquées, caméra placée à l'intérieur |
| Section | Plan de coupe déplaçable, pour lire la composition des parois |

---

## Génération de la nomenclature

Toute pièce créée par `createWoodPiece()` est enregistrée automatiquement dans le registre du
`BuildContext`, regroupée par *nom + section + longueur* (longueurs arrondies au cm supérieur,
comme une liste de débit). `generateBillOfMaterials()` produit ensuite, pour chaque ligne :
nom, section, longueur, quantité, longueur totale, et nombre de planches standard.

Le panneau affiche le tableau, le total de pièces, la longueur totale, le nombre de planches
standard de 2500 mm, la longueur achetée et une estimation des chutes. Le bouton
**Exporter en CSV** télécharge la liste de débit.

> Le calcul est volontairement simplifié : imbrication ligne par ligne dans une planche
> standard, sans imbrication entre lignes ni trait de scie. Les pièces plus longues que la
> planche standard sont signalées en jaune (aboutage nécessaire). Les sections qui ne
> correspondent pas au module standard sont comptabilisées à part.

---

## Limites connues (V1)

- Aucun calcul structurel, thermique, électrique ou réglementaire. Les sections de bois, les
  distances de sécurité autour du poêle et les performances de la paroi isolée **ne sont pas
  validées** : il s'agit d'une représentation architecturale.
- La composition de paroi isolée est schématique (pas de lame d'air ventilée, pas de
  traitement des ponts thermiques, pare-vapeur représenté en 4 mm pour rester visible).
- Pas de plafond séparé : le dessous de toiture fait office de plafond.
- Le poêle est un volume indicatif dont les dimensions varient légèrement avec la puissance ;
  ce n'est pas un appareil réel.
- L'optimisation de débit est une estimation, pas une optimisation.
- **La simulation solaire n'est pas une étude d'ensoleillement.** La position du soleil est
  exacte, mais la végétation est réduite à une dizaine de volumes, les masques lointains
  (relief réel, maison, bâtiments voisins) sont absents, et il n'y a ni ciel couvert, ni
  lumière indirecte calculée, ni changement d'heure automatique.
- Le terrain et la piscine sont des ordres de grandeur estimés d'après une photo, à recaler
  avec de vraies mesures.
- Les menuiseries aluminium (porte, baie, huisseries) ne figurent pas dans la nomenclature,
  qui reste une liste de débit **bois**.
- L'isolation de toiture est un remplissage indifférencié entre chevrons : le modèle ne
  distingue pas mousse polyuréthane et laine de roche, et ne calcule aucune performance.
- Le contour de la piscine est une ressemblance tracée d'après une photo, pas un relevé.
- La plateforme est posée sans plots, sans fondation et sans ancrage modélisés.
- Le bundle de production fait ~580 kB (Three.js non découpé).

Les hypothèses géométriques et constructives détaillées sont dans [DESIGN.md](DESIGN.md).
