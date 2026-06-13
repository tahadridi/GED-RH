package GED.ged_backend.integration;

import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.entity.EmployeeDocument;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.repository.DocumentVersionRepository;
import GED.ged_backend.repository.EmployeeDocumentRepository;
import GED.ged_backend.repository.EmployeeRepository;
import GED.ged_backend.repository.SystemUserRepository;
import GED.ged_backend.service.DocumentService;
import GED.ged_backend.service.StorageService;
import GED.ged_backend.service.OCRService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class DocumentArchitectureIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EmployeeDocumentRepository documentRepository;

    @Autowired
    private DocumentVersionRepository versionRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private SystemUserRepository userRepository;

    @MockitoBean
    private StorageService storageService;

    @MockitoBean
    private OCRService ocrService;

    private Employee testEmployee;

    @BeforeEach
    @Transactional
    void setUp() {
        versionRepository.deleteAll();
        documentRepository.deleteAll();
        userRepository.deleteAll();
        employeeRepository.deleteAll();

        testEmployee = new Employee();
        testEmployee.setFirstName("John");
        testEmployee.setLastName("Doe");
        testEmployee.setMatricule("JD-" + UUID.randomUUID().toString().substring(0, 8));
        testEmployee.setEmail("user-" + UUID.randomUUID() + "@test.com");
        testEmployee = employeeRepository.saveAndFlush(testEmployee);

        SystemUser adminUser = new SystemUser();
        adminUser.setEmail("admin@test.com");
        adminUser.setAuthUid("admin-uid-" + UUID.randomUUID());
        Set<SystemRole> adminRoles = new HashSet<>();
        adminRoles.add(SystemRole.ADMINISTRATOR);
        adminUser.setRoles(adminRoles);
        userRepository.saveAndFlush(adminUser);

        SystemUser regularUser = new SystemUser();
        regularUser.setEmail("user@test.com");
        regularUser.setAuthUid("user-uid-" + UUID.randomUUID());
        Set<SystemRole> managerRoles = new HashSet<>();
        managerRoles.add(SystemRole.MANAGER);
        regularUser.setRoles(managerRoles);
        regularUser.setEmployeeProfile(testEmployee);
        userRepository.saveAndFlush(regularUser);

        when(storageService.downloadFile(anyString())).thenReturn(new ByteArrayInputStream("Mock PDF Content".getBytes()));
        when(ocrService.extractText(any(InputStream.class))).thenReturn("Extracted OCR Text");
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMINISTRATOR"})
    @Transactional
    void testAsynchronousOcrProcessing() throws Exception {
        String docName = "AsyncTestDoc";
        MockMultipartFile file = new MockMultipartFile("file", "test.pdf", MediaType.APPLICATION_PDF_VALUE, "PDF content".getBytes());
        
        String jsonPayload = String.format("{\"employeeId\":\"%s\", \"documentReference\":\"REF-%s\", \"name\":\"%s\", \"type\":\"EMPLOYMENT_CONTRACT\", \"author\":\"Admin\"}", 
            testEmployee.getId(), UUID.randomUUID().toString().substring(0,8), docName);
        MockMultipartFile data = new MockMultipartFile("data", "", MediaType.APPLICATION_JSON_VALUE, jsonPayload.getBytes());

        mockMvc.perform(multipart("/api/documents")
                .file(file)
                .file(data))
                .andExpect(status().isOk());

        await().atMost(10, TimeUnit.SECONDS).until(() -> {
            return documentRepository.findAll().stream()
                .filter(d -> d.getName().equals(docName))
                .findFirst()
                .map(doc -> doc.getOcrText() != null && !doc.getOcrText().isEmpty())
                .orElse(false);
        });
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = {"MANAGER"})
    @Transactional
    void testSecurityAnnotationBlocksUnauthorizedAccess() throws Exception {
        mockMvc.perform(delete("/api/documents/" + UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user@test.com", roles = {"MANAGER"})
    @Transactional
    void testDatabaseLevelFiltering() throws Exception {
        Employee otherEmployee = new Employee();
        otherEmployee.setFirstName("Other");
        otherEmployee.setLastName("User");
        otherEmployee.setMatricule("OU-" + UUID.randomUUID().toString().substring(0,8));
        otherEmployee.setEmail("other-" + UUID.randomUUID() + "@test.com");
        otherEmployee = employeeRepository.saveAndFlush(otherEmployee);

        EmployeeDocument secretDoc = new EmployeeDocument();
        secretDoc.setName("Secret Document");
        secretDoc.setDocumentReference("SECRET-" + UUID.randomUUID().toString().substring(0,8));
        secretDoc.setEmployee(otherEmployee);
        secretDoc.setType(DocumentType.PAYSLIP);
        secretDoc.setStoragePath("path/to/secret");
        documentRepository.saveAndFlush(secretDoc);

        EmployeeDocument myDoc = new EmployeeDocument();
        myDoc.setName("My Document");
        myDoc.setDocumentReference("MY-" + UUID.randomUUID().toString().substring(0,8));
        myDoc.setEmployee(testEmployee);
        myDoc.setType(DocumentType.EMPLOYMENT_CONTRACT);
        myDoc.setStoragePath("path/to/mine");
        documentRepository.saveAndFlush(myDoc);

        mockMvc.perform(get("/api/documents/search"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("My Document")));
    }
}
