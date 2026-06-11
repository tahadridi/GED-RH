# Suivi du Développement - GED RH
## 📋 État Actuel (8 Juin 2026)

### 1. Backend (Spring Boot)
- **Architecture d'Orchestration** : Flux de traitement des documents implémenté selon l'architecture cible :
    1. **Stockage** : Fichier original sauvegardé dans MinIO (`StorageService`).
    2. **OCR** : Extraction de texte via Tesseract (`OCRService`).
    3. **Métadonnées** : Extraction et persistance dans postgresql (`EmployeeDocument`, `DocumentVersion`).
    4. **Indexation** : Préparation de l'indexation dans Elasticsearch (`ElasticsearchService`).
- **Authentification** : **Exclusivement via Supabase**. Suppression complète de toute dépendance ou configuration liée à Firebase.
- **Sécurité & Hiérarchie** : 
    - Contrôle d'accès strict intégré aux contrôleurs.
    - Isolation des données par rôle (Manager, RH, Direction).
- **Recherche** : Couche de recherche (Search Layer) amorcée avec support Elasticsearch (mocké pour le MVP) et filtrage JPA.

### 2. Frontend (Angular)
- Non encore initialisé.

---

## 🚀 Prochaines Étapes Immédiates

### Phase A : Finalisation Technique
1. **Elasticsearch réel** : Remplacer le mock par une intégration réelle si nécessaire, ou affiner la recherche PostgreSQL.


### Phase B : Frontend
1. **Angular Setup** : Initialisation avec intégration directe de l'Auth Supabase.
2. **Dashboard** : Interface de recherche et d'upload respectant le flux d'orchestration.

---

## 🛠️ Actions réalisées
- [x] **Suppression complète de Firebase** (Code, Config, Dépendances).
- [x] **Mise en conformité architecturale** du flux d'upload (Orchestrateur).
- [x] **Création de l'ElasticsearchService** pour la couche de recherche.
- [x] **Refonte du DocumentService** pour suivre les 4 étapes (MinIO -> OCR -> DB -> Index).

