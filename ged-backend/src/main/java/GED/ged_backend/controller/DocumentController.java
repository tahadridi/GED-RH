package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.DocumentVersion;
import GED.ged_backend.domain.entity.EmployeeDocument;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.service.DocumentService;
import GED.ged_backend.service.AccessControlService;
import GED.ged_backend.service.StorageService;
import GED.ged_backend.domain.entity.SystemUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/documents")
@Tag(name = "Documents", description = "Gestion des documents — upload, OCR, versions, telechargement")
public class DocumentController {

    private final DocumentService documentService;
    private final AccessControlService accessControlService;
    private final StorageService storageService;

    public DocumentController(DocumentService documentService, AccessControlService accessControlService, StorageService storageService) {
        this.documentService = documentService;
        this.accessControlService = accessControlService;
        this.storageService = storageService;
    }

    @PostMapping(value = "/ocr-preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Preview OCR", description = "Etape 1 : upload temporaire + extraction OCR. Retourne le texte extrait pour verification avant enregistrement.")
    public OcrPreviewResponse ocrPreview(@RequestPart("file") MultipartFile file) throws Exception {
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!actor.getRoles().contains(SystemRole.ADMINISTRATOR) && !actor.getRoles().contains(SystemRole.RH)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        DocumentService.OcrPreviewResult result = documentService.ocrPreview(
                file.getInputStream(), file.getContentType(), file.getOriginalFilename());
        return new OcrPreviewResponse(result.tempKey(), result.ocrText(), result.originalFilename());
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Creer un document (post-OCR)", description = "Etape 2 : enregistre le document avec le texte OCR verifie par l'utilisateur.")
    public EmployeeDocument createFromPreview(@RequestBody CreateFromPreviewRequest req) {
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!accessControlService.canManageDocument(actor, req.type)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return documentService.createFromPreview(req.toCommand(), actor);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload direct (legacy)", description = "Upload + enregistrement en une etape (sans preview OCR).")
    public EmployeeDocument create(
            @RequestPart("data") CreateDocumentRequest req,
            @RequestPart("file") MultipartFile file) throws Exception {
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!accessControlService.canManageDocument(actor, req.type)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return documentService.createDocument(
                new DocumentService.CreateDocumentCommand(
                        req.employeeId, req.documentReference, req.name, req.type, req.author, null),
                file.getInputStream(), file.getContentType(), file.getOriginalFilename());
    }

    @GetMapping("/{id}/content")
    @Operation(summary = "Telecharger un document")
    public ResponseEntity<InputStreamResource> download(@Parameter(description = "ID du document") @PathVariable UUID id) {
        EmployeeDocument doc = documentService.getDocument(id);
        String ext = detectExtension(doc.getStoragePath());
        MediaType mediaType = resolveMediaType(doc.getStoragePath());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getName() + ext + "\"")
                .contentType(mediaType)
                .body(new InputStreamResource(documentService.getFileContent(id)));
    }

    @PostMapping(value = "/{id}/versions/ocr-preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Preview OCR version", description = "Etape 1 : upload temporaire + extraction OCR pour une nouvelle version d'un document existant.")
    public OcrPreviewResponse ocrPreviewVersion(
            @Parameter(description = "ID du document") @PathVariable UUID id,
            @RequestPart("file") MultipartFile file) throws Exception {
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!accessControlService.canManageDocument(actor, id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        DocumentService.OcrPreviewResult result = documentService.ocrPreview(
                file.getInputStream(), file.getContentType(), file.getOriginalFilename());
        return new OcrPreviewResponse(result.tempKey(), result.ocrText(), result.originalFilename());
    }

    @PostMapping("/{id}/versions")
    @Operation(summary = "Ajouter une version (post-OCR)")
    public DocumentVersion addVersion(
            @Parameter(description = "ID du document") @PathVariable UUID id,
            @RequestBody AddVersionRequest req) {
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!accessControlService.canManageDocument(actor, id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return documentService.addVersion(id, req.uploadedBy, req.tempKey, req.ocrText);
    }

    @GetMapping("/versions/{versionId}/content")
    @Operation(summary = "Telecharger une version")
    public ResponseEntity<InputStreamResource> downloadVersion(@Parameter(description = "ID de la version") @PathVariable UUID versionId) {
        DocumentVersion v = documentService.getVersion(versionId);
        String ext = detectExtension(v.getStoragePath());
        MediaType mediaType = resolveMediaType(v.getStoragePath());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"v" + v.getVersionNumber() + ext + "\"")
                .contentType(mediaType)
                .body(new InputStreamResource(documentService.getVersionContent(versionId)));
    }

    private String detectExtension(String storagePath) {
        String path = storagePath != null ? storagePath.toLowerCase() : "";
        if (path.contains(".pdf")) return ".pdf";
        if (path.contains(".png")) return ".png";
        if (path.contains(".jpg") || path.contains(".jpeg")) return ".jpg";
        return "";
    }

    private MediaType resolveMediaType(String storagePath) {
        // First try to determine from the storage path extension
        String path = storagePath != null ? storagePath.toLowerCase() : "";
        if (path.contains(".pdf")) return MediaType.APPLICATION_PDF;
        if (path.contains(".png")) return MediaType.IMAGE_PNG;
        if (path.contains(".jpg") || path.contains(".jpeg")) return MediaType.IMAGE_JPEG;

        // Fallback: read the content type stored in MinIO (set during upload)
        String storedType = storageService.getContentType(storagePath);
        if (storedType != null && !storedType.isBlank() && !"application/octet-stream".equals(storedType)) {
            return MediaType.parseMediaType(storedType);
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un document par ID")
    public EmployeeDocument get(@Parameter(description = "ID du document") @PathVariable UUID id) {
        return documentService.getDocument(id);
    }

    @GetMapping("/search")
    @Transactional(readOnly = true)
    @Operation(summary = "Rechercher des documents", description = "Recherche multi-criteres : texte, type, employe, departement.")
    public List<EmployeeDocument> search(
            @Parameter(description = "Recherche textuelle (nom du document, reference)") @RequestParam(required = false) String q,
            @Parameter(description = "Filtrer par type de document") @RequestParam(required = false) DocumentType type,
            @Parameter(description = "Filtrer par employe") @RequestParam(required = false) UUID employeeId,
            @Parameter(description = "Filtrer par departement") @RequestParam(required = false) String department) {
        SystemUser actor = accessControlService.getCurrentUser();
        DocumentService.SearchCriteria criteria = new DocumentService.SearchCriteria(q, type, employeeId, department, null, null);
        return documentService.searchDocuments(criteria, actor);
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    @Operation(summary = "Statistiques des documents", description = "Total, taille stockee, documents du mois et repartition par type, restreints à ce que l'utilisateur peut voir.")
    public ResponseEntity<Map<String, Object>> stats() {
        SystemUser actor = accessControlService.getCurrentUser();
        return ResponseEntity.ok(documentService.getStatsForActor(actor));
    }

    @GetMapping("/employee/{employeeId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Lister les documents d'un employe")
    public List<EmployeeDocument> listByEmployee(@Parameter(description = "ID de l'employe") @PathVariable UUID employeeId) {
        SystemUser actor = accessControlService.getCurrentUser();
        return documentService.searchDocuments(
                new DocumentService.SearchCriteria(null, null, employeeId, null, null, null), actor);
    }

    @GetMapping("/type/{type}")
    @Transactional(readOnly = true)
    @Operation(summary = "Lister les documents par type")
    public List<EmployeeDocument> listByType(@Parameter(description = "Type de document") @PathVariable String type) {
        SystemUser actor = accessControlService.getCurrentUser();
        return documentService.searchDocuments(
                new DocumentService.SearchCriteria(null, DocumentType.valueOf(type), null, null, null, null), actor);
    }

    @GetMapping("/{id}/versions")
    @Transactional(readOnly = true)
    @Operation(summary = "Lister les versions d'un document")
    public List<DocumentVersion> versions(@Parameter(description = "ID du document") @PathVariable UUID id) {
        return documentService.listVersions(id);
    }

    @GetMapping("/versions/{versionId}")
    @Operation(summary = "Obtenir une version par ID")
    public DocumentVersion getVersionById(@Parameter(description = "ID de la version") @PathVariable UUID versionId) {
        return documentService.getVersion(versionId);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier les metadonnees d'un document")
    public EmployeeDocument update(@Parameter(description = "ID du document") @PathVariable UUID id, @RequestBody UpdateDocumentRequest req) {
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!accessControlService.canManageDocument(actor, id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return documentService.updateDocument(id,
                new DocumentService.UpdateDocumentCommand(req.name, req.author, req.storagePath));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un document et ses versions")
    public void delete(@Parameter(description = "ID du document") @PathVariable UUID id) {
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!accessControlService.canManageDocument(actor, id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        documentService.deleteDocument(id);
    }

    @DeleteMapping("/versions/{versionId}")
    @Operation(summary = "Supprimer une version specifique")
    public void deleteVersion(@Parameter(description = "ID de la version") @PathVariable UUID versionId) {
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        DocumentVersion v = documentService.getVersion(versionId);
        if (!accessControlService.canManageDocument(actor, v.getDocument().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        documentService.deleteVersion(versionId);
    }

    // ---- Request/Response classes ----

    @Schema(description = "Requete de creation de document (upload direct)")
    public static class CreateDocumentRequest {
        @NotNull @Schema(description = "ID de l'employe") public UUID employeeId;
        @NotBlank @Schema(description = "Reference du document", example = "DOC-2024-001") public String documentReference;
        @NotBlank @Schema(description = "Nom du document", example = "Contrat de travail") public String name;
        @NotNull @Schema(description = "Type de document") public DocumentType type;
        @Schema(description = "Auteur") public String author;
        public String storagePath;
    }

    @Schema(description = "Requete de mise a jour d'un document")
    public static class UpdateDocumentRequest {
        @Schema(description = "Nouveau nom") public String name;
        @Schema(description = "Nouvel auteur") public String author;
        public String storagePath;
    }

    @Schema(description = "Resultat de la preview OCR")
    public record OcrPreviewResponse(
            @Schema(description = "Cle temporaire dans le stockage") String tempKey,
            @Schema(description = "Texte extrait par OCR") String ocrText,
            @Schema(description = "Nom original du fichier") String originalFilename) {}

    @Schema(description = "Requete de creation de document apres validation OCR")
    public static class CreateFromPreviewRequest {
        @NotNull @Schema(description = "ID de l'employe") public UUID employeeId;
        @NotBlank @Schema(description = "Reference du document", example = "DOC-2024-001") public String documentReference;
        @NotBlank @Schema(description = "Nom du document", example = "Contrat de travail") public String name;
        @NotNull @Schema(description = "Type de document") public DocumentType type;
        @Schema(description = "Auteur") public String author;
        @NotBlank @Schema(description = "Cle temporaire retournee par /ocr-preview") public String tempKey;
        @Schema(description = "Texte OCR corrige par l'utilisateur") public String ocrText;

        public DocumentService.CreateFromPreviewCommand toCommand() {
            return new DocumentService.CreateFromPreviewCommand(
                    employeeId, documentReference, name, type, author, tempKey, ocrText);
        }
    }

    @Schema(description = "Requete d'ajout de version apres validation OCR")
    public static class AddVersionRequest {
        @NotBlank @Schema(description = "Nom de la personne qui uploade") public String uploadedBy;
        @NotBlank @Schema(description = "Cle temporaire retournee par /{id}/versions/ocr-preview") public String tempKey;
        @Schema(description = "Texte OCR corrige par l'utilisateur") public String ocrText;
    }
}
