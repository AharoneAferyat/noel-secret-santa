# Repas de Noël & Secret Santa

Mini-site : inscription (prénom, nom, poste, choix repas / Secret Santa / les deux),
sondage pour la date du repas, tirage au sort du Secret Santa, espace perso, admin.

## 1. Firebase
1. Sur https://console.firebase.google.com : **Ajouter un projet** (ex. `noel-secret-santa`).
2. **Firestore Database** › Créer une base (mode production, région `europe-west`).
3. Onglet **Règles** : coller le contenu de `firestore.rules`, puis **Publier**.
4. Paramètres du projet › **Vos applications** › icône Web `</>` › copier la config
   dans `src/firebase.js` (remplacer les `A_REMPLACER`).

## 2. Code admin
Dans `src/config.js`, changer `ADMIN_CODE` (par défaut `noel2026`).
La page Admin est accessible via le lien « Admin » en bas du site.

## 3. Netlify
- Déployer comme d'habitude (dépôt Git ou glisser le dossier ; `netlify.toml` est déjà prêt).
- Nommer le site **noel-secret-santa** (Site configuration › Change site name)
  → l'adresse `https://noel-secret-santa.netlify.app` correspond au QR code de l'affiche.

## 4. Avant d'ouvrir les inscriptions (page Admin)
- Ajouter les dates proposées pour le repas.
- Vérifier budget (15 €), date limite (3 décembre), date des résultats (4 décembre).

## Déroulé
1. Chacun s'inscrit avec un code PIN à 4 chiffres (pour revenir dans « Mon espace »).
2. Le 3 décembre au soir : décocher « Inscriptions ouvertes », retenir la date du repas.
3. Le 4 décembre : **Lancer le tirage**. Chacun voit son résultat dans « Mon espace ».
   Personne ne peut tomber sur soi-même.
4. PIN oublié : Admin › Inscrits › « Nouveau PIN ».
