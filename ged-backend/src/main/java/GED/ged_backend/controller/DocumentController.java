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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final AccessControlService accessControlService;

    public DocumentController(DocumentService documentService, AccessControlService accessControlService) {
        this.documentService = documentService;
        this.accessControlService = accessControlService;
    }

    /** Step 1: upload to temp storage + OCR */
    @PostMapping(value = "/ocr-preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OcrPreviewResponse ocrPreview(@RequestPart("file") MultipartFile file) throws Exception {
        DocumentService.OcrPreviewResult result = documentService.ocrPreview(
                file.getInputStream(), file.getContentType(), file.getOriginalFilename());
        return new OcrPreviewResponse(result.tempKey(), result.ocrText(), result.originalFilename());
    }

    /** Step 2: save with reviewed metadata */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public EmployeeDocument createFromPreview(@RequestBody CreateFromPreviewRequest req) {
        SystemUser actor = accessControlService.getCurrentUser();
        return documentService.createFromPreview(req.toCommand(), actor);
    }

    /** Legacy multipart upload */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EmployeeDocument create(
            @RequestPart("data") CreateDocumentRequest req,
            @RequestPart("file") MultipartFile file) throws Exception {
        return documentService.createDocument(
                new DocumentService.CreateDocumentCommand(
                        req.employeeId, req.documentReference, req.name, req.type, req.author, null),
                file.getInputStream(), file.getContentType());
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<InputStreamResource> download(@PathVariable UUID id) {
        EmployeeDocument doc = documentService.getDocument(id);
        String path = doc.getStoragePath() != null ? doc.getStoragePath().toLowerCase() : "";
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (path.contains(".pdf")) mediaType = MediaType.APPLICATION_PDF;
        else if (path.contains(".png")) mediaType = MediaType.IMAGE_PNG;
        else if (path.contains(".jpg") || path.contains(".jpeg")) mediaType = MediaType.IMAGE_JPEG;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getName() + "\"")
                .contentType(mediaType)
                .body(new InputStreamResource(documentService.getFileContent(id)));
    }

    @PostMapping(value = "/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentVersion addVersion(
            @PathVariable UUID id,
            @RequestParam("uploadedBy") String uploadedBy,
            @RequestPart("file") MultipartFile file) throws Exception {
        return documentService.addVersion(id, uploadedBy, file.getInputStream(), file.getContentType());
    }

    @GetMapping("/versions/{versionId}/content")
    public ResponseEntity<InputStreamResource> downloadVersion(@PathVariable UUID versionId) {
        DocumentVersion v = documentService.getVersion(versionId);
        String path = v.getStoragePath() != null ? v.getStoragePath().toLowerCase() : "";
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (path.contains(".pdf")) mediaType = MediaType.APPLICATION_PDF;
        else if (path.contains(".png")) mediaType = MediaType.IMAGE_PNG;
        else if (path.contains(".jpg") || path.contains(".jpeg")) mediaType = MediaType.IMAGE_JPEG;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"v" + v.getVersionNumber() + "\"")
                .contentType(mediaType)
                .body(new InputStreamResource(documentService.getVersionContent(versionId)));
    }

    @GetMapping("/{id}")
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
        return documentService.searchDocuments(criteria, actor);
    }

    @GetMapping("/employee/{employeeId}")
    @Transactional(readOnly = true)
    public List<EmployeeDocument> listByEmployee(@PathVariable UUID employeeId) {
        SystemUser actor = accessControlService.getCurrentUser();
        return documentService.searchDocuments(
                new DocumentService.SearchCriteria(null, null, employeeId, null, null, null), actor);
    }

    @GetMapping("/type/{type}")
    @Transactional(readOnly = true)
    public List<EmployeeDocument> listByType(@PathVariable String type) {
        SystemUser actor = accessControlService.getCurrentUser();
        return documentService.searchDocuments(
                new DocumentService.SearchCriteria(null, DocumentType.valueOf(type), null, null, null, null), actor);
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
        return documentService.updateDocument(id,
                new DocumentService.UpdateDocumentCommand(req.name, req.author, req.storagePath));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        documentService.deleteDocument(id);
    }

    // ---- Request/Response classes ----

    public static class CreateDocumentRequest {
        @NotNull public UUID employeeId;
        @NotBlank public String documentReference;
        @NotBlank public String name;
        @NotNull public DocumentType type;
        public String author;
        public String storagePath;
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
        public String ocrText;

        public DocumentService.CreateFromPreviewCommand toCommand() {
            return new DocumentService.CreateFromPreviewCommand(
                    employeeId, documentReference, name, type, author, tempKey, ocrText);
        }
    }
}
