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
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        DocumentService.OcrPreviewResult result = documentService.ocrPreview(
            file.getInputStream(), file.getContentType(), file.getOriginalFilename());
        return new OcrPreviewResponse(result.tempKey(), result.ocrText(), result.originalFilename());
    }

    /** Step 2: save the document using the temp key + user-reviewed metadata */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public EmployeeDocument createFromPreview(@RequestBody CreateFromPreviewRequest req) {
        SystemUser actor = accessControlService.getCurrentUser();
        if (!accessControlService.canManageDocument(actor, dummyDocWithType(req.type))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
        return documentService.createFromPreview(req.toCommand(), actor);
    }

    /** Legacy multipart create (kept for compatibility) */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EmployeeDocument create(
            @RequestPart("data") CreateDocumentRequest req,
            @RequestPart("file") MultipartFile file) throws Exception {
        SystemUser actor = accessControlService.getCurrentUser();
        // Permission check: Admin or RH with correct responsibility
        // Note: For creation, we check if they can manage this TYPE of document.
        // We can check after creating a dummy object or just check the type.
        if (!accessControlService.canManageDocument(actor, dummyDocWithType(req.type))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
        
        return documentService.createDocument(new DocumentService.CreateDocumentCommand(
                req.employeeId, req.documentReference, req.name, req.type, req.author, null),
                file.getInputStream(), file.getContentType());
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID id) {
        SystemUser actor = accessControlService.getCurrentUser();
        EmployeeDocument doc = documentService.getDocument(id);
        if (!accessControlService.canViewDocument(actor, doc)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(documentService.getFileContent(id)));
    }

    @PostMapping(value = "/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentVersion addVersion(
            @PathVariable UUID id,
            @RequestParam("uploadedBy") String uploadedBy,
            @RequestPart("file") MultipartFile file) throws Exception {
        SystemUser actor = accessControlService.getCurrentUser();
        EmployeeDocument doc = documentService.getDocument(id);
        if (!accessControlService.canManageDocument(actor, doc)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
        
        return documentService.addVersion(id, uploadedBy, file.getInputStream(), file.getContentType());
    }

    @GetMapping("/versions/{versionId}/content")
    public ResponseEntity<InputStreamResource> downloadVersion(@PathVariable UUID versionId) {
        SystemUser actor = accessControlService.getCurrentUser();
        DocumentVersion v = documentService.getVersion(versionId);
        if (!accessControlService.canViewDocument(actor, v.getDocument())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"v" + v.getVersionNumber() + "_" + v.getDocument().getName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(documentService.getVersionContent(versionId)));
    }

    @GetMapping("/{id}")
    public EmployeeDocument get(@PathVariable UUID id) {
        SystemUser actor = accessControlService.getCurrentUser();
        EmployeeDocument doc = documentService.getDocument(id);
        if (!accessControlService.canViewDocument(actor, doc)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
        return doc;
    }

    @GetMapping("/employee/{employeeId}")
    public List<EmployeeDocument> listByEmployee(@PathVariable UUID employeeId) {
        // Filter list based on permissions
        SystemUser actor = accessControlService.getCurrentUser();
        return documentService.listByEmployee(employeeId).stream()
                .filter(doc -> accessControlService.canViewDocument(actor, doc))
                .toList();
    }

    @GetMapping("/search")
    public List<EmployeeDocument> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) DocumentType type,
            @RequestParam(required = false) UUID employeeId,
            @RequestParam(required = false) String department) {
        SystemUser actor = accessControlService.getCurrentUser();
        DocumentService.SearchCriteria criteria = new DocumentService.SearchCriteria(q, type, employeeId, department, null, null);
        return documentService.searchDocuments(criteria).stream()
                .filter(doc -> accessControlService.canViewDocument(actor, doc))
                .toList();
    }

    @GetMapping("/type/{type}")
    public List<EmployeeDocument> listByType(@PathVariable String type) {
        SystemUser actor = accessControlService.getCurrentUser();
        return documentService.listByType(DocumentType.valueOf(type)).stream()
                .filter(doc -> accessControlService.canViewDocument(actor, doc))
                .toList();
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
    public EmployeeDocument update(@PathVariable UUID id, @RequestBody UpdateDocumentRequest req) {
        return documentService.updateDocument(id, new DocumentService.UpdateDocumentCommand(req.name, req.author, req.storagePath));
    }

    @DeleteMapping("/{id}")
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
