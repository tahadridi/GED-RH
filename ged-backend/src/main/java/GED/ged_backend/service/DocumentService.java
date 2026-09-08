package GED.ged_backend.service;

import GED.ged_backend.domain.entity.DocumentVersion;
import GED.ged_backend.domain.entity.EmployeeDocument;
import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.repository.DocumentVersionRepository;
import GED.ged_backend.repository.EmployeeDocumentRepository;
import GED.ged_backend.repository.EmployeeRepository;
import GED.ged_backend.repository.DocumentSpecifications;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.io.InputStream;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final EmployeeDocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final EmployeeRepository employeeRepository;
    private final StorageService storageService;
    private final OCRService ocrService;
    private final ElasticsearchService elasticsearchService;

    public DocumentService(EmployeeDocumentRepository documentRepository,
            DocumentVersionRepository versionRepository, EmployeeRepository employeeRepository,
            StorageService storageService, OCRService ocrService, ElasticsearchService elasticsearchService) {
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.employeeRepository = employeeRepository;
        this.storageService = storageService;
        this.ocrService = ocrService;
        this.elasticsearchService = elasticsearchService;
    }

    /**
     * Asynchronous OCR processing to avoid blocking the main thread.
     */
    @Async
    public void processOcrAsync(UUID documentId, UUID versionId, String storagePath) {
        try (InputStream is = storageService.downloadFile(storagePath)) {
            String ext = storagePath.contains(".") ? storagePath.substring(storagePath.lastIndexOf('.')) : ".tmp";
            String extractedText = ocrService.extractText(is, "file" + ext);
            
            // Update Database with extracted text
            updateOcrText(documentId, versionId, extractedText);
            
            // Index in Elasticsearch for full-text search
            EmployeeDocument doc = documentRepository.findById(documentId).orElse(null);
            if (doc != null) {
                elasticsearchService.indexDocument(doc);
            }
        } catch (Exception e) {
            log.error("Async OCR failed for document {}", documentId, e);
        }
    }

    @Transactional
    protected void updateOcrText(UUID documentId, UUID versionId, String text) {
        EmployeeDocument doc = documentRepository.findById(documentId).orElseThrow();
        doc.setOcrText(text);
        documentRepository.save(doc);

        DocumentVersion v = versionRepository.findById(versionId).orElseThrow();
        v.setOcrText(text);
        versionRepository.save(v);
    }

    /**
     * Step 1: Store file in MinIO under a temp key, run OCR, return result for user review.
     */
    public OcrPreviewResult ocrPreview(InputStream fileStream, String contentType, String originalFilename) {
        String tempKey = "temp/" + UUID.randomUUID().toString() + "_" + (originalFilename != null ? originalFilename : "file");
        storageService.uploadFile(tempKey, fileStream, contentType);

        String extractedText = "";
        try (InputStream is = storageService.downloadFile(tempKey)) {
            extractedText = ocrService.extractText(is, originalFilename);
        } catch (Exception e) {
            log.error("OCR preview failed", e);
        }
        return new OcrPreviewResult(tempKey, extractedText, originalFilename);
    }

    /**
     * Step 2: Save document using the temp key (already in MinIO) + user-reviewed OCR text.
     */
    @Transactional
    public EmployeeDocument createFromPreview(CreateFromPreviewCommand cmd, GED.ged_backend.domain.entity.SystemUser actor) {
        Employee employee = employeeRepository.findById(cmd.employeeId()).orElseThrow();

        // Move temp file into the employee's folder
        String fileName = cmd.tempKey().replaceFirst("^temp/", "");
        String finalKey = employeeFolder(employee) + fileName;
        storageService.copyFile(cmd.tempKey(), finalKey);
        storageService.deleteFile(cmd.tempKey());

        EmployeeDocument doc = new EmployeeDocument();
        doc.setDocumentReference(cmd.documentReference());
        doc.setName(cmd.name());
        doc.setType(cmd.type());
        doc.setAuthor(cmd.author() != null ? cmd.author() : (actor != null ? actor.getEmail() : ""));
        doc.setStoragePath(finalKey);
        doc.setOcrText(cmd.ocrText()); // user-corrected text
        doc.setFileSize(storageService.getFileSize(finalKey));
        doc.setEmployee(employee);
        doc.setCurrentVersion(1);

        EmployeeDocument savedDoc = documentRepository.save(doc);

        DocumentVersion v = new DocumentVersion();
        v.setDocument(savedDoc);
        v.setVersionNumber(1);
        v.setStoragePath(finalKey);
        v.setUploadedBy(doc.getAuthor());
        v.setOcrText(cmd.ocrText());
        versionRepository.save(v);

        elasticsearchService.indexDocument(savedDoc);
        return savedDoc;
    }

    @Transactional
    public EmployeeDocument createDocument(CreateDocumentCommand cmd, InputStream fileStream, String contentType, String originalFilename) {
        Employee employee = employeeRepository.findById(cmd.employeeId()).orElseThrow();

        // Extract extension from the uploaded file
        String ext = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        // Architecture Step 1: Store Original File (MinIO)
        String fileName = employeeFolder(employee) + UUID.randomUUID().toString() + "_" + cmd.name() + ext;
        storageService.uploadFile(fileName, fileStream, contentType);
        
        // Architecture Step 3: Metadata Extraction & Database Save (PostgreSQL)
        EmployeeDocument doc = new EmployeeDocument();
        doc.setDocumentReference(cmd.documentReference());
        doc.setName(cmd.name());
        doc.setType(cmd.type());
        doc.setAuthor(cmd.author());
        doc.setStoragePath(fileName);
        doc.setFileSize(storageService.getFileSize(fileName));
        doc.setEmployee(employee);
        doc.setCurrentVersion(1);
        
        EmployeeDocument savedDoc = documentRepository.save(doc);
        
        // Initial version creation
        DocumentVersion v = new DocumentVersion();
        v.setDocument(savedDoc);
        v.setVersionNumber(1);
        v.setStoragePath(fileName);
        v.setUploadedBy(cmd.author());
        DocumentVersion savedVersion = versionRepository.save(v);
        
        // Architecture Step 2: Asynchronous OCR Processing
        processOcrAsync(savedDoc.getId(), savedVersion.getId(), fileName);
        
        return savedDoc;
    }

    @Transactional
    public DocumentVersion addVersion(UUID documentId, String uploadedBy, String tempKey, String ocrText) {
        EmployeeDocument doc = documentRepository.findById(documentId).orElseThrow();
        int next = doc.getCurrentVersion() + 1;

        // Move temp file (already in MinIO) into the employee's folder
        Employee employee = doc.getEmployee();
        String fileName = tempKey.replaceFirst("^temp/", "");
        String finalKey = employeeFolder(employee) + fileName;
        storageService.copyFile(tempKey, finalKey);
        storageService.deleteFile(tempKey);

        // Create version with user-corrected OCR text
        DocumentVersion v = new DocumentVersion();
        v.setDocument(doc);
        v.setVersionNumber(next);
        v.setStoragePath(finalKey);
        v.setUploadedBy(uploadedBy);
        v.setOcrText(ocrText);
        DocumentVersion savedVersion = versionRepository.save(v);

        doc.setCurrentVersion(next);
        doc.setStoragePath(finalKey);
        doc.setOcrText(ocrText);
        doc.setFileSize(storageService.getFileSize(finalKey));
        doc.setUpdatedAt(java.time.Instant.now());
        documentRepository.save(doc);

        elasticsearchService.indexDocument(doc);
        return savedVersion;
    }

    public List<DocumentVersion> listVersions(UUID documentId) {
        return versionRepository.findByDocumentIdOrderByVersionNumberDesc(documentId);
    }

    public DocumentVersion getVersion(UUID versionId) {
        return versionRepository.findById(versionId).orElseThrow();
    }

    public InputStream getFileContent(UUID documentId) {
        EmployeeDocument doc = documentRepository.findById(documentId).orElseThrow();
        return storageService.downloadFile(doc.getStoragePath());
    }

    public InputStream getVersionContent(UUID versionId) {
        DocumentVersion v = versionRepository.findById(versionId).orElseThrow();
        return storageService.downloadFile(v.getStoragePath());
    }

    public EmployeeDocument getDocument(UUID id) {
        return documentRepository.findById(id).orElseThrow();
    }

    public List<EmployeeDocument> listByEmployee(UUID employeeId) {
        return documentRepository.findByEmployee_Id(employeeId);
    }

    public List<EmployeeDocument> listByType(DocumentType type) {
        return documentRepository.findByType(type);
    }

    @Transactional
    public EmployeeDocument updateDocument(UUID id, UpdateDocumentCommand cmd) {
        EmployeeDocument doc = documentRepository.findById(id).orElseThrow();
        if (cmd.name() != null) doc.setName(cmd.name());
        if (cmd.author() != null) doc.setAuthor(cmd.author());
        if (cmd.storagePath() != null) doc.setStoragePath(cmd.storagePath());
        return documentRepository.save(doc);
    }

    @Transactional
    public void deleteVersion(UUID versionId) {
        DocumentVersion v = versionRepository.findById(versionId).orElseThrow();
        EmployeeDocument doc = v.getDocument();

        // Delete the version file from storage
        try { storageService.deleteFile(v.getStoragePath()); } catch (Exception ignored) {}
        versionRepository.delete(v);
        versionRepository.flush();

        // Re-number remaining versions sequentially (v1, v2, ...) so the previous
        // version becomes the new latest one.
        List<DocumentVersion> remaining = versionRepository.findByDocumentIdOrderByVersionNumberDesc(doc.getId());
        java.util.Collections.reverse(remaining);
        int seq = 1;
        for (DocumentVersion rv : remaining) {
            rv.setVersionNumber(seq++);
            versionRepository.save(rv);
        }

        if (remaining.isEmpty()) {
            // No versions left -> the document itself becomes empty and useless.
            // Delete the document entirely (Elasticsearch + DB) so it no longer
            // appears in the employee's dossier or anywhere else.
            try { storageService.deleteFile(doc.getStoragePath()); } catch (Exception ignored) {}
            documentRepository.delete(doc);
            elasticsearchService.deleteDocument(doc.getId().toString());
            return;
        }

        // Update the document so it reflects the new latest version
        DocumentVersion latest = remaining.get(remaining.size() - 1);
        doc.setCurrentVersion(latest.getVersionNumber());
        doc.setStoragePath(latest.getStoragePath());
        doc.setOcrText(latest.getOcrText());
        doc.setFileSize(storageService.getFileSize(latest.getStoragePath()));
        doc.setUpdatedAt(java.time.Instant.now());
        documentRepository.save(doc);

        elasticsearchService.indexDocument(doc);
    }

    @Transactional
    public void deleteDocument(UUID id) {
        EmployeeDocument doc = documentRepository.findById(id).orElseThrow();
        
        // Delete all version files from MinIO
        for (DocumentVersion v : versionRepository.findByDocumentIdOrderByVersionNumberDesc(id)) {
            try { storageService.deleteFile(v.getStoragePath()); } catch (Exception ignored) {}
        }
        // Delete all versions from DB
        versionRepository.deleteAll(versionRepository.findByDocumentIdOrderByVersionNumberDesc(id));
        
        // Delete the main file from MinIO
        try { storageService.deleteFile(doc.getStoragePath()); } catch (Exception ignored) {}
        
        // Delete from DB
        documentRepository.delete(doc);
    }

    /**
     * Database-level filtering using Specifications.
     * Heavy text searches are offloaded to Elasticsearch if a query is present.
     */
    public List<EmployeeDocument> searchDocuments(SearchCriteria criteria, GED.ged_backend.domain.entity.SystemUser actor) {
        if (criteria.query() != null && !criteria.query().isBlank()) {
            // If there's a heavy query, we could use Elasticsearch to get IDs first
            List<String> esDocIds = elasticsearchService.search(criteria.query());
            // Then filter by ES results AND security specifications
            // For now, we use JPA Specifications which handle both functional and security filtering
        }
        
        return documentRepository.findAll(DocumentSpecifications.withSearchCriteria(criteria, actor));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        long total = documentRepository.count();
        long totalSize = documentRepository.sumFileSize();
        long employeesWithDocs = documentRepository.countDistinctEmployees();

        java.time.ZonedDateTime startMonth = java.time.ZonedDateTime.now()
            .withDayOfMonth(1)
            .withHour(0).withMinute(0).withSecond(0).withNano(0);
        long thisMonth = documentRepository.countByCreatedAtGreaterThanEqual(startMonth.toInstant());

        List<Object[]> rows = documentRepository.countByType();
        Map<String, Long> byType = new java.util.LinkedHashMap<>();
        for (Object[] row : rows) {
            byType.put(((DocumentType) row[0]).name(), (Long) row[1]);
        }

        return Map.of(
            "total", total,
            "totalSize", totalSize,
            "thisMonth", thisMonth,
            "employeesWithDocs", employeesWithDocs,
            "byType", byType
        );
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStatsForActor(GED.ged_backend.domain.entity.SystemUser actor) {
        List<EmployeeDocument> visible = documentRepository.findAll(
                DocumentSpecifications.withSearchCriteria(new SearchCriteria(null, null, null, null, null, null), actor));

        long total = visible.size();
        long totalSize = visible.stream()
                .filter(d -> d.getFileSize() != null)
                .mapToLong(EmployeeDocument::getFileSize)
                .sum();
        long employeesWithDocs = visible.stream().map(EmployeeDocument::getEmployeeId).distinct().count();

        java.time.ZonedDateTime startMonth = java.time.ZonedDateTime.now()
            .withDayOfMonth(1)
            .withHour(0).withMinute(0).withSecond(0).withNano(0);
        Instant monthStart = startMonth.toInstant();
        long thisMonth = visible.stream().filter(d -> !d.getCreatedAt().isBefore(monthStart)).count();

        Map<String, Long> byType = new java.util.LinkedHashMap<>();
        for (EmployeeDocument d : visible) {
            byType.merge(d.getType().name(), 1L, Long::sum);
        }

        return Map.of(
            "total", total,
            "totalSize", totalSize,
            "thisMonth", thisMonth,
            "employeesWithDocs", employeesWithDocs,
            "byType", byType
        );
    }

    private String employeeFolder(Employee employee) {
        String sanitizedFirstName = employee.getFirstName().replaceAll("[^a-zA-Z0-9_-]", "");
        String sanitizedLastName = employee.getLastName().replaceAll("[^a-zA-Z0-9_-]", "");
        return "docs/" + sanitizedFirstName + "_" + sanitizedLastName + "_" + employee.getMatricule() + "/";
    }

    public record SearchCriteria(String query, DocumentType type, UUID employeeId, String department, java.time.LocalDate startDate, java.time.LocalDate endDate) {}
    public record CreateDocumentCommand(UUID employeeId, String documentReference, String name, DocumentType type, String author, String storagePath) {}
    public record AddVersionCommand(String storagePath, String uploadedBy, String ocrText) {}
    public record UpdateDocumentCommand(String name, String author, String storagePath) {}
    public record OcrPreviewResult(String tempKey, String ocrText, String originalFilename) {}
    public record CreateFromPreviewCommand(UUID employeeId, String documentReference, String name, DocumentType type, String author, String tempKey, String ocrText) {}
}
