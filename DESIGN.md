# DESIGN — hypothèses géométriques et constructives

Ce document décrit ce que le modèle **suppose** aujourd'hui. Il n'a pas valeur de note de
calcul : rien de ce qui suit n'est vérifié structurellement, thermiquement ni réglementairement.

---

## 1. Unités et repère

- Toutes les dimensions de `SaunaConfig` sont en **millimètres**, les angles en **degrés**,
  la puissance en **watts**.
- La conversion vers Three.js (1 unité = 1 mètre) a lieu uniquement dans `createWoodPiece()`,
  `createPanel()` et `Viewer` — jamais dans un composant.
- Repère, origine au centre de l'emprise, **Y vers le haut**, **sol fini intérieur à Y = 0** :

| Axe | Signification |
|---|---|
| `+Z` | façade **avant**, côté piscine, porte |
| `−Z` | façade **arrière**, côté jardin / vallée, baie panoramique |
| `+X` | côté **droit** en regardant depuis l'entrée vers la baie (poêle, banc secondaire) |
| `−X` | côté **gauche** (banc principal) |

« Droite » et « gauche » sont donc définis depuis l'entrée, regardant la vallée. C'est la
convention utilisée par les boutons de vue *Left* / *Right* et par la position du poêle.

## 2. Module bois

Le module principal est **2500 × 80 × 40 mm**. Une pièce est modélisée dans son repère local
`X = longueur`, `Y = épaisseur`, `Z = largeur`, puis orientée par une des six rotations
nommées de `ORIENTATION` (à plat, sur chant, debout). Ces six rotations ont été vérifiées
numériquement contre l'ordre d'Euler `XYZ` de Three.js.

Chaque latte est modélisée individuellement, pas simulée par une texture, et **posée à
l'horizontale**. Pour qu'elles se lisent au lieu de former un panneau plat, deux choses les
distinguent : une teinte prise dans une palette de six nuances de pin, et quelques dixièmes de
millimètre de relief ajoutés à l'épaisseur *dessinée*, en cycle d'un rang au suivant. La pièce restant centrée sur sa
couche, elle dépasse des deux côtés : les joints accrochent la lumière à l'intérieur comme à
l'extérieur. **L'épaisseur commandée, elle, ne change pas** : la nomenclature reste juste.

Les éléments qui **ne** peuvent pas utiliser le module, et pourquoi :

| Élément | Section | Raison |
|---|---|---|
| Montants d'ossature | `épaisseur d'isolation` × 80 | le montant doit remplir l'épaisseur d'isolation |
| Lambris intérieur | 80 × 20 | une finition de 40 mm serait absurde |
| Solives de plateforme | `hauteur de plateforme − 40` × 40 | la hauteur de la solive fixe la hauteur de la terrasse |
| Menuiseries porte et baie | profilé aluminium 50 mm | ce ne sont pas des pièces de bois (voir §5) |

## 3. Parois

Deux compositions, de l'extérieur vers l'intérieur :

**Solid wood** — une seule couche : le module posé de sorte que sa face de **80 mm** traverse
la paroi, la face de 40 mm formant la largeur visible. Épaisseur de paroi : **80 mm**.
Dans ce mode, la paroi *est* l'ossature : `StructuralFrame` ne produit alors que le plancher,
et le mode *Structure* garde les parois visibles.

**Insulated wall** — quatre couches : bardage extérieur 40 mm, zone isolation 100 mm (par
défaut, paramétrable) partagée avec l'ossature, pare-vapeur 4 mm, lambris intérieur 20 mm.
Épaisseur totale par défaut : **164 mm**.

Hypothèses assumées : pas de lame d'air ventilée derrière le bardage, pas de traitement des
ponts thermiques aux angles, pare-vapeur représenté en 4 mm pour rester lisible en coupe,
aucune valeur de résistance thermique n'est calculée ni affichée.

**Assemblage en plan** : les deux façades occupent toute la largeur extérieure, les murs
latéraux s'arrêtent contre elles. Il n'y a donc pas de bois en double dans les angles, et la
largeur maximale d'une baie est la largeur extérieure moins deux jambages.

**Pose horizontale.** Chaque couche est montée en **rangs horizontaux**, comme les lattes
sont réellement fixées. Les rangs font exactement la hauteur de latte à partir du sol, sans
ajustement : tous les murs partagent donc les mêmes lignes de rang quelle que soit leur
hauteur propre, et les lattes se raccordent aux angles. Seul le rang de tête reprend le
reste, et il est fusionné avec celui du dessous s'il est trop mince pour valoir une pièce.

Un rang traversé par une ouverture ressort en deux morceaux (soustraction de rectangles),
et un rang qui affleure le linteau ou l'allège sort en délardé : la nomenclature affiche
alors des sections comme 80 × 10, qui sont de vraies refentes. C'est le prix d'une allège
qui ne tombe pas sur une ligne de rang.

Le **haut incliné** des murs latéraux est traité en bornant chaque rang à la portion de mur
qui atteint sa mi-hauteur, le point de croisement étant trouvé par dichotomie — ce qui vaut
pour n'importe quel rampant, pas seulement pour une droite. Le rampant devient donc un
escalier d'une demi-hauteur de rang au maximum, entièrement caché sous le débord de toiture.

## 4. Toiture

Monopente, **haute à l'avant, basse à l'arrière**.

```
hauteur du mur en Z  =  entranceHeight − (profondeur/2 − Z) × tan(pente)
hauteur arrière      =  entranceHeight − profondeur × tan(pente)
```

La toiture est construite dans un groupe incliné dont le plan `Y = 0` local coïncide
exactement avec le haut des murs. C'est un **caisson isolé plein**, et non une coque creuse.
Composition, de bas en haut :

| Couche | Épaisseur par défaut | Étiquette |
|---|---|---|
| Lambris de sous-face | 20 mm | `interiorLining` |
| Chevrons sur chant, entraxe 600 mm | 80 mm | `roofStructure` |
| Isolation remplissant chaque caisson entre chevrons | 80 mm | `insulation` |
| Voliges à plat | 40 mm | `roofStructure` |
| Ardoises | 10 mm | `roofCover` |

Le lambris ferme la sous-face, l'isolation remplit les caissons, et deux planches de rive
ferment les about de caissons en haut et en bas de la pente. Les chevrons restent lisibles
depuis l'intérieur et sont ce qui subsiste en vue *Structure*. La hauteur de chevron est
réglable : c'est elle qui fixe l'épaisseur d'isolant, l'isolation étant représentée comme un
remplissage indifférencié (mousse polyuréthane ou laine de roche, le modèle ne tranche pas).

Hypothèses : pas de pannes ni de contreventement, pas de gouttière, pas d'écran
sous-toiture, pas de lame d'air ventilée sous les ardoises, pas de fixation modélisée, aucun
calcul de charge (neige, vent) ni de portée.
Les voliges dépassent la longueur standard dès que la largeur + débords dépasse 2500 mm ; la
nomenclature les signale comme nécessitant un aboutage.

## 5. Ouvertures

Les deux menuiseries sont en **aluminium gris anthracite** (RAL 7016). Un profilé est
modélisé comme un volume rectangulaire de 50 mm de large (paramétrable), traversant toute
l'épaisseur de la paroi pour le dormant, et de 50 mm de profondeur pour l'ouvrant.

- **Porte** : façade avant, centrée, 800 × 1920 mm par défaut. **Entièrement vitrée** : un
  châssis aluminium (deux montants, deux traverses) enserrant un vitrage clair, le tout dans
  un dormant aluminium de la même teinte. Modélisée **fermée**, avec une poignée barre.
  Pas de seuil, pas de paumelles, pas de serrure modélisés.
- **Baie** : façade arrière, centrée, 1680 × 1000 mm sur une allège de 570 mm par défaut,
  **fixe**, dormant aluminium sur les quatre côtés, vitrage simple volume de 24 mm sans
  châssis ouvrant ni double vitrage modélisé.
- Aucun vitrage sur les murs latéraux, par choix de conception.

L'aluminium n'apparaît pas dans la nomenclature, qui reste une liste de débit bois.

Les dimensions demandées sont **contraintes** au moment du calcul de la géométrie dérivée, et
non silencieusement : chaque ajustement produit un avertissement affiché dans le panneau.
Les curseurs conservent la valeur demandée par l'utilisateur, le modèle affiche la valeur
constructible. Contraintes actives :

- jambage minimal de 80 mm de part et d'autre d'une ouverture ;
- retombée minimale de 60 mm au-dessus d'une ouverture ;
- allège minimale de 50 mm ;
- mur arrière d'au moins 1200 mm : au-delà, c'est la **pente** qui est réduite ;
- bancs limités à la profondeur intérieure, et passage libre de 400 mm entre les deux bancs ;
- banc secondaire raccourci pour dégager l'emprise du poêle.

Avec les valeurs par défaut, aucune de ces contraintes ne se déclenche : le panneau
d'avertissements reste vide tant que les dimensions demandées sont constructibles.

## 6. Aménagement intérieur

- **Banc principal** : le long du mur gauche, 2300 mm de long par défaut — assez pour
  s'allonger — 600 mm de profondeur, 500 mm de hauteur.
- **Banc secondaire** : face au précédent, le long du mur droit, plus court (1400 mm), même
  hauteur, arrêté avant le poêle.
- Les deux bancs sont des structures à lattes : deux longerons sur chant, des pieds tous les
  900 mm maximum, des lattes de 80 mm espacées de 15 mm.
- **Poêle** : électrique, dans l'**angle arrière droit** vu depuis l'entrée. Corps métallique,
  socle et lit de pierres. Ses dimensions varient comme la racine cubique de la puissance
  autour de la référence 6 kW — c'est une **convention d'affichage**, pas un catalogue.
  Le déplacer plus tard ne demande que de changer `stove.centerX` / `stove.centerZ` dans
  `deriveGeometry()` : aucun autre composant ne dépend de sa position.

**Ce qui n'est pas validé** : les distances de sécurité autour du poêle, sa puissance par
rapport au volume à chauffer, l'alimentation électrique, la ventilation, l'évacuation d'eau,
la protection du sol et des parois à proximité de l'appareil.

## 7. Plancher et plateforme

**Plancher du sauna** : solives de 80 mm sur chant à 500 mm d'entraxe, deux longrines de
rive, lame de plancher de 40 mm au-dessus. Le sol fini est à `Y = 0`, la structure descend à
−120 mm. Pas d'isolation ni d'étanchéité en sous-face, pas de pente d'évacuation.

**Plateforme** : terrasse bois de 2500 × 3500 mm et 200 mm de haut par défaut, les trois
dimensions étant des paramètres du modèle. Son plan de pose se déduit du sauna :

- le sauna est **centré en largeur** — 250 mm de terrasse de chaque côté par défaut ;
- en profondeur, **tout le surplus est placé devant la porte** (1000 mm par défaut) et sert
  de marchepied ; la terrasse est donc affleurante au nu de la façade arrière ;
- le dessus du platelage coïncide avec le **dessous de la structure de plancher** du sauna
  (−120 mm) : on monte donc de 120 mm en entrant.

Composition : lames de terrasse dans le sens de la largeur (2500 mm, soit exactement une
planche standard), solives dans le sens de la profondeur, deux traverses de rive. La hauteur
de solive vaut `hauteur de plateforme − 40 mm`, ce qui fixe la hauteur de la terrasse.

Si la plateforme demandée est plus petite que l'emprise du sauna, elle est agrandie
automatiquement et un avertissement est affiché.

**Non modélisé** : plots, fondations, ancrage au sol, garde-corps, structure sous la partie
en porte-à-faux, pente d'écoulement, espacement entre lames pour le drainage.

## 8. Nomenclature

Regroupement par *nom + section + longueur*, longueurs arrondies au **centimètre supérieur**
(convention de liste de débit). Pour chaque ligne :

```
si longueur > longueur standard :  planches = quantité × ceil(longueur / standard)   (aboutage)
sinon                           :  planches = ceil(quantité / floor(standard / longueur))
```

Limites de ce calcul : pas d'imbrication entre lignes différentes, pas de trait de scie, pas
d'optimisation globale de débit, sections hors module comptées séparément (elles ne se
débitent pas dans une planche standard). Les chutes affichées sont donc une borne haute
grossière, utile pour se faire une idée, pas pour commander.

## 9. Rendu

Matériaux `MeshStandardMaterial` de couleur unie, éclairés par une lumière hémisphérique, un
soleil directionnel avec ombres, et un environnement procédural (`RoomEnvironment`). **Aucune
texture externe**, conformément au cahier des charges.

Seule exception à la couleur unie : la couverture, dont la texture d'ardoise est **dessinée par
le code** sur un canvas au démarrage — six rangs de cinq ardoises à coupe décalée, teinte tirée
d'un générateur à graine fixe, dégradé sombre au joint haut et clair en partie basse. Une carte
de normales est dérivée de la même image par gradient, ce qui donne du relief aux rangs sous la
lumière rasante. Le pas de la texture est recalé sur les dimensions réelles du pan
(`setSlateScale`), pour que les ardoises gardent 300 × 180 mm quelle que soit la taille du toit.

Tous les matériaux sont en `DoubleSide` afin que le mode *Section* montre des tranches
pleines. Le plan de coupe est un `clippingPlane` global déplaçable le long de X ; il coupe la
géométrie sans reboucher les faces, ce qui reste lisible mais n'est pas une vraie coupe
« remplie ».

## 10. Simulation d'environnement

### 10.1 Soleil

Position calculée avec les équations solaires **NOAA** : année fractionnaire, équation du
temps, déclinaison, angle horaire, puis hauteur et azimut. Simplifications assumées : pas de
réfraction atmosphérique au-delà de la correction d'horizon standard de −0,833°, et **aucune
règle d'heure d'été** — le décalage UTC est un paramètre, à passer manuellement de 1 à 2.

Le calcul a été vérifié pour Madrid contre des éphémérides publiées :

| Contrôle | Calculé | Attendu |
|---|---|---|
| Lever / coucher, 21 juin (UTC+2) | 06:44 / 21:48 | ~06:44 / ~21:48 |
| Lever / coucher, 21 décembre (UTC+1) | 08:34 / 17:51 | ~08:34 / ~17:51 |
| Hauteur au midi solaire, 21 juin | 73,04° | 73,02° |
| Hauteur au midi solaire, 21 décembre | 26,16° | 26,14° |
| Azimut au lever, équinoxe | 89° E | ~90° E |

### 10.2 Orientation

Le modèle garde son repère local (−Z = baie arrière). Le paramètre `bayAzimuth` donne
l'azimut géographique de cette direction : 135° (sud-est) par défaut, d'après la photo du
terrain. La conversion d'une position solaire en direction dans le repère du modèle est
donc une simple rotation autour de Y :

```
d = ( cos h · sin(A − A₀) ,  sin h ,  −cos h · cos(A − A₀) )
```

avec `A` l'azimut du soleil, `h` sa hauteur et `A₀ = bayAzimuth`.

Conséquence pour ce terrain : la baie reçoit le soleil levant toute l'année, mais sous un
angle très variable — 14° hors normale le 21 décembre (soleil presque de face), 47° aux
équinoxes, 77° le 21 juin (lumière rasante sur le vitrage).

### 10.3 Terrain

Une seule surface continue, sur une grille dont le pas croît géométriquement (~70 cm près du
sauna, ~15 m à 350 m) : le détail est là où on regarde, sans coût au loin, et sans raccord
visible. Le profil est plat jusqu'au replat derrière le sauna, puis une décroissance
exponentielle qui converge vers le dénivelé total, et deux crêtes gaussiennes qui remontent
au loin pour fermer la vue. Les couleurs sont portées par les sommets : pelouse près du
sauna, garrigue sèche sur la pente, brume au lointain.

Les mailles entièrement contenues dans l'emprise de la terrasse sont supprimées, ce qui ouvre
le trou dans lequel s'inscrivent le dallage et le bassin. Comme seules les mailles *entièrement*
contenues sont retirées, le trou est toujours plus petit que la dalle qui le recouvre.

### 10.4 Piscine et végétation

Le bassin suit un **contour libre**, approché d'après la photographie : une spline fermée
passant par quinze points de contrôle normalisés — plus étroit du côté de l'échelle, s'élargissant
en une boucle arrondie à l'autre extrémité, avec un décrochement du côté du sauna. Les points
étant normalisés, la forme se met à l'échelle avec la longueur et la largeur réglées. Ce n'est
pas un relevé : c'est une ressemblance.

La margelle et les parois du bassin sont obtenues en décalant ce contour le long de ses
normales. Ce décalage est volontairement simple et se replierait sur un angle rentrant marqué ;
il tient pour les valeurs en jeu (450 mm de margelle sur un bassin de 9 m), pas pour n'importe
quelle forme.

Le bassin est composé d'une dalle percée, d'un anneau de parois, d'un fond et d'un plan d'eau
translucide. Les arbres sont des cônes et des blobs : ils existent pour porter une ombre
crédible et donner l'échelle, pas pour ressembler à une espèce.

**Implantation.** Le sauna reste à l'origine du modèle ; c'est la piscine qui porte le décalage.
`poolOffsetX` vaut 1500 mm par défaut : vu depuis la piscine, face à la porte, le sauna est donc
**décalé de 1,50 m sur la gauche**, du côté des quatre cyprès. Les écartements du cèdre et des
cyprès ont été repris en conséquence (8,5 m et 4,5 m au lieu de 7 m et 6 m).

**Ce qui n'est pas simulé** : le relief réel au-delà du jardin, la maison et les constructions
voisines, le feuillage saisonnier, la transparence partielle des houppiers, le ciel couvert,
l'éclairement diffus calculé, et la réverbération de l'eau. Les dimensions du site sont des
ordres de grandeur estimés d'après une photographie. **Ce n'est donc pas une étude
d'ensoleillement** : c'est un outil pour juger une implantation.

Le vitrage ne projette pas d'ombre, pour que la lumière traverse réellement la baie et la
porte. La vue *Interior* ne retire plus la façade avant pour la même raison.

## 11. Interface et mobile

Au-delà de 860 px, le panneau de paramètres est une colonne de la grille. En dessous, il
devient un tiroir qui glisse par-dessus la scène, fermé par défaut et ouvert par un bouton
flottant ; choisir une vue le referme, puisqu'il masque justement ce qu'on veut regarder.

En portrait, le champ vertical de la caméra est élargi pour que le champ **horizontal** reste
constant : sans cela le sauna serait recadré sur un téléphone tenu debout.

Gestes tactiles : le canvas porte `touch-action: none`, sans quoi le navigateur confisquerait
les gestes avant que la scène ne les voie. Deux doigts font toujours le pincement pour zoomer
et le déplacement. Un doigt fait tourner la vue par défaut ; un bouton flottant le bascule en
déplacement, parce qu'un téléphone n'a pas de second bouton de souris et qu'aucun des deux
comportements ne convient à lui seul.

## 12. Fichier de projet

Le projet complet — le bâtiment (`SaunaConfig`) **et** son site (`SiteConfig`) — s'enregistre
sur le disque en JSON (`sauna-projet.json`), via la *File System Access API* quand le
navigateur la propose, sinon par téléchargement. Le fichier porte un en-tête
`format` / `version` / `savedAt`.

Hypothèses de relecture : le fichier est une **source non fiable**. Chaque clé attendue est
relue individuellement, les clés inconnues sont ignorées, les types inattendus retombent sur
la valeur par défaut, et les valeurs hors plage sont ramenées dans la plage du curseur
correspondant. Il n'existe donc pas de fichier capable de produire un modèle non
constructible. La `version` n'est pas encore utilisée pour migrer : une future version du
format devra décider quoi faire des fichiers de version 1.

## 13. Ce que la V1 ne fait volontairement pas

Réalité augmentée, photogrammétrie, génération d'images IA, calcul structurel, validation
réglementaire, calcul thermique détaillé, étude d'ensoleillement normative. La priorité a été mise sur une base paramétrique
propre et extensible.
