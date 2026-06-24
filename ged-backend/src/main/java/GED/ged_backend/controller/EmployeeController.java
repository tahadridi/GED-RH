package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.enums.EmployeeStatus;
import GED.ged_backend.service.EmployeeService;
import GED.ged_backend.service.AccessControlService;
import GED.ged_backend.service.StorageService;
import GED.ged_backend.domain.entity.SystemUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.InputStreamResource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/employees")
@Tag(name = "Employes", description = "Gestion des employes — CRUD, photo, affectation hierarchique")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final AccessControlService accessControlService;
    private final StorageService storageService;

    public EmployeeController(EmployeeService employeeService, AccessControlService accessControlService, StorageService storageService) {
        this.employeeService = employeeService;
        this.accessControlService = accessControlService;
        this.storageService = storageService;
    }

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Lister les employes", description = "Retourne une liste paginee d'employes avec filtres (recherche, departement, statut). Les admins/RH voient tout, les managers voient leur equipe, les employes ne voient qu'eux-memes.")
    public Page<EmployeeResponse> list(
            @Parameter(description = "Recherche textuelle (nom, prenom, matricule)") @RequestParam(required = false) String search,
            @Parameter(description = "Filtrer par departement") @RequestParam(required = false) String department,
            @Parameter(description = "Filtrer par statut (ACTIVE, INACTIVE, ON_LEAVE, TERMINATED)") @RequestParam(required = false) EmployeeStatus status,
            @Parameter(description = "Pagination : page, size, sort (ex: sort=matricule,asc)") @PageableDefault(size = Integer.MAX_VALUE, sort = "matricule", direction = Sort.Direction.ASC) Pageable pageable) {
        SystemUser actor = accessControlService.getCurrentUser();
        Page<Employee> page = employeeService.listEmployeesPaginated(actor, search, department, status, pageable);
        return page.map(EmployeeResponse::fromList);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    @Operation(summary = "Obtenir un employe par ID")
    public EmployeeResponse get(@Parameter(description = "ID de l'employe") @PathVariable UUID id) {
        SystemUser actor = accessControlService.getCurrentUser();
        Employee e = employeeService.getEmployee(id);
        if (!accessControlService.canViewEmployee(actor, e)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
        return EmployeeResponse.from(e);
    }

    @GetMapping("/hierarchy")
    @Transactional(readOnly = true)
    @Operation(summary = "Organigramme", description = "Retourne l'arbre hierarchique complet de l'entreprise.")
    public List<EmployeeTreeNode> getHierarchy() {
        List<Employee> all = employeeService.getAllEmployees();
        // Build children map
        java.util.Map<UUID, List<Employee>> childrenByManagerId = new java.util.HashMap<>();
        for (Employee e : all) {
            if (e.getManager() != null) {
                UUID mid = e.getManager().getId();
                childrenByManagerId.computeIfAbsent(mid, k -> new ArrayList<>()).add(e);
            }
        }
        // Build tree starting from top-level managers (no manager)
        List<EmployeeTreeNode> roots = new ArrayList<>();
        for (Employee e : all) {
            if (e.getManager() == null) {
                roots.add(buildNode(e, childrenByManagerId));
            }
        }
        return roots;
    }

    private EmployeeTreeNode buildNode(Employee e, java.util.Map<UUID, List<Employee>> childrenByManagerId) {
        List<EmployeeTreeNode> children = new ArrayList<>();
        List<Employee> directReports = childrenByManagerId.get(e.getId());
        if (directReports != null) {
            for (Employee child : directReports) {
                children.add(buildNode(child, childrenByManagerId));
            }
        }
        return new EmployeeTreeNode(e.getId(), e.getFirstName(), e.getLastName(), e.getMatricule(),
                e.getPosition(), e.getDepartment(), e.getPhotoPath() != null ? "/employees/" + e.getId() + "/photo/content" : null,
                children);
    }

    @Schema(description = "Noeud de l'organigramme")
    public record EmployeeTreeNode(
            @Schema(description = "ID") UUID id,
            @Schema(description = "Prenom") String firstName,
            @Schema(description = "Nom") String lastName,
            @Schema(description = "Matricule") String matricule,
            @Schema(description = "Poste") String position,
            @Schema(description = "Departement") String department,
            @Schema(description = "URL de la photo") String photoUrl,
            @Schema(description = "Subalternes") List<EmployeeTreeNode> children) {}

    @GetMapping("/{id}/org-context")
    @Transactional(readOnly = true)
    @Operation(summary = "Contexte hierarchique", description = "Retourne le manager, l'employe et ses subalternes directs pour un employe donne.")
    public OrgContextResponse getOrgContext(@PathVariable UUID id) {
        var ctx = employeeService.getOrgContext(id);
        return new OrgContextResponse(
            ctx.manager() != null ? buildFlatNode(ctx.manager()) : null,
            buildFlatNode(ctx.employee()),
            ctx.reports().stream().map(this::buildFlatNode).toList()
        );
    }

    private EmployeeTreeNode buildFlatNode(Employee e) {
        return new EmployeeTreeNode(e.getId(), e.getFirstName(), e.getLastName(), e.getMatricule(),
                e.getPosition(), e.getDepartment(), e.getPhotoPath() != null ? "/employees/" + e.getId() + "/photo/content" : null,
                List.of());
    }

    @Schema(description = "Contexte hierarchique d'un employe")
    public record OrgContextResponse(
            @Schema(description = "Manager direct (null si aucun)") EmployeeTreeNode manager,
            @Schema(description = "L'employe courant") EmployeeTreeNode employee,
            @Schema(description = "Subalternes directs") List<EmployeeTreeNode> reports) {}

    @PostMapping
    @Transactional
    @Operation(summary = "Creer un employe")
    public EmployeeResponse create(@RequestBody CreateEmployeeRequest req) {
        Employee e = employeeService.createEmployee(new EmployeeService.CreateEmployeeCommand(
                req.matricule, req.firstName, req.lastName, req.email,
                req.phoneNumber, req.address,
                req.department, req.position, req.hireDate, req.status, req.managerId));
        return EmployeeResponse.from(e);
    }

    @PutMapping("/{id}")
    @Transactional
    @Operation(summary = "Modifier un employe")
    public EmployeeResponse update(@Parameter(description = "ID de l'employe") @PathVariable UUID id, @RequestBody UpdateEmployeeRequest req) {
        Employee e = employeeService.updateEmployee(id, new EmployeeService.UpdateEmployeeCommand(
                req.firstName, req.lastName, req.email, req.phoneNumber, req.address,
                req.department, req.position, req.hireDate, req.status, req.managerId));
        return EmployeeResponse.from(e);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un employe")
    public void delete(@Parameter(description = "ID de l'employe") @PathVariable UUID id) {
        employeeService.deleteEmployee(id);
    }

    @PostMapping("/{managerId}/reports")
    public void assignReports(@PathVariable UUID managerId, @RequestBody Set<UUID> reportIds) {
        employeeService.assignDirectReports(managerId, reportIds);
    }

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public EmployeeResponse uploadPhoto(@PathVariable UUID id, @RequestPart("file") MultipartFile file) throws Exception {
        Employee e = employeeService.savePhoto(id, file.getInputStream(), file.getContentType(), file.getOriginalFilename());
        return EmployeeResponse.from(e);
    }

    @GetMapping("/{id}/photo/content")
    public ResponseEntity<InputStreamResource> getPhoto(@PathVariable UUID id) {
        Employee e = employeeService.getEmployee(id);
        if (e.getPhotoPath() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No photo");
        }
        String ext = "";
        String path = e.getPhotoPath();
        if (path != null && path.contains(".")) {
            ext = path.substring(path.lastIndexOf("."));
        }
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (".png".equalsIgnoreCase(ext)) mediaType = MediaType.IMAGE_PNG;
        else if (".jpg".equalsIgnoreCase(ext) || ".jpeg".equalsIgnoreCase(ext)) mediaType = MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(new InputStreamResource(storageService.downloadFile(e.getPhotoPath())));
    }

    @Schema(description = "Requete de creation d'un employe")
    public static class CreateEmployeeRequest {
        @Schema(description = "Matricule (laissez vide pour auto-generation)", example = "RH-001") public String matricule;
        @NotBlank @Schema(description = "Prenom", example = "Ahmed") public String firstName;
        @NotBlank @Schema(description = "Nom", example = "Ben Ali") public String lastName;
        @Email @Schema(description = "Email", example = "ahmed.benali@ged.com") public String email;
        @Schema(description = "Telephone", example = "+216 99 999 999") public String phoneNumber;
        @Schema(description = "Adresse") public String address;
        @Schema(description = "Departement", example = "Ressources Humaines") public String department;
        @Schema(description = "Poste", example = "Chef RH") public String position;
        @Schema(description = "Date d'embauche", example = "2024-01-15") public LocalDate hireDate;
        @Schema(description = "Statut", example = "ACTIVE") public EmployeeStatus status;
        @Schema(description = "ID du manager") public UUID managerId;
    }

    @Schema(description = "Requete de mise a jour d'un employe")
    public static class UpdateEmployeeRequest {
        @NotBlank @Schema(description = "Prenom", example = "Ahmed") public String firstName;
        @NotBlank @Schema(description = "Nom", example = "Ben Ali") public String lastName;
        @Email @Schema(description = "Email", example = "ahmed.benali@ged.com") public String email;
        @Schema(description = "Telephone", example = "+216 99 999 999") public String phoneNumber;
        @Schema(description = "Adresse") public String address;
        @Schema(description = "Departement", example = "Ressources Humaines") public String department;
        @Schema(description = "Poste", example = "Chef RH") public String position;
        @Schema(description = "Date d'embauche", example = "2024-01-15") public LocalDate hireDate;
        @Schema(description = "Statut", example = "ACTIVE") public EmployeeStatus status;
        @Schema(description = "ID du manager") public UUID managerId;
    }

    @Schema(description = "Reponse contenant les details d'un employe")
    public record EmployeeResponse(
            @Schema(description = "ID unique") UUID id,
            @Schema(description = "Matricule", example = "RH-001") String matricule,
            @Schema(description = "Prenom", example = "Ahmed") String firstName,
            @Schema(description = "Nom", example = "Ben Ali") String lastName,
            @Schema(description = "Email", example = "ahmed.benali@ged.com") String email,
            @Schema(description = "Telephone", example = "+216 99 999 999") String phoneNumber,
            @Schema(description = "Adresse") String address,
            @Schema(description = "Departement", example = "Ressources Humaines") String department,
            @Schema(description = "Poste", example = "Chef RH") String position,
            @Schema(description = "Date d'embauche") LocalDate hireDate,
            @Schema(description = "Statut", example = "ACTIVE") EmployeeStatus status,
            @Schema(description = "ID du manager") UUID managerId,
            @Schema(description = "Nom du manager") String managerName,
            @Schema(description = "IDs des subalternes directs") Set<UUID> directReportIds,
            @Schema(description = "URL de la photo") String photoUrl) {

        public static EmployeeResponse from(Employee e) {
            return new EmployeeResponse(
                    e.getId(), e.getMatricule(), e.getFirstName(), e.getLastName(), e.getEmail(),
                    e.getPhoneNumber(), e.getAddress(),
                    e.getDepartment(), e.getPosition(), e.getHireDate(), e.getStatus(),
                    e.getManager() == null ? null : e.getManager().getId(),
                    e.getManager() == null ? null : e.getManager().getFirstName() + " " + e.getManager().getLastName(),
                    e.getDirectReports().stream().map(Employee::getId).collect(Collectors.toSet()),
                    e.getPhotoPath() != null ? "/api/employees/" + e.getId() + "/photo/content" : null);
        }

        public static EmployeeResponse fromList(Employee e) {
            return new EmployeeResponse(
                    e.getId(), e.getMatricule(), e.getFirstName(), e.getLastName(), e.getEmail(),
                    e.getPhoneNumber(), e.getAddress(),
                    e.getDepartment(), e.getPosition(), e.getHireDate(), e.getStatus(),
                    e.getManager() == null ? null : e.getManager().getId(),
                    e.getManager() == null ? null : e.getManager().getFirstName() + " " + e.getManager().getLastName(),
                    Set.of(),
                    e.getPhotoPath() != null ? "/api/employees/" + e.getId() + "/photo/content" : null);
        }
    }
}
