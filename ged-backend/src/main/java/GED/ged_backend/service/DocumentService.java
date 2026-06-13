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
import java.util.UUID;
import java.io.InputStream;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentService {

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
            String extractedText = ocrService.extractText(is);
            
            // Update Database with extracted text
            updateOcrText(documentId, versionId, extractedText);
            
            // Index in Elasticsearch for full-text search
            EmployeeDocument doc = documentRepository.findById(documentId).orElse(null);
            if (doc != null) {
                elasticsearchService.indexDocument(doc);
            }
        } catch (Exception e) {
            System.err.println("Async OCR failed for document " + documentId + ": " + e.getMessage());
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
            System.err.println("OCR preview failed: " + e.getMessage());
        }
        return new OcrPreviewResult(tempKey, extractedText, originalFilename);
    }

    /**
     * Step 2: Save document using the temp key (already in MinIO) + user-reviewed OCR text.
     */
    @Transactional
    public EmployeeDocument createFromPreview(CreateFromPreviewCommand cmd, GED.ged_backend.domain.entity.SystemUser actor) {
        Employee employee = employeeRepository.findById(cmd.employeeId()).orElseThrow();

        // Move temp file to final path
        String finalKey = cmd.tempKey().replaceFirst("^temp/", "docs/");
        storageService.copyFile(cmd.tempKey(), finalKey);
        storageService.deleteFile(cmd.tempKey());

        EmployeeDocument doc = new EmployeeDocument();
        doc.setDocumentReference(cmd.documentReference());
        doc.setName(cmd.name());
        doc.setType(cmd.type());
        doc.setAuthor(cmd.author() != null ? cmd.author() : (actor != null ? actor.getEmail() : ""));
        doc.setStoragePath(finalKey);
        doc.setOcrText(cmd.ocrText()); // user-corrected text
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
    public EmployeeDocument createDocument(CreateDocumentCommand cmd, InputStream fileStream, String contentType) {
        Employee employee = employeeRepository.findById(cmd.employeeId()).orElseThrow();
        
        // Architecture Step 1: Store Original File (MinIO)
        String fileName = UUID.randomUUID().toString() + "_" + cmd.name();
        storageService.uploadFile(fileName, fileStream, contentType);
        
        // Architecture Step 3: Metadata Extraction & Database Save (PostgreSQL)
        EmployeeDocument doc = new EmployeeDocument();
        doc.setDocumentReference(cmd.documentReference());
        doc.setName(cmd.name());
        doc.setType(cmd.type());
        doc.setAuthor(cmd.author());
        doc.setStoragePath(fileName);
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
    public DocumentVersion addVersion(UUID documentId, String uploadedBy, InputStream fileStream, String contentType) {
        EmployeeDocument doc = documentRepository.findById(documentId).orElseThrow();
        int next = doc.getCurrentVersion() + 1;
        
        // Architecture Step 1: Store Original File
        String fileName = UUID.randomUUID().toString() + "_v" + next + "_" + doc.getName();
        storageService.uploadFile(fileName, fileStream, contentType);
        
        // Architecture Step 3: Metadata Extraction & DB Update
        DocumentVersion v = new DocumentVersion();
        v.setDocument(doc);
        v.setVersionNumber(next);
        v.setStoragePath(fileName);
        v.setUploadedBy(uploadedBy);
        DocumentVersion savedVersion = versionRepository.save(v);
        
        doc.setCurrentVersion(next);
        doc.setStoragePath(fileName);
        doc.setUpdatedAt(java.time.Instant.now());
        documentRepository.save(doc);
        
        // Architecture Step 2: Asynchronous OCR Processing
        processOcrAsync(doc.getId(), savedVersion.getId(), fileName);
        
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
        return documentRepository.findByEmployeeId(employeeId);
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

    public record SearchCriteria(String query, DocumentType type, UUID employeeId, String department, java.time.LocalDate startDate, java.time.LocalDate endDate) {}
    public record CreateDocumentCommand(UUID employeeId, String documentReference, String name, DocumentType type, String author, String storagePath) {}
    public record AddVersionCommand(String storagePath, String uploadedBy, String ocrText) {}
    public record UpdateDocumentCommand(String name, String author, String storagePath) {}
    public record OcrPreviewResult(String tempKey, String ocrText, String originalFilename) {}
    public record CreateFromPreviewCommand(UUID employeeId, String documentReference, String name, DocumentType type, String author, String tempKey, String ocrText) {}
}
