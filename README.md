# Tally — Compteur de Points

Petite PWA (Progressive Web App) 100 % hors-ligne pour compter les points de plusieurs équipes en simultané — pratique pour les jeux de société, les cartes, le sport entre amis, etc. Aucun compte à créer, aucun serveur : tout est stocké localement dans le navigateur.

🔗 **Démo en ligne** : https://wip06.github.io/Tally/

## Fonctionnalités

- **Plusieurs compteurs en parallèle**, tous visibles sur la page d'accueil.
- Pour chaque compteur : autant d'équipes que voulu, avec **nom et couleur personnalisables**.
- Deux modes de score, au choix par compteur :
  - **Clic +1** : on touche le score pour l'incrémenter (bouton −1 pour corriger).
  - **Libre** : saisie manuelle du score.
- Réinitialisation des scores, ajout/suppression d'équipes et de compteurs.
- **Fonctionne hors-ligne** une fois chargée (service worker + cache local).
- **Installable** sur mobile ou desktop comme une vraie application (Ajouter à l'écran d'accueil).
- Aucune inscription, aucune donnée envoyée nulle part : tout reste dans le `localStorage` de l'appareil.

## Stack technique

Vanilla HTML / CSS / JavaScript, sans framework, sans étape de build, sans dépendance externe. Le tout tient dans quelques fichiers :

```
index.html      Structure de la page
styles.css      Thème (pastel turquoise) et mise en page responsive
app.js          Logique de l'application (état, rendu, interactions)
manifest.json   Manifeste PWA (nom, icônes, couleurs)
sw.js           Service worker (cache hors-ligne)
icon.svg        Icône de l'application
```
