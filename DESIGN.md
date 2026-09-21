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

Les éléments qui **ne** peuvent pas utiliser le module, et pourquoi :

| Élément | Section | Raison |
|---|---|---|
| Montants d'ossature | `épaisseur d'isolation` × 80 | le montant doit remplir l'épaisseur d'isolation |
| Huisseries porte et baie | `épaisseur de paroi` × 40 | le tapée doit traverser toute la paroi |
| Lambris intérieur | 80 × 20 | une finition de 40 mm serait absurde |

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

Chaque couche est découpée en lames verticales. Une lame traversée par une ouverture est
recoupée en morceaux au-dessus et en dessous (soustraction de rectangles). Ce découpage
unique gère à la fois les ouvertures et le **haut incliné** des murs latéraux : chaque lame
est coupée à la hauteur du rampant au droit de son axe, ce qui produit un bord supérieur
légèrement en marches d'escalier (une marche par lame).

## 4. Toiture

Monopente, **haute à l'avant, basse à l'arrière**.

```
hauteur du mur en Z  =  entranceHeight − (profondeur/2 − Z) × tan(pente)
hauteur arrière      =  entranceHeight − profondeur × tan(pente)
```

La toiture est construite dans un groupe incliné dont le plan `Y = 0` local coïncide
exactement avec le haut des murs. Composition, de bas en haut : chevrons de 80 mm posés sur
chant dans le sens de la pente, voliges à plat, puis une dalle d'ardoise de 10 mm représentée
par un seul volume de matériau « ardoise ».

Hypothèses : pas de pannes ni de contreventement, pas de gouttière, pas d'écran
sous-toiture, pas de fixation modélisée, aucun calcul de charge (neige, vent) ni de portée.
Les voliges dépassent la longueur standard dès que la largeur + débords dépasse 2500 mm ; la
nomenclature les signale comme nécessitant un aboutage.

## 5. Ouvertures

- **Porte** : façade avant, centrée, 800 × 2000 mm par défaut. Vantail à lames verticales et
  deux barres, modélisé **fermé**, sans quincaillerie autre qu'une poignée symbolique.
- **Baie** : façade arrière, centrée, 1800 × 1700 mm par défaut, **fixe**, vitrage simple
  volume de 24 mm sans châssis ouvrant ni double vitrage modélisé.
- Aucun vitrage sur les murs latéraux, par choix de conception.

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

Avec les valeurs par défaut, deux contraintes se déclenchent : l'allège de la baie descend à
89 mm (une baie de 1700 mm dans un mur arrière de 1849 mm), et le banc principal est ramené à
la profondeur intérieure (2340 mm au lieu des 2500 mm demandés).

## 6. Aménagement intérieur

- **Banc principal** : le long du mur gauche, sur toute la profondeur intérieure, hauteur
  900 mm par défaut, assez long pour s'allonger.
- **Banc secondaire** : face au précédent, le long du mur droit, plus court (1400 mm), hauteur
  450 mm, arrêté avant le poêle.
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

## 7. Plancher

Solives de 80 mm sur chant à 500 mm d'entraxe, deux longrines de rive, lame de plancher de
40 mm au-dessus. Le sol fini est à `Y = 0`, la structure descend à −120 mm. Pas de fondation,
pas de plots, pas d'isolation ni d'étanchéité en sous-face, pas de pente d'évacuation.

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
soleil directionnel avec ombres, et un environnement procédural (`RoomEnvironment`). Aucune
texture externe, conformément au cahier des charges de la V1.

Tous les matériaux sont en `DoubleSide` afin que le mode *Section* montre des tranches
pleines. Le plan de coupe est un `clippingPlane` global déplaçable le long de X ; il coupe la
géométrie sans reboucher les faces, ce qui reste lisible mais n'est pas une vraie coupe
« remplie ».

## 10. Ce que la V1 ne fait volontairement pas

Réalité augmentée, photogrammétrie, génération d'images IA, calcul structurel, validation
réglementaire, calcul thermique détaillé. La priorité a été mise sur une base paramétrique
propre et extensible.
