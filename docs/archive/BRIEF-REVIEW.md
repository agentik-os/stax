# Revue critique du Frameword concept brief — 2026-07-19

> Verdict d'abord : **adopter le brief comme concept canonique v2.** Il corrige les
> trois trous les plus profonds du modèle v1 (pile plate). Nos apports propres —
> dimensionnement/épines, canvas, agent-contexte, la démo — restent valables et
> **complètent** le brief, ils ne le contredisent pas. Le nom reste ouvert.

---

## 1. Les 3 trous de v1 que le brief corrige (avec preuve)

### 1.1 L'ordre visuel mentait sur la parenté
Dans notre reducer v1, `openChild` conserve les épinglés de la queue **à droite du
nouvel enfant** (`kept = [...head, ...tailPinned]` — `panel-logic-demo.html`, Ops.openChild).
Résultat : un panneau épinglé issu d'une branche morte s'affiche comme s'il était un
descendant du nouveau panneau. Le fil d'ariane dérivé de la position devient un
mensonge. Le brief tranche : **« Visual order must never be treated as proof of
parentage »** — l'ascendance vit dans des liens `parentInstanceId`, le `ContextPath`
en dérive, et les orphelins épinglés deviennent des **références détachées**
explicites dans un rail séparé. C'est LA correction structurelle.

### 1.2 `closeAt` créait des orphelins silencieux
Notre `closeAt(i)` retire un panneau du milieu et laisse ses descendants vivants avec
un parent mort. Le brief : invariant 9 — fermer un parent applique une **politique de
sous-arbre déclarée** (`closeBranch` : les previews ferment, les retenus se détachent
en références). Aucun orphelin silencieux.

### 1.3 La dédup était aveugle au contexte
Notre loi 5 (id unique global → no-op) empêche d'ouvrir la même fiche sous deux
parents différents — pourtant ce sont **deux fils de pensée distincts**. Le brief :
identité **scopée au contexte** (`spaceId + panelType + resourceKey + parentInstanceId`) —
même cible + même parent = révéler ; parent différent = instance distincte ;
références dédupliquées par cible canonique. Subtil et juste.

## 2. Upgrades adoptés tels quels (convergences comprises)

- **Descripteurs sérialisables + registre** — c'était déjà notre Tier-0 ; convergence totale.
- **`role` / `retention` / `placement` en axes indépendants** — meilleur que notre booléen `pinned`.
- **Réordonner limité aux références** — corollaire de l'ascendance-vérité ; nos ‹ › v1 disparaissent du rail actif.
- **Verbes d'intention** (`openDetail`, `revealPanel`, `navigateUp`…) au lieu de `push/append/popTo`.
- **`navigateUp` ≠ Back navigateur ; `reconcileLocation(destination)`** — indispensable pour l'adaptateur Next.js.
- **Contrat a11y complet** — précédence Échap, focus rendu au trigger, `DrillTrigger` = vrai lien `href`, modalité du drawer par breakpoint. Bien au-delà de notre §8 v1.
- **« Profondeur logique illimitée, présentation montée bornée »** — la formulation honnête de notre « profondeur infinie ».
- **Étages 1–7** (invariants → recettes) : centrage optique et chat pleine hauteur redescendent en recettes visuelles — c'était une erreur de v1 de les appeler « lois ».
- **Pas de « Sheet »** — collision shadcn réelle (notre moteur LifeOS s'appelait `SheetView` ; à renommer partout).
- **Précédence de persistance** URL → workspace nommé → session locale → défauts ; hypothèse **Convex Component** ; **Phase 0 falsificationniste** avec 3 domaines hors LifeOS.

## 3. Objections et corrections à apporter au brief

1. **Le nom « Frameword » est faible.** Il se lit comme une typo de « Framework »
   (autocorrect le massacrera, SEO impossible, imprononçable à l'oral). Le brief
   lui-même laisse la décision en Phase 0 #8 — bien. Candidat fort aligné sur la
   tagline « *Open the detail. Keep the thread* » : **Ariane / Ariadne** (le fil
   d'Ariane est littéralement le concept du ContextPath). Autres : Stax, Trail, Strata.
2. **Budget de vocabulaire explosé : 17 termes publics.** ApplicationDock, CommandBar,
   WorkspaceCanvas, PanelZone, PanelRail, ContextRail, ReferenceRail, ContextPath,
   RootPanel, DetailPanel, DrillTrigger, PreviewPanel, PinnedPanel, UtilityDrawer,
   PanelFooter, Space, Panel. Personne ne retient 17 noms pour adopter un routeur.
   Proposition : **6 termes enseignés** (Space, Panel, DrillTrigger, ContextPath,
   Reference, UtilityDrawer) ; le reste = API de layout interne, documentée mais pas
   « canonique ». WorkspaceCanvas / PanelZone / PanelRail peuvent probablement fusionner.
3. **`size` dans `PanelInstance` contredit « présentation locale »** (notre §5b et la
   table adaptive du brief lui-même). Correction : `size` = *hint par défaut du
   registre de types* ; l'override utilisateur vit en préférence locale à l'appareil,
   jamais dans l'état partagé/URL.
4. **Incohérences mineures de la liste de commandes** : `replacePreview`,
   `moveReference`, `closeUtility`, `saveWorkspace`, `restoreFromUrl` figurent dans
   les événements du Prompt 4 mais pas dans la liste des commandes publiques du brief.
   Unifier (une seule table de commandes canonique).
5. **Risque de spec-lourdeur.** Le brief est une spec de v3 pour un produit sans v0.
   Son propre antidote est le bon : Phase 0 #5 (reducer en mémoire + CRM low-fi).
   Garde-fou supplémentaire : si le modèle pin→détachement (cascades de l'étape 3)
   embrouille les testeurs, **replier sur un V1-lite** : pin = « garder visible dans
   la branche active » seulement, ReferenceRail = phase 2. C'est la pièce la plus
   complexe du brief — à falsifier en premier.

## 4. Ce que NOTRE travail ajoute au brief (à réinjecter)

1. **Épines / budget de slots** (`PANEL-LOGIC.md` §5b + démo v3-v4). La table
   « Adaptive presentation » du brief mentionne un « collapsible context strip » sans
   le spécifier — nous, on l'a **spécifié ET prototypé** : budget
   `k = f(largeur conteneur)`, repli des ancêtres en épines verticales toujours
   visibles, priorité de slot aux retenus, focus jamais replié. À verser au brief
   comme la spec du strip.
2. **Le panneau-canvas** (React Flow / workflowbuilder) — absent du brief. À classer
   étage 6 (recette) : un `panelType` graphe dont la sélection de nœud est un
   `DrillTrigger` (`openDetail(nodeInspector)`). L'axe topologie complète l'axe
   profondeur ; état `{nodes,edges}` JSON → mêmes bénéfices URL/persistance.
3. **ContextPath-as-agent-context** — le brief exile l'IA entière dans l'app exemple.
   Correct pour le *coach LifeOS*, mais la **recette** générique mérite l'étage 6 :
   l'état étant du JSON pur, sérialiser `ContextPath + références` comme contexte
   d'un LLM est gratuit et différenciant (« l'agent voit ce que l'utilisateur
   regarde »). Aucun vendor dans le core, juste un sélecteur d'état documenté.
4. **Devtools + harnais de mesure.** Le reducer pur rend triviaux : time-travel,
   replay de session, et surtout **l'instrumentation des métriques de validation du
   brief** (time-to-target, backtracking, wrong-context actions) — à construire dans
   `panels-react` (mode debug) pour que l'étude comparative (Prompt 13) soit runnable.
5. **La démo pédagogique** (artifact, missions auto-validées) — outil d'onboarding
   que le brief n'a pas. Prochaine évolution : la faire passer au modèle
   d'ascendance (arbre + ContextPath + ReferenceRail) = livrable Phase 0 #5-lite.

## 5. Carte de réconciliation des documents

| Document | Statut |
|---|---|
| `CONCEPT-BRIEF.md` | **Canonique v2** (état, invariants, pinning, packages, phase 0) |
| `PROMPT-KIT.md` | **Canonique v2** (contexte canonique + 14 prompts) |
| `PANEL-LOGIC.md` | §1–3 = pédagogie v1 (pile plate, dépassée pour l'état) ; **§5b dimensionnement/épines reste valable** et complète le brief |
| `BRAINSTORM.md` / `PROMPTS.md` | Historique ; remplacés là où ils recouvrent le brief ; y survivent : canvas, agent-contexte, devtools (repris en §4 ci-dessus) |
| Démo artifact | Pédagogie vivante (v4 : CommandBar, drawer, épines, appareils) ; à faire évoluer vers le modèle d'ascendance |

## 6. Prochain pas concret (Phase 0)

**Livrable #5 du brief, en premier** : un reducer en mémoire du nouveau modèle
(`WorkspaceState` : `panelsById` + `parentInstanceId` + `contextLeafId` +
`referenceRailOrder`) + un CRM low-fi (account → contact → opportunity → activity)
pour falsifier : identité scopée au contexte, `closeBranch`, pin→détachement,
`reconcileLocation`. La démo actuelle fournit déjà le harnais visuel — on remplace
son moteur, pas sa coquille.
