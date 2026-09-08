# GED — Gestion Électronique de Documents

Application web de gestion administrative et documentaire pour entreprise.

## Description

La GED centralise la gestion des **employés**, des **documents RH**, de l'**organigramme**, des **annonces**, des **réclamations** et du **calendrier** de l'entreprise.

Elle s'adresse à différents profils avec des droits d'accès adaptés :

- **Administrateur** : gestion des utilisateurs, rôles, types de documents et de l'organisation.
- **Direction Générale** : vue globale et tableaux de bord (employés, réclamations, documents).
- **RH** : accès complet aux dossiers documents de tous les employés et validation des réclamations.
- **Manager** : gestion de son équipe (employés, documents, réclamations, calendrier).
- **Employé** : consultation de ses documents, dépôt de réclamations.

## Technologies

- **Backend** : Java 21, Spring Boot, PostgreSQL, MinIO, Tesseract (OCR), Supabase (authentification JWT).
- **Frontend** : Angular, Tailwind CSS.
- **Déploiement** : Docker (docker-compose).

## Démarrage

### En local

```bash
# Backend
cd ged-backend
./mvnw spring-boot:run        # API : http://localhost:8080

# Frontend
cd ged-frontend
npm install
npm start                     # App : http://localhost:4200
```

### Avec Docker

```bash
docker compose -f docker-compose.backend.yml  up -d --build
docker compose -f docker-compose.frontend.yml up -d --build
```

Accès : app sur `http://localhost:8081`, API sur `http://localhost:8080`.

## Documentation API

Swagger : `http://localhost:8080/swagger-ui.html`