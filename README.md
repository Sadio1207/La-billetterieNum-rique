# TERANGAPASS

TERANGAPASS est une billetterie sénégalaise en XOF avec une API Node.js, une base PostgreSQL, un espace organisateur et un parcours de paiement manuel par Wave ou Orange Money.

## Préparer le premier démarrage

Prérequis : Docker Desktop démarré, PowerShell, et Node.js 22 ou plus récent si vous lancez l’API hors Docker.

Depuis la racine du projet, créez votre configuration privée :

```powershell
.\scripts\initialiser-environnement.ps1
```

Le script demande l’adresse e-mail et le mot de passe du premier administrateur, puis génère des secrets aléatoires pour PostgreSQL et les sessions. Les secrets sont écrits dans `.env`, qui est exclu de Git. Ne partagez pas ce fichier.

Avant toute réservation, ouvrez `.env` et renseignez les vrais comptes professionnels :

- `PAYMENT_RECEIVER_NAME`
- `PAYMENT_ORANGE_MONEY_LABEL` et `PAYMENT_ORANGE_MONEY_NUMBER`
- `PAYMENT_WAVE_LABEL` et `PAYMENT_WAVE_NUMBER`
- `SUPPORT_PHONE` : numéro d’assistance TERANGAPASS, actuellement `+221 78 545 55 40`
- `SUPPORT_EMAIL` : destinataire du formulaire d’aide. Le bouton ouvre la messagerie du client avec le message prérempli ; celui-ci valide ensuite son envoi.

Vérifiez chaque numéro directement auprès du bénéficiaire. Aucun numéro de paiement de démonstration n’est préconfiguré.

## Créer la base et lancer le site

Après avoir démarré Docker Desktop :

```powershell
docker compose up --build -d
docker compose ps
```

La base `terangapass` est créée par le conteneur PostgreSQL avec un volume persistant. Le compte propriétaire sert à l’initialisation; l’API se connecte avec un compte applicatif distinct. Au premier démarrage, le script SQL initialise ce rôle et les migrations de `server/migrations` créent les tables et index. L’administrateur initial est enregistré avec un hash Argon2id. Aucune donnée d’événement ou commande fictive n’est insérée.

Ouvrez <http://localhost:8080>. Connectez-vous dans l’espace organisateur avec les identifiants saisis pendant l’initialisation, puis créez vos événements et catégories de billets.

Pour consulter les journaux :

```powershell
docker compose logs -f app
docker compose logs -f db
```

Pour arrêter les services sans supprimer les données :

```powershell
docker compose down
```

Le volume PostgreSQL est conservé. **`docker compose down -v` supprime les données de la base et les justificatifs privés** : ne l’utilisez pas pour un site en activité.

## Sauvegarder et restaurer

Sauvegarde SQL :

```powershell
cmd /c "docker compose exec -T db pg_dump -U terangapass -F c terangapass > sauvegarde-terangapass.dump"
```

Restauration sur une base vide :

```powershell
cmd /c "docker compose exec -T db pg_restore -U terangapass -d terangapass < sauvegarde-terangapass.dump"
```

Les captures de paiement sont dans le volume privé `private_uploads`, séparé des fichiers publiés par le site. Sauvegardez aussi ce volume selon votre procédure d’exploitation.

## Paiements et limites opérationnelles

Le flux actuel accepte les réservations, conserve le stock pendant 20 minutes, recueille une référence et une preuve JPEG, puis laisse un organisateur vérifier le transfert et approuver ou refuser la commande. Les billets ne sont émis qu’après approbation. Le paiement n’est pas débité automatiquement et aucune API Wave/Orange Money n’est connectée.

Le client doit conserver la référence de commande pour retrouver son statut et ses billets. Les notifications par e-mail/SMS, les remboursements automatiques et la vérification bancaire automatisée ne sont pas encore implémentés. Définissez avant une exploitation publique votre entité légale, adresse, conditions de vente et de remboursement, canal de support et procédure de rapprochement des transferts.

## Configuration d’un déploiement public

Le fichier Compose lie l’application et PostgreSQL à `127.0.0.1` et ne fournit pas de nom de domaine ni de terminaison TLS. Pour un site public, placez l’application derrière un reverse proxy HTTPS correctement maintenu, configurez `NODE_ENV=production`, `APP_ORIGIN=https://votre-domaine`, et définissez `TRUST_PROXY` selon le nombre exact de proxys de confiance. Ne rendez jamais PostgreSQL accessible directement à Internet. Sur une base PostgreSQL gérée, utilisez TLS et `DATABASE_SSL=true`.

Le domaine, les secrets définitifs, le bénéficiaire des paiements, les obligations légales et le processus de sauvegarde doivent être configurés et vérifiés avant d’ouvrir les ventes au public. Le flux manuel de paiement reste une opération contrôlée par l’organisateur.

## Structure utile

- `index.html` et `assets/` : interface publique et espace organisateur.
- `server/index.mjs` : API, authentification, réservations, validation des paiements et billets.
- `server/migrations/` : migrations PostgreSQL appliquées au démarrage.
- `compose.yaml` et `Dockerfile` : environnement conteneurisé.
- `.env.example` : modèle sans secret ; ne mettez jamais de valeur secrète dans ce fichier.
