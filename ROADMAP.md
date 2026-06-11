# Projet GED RH - Roadmap Complète

## 📋 Vue d'ensemble du projet

Application de Gestion Électronique des Documents (GED) pour les Ressources Humaines avec contrôle d'accès hiérarchique par rôle.

**Durée estimée:** 12-16 semaines (équipe de 2-3 développeurs)

---

## 🔶 PHASE 1: Préparation & Infrastructure (Semaines 1-2)


---

## 🔵 PHASE 2: Backend Spring Boot (Semaines 3-7)

### 2.1 Configuration initiale Spring Boot
- [ ] Créer projet Spring Boot avec Maven/Gradle
- [ ] Configurer les dépendances principales:
  - spring-boot-starter-web
  - spring-boot-starter-data-jpa  
  - spring-boot-starter-security
  - firebase-admin-sdk
  - MinIO Java client
  - Tesseract OCR
  - Elasticsearch (RestHighLevelClient ou autre)

### 2.2 Authentification Firebase
- [ ] Intégrer Firebase Admin SDK
- [ ] Créer filtre JWT pour valider les tokens Firebase
- [ ] Endpoint de vérification du token
- [ ] Configuration CORS pour frontend
- [ ] Tests des endpoints d'authentification

### 2.3 Modèle de données et entités JPA
- [ ] **Utilisateurs** (User)
  - Email, nom, prénom, statut
  - Rôles (admin, manager, RH, direction)
  - Supérieur hiérarchique (manager)
  
- [ ] **Employés** (Employee)
  - Matricule, informations personnelles
  - Manager responsable
  - Département, poste
  
- [ ] **Dossiers employés** (EmployeeFile)
  - Référence à l'employé
  - Date de création
  
- [ ] **Documents** (Document)
  - Nom, type, version
  - Dates (création, modification)
  - Auteur, employé concerné
  - Chemin de stockage
  
- [ ] **RH Responsabilités** (RHResponsibility)
  - Type de document autorisé
  - Utilisateur RH associé

- [ ] **Relations** entre toutes les entités
- [ ] Migrations Flyway/Liquibase

### 2.4 Rôles et permissions (RBAC + Hiérarchie)
- [ ] Énumération des rôles
- [ ] Table des permissions par rôle
- [ ] Annotation @PreAuthorize pour les endpoints
- [ ] Service de vérification des permissions
  - Vérifier manager/employés affectés
  - Vérifier responsabilités RH
  - Vérifier accès direction générale
- [ ] Contrôleur pour gestion des utilisateurs (Admin only)
  - POST /api/admin/users (créer)
  - PUT /api/admin/users/{id} (modifier)
  - DELETE /api/admin/users/{id} (désactiver)
  - POST /api/admin/users/{id}/reset-password
  - POST /api/admin/users/{id}/assign-manager
  - POST /api/admin/users/{id}/assign-rh-responsibility

### 2.5 Gestion des documents
- [ ] Service MinIO
  - Upload de fichiers
  - Récupération de fichiers
  - Suppression de fichiers
  - Gestion des versions de fichiers
  
- [ ] Contrôleur document
  - POST /api/documents (upload simple)
  - GET /api/documents/{id}
  - GET /api/documents/employee/{employeeId}
  - PUT /api/documents/{id}
  - DELETE /api/documents/{id}
  - GET /api/documents/{id}/versions
  
- [ ] Service OCR Tesseract
  - Traiter les documents uploadés
  - Extraire texte et métadonnées
  - Sauvegarder données OCR

### 2.6 Recherche et indexation
- [ ] Service Elasticsearch (ou simple recherche PostgreSQL pour MVP)
  - Indexer les documents
  - Indexer le texte OCR
  - Recherche par critères multiples
  
- [ ] Endpoint de recherche
  - GET /api/search?q=...&type=...&employee=...&department=...&dateRange=...
  - Résultats paginés
  - Application des permissions


---

## 🟢 PHASE 3: Frontend React.js (Semaines 5-9)

### 3.1 Configuration initiale React
- [ ] Créer avec Create React App ou Vite
- [ ] Configurer linter (ESLint) et formatter (Prettier)
- [ ] Setup Tailwind CSS ou Material-UI
- [ ] Structure des dossiers:
  - /components
  - /pages
  - /services
  - /hooks
  - /context
  - /utils

### 3.2 Authentification Firebase
- [ ] Intégrer supabase authent
- [ ] Page de connexion (email/mot de passe)
- [ ] Page de réinitialisation du mot de passe
- [ ] Service de gestion du token
- [ ] Context pour état d'authentification
- [ ] Route protégée (PrivateRoute)

### 3.3 Layout principal et navigation
- [ ] Barre de navigation adaptée au rôle
- [ ] Sidebar avec menu contextuel
- [ ] Barre latérale avec informations utilisateur
- [ ] Sélecteur de thème (optionnel)

### 3.4 Dashboard selon les rôles

#### Pour Administrator
- [ ] Widgets statistiques (nb utilisateurs, docs, etc.)
- [ ] Accès rapide à gestion utilisateurs
- [ ] Accès rapide à logs d'audit

#### Pour Direction Générale
- [ ] Vue globale de tous les dossiers
- [ ] Statistiques RH

#### Pour Manager
- [ ] Liste des employés affectés
- [ ] Derniers documents

#### Pour RH
- [ ] Documents de sa responsabilité
- [ ] Filtres par type

### 3.5 Gestion des utilisateurs (Admin)
- [ ] Page de liste des utilisateurs
- [ ] Form de création utilisateur
  - Email, nom, prénom, département, poste
  - Sélection du rôle
  - Sélection du manager (si applicable)
  - Sélection des responsabilités RH (si RH)
  
- [ ] Page de modification utilisateur
- [ ] Bouton désactivation utilisateur
- [ ] Bouton réinitialisation mot de passe
- [ ] Pagination et recherche

### 3.6 Gestion des employés
- [ ] Page de liste des employés (avec filtres)
- [ ] Création d'employé
- [ ] Modification d'employé
- [ ] Suppression d'employé

### 3.7 Gestion des dossiers employés
- [ ] Vue détaillée du dossier
- [ ] Affichage des sections:
  - Infos personnelles
  - Contrats
  - Paie
  - Congés
  - Évaluations
  - Formations
  - Documents administratifs
  - Autres

### 3.8 Upload et gestion de documents
- [ ] Form d'upload (PDF, JPG, PNG)
- [ ] Drag & drop support
- [ ] Barre de progression
- [ ] Affichage des documents par catégorie
- [ ] Aperçu/téléchargement de document
- [ ] Historique des versions

### 3.9 Scan de documents
- [ ] Interface pour accès caméra
  - Webcam (pour desktop)
  - Caméra mobile (pour mobile)
- [ ] Capture et traitement
- [ ] Cropage/ajustement de l'image
- [ ] OCR en temps réel (optionnel)

### 3.10 Recherche
- [ ] Barre de recherche globale
- [ ] Page de recherche avancée
- [ ] Filtres:
  - Nom/Prénom employé
  - Matricule
  - Type de document
  - Département
  - Date range
  - Texte
- [ ] Résultats paginés
- [ ] Affichage du texte OCR dans résultats

### 3.11 Tests frontend
- [ ] Tests unitaires (Jest + React Testing Library)
- [ ] Tests d'intégration
- [ ] Tests E2E (Cypress ou Playwright)
- [ ] Coverage cible: >75%

---

## 🟡 PHASE 4: Intégration & Affinage (Semaines 10-12)

### 4.1 Intégration complète frontend-backend
- [ ] Vérifier tous les appels API
- [ ] Gestion des erreurs côté frontend
- [ ] Messages d'erreur/succès
- [ ] Refetch de données

### 4.2 Permissions en temps réel
- [ ] Masquer les boutons non autorisés
- [ ] Redirection appropriée si accès refusé
- [ ] Messages d'autorisation

### 4.3 Performance et optimisations
- [ ] Pagination des listes
- [ ] Lazy loading des images
- [ ] Caching côté frontend (React Query ou SWR)
- [ ] Compression des fichiers
- [ ] Optimization des requêtes DB
- [ ] Indexes PostgreSQL

### 4.4 Versioning complet
- [ ] Tester le versioning des documents
- [ ] Historique des versions avec diffs
- [ ] Restauration d'une version antérieure

### 4.5 Audit logging complet
- [ ] Logger toutes les actions utilisateur
- [ ] Consultation des logs (Admin)
- [ ] Exportation des logs

### 4.6 Valeur ajoutée (Nice-to-have)
- [ ] Elasticsearch pour recherche rapide
- [ ] Notifications (ajout de document par RH)
- [ ] Export PDF du dossier employé
- [ ] Archivage des dossiers inactifs

---

## 🔴 PHASE 5: Tests Complets & QA (Semaines 13-14)

### 5.1 Tests fonctionnels par rôle
- [ ] Scénarios Admin
- [ ] Scénarios Manager
- [ ] Scénarios RH
- [ ] Scénarios Direction
- [ ] Scénarios Employé (lecture seule)

### 5.2 Tests de sécurité
- [ ] Vérification des authentifications
- [ ] Tentatives d'accès non autorisé
- [ ] Injection SQL
- [ ] XSS
- [ ] CSRF
- [ ] Validation des tokens

### 5.3 Tests de charge
- [ ] Simuler 100+ utilisateurs
- [ ] Upload de fichiers volumineux
- [ ] Recherche avec gros volumes de données

### 5.4 Tests compatibilité navigateurs
- [ ] Chrome, Firefox, Safari, Edge
- [ ] Responsive design mobile/tablet

### 5.5 Rapport de bugs et corrections
- [ ] Tracer les bugs découverts
- [ ] Corriger les critiques
- [ ] Régresser les correctives

---

## 📦 PHASE 6: Documentation & Déploiement (Semaines 15-16)

### 6.1 Documentation technique
- [ ] API REST documentée (Swagger/OpenAPI)
- [ ] Architecture système détaillée
- [ ] Schéma de base de données
- [ ] Diagrammes UML (use case, class, sequence)
- [ ] Guides d'intégration

### 6.2 Documentation fonctionnelle
- [ ] Manuel utilisateur par rôle
- [ ] Tutoriels vidéo (optionnel)
- [ ] FAQ
- [ ] Guide de dépannage

### 6.3 Documentation d'administration
- [ ] Guide de gestion des utilisateurs
- [ ] Guide d'administration du système
- [ ] Procédures de sauvegarde/restauration
- [ ] Monitoring et alertes

### 6.4 Déploiement
- [ ] Configuration serveur (staging)
- [ ] Configuration base de données production
- [ ] Migration des données de test
- [ ] Mise en place du monitoring/logging
- [ ] Alertes et notifications
- [ ] Déploiement production
- [ ] Vérification post-déploiement

### 6.5 Formation utilisateurs
- [ ] Sessions de formation pour Admin
- [ ] Sessions pour Managers
- [ ] Sessions pour RH
- [ ] Support utilisateur

---

## 📊 Gantt Simplifié

```
Semaine:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
Phase 1   [====]
Phase 2        [=================]
Phase 3           [=====================]
Phase 4                      [==========]
Phase 5                              [====]
Phase 6                                 [======]
```

---

## 🎯 Priorités par MVP (Minimum Viable Product)

### MVP v1.0 (Semaines 1-8)
**Livraison:** Fonctionnalités de base
- ✅ Authentification Firebase
- ✅ Gestion utilisateurs (création, modification, désactivation)
- ✅ Gestion des employés
- ✅ Upload de documents (PDF, JPG, PNG)
- ✅ Accès contrôlé par rôle (Admin, Manager, RH simple)
- ✅ OCR Tesseract
- ✅ Recherche basique (PostgreSQL)
- ✅ Versioning des documents
- ✅ Audit logging

**Rôles inclus:** Admin, Manager, RH, Direction (read-only)

---

### MVP v1.1 (Semaines 9-12)
**Améliorations:**
- ✅ Interface scan (webcam)
- ✅ Permissions RH spécialisées
- ✅ Recherche avancée
- ✅ Performance optimisée
- ✅ UI/UX améliorée

---

### v2.0+ (Post-MVP)
**Évolutions futures:**
- Elasticsearch pour recherche full-text
- Reconnaissance faciale (optionnel)
- Workflows d'approbation
- Intégration LDAP/Active Directory
- Signatures numériques
- Archive à long terme

---

## 🛠️ Stack Détaillé par Couche

### Backend
```
Spring Boot 3.x
├── spring-boot-starter-web
├── spring-boot-starter-data-jpa
├── spring-boot-starter-security
├── spring-boot-starter-validation
├── postgresql (driver)
├── firebase-admin
├── minio
├── net.sourceforge.tess4j (Tesseract)
├── elasticsearch-java
├── lombok (optionnel mais recommandé)
└── springdoc-openapi (Swagger)
```

### Frontend
```
React 18+
├── react-router-dom
├── axios ou fetch
├── firebase
├── tailwindcss ou Material-UI
├── react-query ou SWR (caching)
├── formik ou react-hook-form
├── jest + react-testing-library
└── cypress (E2E)
```

### Infrastructure
```
Docker
├── PostgreSQL 14+
├── MinIO
├── Elasticsearch 8+ (optionnel MVP)
└── Redis (optionnel cache)
```

---

## 📋 Checklist de Prérequis

Avant de démarrer:
- [ ] Environnement Java 17+
- [ ] Node.js 18+
- [ ] Docker & Docker Compose
- [ ] IDE (IntelliJ IDEA ou VS Code)
- [ ] Git configuré
- [ ] Compte Firebase créé
- [ ] PostgreSQL client installé
- [ ] MinIO client (mc) installé

---

## 🚀 Commandes de Démarrage Rapide (Future)

```bash
# Backend
cd backend
./mvnw spring-boot:run

# Frontend
cd frontend
npm install
npm start

# Infrastructure
docker-compose up -d
```

---

## 📞 Points de Contact & Escalade

À définir selon la structure d'équipe:
- Product Owner
- Scrum Master / Project Manager
- Lead Backend
- Lead Frontend
- DevOps/Infrastructure

---

**Dernière mise à jour:** 3 Juin 2026
**État:** 🟡 En attente de démarrage
