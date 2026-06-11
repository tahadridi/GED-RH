# GED RH — État du Projet

## Stack Technique

| Couche | Technologie |
|---|---|
| Backend | Spring Boot 4.0.6 / Java 17 |
| Base de données | PostgreSQL local (`Gestion_Administratif`) |
| Authentification | Supabase Auth (JWT) |
| Stockage fichiers | MinIO (bucket `ged-rh`) |
| OCR | Tesseract via Tess4J |
| Recherche | Elasticsearch (placeholder — non connecté) |
| Frontend | Angular 21 + Tailwind CSS v4 |
| Icons | @lucide/angular v1.x |

---

## Architecture Générale

```
[Angular Frontend]
      ↕ JWT Bearer
[Spring Boot Backend :8080]
      ↕ JPA/Hibernate       ↕ MinIO SDK        ↕ Tess4J
[PostgreSQL local]      [MinIO :9000]      [Tesseract OCR]
      ↑
[Supabase Auth] — vérifie JWT uniquement, ne stocke pas les données métier
```

---

## Backend — Ce qui est implémenté

### Entités (PostgreSQL)

| Table | Description |
|---|---|
| `system_users` | Comptes utilisateurs de l'application |
| `system_user_roles` | Rôles par utilisateur |
| `system_user_rh_responsibilities` | Types de documents gérés par chaque RH |
| `employees` | Dossiers employés |
| `employee_documents` | Documents liés aux employés |
| `document_versions` | Historique des versions de chaque document |

### Rôles

- `ADMINISTRATOR` — accès complet
- `DIRECTION_GENERALE` — lecture seule sur tout
- `MANAGER` — lecture des employés qui lui sont affectés uniquement
- `RH` — création/modification des types de documents dans ses responsabilités uniquement

### Sécurité

- Filtre JWT Supabase sur toutes les requêtes (`SupabaseAuthenticationFilter`)
- Contrôle d'accès par rôle (`AccessControlService`)
- Contrôle hiérarchique manager/employé
- `@PreAuthorize("hasRole('ADMINISTRATOR')")` sur les routes admin
- CORS configuré pour `http://localhost:4200`

### Endpoints REST

#### Auth
| Méthode | URL | Description |
|---|---|---|
| GET | `/api/auth/me` | Informations de l'utilisateur connecté |

#### Admin — Utilisateurs
| Méthode | URL | Description |
|---|---|---|
| GET | `/api/admin/users` | Lister tous les utilisateurs |
| GET | `/api/admin/users/{id}` | Détail d'un utilisateur |
| POST | `/api/admin/users` | Créer un utilisateur (Supabase Auth + DB) |
| PUT | `/api/admin/users/{id}` | Modifier un utilisateur |
| DELETE | `/api/admin/users/{id}` | Désactiver un utilisateur |
| POST | `/api/admin/users/{id}/reset-password` | Réinitialiser mot de passe |
| POST | `/api/admin/users/{id}/assign-manager/{managerId}` | Affecter un manager |
| POST | `/api/admin/users/{id}/rh-responsibilities` | Affecter responsabilités RH |

#### Employés
| Méthode | URL | Description |
|---|---|---|
| GET | `/api/employees` | Lister (filtré par rôle) |
| GET | `/api/employees/{id}` | Détail |
| POST | `/api/employees` | Créer |
| PUT | `/api/employees/{id}` | Modifier |
| DELETE | `/api/employees/{id}` | Désactiver (soft delete) |

#### Documents
| Méthode | URL | Description |
|---|---|---|
| POST | `/api/documents/ocr-preview` | Étape 1 — upload temp + OCR → retourne texte extrait |
| POST | `/api/documents` (JSON) | Étape 2 — sauvegarder avec texte OCR révisé |
| POST | `/api/documents` (multipart) | Upload direct (legacy) |
| GET | `/api/documents/{id}` | Détail |
| GET | `/api/documents/{id}/content` | Télécharger le fichier |
| GET | `/api/documents/employee/{employeeId}` | Documents d'un employé |
| GET | `/api/documents/search` | Recherche multicritère |
| GET | `/api/documents/type/{type}` | Par type |
| POST | `/api/documents/{id}/versions` | Ajouter une version |
| GET | `/api/documents/{id}/versions` | Lister les versions |
| GET | `/api/documents/versions/{versionId}/content` | Télécharger une version |
| PUT | `/api/documents/{id}` | Modifier métadonnées |
| DELETE | `/api/documents/{id}` | Supprimer |

### Services Backend

| Service | Rôle |
|---|---|
| `AdminUserService` | Gestion utilisateurs + appels Supabase Admin API |
| `EmployeeService` | CRUD employés |
| `DocumentService` | Logique documents, OCR preview, versioning |
| `StorageService` | Upload/download/copy/delete MinIO |
| `OCRService` | Extraction texte via Tesseract |
| `ElasticsearchService` | Placeholder — indexation (non connecté) |
| `AccessControlService` | Vérification permissions par rôle/hiérarchie |

---

## Frontend — Ce qui est implémenté

### Structure

```
src/app/
├── core/
│   ├── models/
│   │   ├── user.model.ts         — SystemUser, SystemRole, DocumentType
│   │   ├── employee.model.ts     — Employee, EmployeeStatus
│   │   └── document.model.ts     — EmployeeDocument, DocumentVersion
│   ├── services/
│   │   ├── auth.service.ts       — Supabase auth, session, token
│   │   ├── api.service.ts        — HTTP calls avec JWT header auto
│   │   ├── user.service.ts       — CRUD utilisateurs admin
│   │   ├── employee.service.ts   — CRUD employés
│   │   └── document.service.ts   — Documents, OCR preview, versions
│   └── guards/
│       └── auth.guard.ts         — Protège toutes les routes sauf login
├── shared/
│   └── components/
│       ├── sidebar/              — Navigation latérale
│       └── shell/                — Layout avec sidebar + router-outlet
└── features/
    ├── auth/login/               — Page de connexion Supabase
    ├── dashboard/                — Stats (employés, documents, activité récente)
    ├── employees/
    │   ├── employees-list/       — Liste avec recherche/filtre
    │   ├── employee-form/        — Modal création/modification
    │   └── employee-detail/      — Dossier employé + gestion documents
    ├── documents/
    │   └── documents-list/       — Liste globale avec filtre type + recherche
    ├── search/                   — Recherche multicritère (employés + documents)
    └── admin/
        └── users/                — Gestion utilisateurs (admin uniquement)
```

### Pages / Routes

| Route | Composant | Accès |
|---|---|---|
| `/auth/login` | `Login` | Public |
| `/dashboard` | `Dashboard` | Authentifié |
| `/employees` | `EmployeesList` | Authentifié |
| `/employees/:id` | `EmployeeDetail` | Authentifié |
| `/documents` | `DocumentsList` | Authentifié |
| `/search` | `Search` | Authentifié |
| `/admin/users` | `AdminUsers` | Authentifié (ADMIN côté backend) |

### Flux Upload Document (2 étapes)

1. **Étape 1** — L'utilisateur sélectionne un fichier (PDF/JPG/PNG), clique **"Analyser avec OCR"**
   → le fichier est envoyé au backend, stocké en temp dans MinIO, OCR tourne
   → le texte extrait revient dans le formulaire

2. **Étape 2** — L'utilisateur voit et **peut corriger** le texte OCR dans un textarea éditable
   → Il remplit : nom du document, référence, type (dropdown libre)
   → Clique **"Enregistrer"** → document sauvegardé en DB, fichier déplacé vers chemin final

---

## Configuration

### Backend (`ged-backend/.env`)

```
DB_URL=jdbc:postgresql://localhost:5432/Gestion_Administratif
DB_USERNAME=postgres
DB_PASSWORD:LOCAL_DEV_CREDENTIALS
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWKS_URL=...
MINIO_URL=http://localhost:9000
MINIO_ACCESS_KEY=LOCAL_DEV_CREDENTIALS
MINIO_SECRET_KEY=LOCAL_DEV_CREDENTIALS
```

### Frontend (`ged-frontend/src/environments/environment.ts`)

```typescript
supabaseUrl: 'https://...supabase.co'
supabaseKey: '...'
apiUrl: 'http://localhost:8080/api'
```

---

## Ce qui n'est pas encore fait

| Fonctionnalité | État |
|---|---|
| Scan via webcam/caméra | ❌ Non implémenté |
| Elasticsearch connecté | ❌ Placeholder uniquement |
| Sauvegarde automatique PostgreSQL | ❌ Infrastructure/ops |
| Sauvegarde automatique MinIO | ❌ Infrastructure/ops |

---

## Démarrage

```bash
# 1. PostgreSQL : créer la base
CREATE DATABASE "Gestion_Administratif";

# 2. MinIO
minio.exe server C:\minio-data --console-address ":9001"

# 3. Backend
cd ged-backend
./mvnw spring-boot:run

# 4. Frontend
cd ged-frontend
ng serve
```

Accès : http://localhost:4200 — connexion via compte Supabase Auth
