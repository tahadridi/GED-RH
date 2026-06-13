package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.DocumentVersion;
import GED.ged_backend.domain.entity.EmployeeDocument;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.service.DocumentService;
import GED.ged_backend.service.AccessControlService;
import GED.ged_backend.domain.entity.SystemUser;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final AccessControlService accessControlService;

    public DocumentController(DocumentService documentService, AccessControlService accessControlService) {
        this.documentService = documentService;
        this.accessControlService = accessControlService;
    }

    /** Step 1: upload file to temp storage, run OCR, return extracted text for review */
    @PostMapping(value = "/ocr-preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OcrPreviewResponse ocrPreview(@RequestPart("file") MultipartFile file) throws Exception {
        DocumentService.OcrPreviewResult result = documentService.ocrPreview(
            file.getInputStream(), file.getContentType(), file.getOriginalFilename());
        return new OcrPreviewResponse(result.tempKey(), result.ocrText(), result.originalFilename());
    }

    /** Step 2: save the document using the temp key + user-reviewed metadata */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMINISTRATOR') or (hasRole('RH') and @accessControlService.canManageDocument(principal, #req.type))")
    public EmployeeDocument createFromPreview(@RequestBody CreateFromPreviewRequest req) {
        SystemUser actor = accessControlService.getCurrentUser();
        return documentService.createFromPreview(req.toCommand(), actor);
    }

    /** Legacy multipart create (kept for compatibility) */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMINISTRATOR') or (hasRole('RH') and @accessControlService.canManageDocument(principal, #req.type))")
    public EmployeeDocument create(
            @RequestPart("data") CreateDocumentRequest req,
            @RequestPart("file") MultipartFile file) throws Exception {
        return documentService.createDocument(new DocumentService.CreateDocumentCommand(
                req.employeeId, req.documentReference, req.name, req.type, req.author, null),
                file.getInputStream(), file.getContentType());
    }

    @GetMapping("/{id}/content")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'DIRECTION_GENERALE') or @accessControlService.canViewDocument(principal, #id)")
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID id) {
        EmployeeDocument doc = documentService.getDocument(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(documentService.getFileContent(id)));
    }

    @PostMapping(value = "/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMINISTRATOR') or @accessControlService.canManageDocument(principal, #id)")
    public DocumentVersion addVersion(
            @PathVariable UUID id,
            @RequestParam("uploadedBy") String uploadedBy,
            @RequestPart("file") MultipartFile file) throws Exception {
        return documentService.addVersion(id, uploadedBy, file.getInputStream(), file.getContentType());
    }

    @GetMapping("/versions/{versionId}/content")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'DIRECTION_GENERALE') or @accessControlService.canViewVersion(principal, #versionId)")
    public ResponseEntity<InputStreamResource> downloadVersion(@PathVariable UUID versionId) {
        DocumentVersion v = documentService.getVersion(versionId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"v" + v.getVersionNumber() + "_" + v.getDocument().getName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(documentService.getVersionContent(versionId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'DIRECTION_GENERALE') or @accessControlService.canViewDocument(principal, #id)")
    public EmployeeDocument get(@PathVariable UUID id) {
        return documentService.getDocument(id);
    }

    @GetMapping("/search")
    @Transactional(readOnly = true)
    public List<EmployeeDocument> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) DocumentType type,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String department) {
        SystemUser actor = accessControlService.getCurrentUser();
        DocumentService.SearchCriteria criteria = new DocumentService.SearchCriteria(q, type, employeeId, department, null, null);
        // Security is handled at the database level via Specification
        return documentService.searchDocuments(criteria, actor);
    }

    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'RH', 'DIRECTION_GENERALE') or @accessControlService.canViewEmployee(principal, #employeeId)")
    @Transactional(readOnly = true)
    public List<EmployeeDocument> listByEmployee(@PathVariable UUID employeeId) {
        SystemUser actor = accessControlService.getCurrentUser();
        // Still use searchDocuments to ensure security specifications are applied even for employee-specific listing
        return documentService.searchDocuments(new DocumentService.SearchCriteria(null, null, employeeId, null, null, null), actor);
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('ADMINISTRATOR', 'RH', 'DIRECTION_GENERALE')")
    @Transactional(readOnly = true)
    public List<EmployeeDocument> listByType(@PathVariable String type) {
        SystemUser actor = accessControlService.getCurrentUser();
        return documentService.searchDocuments(new DocumentService.SearchCriteria(null, DocumentType.valueOf(type), null, null, null, null), actor);
    }

    private EmployeeDocument dummyDocWithType(DocumentType type) {
        EmployeeDocument doc = new EmployeeDocument();
        doc.setType(type);
        return doc;
    }

    @GetMapping("/{id}/versions")
    public List<DocumentVersion> versions(@PathVariable UUID id) {
        return documentService.listVersions(id);
    }

    @GetMapping("/versions/{versionId}")
    public DocumentVersion getVersionById(@PathVariable UUID versionId) {
        return documentService.getVersion(versionId);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR') or @accessControlService.canManageDocument(principal, #id)")
    public EmployeeDocument update(@PathVariable UUID id, @RequestBody UpdateDocumentRequest req) {
        return documentService.updateDocument(id, new DocumentService.UpdateDocumentCommand(req.name, req.author, req.storagePath));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public void delete(@PathVariable UUID id) {
        documentService.deleteDocument(id);
    }

    public static class CreateDocumentRequest {
        @NotNull public UUID employeeId;
        @NotBlank public String documentReference;
        @NotBlank public String name;
        @NotNull public DocumentType type;
        public String author;
        @NotBlank public String storagePath;
    }

    public static class AddVersionRequest {
        @NotBlank public String storagePath;
        public String uploadedBy;
        public String ocrText;
    }

    public static class UpdateDocumentRequest {
        public String name;
        public String author;
        public String storagePath;
    }

    public record OcrPreviewResponse(String tempKey, String ocrText, String originalFilename) {}

    public static class CreateFromPreviewRequest {
        @NotNull public UUID employeeId;
        @NotBlank public String documentReference;
        @NotBlank public String name;
        @NotNull public DocumentType type;
        public String author;
        @NotBlank public String tempKey;
        public String ocrText; // user-reviewed/corrected text

        public DocumentService.CreateFromPreviewCommand toCommand() {
            return new DocumentService.CreateFromPreviewCommand(
                employeeId, documentReference, name, type, author, tempKey, ocrText);
        }
    }
}
