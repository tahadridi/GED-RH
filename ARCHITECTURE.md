# Architecture du Projet GED RH

## 1. Vue d'ensemble

Application de **Gestion Électronique de Documents (GED)** pour les Ressources Humaines.
Permet de stocker, classifier, rechercher et valider des documents RH avec OCR,
flux de validation et gestion des réclamations.

```
┌──────────────────────────────────────────────────────────────────┐
│                       Frontend Angular                           │
│          (Standalone Components, Tailwind, Lucide Icons)         │
└─────────────────┬────────────────────────────────────────────────┘
                  │ HTTP (REST JSON) + WebSocket (STOMP)
                  │
┌─────────────────▼────────────────────────────────────────────────┐
│                     Spring Boot 3.4.1 / Java 21                   │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │Controller │→│ Service  │→│Repository │→│  PostgreSQL       │  │
│  │  (REST)   │  │ (Métier) │  │  (JPA)   │  │  (DDL auto)      │  │
│  └──────────┘  └────┬─────┘  └──────────┘  └──────────────────┘  │
│                     │                                              │
│            ┌────────▼────────┐                                    │
│            │  External       │                                    │
│            │  Services       │                                    │
│            │  ┌──────────┐   │                                    │
│            │  │ MinIO    │   │  Stockage fichiers (S3-compatible) │
│            │  ├──────────┤   │                                    │
│            │  │Supabase  │   │  Authentification                  │
│            │  ├──────────┤   │                                    │
│            │  │Tesseract │   │  OCR (texte extrait)               │
│            │  ├──────────┤   │                                    │   
│            └────────────────┘                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Technique

| Couche       | Technologie                              | Version   |
|-------------|------------------------------------------|-----------|
| Backend      | Spring Boot                              | 3.4.1     |
|              | Java                                     | 21        |
|              | Maven                                    | -         |
| Base de données | PostgreSQL                            | -         |
| Frontend     | Angular (Standalone Components)          | 18        |
|              | Tailwind CSS                             | 3.4       |
|              | Lucide Icons                             | -         |
| Authentification | Supabase Auth                         | -         |
| Stockage fichiers | MinIO (S3-compatible)                | 8.5.2     |
| OCR          | Tesseract (via Tess4J)                   | 5.7.0     |
|              | PDFBox (conversion PDF → image)          | 3.0.3     |
|              | TwelveMonkeys ImageIO (TIFF, BMP, JPEG)  | 3.11.0    |
| Recherche    | Elasticsearch (MVP, stub)                | -         |
| Realtime     | STOMP over SockJS (WebSocket)            | -         |
| Docs API     | SpringDoc OpenAPI (Swagger UI)           | 2.7.0     |
| Monitoring   | Spring Actuator                          | -         |

---

## 3. Backend : Structure détaillée

### 3.1 Couche Controller (API REST)

Chaque contrôleur expose des endpoints REST. Tous les chemins commencent par `/api/`.

| Fichier | Endpoints | Rôle |
|---------|-----------|------|
| `HealthController.java` | `GET /api/health` | Health check |
| `AuthController.java` | `POST /api/auth/login`, `PUT /api/auth/password` | Authentification Supabase |
| `EmployeeController.java` | CRUD `/api/employees/**` | Gestion des employés + photo |
| `DocumentController.java` | `POST /api/documents/ocr-preview`, `POST /api/documents`, `GET /api/documents/**`, `DELETE /api/documents/**`, `POST /api/documents/*/versions`, `GET /api/documents/search` | Upload avec OCR, versioning, recherche |
| `DocTypeController.java` | CRUD `/api/doc-types/**` | Types de documents configurables |
| `OrganizationController.java` | CRUD `/api/departments/**`, `/api/job-positions/**` | Structure organisationnelle |
| `ReclamationController.java` | CRUD `/api/reclamations/**`, `POST .../approve`, `POST .../reject` | Gestion des réclamations |
| `AdminUserController.java` | CRUD `/api/admin/users/**` | Administration des utilisateurs via Supabase Admin API |
| `StorageController.java` | `POST /api/files/upload` | Upload direct de fichiers (présigned) |

### 3.2 Couche Service (Logique métier)

| Fichier | Rôle |
|---------|------|
| `EmployeeService.java` | CRUD employés, génération automatique du matricule (prefixe département + numéro séquentiel), upload photo, recherche avec `EmployeeSpecifications` |
| `DocumentService.java` | **Deux flux d'upload** : (1) OCR preview → sauvegarde avec texte corrigé, (2) Upload direct → OCR asynchrone. Gestion des versions, ACL |
| `OCRService.java` | Wrapper Tess4J + PDFBox. Détection automatique du format (PDF, image). OCR français. Logging détaillé |
| `StorageService.java` | Upload / download / delete / copy dans MinIO. Génération de clés avec UUID |
| `OrganizationService.java` | CRUD départements et postes |
| `ReclamationService.java` | Cycle de vie complet des réclamations + notification WebSocket via `ReclamationWebSocketService` |
| `AccessControlService.java` | Vérifications RBAC centralisées : qui peut voir/modifier quoi |
| `AdminUserService.java` | Gestion des utilisateurs via l'API Admin Supabase |
| `ElasticsearchService.java` | MVP / stub. Indexation et recherche plein texte. Fallback sur JPA Specifications |

### 3.3 Couche Repository (JPA / Data)

| Fichier | Rôle |
|---------|------|
| `EmployeeRepository.java` | Requêtes de base + `findByMatricule`, `findByManagerId` |
| `EmployeeDocumentRepository.java` | `findByEmployee_Id`, `findByType` |
| `DocumentVersionRepository.java` | `findByDocumentIdOrderByVersionNumberDesc` |
| `SystemUserRepository.java` | `findByEmail` |
| `DepartmentRepository.java` | `findByParentId` (hiérarchie) |
| `JobPositionRepository.java` | - |
| `DocTypeEntityRepository.java` | - |
| `ReclamationRepository.java` | `findByEmployeeIdOrderByCreatedAtDesc`, `countByStatus` |
| `EmployeeSpecifications.java` | Specifications JPA pour filtres + sécurité lignes |
| `DocumentSpecifications.java` | Specifications JPA pour filtres + sécurité lignes |

### 3.4 Couche Entity (Modèle de données)

| Fichier | Table | Rôle |
|---------|-------|------|
| `Employee.java` | `employees` | Fiche employé (nom, prénom, email, téléphone, matricule, statut, manager, photo, département, poste) |
| `EmployeeDocument.java` | `employee_documents` | Métadonnées document (référence, nom, type, auteur, chemin stockage, texte OCR) |
| `DocumentVersion.java` | `document_versions` | Versions d'un document (numéro, chemin, uploadé par, texte OCR) |
| `SystemUser.java` | `system_users` | Utilisateur applicatif lié à Supabase Auth (email, rôles, prénom, nom) |
| `Department.java` | `departments` | Département (nom, code, parent — hiérarchie) |
| `JobPosition.java` | `job_positions` | Poste (titre, département) |
| `DocTypeEntity.java` | `doc_types` | Type de document configurable (nom, code, rôles RH associés) |
| `Reclamation.java` | `reclamations` | Réclamation (type, statut, priorité, message, approbateur, motif rejet) |

### 3.5 Enums

| Fichier | Valeurs |
|---------|---------|
| `SystemRole.java` | `ADMINISTRATOR`, `DIRECTION_GENERALE`, `MANAGER`, `RH` |
| `DocumentType.java` | `PERSONAL_FILE`, `EMPLOYMENT_CONTRACT`, `PAYSLIP`, `LEAVE_REQUEST`, `EVALUATION`, `TRAINING`, `ADMINISTRATIVE`, `DISCIPLINARY`, `OTHER` |
| `ReclamationType.java` | `EMAIL_CHANGE`, `OTHER` |
| `ReclamationStatus.java` | `PENDING`, `APPROVED`, `REJECTED` |
| `ReclamationPriority.java` | `FAIBLE`, `MOYENNE`, `HAUTE`, `CRITIQUE` |
| `EmployeeStatus.java` | `ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED` |

### 3.6 Configuration

| Fichier | Rôle |
|---------|------|
| `application.properties` | Datasource PostgreSQL, Supabase (URL/clés), MinIO (URL/clés/bucket), OCR (tessdata), CORS, `ddl-auto=update`, `open-in-view=false` |
| `SecurityConfig.java` | Désactive CSRF, session stateless, CORS, autorise endpoints publics (`/api/health`, `/ws-native/**`, `/swagger-ui/**`, `/v3/api-docs/**`), ajoute `SupabaseAuthenticationFilter` |
| `SupabaseAuthenticationFilter.java` | Extrait JWT du header `Authorization`, le valide via `GET /auth/v1/user` Supabase REST, charge le `SystemUser` depuis la BDD, crée l'objet `Authentication` |
| `SupabaseConfig.java` | Bean `RestClient` pour l'API Supabase (endpoint auth/admin) |
| `SupabaseAdminClient.java` | Opérations admin : créer/lister/supprimer utilisateurs, changer mot de passe (via `service_role_key`) |
| `MinioConfig.java` | Bean `MinioClient` configuré avec URL, access key, secret key |
| `WebSocketConfig.java` | STOMP sur `/ws-native`, broker `/topic`, app prefix `/app` |
| `CorsConfig.java` (dans SecurityConfig) | Configuration CORS : origines, méthodes, headers, credentials |

---

## 4. Frontend : Architecture

### 4.1 Structure des dossiers

```
src/app/
├── core/
│   ├── services/          # Services partagés (API, Auth, Document, Employee, WebSocket)
│   ├── guards/            # AuthGuard (protection routes)
│   ├── interceptors/      # AuthInterceptor (attache JWT)
│   └── models/            # Interfaces TypeScript (Employee, Document, Reclamation...)
├── features/
│   ├── auth/              # Login
│   ├── employees/         # Liste + détail employé
│   ├── documents/         # Liste documents
│   ├── dashboard/         # 4 dashboards (Admin, RH, Manager, DG)
│   ├── reclamations/      # Réclamations employé
│   ├── admin/             # Utilisateurs, organisation, types de documents
│   ├── search/            # Recherche globale
│   └── shell/             # Layout (sidebar + header) + navigation
└── shared/                # Composants réutilisables
```

### 4.2 Services principaux

| Service | Rôle |
|---------|------|
| `api.service.ts` | Wrapper HTTP de base (get, post, put, delete, postFormData) |
| `auth.service.ts` | Gestion session Supabase (signIn, signOut, refresh), profil utilisateur `loadProfile()`, changement mot de passe, récupération réclamations |
| `document.service.ts` | OCR preview, sauvegarde, versioning, recherche |
| `employee.service.ts` | CRUD employés, upload photo, search |
| `websocket.service.ts` | Connexion STOMP, abonnement aux notifications réclamations |
| `auth.interceptor.ts` | Ajoute le JWT (Bearer) à chaque requête HTTP |
| `auth.guard.ts` | Protège les routes, redirige vers `/auth/login` si non authentifié |

### 4.3 Routage

```
/auth/login              → LoginComponent              (public)
/                        → ShellComponent              (auth required)
  /dashboard             → AdminDashboardComponent
  /dashboard/rh          → RhDashboardComponent
  /dashboard/manager     → ManagerDashboardComponent
  /dashboard/dg          → DgDashboardComponent
  /employees             → EmployeeListComponent
  /employees/:id         → EmployeeDetailComponent
  /documents             → DocumentListComponent
  /reclamations          → ReclamationListComponent
  /search                → SearchComponent
  /admin/users           → AdminUsersComponent
  /admin/organization    → OrganizationComponent
  /admin/doc-types       → DocTypesComponent
**                       → Redirection vers /auth/login
```

### 4.4 Sidebar (navigation par rôle)

| Rôle | Menu affiché |
|------|-------------|
| ADMINISTRATOR | Dashboard, Employés, Documents, Réclamations, Administration (Utilisateurs, Départements, Types doc) |
| DIRECTION_GENERALE | Dashboard, Employés, Documents, Réclamations |
| RH | Dashboard, Employés, Documents, Réclamations |
| MANAGER | Dashboard, Employés, Documents, Réclamations |

---

## 5. Flux de données critiques

### 5.1 Upload document avec OCR

```
Étape 1 : OCR Preview
┌──────────┐    POST /documents/ocr-preview    ┌──────────────┐
│ Frontend │ ──────── (multipart/file) ────────→│  Controller  │
│          │                                    │              │
│          │←── { tempKey, ocrText, filename } ─│  ocrPreview  │
└──────────┘                                    └──────┬───────┘
                                                       │
                                              ┌────────▼───────┐
                                              │  DocumentService│
                                              │                │
                                              │  1. Upload temp│──→ MinIO (temp/uuid_filename)
                                              │  2. OCR Service│──→ Tesseract/PDFBox
                                              │  3. Return text│
                                              └────────────────┘

Étape 2 : Sauvegarde (après validation utilisateur)
┌──────────┐    POST /documents (JSON)       ┌──────────────┐
│ Frontend │ ──── { tempKey, ocrText, ... } ─→│  Controller  │
│          │                                   │              │
│(utilisateur│←────── EmployeeDocument ────────│createFromPrev│
│ corrige   │                                   └──────┬───────┘
│ le texte) │                                         │
└──────────┘                                ┌──────────▼─────────┐
                                            │  DocumentService    │
                                            │                     │
                                            │  1. Copy temp→final │──→ MinIO (docs/emp/uuid_name.ext)
                                            │  2. Delete temp     │──→ MinIO
                                            │  3. Save EmployeeDoc│──→ PostgreSQL
                                            │  4. Save Version    │──→ PostgreSQL
                                            │  5. Index Elastic   │──→ Elasticsearch
                                            └─────────────────────┘
```

### 5.2 Authentification

```
┌──────────┐   signIn(email, password)    ┌──────────────┐
│ Frontend │─────────────────────────────→│  Supabase    │
│          │←─── session + JWT ───────────│   Auth       │
│          │                              └──────────────┘
│          │   GET /api/auth/me           ┌──────────────┐
│          │─── (Authorization: Bearer) ─→│  Backend     │
│          │                              │              │
│          │←── SystemUser (roles, email) │  Filter      │
└──────────┘                              │  → Valide JWT │
                                          │  → Load User  │
                                          │  → Auth object│
                                          └──────────────┘
```

### 5.3 Réclamation avec WebSocket

```
┌──────────┐   POST /api/reclamations      ┌──────────────┐
│ Employé  │──────────────────────────────→│  Backend      │
│          │                               │              │
└──────────┘                               │  1. Save Reclamation (PENDING)
                                           │  2. Push WebSocket → /topic/reclamations
                                           └──────┬───────┘
                                                  │
                    ┌─────────────────────────────┼──────────────┐
                    │                             │              │
            ┌───────▼───────┐            ┌────────▼────────┐    │
            │  RH/Manager   │            │  WebSocket push  │    │
            │  voit notif   │←───────────│  (notification)  │    │
            └───────┬───────┘            └─────────────────┘    │
                    │                                           │
         POST .../approve ou .../reject                         │
                    │                                           │
            ┌───────▼───────┐                                    │
            │  Backend      │                                    │
            │  1. Update status                                  │
            │  2. Push WS → /topic/reclamations/{id}             │
            └───────────────┘                                    │
```

---

## 6. Sécurité

### 6.1 RBAC (Role-Based Access Control)

Les permissions sont centralisées dans `AccessControlService.java` :

| Action | RÔLES autorisés |
|--------|----------------|
| Voir tous les employés | ADMIN, RH, DG, MANAGER |
| Modifier un employé | ADMIN, RH |
| Supprimer un employé | ADMIN, RH |
| Upload document | ADMIN, RH |
| Voir documents employé | ADMIN, RH, DG (tous), MANAGER (son équipe) |
| Gérer réclamations | RH, MANAGER (son équipe) |
| Administration | ADMIN |

### 6.2 Sécurité au niveau lignes (Row-Level Security)

Les `EmployeeSpecifications` et `DocumentSpecifications` filtrent les données
selon le rôle et le département du `SystemUser` connecté :

- **DG** : voit tout
- **MANAGER** : voit uniquement les employés de son département (managedEmployees)
- **RH** : voit les employés de son département assigné
- **ADMIN** : voit tout

### 6.3 Flux du filtre d'authentification

```
Requête entrante
       │
       ▼
┌──────────────────┐   NON    ┌────────────────────┐
│ Header Bearer ?  │─────────→│ 401 Unauthorized    │
└────────┬─────────┘          └────────────────────┘
         │ OUI
         ▼
┌──────────────────┐
│ Valider JWT via  │
│ Supabase REST    │
│ /auth/v1/user    │
└────────┬─────────┘
         │ Échec
         ▼
    ┌────────────────────┐
    │ 401 Unauthorized    │
    └────────────────────┘
         │ Succès
         ▼
┌──────────────────┐
│ Charger/créer    │
│ SystemUser (DB)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Créer Authentication│
│ (roles → SimpleGrantedAuthority)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Prochaine étape   │
│ du filtre Spring  │
└──────────────────┘
```

---

## 7. Rôle de chaque fichier backend

### src/main/java/GED/ged_backend/

| Fichier | Description |
|---------|-------------|
| `GedBackendApplication.java` | Point d'entrée Spring Boot |

### config/

| Fichier | Description |
|---------|-------------|
| `WebSocketConfig.java` | Configuration STOMP : endpoint `/ws-native`, broker `/topic` |
| `SupabaseProperties.java` | `@ConfigurationProperties` pour les 3 clés Supabase |
| `SupabaseConfig.java` | Bean `RestClient` pour API Supabase Auth |
| `SupabaseAdminClient.java` | Opérations admin via `service_role_key` (création/suppression utilisateurs) |
| `MinioProperties.java` | `@ConfigurationProperties` pour URL, access key, secret key |
| `MinioConfig.java` | Bean `MinioClient` + initialisation du bucket |

### controller/

| Fichier | Description |
|---------|-------------|
| `HealthController.java` | `GET /api/health` — vérification que l'API tourne |
| `AuthController.java` | Login Supabase, changement mot de passe |
| `EmployeeController.java` | CRUD employés, upload photo, recherche |
| `DocumentController.java` | OCR preview, création/suppression documents, versioning, recherche, téléchargement |
| `DocTypeController.java` | CRUD types de documents configurables |
| `OrganizationController.java` | CRUD départements et postes |
| `ReclamationController.java` | CRUD réclamations, approbation/rejet avec WebSocket |
| `AdminUserController.java` | CRUD utilisateurs (admin only) |
| `StorageController.java` | Upload direct de fichiers |

### domain/entity/

| Fichier | Table | Description |
|---------|-------|-------------|
| `Employee.java` | `employees` | Fiche employé complète avec relations |
| `EmployeeDocument.java` | `employee_documents` | Document avec métadonnées + texte OCR |
| `DocumentVersion.java` | `document_versions` | Version d'un document avec historique |
| `SystemUser.java` | `system_users` | Utilisateur applicatif (lié à Supabase Auth) |
| `Department.java` | `departments` | Département (structure arborescente : parent) |
| `JobPosition.java` | `job_positions` | Poste de travail lié à un département |
| `DocTypeEntity.java` | `doc_types` | Type de document configurable |
| `Reclamation.java` | `reclamations` | Réclamation avec workflow (PENDING → APPROVED/REJECTED) |

### domain/enums/

| Fichier | Description |
|---------|-------------|
| `SystemRole.java` | Rôles : ADMINISTRATOR, DIRECTION_GENERALE, MANAGER, RH |
| `DocumentType.java` | Types document : PERSONAL_FILE, EMPLOYMENT_CONTRACT, PAYSLIP, etc. |
| `ReclamationType.java` | Types : EMAIL_CHANGE, OTHER |
| `ReclamationStatus.java` | Statuts : PENDING, APPROVED, REJECTED |
| `ReclamationPriority.java` | Priorités : FAIBLE, MOYENNE, HAUTE, CRITIQUE |
| `EmployeeStatus.java` | Statuts : ACTIVE, INACTIVE, ON_LEAVE, TERMINATED |

### repository/

| Fichier | Description |
|---------|-------------|
| `EmployeeRepository.java` | Accès DB employés |
| `EmployeeDocumentRepository.java` | Accès DB documents employés |
| `DocumentVersionRepository.java` | Accès DB versions documents |
| `SystemUserRepository.java` | Accès DB utilisateurs |
| `DepartmentRepository.java` | Accès DB départements |
| `JobPositionRepository.java` | Accès DB postes |
| `DocTypeEntityRepository.java` | Accès DB types documents |
| `ReclamationRepository.java` | Accès DB réclamations |
| `EmployeeSpecifications.java` | Filtres JPA dynamiques pour employés (sécurité lignes) |
| `DocumentSpecifications.java` | Filtres JPA dynamiques pour documents (sécurité lignes) |

### security/

| Fichier | Description |
|---------|-------------|
| `SecurityConfig.java` | Configuration Spring Security : CORS, CSRF, sessions, routes publiques, filtre JWT |
| `SupabaseAuthenticationFilter.java` | Filtre OncePerRequest : extrait JWT, valide via Supabase, charge SystemUser, crée Authentication |

### service/

| Fichier | Description |
|---------|-------------|
| `EmployeeService.java` | Logique métier employés : CRUD, matricule auto, photo, search |
| `DocumentService.java` | Logique métier documents : upload 2 étapes, OCR, versioning, ACL |
| `OCRService.java` | Service OCR : Tess4J + PDFBox + TwelveMonkeys, détection format fichier |
| `StorageService.java` | Service stockage MinIO : upload, download, delete, copy |
| `OrganizationService.java` | Logique métier organisation : départements, postes |
| `ReclamationService.java` | Logique métier réclamations : CRUD, workflow, notification WebSocket |
| `AccessControlService.java` | Vérifications RBAC centralisées |
| `AdminUserService.java` | Gestion utilisateurs via Supabase Admin API |
| `ElasticsearchService.java` | Service Elasticsearch (MVP, stub) |
| `ReclamationWebSocketService.java` | Envoi notifications WebSocket STOMP |

---

## 8. Rôle de chaque fichier frontend

### src/app/core/

| Fichier | Description |
|---------|-------------|
| `services/api.service.ts` | Wrapper HTTP : get, post, put, delete, postFormData — attache automatiquement le token |
| `services/auth.service.ts` | Gestion complète session Supabase : signIn, signOut, loadProfile, refresh, password change |
| `services/document.service.ts` | OCR preview + saveFromPreview + create + get + delete + addVersion + search |
| `services/employee.service.ts` | CRUD employés, upload photo, search |
| `services/websocket.service.ts` | Connexion STOMP SockJS, subscribe reclamations |
| `models/employee.model.ts` | Interface Employee |
| `models/document.model.ts` | Interfaces EmployeeDocument, DocumentVersion, CreateFromPreviewRequest |
| `models/reclamation.model.ts` | Interface Reclamation |
| `interceptors/auth.interceptor.ts` | Attache JWT à chaque requête HTTP |
| `guards/auth.guard.ts` | Protège les routes : redirige vers /auth/login si non connecté |

### src/app/features/

| Fichier | Description |
|---------|-------------|
| `auth/login/login.ts` | Page de connexion (email + mot de passe) |
| `shell/shell.ts` | Layout avec sidebar + header + router-outlet |
| `shell/sidebar.ts` | Sidebar avec navigation par rôle, badge réclamations, popup profil |
| `dashboard/rh-dashboard/` | Dashboard RH : upload document, statistiques, uploads récents |
| `dashboard/admin-dashboard/` | Dashboard Admin |
| `dashboard/manager-dashboard/` | Dashboard Manager |
| `dashboard/dg-dashboard/` | Dashboard DG |
| `employees/employee-list/` | Liste employés avec recherche/filtres |
| `employees/employee-detail/` | Détail employé : infos, documents, upload avec OCR |
| `documents/document-list/` | Recherche documents par employé, type, date |
| `reclamations/reclamation-list/` | Liste réclamations de l'employé connecté |
| `admin/users/` | Gestion utilisateurs (admin only) |
| `admin/organization/` | Gestion départements (admin/DG) |
| `admin/doc-types/` | Gestion types de documents (admin) |
| `search/search/` | Recherche globale |

### src/app/app.config.ts

Configure le routage, le HttpClient avec intercepteur, et les erreurs globales.

### src/app/app.routes.ts

Définit toutes les routes de l'application avec `authGuard` pour les routes protégées.

### src/environments/environment.ts

Contient les URLs et clés : `apiUrl`, `supabaseUrl`, `supabaseAnonKey`, `wsUrl`.

---

## 9. Base de données : Schéma relationnel

```
system_users                  employees
┌──────────────┐              ┌────────────────────┐
│ id (UUID)    │──┐           │ id (UUID)          │
│ email        │  │           │ first_name          │
│ first_name   │  │           │ last_name           │
│ last_name    │  │           │ email               │
│ roles (text) │  │           │ phone               │
└──────────────┘  │           │ matricule (unique)  │
                  │           │ status (enum)       │
                  │           │ photo_path          │
                  │           │ manager_id ─────────┼──┐
                  │           │ department_id ──────┼──┼──┐
                  │           │ job_position_id ────┼──┼──┼──┐
                  │           │ user_id (FK) ───────┘  │  │  │
                  │           └────────────────────────┘  │  │  │
                  │                                      │  │  │
┌──────────────────────────┐  departments ────────────────┘  │  │
│ employee_documents       │  ┌──────────────────┐           │  │
│ ┌──────────────────────┐ │  │ id (UUID)        │           │  │
│ │ id (UUID)            │ │  │ name              │           │  │
│ │ document_reference   │ │  │ code              │           │  │
│ │ name                 │ │  │ parent_id (FK) ───┼───────────┼──┘
│ │ type (enum)          │ │  └──────────────────┘           │
│ │ storage_path         │ │  job_positions ─────────────────┘
│ │ ocr_text (Lob)       │ │  ┌──────────────────┐
│ │ current_version      │ │  │ id (UUID)        │
│ │ employee_id (FK) ────┼─┼──│ department_id ───┼──┐
│ └──────────────────────┘ │  │ title             │  │
│                          │  └──────────────────┘  │
│ document_versions        │                        │
│ ┌──────────────────────┐ │  doc_types             │
│ │ id (UUID)            │ │  ┌──────────────────┐  │
│ │ version_number       │ │  │ id (UUID)        │  │
│ │ storage_path         │ │  │ name              │  │
│ │ ocr_text (Lob)       │ │  │ code              │  │
│ │ uploaded_by          │ │  │ allowed_roles     │  │
│ │ document_id (FK) ────┼─┘  └──────────────────┘  │
│ └──────────────────────┘                           │
│                                                    │
│ reclamations                                      │
│ ┌──────────────────────┐                           │
│ │ id (UUID)            │                           │
│ │ type (enum)          │                           │
│ │ status (enum)        │                           │
│ │ priority (enum)      │                           │
│ │ message              │                           │
│ │ employee_id (FK) ────┼───────────────────────────┘
│ │ approved_by          │
│ │ rejection_reason     │
│ └──────────────────────┘
```

---

## 10. Services externes

| Service | Rôle | Accès |
|---------|------|-------|
| **Supabase Auth** | Authentification (email/mot de passe, JWT) | `supabase.url` + `supabase.anon-key` |
| **Supabase Admin API** | Gestion utilisateurs (création, suppression) | `supabase.service-role-key` (réservé ADMIN) |
| **MinIO** | Stockage fichiers (S3-compatible) | `localhost:9000` (dev) |
| **Tesseract OCR** | Extraction texte depuis images/PDF | `TESSDATA_PATH` (tessdata français) |
| **Elasticsearch** | Recherche plein texte (MVP/stub) | `localhost:9200` (optionnel) |
| **PostgreSQL** | Base de données principale | `localhost:5432/ged_rh_db` |

---

## 11. Décisions d'architecture clés

| Décision | Justification |
|----------|--------------|
| **Supabase Auth > Spring Security local** | Évite de gérer les mots de passe, MFA, refresh tokens. Délègue à Supabase |
| **MinIO > BDD blobs** | Scalable, performant pour fichiers volumineux, séparation données métier/fichiers |
| **Upload 2 étapes (preview → save)** | L'OCR prend du temps → l'utilisateur voit le résultat avant de valider |
| **Textarea éditable pour OCR** | L'OCR peut faire des erreurs → l'utilisateur corrige avant sauvegarde |
| **JPA Specifications** | Sécurité au niveau ligne sans vue BDD. S'adapte au rôle de l'utilisateur |
| **TwelveMonkeys + PDFBox** | Support des formats image (JPEG, TIFF, BMP) + PDF pour OCR |
| **UUID v7 temps-ordonné** | Performance index B-tree PostgreSQL (vs UUID v4 aléatoire) |
| **Standalone Components Angular** | Plus modulaire, pas de NgModules, arbre de dépendances réduit |
| **DDL auto-update** | Développement rapide. Évolution du schéma sans scripts SQL manuels |
| **WebSocket STOMP** | Notifications temps réel sans polling HTTP |

---

## 12. Dépendances Maven (pom.xml)

| Dépendance | Usage |
|-----------|-------|
| `spring-boot-starter-web` | API REST |
| `spring-boot-starter-data-jpa` | ORM / BDD |
| `spring-boot-starter-security` | Authentification + autorisation |
| `spring-boot-starter-validation` | Validation des DTO (`@Valid`, `@NotNull`) |
| `spring-boot-starter-websocket` | WebSocket STOMP pour notifications |
| `spring-boot-starter-actuator` | Health check, métriques |
| `postgresql` | Driver PostgreSQL |
| `minio` | Client S3 pour stockage fichiers |
| `tess4j` | OCR (wrapper JNA pour Tesseract) |
| `pdfbox` | Conversion PDF → image pour OCR |
| `imageio-core / jpeg / tiff / bmp` | Support formats image pour ImageIO |
| `springdoc-openapi-starter-webmvc-ui` | Swagger UI |
| `nimbus-jose-jwt` | Validation JWT Supabase |
| `dotenv-java` | Variables d'environnement (.env) |
| `uuid-creator` | UUID v7 temps-ordonné |
