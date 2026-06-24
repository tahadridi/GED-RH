package GED.ged_backend.controller;

import GED.ged_backend.config.SupabaseAdminClient;
import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.entity.Reclamation;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.ReclamationPriority;
import GED.ged_backend.domain.enums.ReclamationStatus;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.repository.EmployeeRepository;
import GED.ged_backend.repository.ReclamationRepository;
import GED.ged_backend.repository.SystemUserRepository;
import GED.ged_backend.service.AccessControlService;
import GED.ged_backend.service.ReclamationWebSocketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/reclamations")
@Tag(name = "Reclamations", description = "Gestion des reclamations — creation, approbation, rejet, changement d'email")
public class ReclamationController {

    private final ReclamationRepository reclamationRepository;
    private final SystemUserRepository systemUserRepository;
    private final EmployeeRepository employeeRepository;
    private final AccessControlService accessControlService;
    private final ObjectProvider<SupabaseAdminClient> supabaseAdminClientProvider;
    private final ReclamationWebSocketService webSocketService;

    public ReclamationController(ReclamationRepository reclamationRepository, SystemUserRepository systemUserRepository, EmployeeRepository employeeRepository, AccessControlService accessControlService, ObjectProvider<SupabaseAdminClient> supabaseAdminClientProvider, ReclamationWebSocketService webSocketService) {
        this.reclamationRepository = reclamationRepository;
        this.systemUserRepository = systemUserRepository;
        this.employeeRepository = employeeRepository;
        this.accessControlService = accessControlService;
        this.supabaseAdminClientProvider = supabaseAdminClientProvider;
        this.webSocketService = webSocketService;
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Creer une reclamation")
    public ReclamationResponse create(@RequestBody CreateReclamationRequest req) {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        // Re-fetch within transaction so lazy associations are available
        SystemUser user = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        Reclamation r = new Reclamation();
        r.setEmployee(user);
        r.setTitle(req.title());
        r.setMessage(req.message());
        r.setNewValue(req.newValue());
        r.setStatus(ReclamationStatus.PENDING);
        if (req.priority() != null) {
            r.setPriority(ReclamationPriority.valueOf(req.priority()));
        }
        reclamationRepository.save(r);
        reclamationRepository.flush();

        Map<String, String> notification = Map.of(
            "id", r.getId().toString(),
            "status", r.getStatus().name()
        );
        if (user.getManager() != null) {
            webSocketService.notifyReclamationUpdate(user.getManager().getId().toString(), notification);
        }
        webSocketService.notifyReclamationUpdateAdmin(notification);

        return ReclamationResponse.from(r);
    }

    @GetMapping("/mine")
    @Transactional(readOnly = true)
    @Operation(summary = "Mes reclamations", description = "Retourne les reclamations de l'utilisateur connecte.")
    public List<ReclamationResponse> listMine() {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        SystemUser user = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return reclamationRepository.findByEmployee_IdOrderByCreatedAtDesc(user.getId())
                .stream().map(ReclamationResponse::from).toList();
    }

    @GetMapping("/team")
    @Transactional(readOnly = true)
    @Operation(summary = "Reclamations de l'equipe", description = "Retourne les reclamations des employes rattaches au manager connecte.")
    public List<ReclamationResponse> listTeam() {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        SystemUser user = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!user.getRoles().contains(SystemRole.MANAGER)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Employee empProfile = user.getEmployeeProfile();
        if (empProfile == null) {
            return List.of();
        }
        return reclamationRepository.findTeamReclamations(empProfile.getId())
                .stream()
                .filter(r -> r.getNewValue() == null || r.getNewValue().isBlank())
                .map(ReclamationResponse::from).toList();
    }

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Toutes les reclamations", description = "ADMIN : toutes + changements d'email. DG : toutes. MANAGER : equipe + personnelles.")
    public List<ReclamationResponse> listAll() {
        SystemUser user = accessControlService.getCurrentUser();
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (user.getRoles().contains(SystemRole.DIRECTION_GENERALE)) {
            return reclamationRepository.findAllByOrderByCreatedAtDesc()
                    .stream()
                    .map(ReclamationResponse::from).toList();
        }
        // Admin sees: email-change reclamations + reclamations from users with no manager
        if (user.getRoles().contains(SystemRole.ADMINISTRATOR)) {
            return reclamationRepository.findAllByOrderByCreatedAtDesc()
                    .stream()
                    .filter(r -> (r.getNewValue() != null && !r.getNewValue().isBlank())
                            || r.getEmployee().getManager() == null)
                    .map(ReclamationResponse::from).toList();
        }
        if (user.getRoles().contains(SystemRole.MANAGER)) {
            var team = (user.getEmployeeProfile() != null
                    ? reclamationRepository.findTeamReclamations(user.getEmployeeProfile().getId())
                    : List.<Reclamation>of())
                    .stream()
                    .filter(r -> r.getNewValue() == null || r.getNewValue().isBlank())
                    .toList();
            var own = reclamationRepository.findByEmployee_IdOrderByCreatedAtDesc(user.getId());
            return java.util.stream.Stream.concat(team.stream(), own.stream())
                    .distinct()
                    .map(ReclamationResponse::from)
                    .toList();
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    @PutMapping("/{id}/approve")
    @Transactional
    @Operation(summary = "Approuver une reclamation")
    public ReclamationResponse approve(@Parameter(description = "ID de la reclamation") @PathVariable UUID id) {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        SystemUser user = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Reclamation r = reclamationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        SystemUser emp = systemUserRepository.findById(r.getEmployee().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR));

        boolean isAdmin = user.getRoles().contains(SystemRole.ADMINISTRATOR);
        boolean isManagerOf = emp.getManager() != null && emp.getManager().getId().equals(user.getId());

        if (!isAdmin && !isManagerOf) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        // Only admin can approve email-change reclamations
        if (!isAdmin && r.getNewValue() != null && !r.getNewValue().isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin can approve email changes");
        }
        if (r.getStatus() != ReclamationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reclamation already processed");
        }
        r.setStatus(ReclamationStatus.APPROVED);
        r.setProcessedAt(LocalDateTime.now());
        r.setProcessedBy(user);
        reclamationRepository.save(r);

        Map<String, String> notification = Map.of(
            "id", r.getId().toString(),
            "status", r.getStatus().name()
        );
        webSocketService.notifyReclamationUpdate(emp.getId().toString(), notification);
        if (emp.getManager() != null) {
            webSocketService.notifyReclamationUpdate(emp.getManager().getId().toString(), notification);
        }
        webSocketService.notifyReclamationUpdateAdmin(notification);

        return ReclamationResponse.from(r);
    }

    @PutMapping("/{id}/apply-email-change")
    @Transactional
    @Operation(summary = "Appliquer un changement d'email", description = "L'employe ou l'admin applique le nouvel email apres approbation.")
    public ReclamationResponse applyEmailChange(@Parameter(description = "ID de la reclamation") @PathVariable UUID id) {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        SystemUser user = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Reclamation r = reclamationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        SystemUser employee = systemUserRepository.findById(r.getEmployee().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR));

        // Only the owner or admin can apply
        if (!employee.getId().equals(user.getId()) &&
            !user.getRoles().contains(SystemRole.ADMINISTRATOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (r.getStatus() != ReclamationStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reclamation is not approved");
        }
        if (r.getNewValue() == null || r.getNewValue().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No email change to apply");
        }
        if (r.isAcknowledged()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Already applied");
        }

        employee.setEmail(r.getNewValue());

        SupabaseAdminClient client = supabaseAdminClientProvider.getIfAvailable();
        if (client != null && employee.getAuthUid() != null) {
            try {
                Map<String, Object> updates = new java.util.HashMap<>();
                updates.put("email", r.getNewValue());
                updates.put("email_confirm", true);
                client.updateUser(employee.getAuthUid(), updates);
            } catch (Exception e) {
                System.err.println("[Supabase] Failed to update email in Supabase: " + e.getMessage());
            }
            try {
                client.revokeSessions(employee.getAuthUid());
            } catch (Exception e) {
                System.err.println("[Supabase] Failed to revoke sessions: " + e.getMessage());
            }
        }

        r.setAcknowledged(true);
        reclamationRepository.save(r);
        return ReclamationResponse.from(r);
    }

    @PutMapping("/{id}/acknowledge")
    @Transactional
    @Operation(summary = "Accuser reception", description = "Marque la reclamation comme lue par l'employe, son manager ou l'admin.")
    public ReclamationResponse acknowledge(@Parameter(description = "ID de la reclamation") @PathVariable UUID id) {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        SystemUser user = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Reclamation r = reclamationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        // Only the owner, their manager, or admin can acknowledge
        SystemUser emp = systemUserRepository.findById(r.getEmployee().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR));
        if (!emp.getId().equals(user.getId()) &&
            (emp.getManager() == null || !emp.getManager().getId().equals(user.getId())) &&
            !user.getRoles().contains(SystemRole.ADMINISTRATOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

        r.setAcknowledged(true);
        reclamationRepository.save(r);
        return ReclamationResponse.from(r);
    }

    @PutMapping("/{id}/reject")
    @Transactional
    @Operation(summary = "Rejeter une reclamation")
    public ReclamationResponse reject(@Parameter(description = "ID de la reclamation") @PathVariable UUID id, @RequestBody(required = false) RejectRequest req) {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        SystemUser user = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Reclamation r = reclamationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        SystemUser emp = systemUserRepository.findById(r.getEmployee().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR));

        boolean isAdmin = user.getRoles().contains(SystemRole.ADMINISTRATOR);
        boolean isManagerOf = emp.getManager() != null && emp.getManager().getId().equals(user.getId());

        if (!isAdmin && !isManagerOf) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (!isAdmin && r.getNewValue() != null && !r.getNewValue().isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin can reject email changes");
        }
        if (r.getStatus() != ReclamationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reclamation already processed");
        }
        r.setStatus(ReclamationStatus.REJECTED);
        r.setProcessedAt(LocalDateTime.now());
        r.setProcessedBy(user);
        if (req != null) {
            r.setRejectionReason(req.reason());
            r.setRejectionComment(req.comment());
        }
        reclamationRepository.save(r);

        Map<String, String> notification = Map.of(
            "id", r.getId().toString(),
            "status", r.getStatus().name()
        );
        webSocketService.notifyReclamationUpdate(emp.getId().toString(), notification);
        if (emp.getManager() != null) {
            webSocketService.notifyReclamationUpdate(emp.getManager().getId().toString(), notification);
        }
        webSocketService.notifyReclamationUpdateAdmin(notification);

        return ReclamationResponse.from(r);
    }

    @GetMapping("/stats/by-department")
    @Transactional(readOnly = true)
    @Operation(summary = "Statistiques par departement", description = "ADMIN/DG : nombre total, en attente, approuve, rejete par departement.")
    public List<DepartmentStats> statsByDepartment() {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        SystemUser user = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!user.getRoles().contains(SystemRole.ADMINISTRATOR) && !user.getRoles().contains(SystemRole.DIRECTION_GENERALE)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        List<Reclamation> all = reclamationRepository.findAllByOrderByCreatedAtDesc();
        Map<String, List<Reclamation>> byDept = all.stream()
                .collect(Collectors.groupingBy(r -> {
                    var emp = r.getEmployee().getEmployeeProfile();
                    if (emp == null || emp.getDepartment() == null) return "Sans département";
                    return emp.getDepartment();
                }));
        return byDept.entrySet().stream()
                .map(e -> {
                    var list = e.getValue();
                    long total = list.size();
                    long pending = list.stream().filter(r -> r.getStatus() == ReclamationStatus.PENDING).count();
                    long approved = list.stream().filter(r -> r.getStatus() == ReclamationStatus.APPROVED).count();
                    long rejected = list.stream().filter(r -> r.getStatus() == ReclamationStatus.REJECTED).count();
                    return new DepartmentStats(e.getKey(), (int) total, (int) pending, (int) approved, (int) rejected);
                })
                .sorted((a, b) -> b.total() - a.total())
                .toList();
    }

    @Schema(description = "Statistiques par departement")
    public record DepartmentStats(
            @Schema(description = "Departement") String department,
            @Schema(description = "Total") int total,
            @Schema(description = "En attente") int pending,
            @Schema(description = "Approuve") int approved,
            @Schema(description = "Rejete") int rejected) {}

    @Schema(description = "Requete de creation de reclamation")
    public record CreateReclamationRequest(
            @Schema(description = "Titre", example = "Probleme d'acces") String title,
            @Schema(description = "Message") String message,
            @Schema(description = "Nouvel email (pour changement d'email)") String newValue,
            @Schema(description = "Priorite (FAIBLE, MOYENNE, HAUTE, CRITIQUE)") String priority) {}

    @Schema(description = "Requete de rejet")
    public record RejectRequest(
            @Schema(description = "Motif (HORS_PERIMETRE, INFOS_INSUFFISANTES, etc.)") String reason,
            @Schema(description = "Commentaire libre") String comment) {}

    @Schema(description = "Reclamation")
    public record ReclamationResponse(
            @Schema(description = "ID") UUID id,
            @Schema(description = "ID de l'employe") UUID employeeId,
            @Schema(description = "Prenom de l'employe") String employeeFirstName,
            @Schema(description = "Nom de l'employe") String employeeLastName,
            @Schema(description = "Email de l'employe") String employeeEmail,
            @Schema(description = "Matricule") String employeeMatricule,
            @Schema(description = "ID du manager") String employeeManagerId,
            @Schema(description = "Nom du manager") String employeeManagerName,
            @Schema(description = "Titre") String title,
            @Schema(description = "Message") String message,
            @Schema(description = "Nouvel email demande") String newValue,
            @Schema(description = "Priorite") String priority,
            @Schema(description = "Statut (PENDING, APPROVED, REJECTED)") String status,
            @Schema(description = "Motif du rejet") String rejectionReason,
            @Schema(description = "Commentaire de rejet") String rejectionComment,
            @Schema(description = "Date de creation") String createdAt,
            @Schema(description = "Date de traitement") String processedAt,
            @Schema(description = "Nom du traiteur") String processedByName,
            @Schema(description = "Accuse de lecture") boolean acknowledged
    ) {
        public static ReclamationResponse from(Reclamation r) {
            SystemUser emp = r.getEmployee();
            SystemUser mgr = emp.getManager();
            String matricule = emp.getEmployeeProfile() != null ? emp.getEmployeeProfile().getMatricule() : null;
            return new ReclamationResponse(
                    r.getId(),
                    emp.getId(),
                    emp.getFirstName(),
                    emp.getLastName(),
                    emp.getEmail(),
                    matricule,
                    mgr != null ? mgr.getId().toString() : null,
                    mgr != null ? mgr.getFirstName() + " " + mgr.getLastName() : null,
                    r.getTitle(),
                    r.getMessage(),
                    r.getNewValue(),
                    r.getPriority().name(),
                    r.getStatus().name(),
                    r.getRejectionReason(),
                    r.getRejectionComment(),
                    r.getCreatedAt() != null ? r.getCreatedAt().toString() : null,
                    r.getProcessedAt() != null ? r.getProcessedAt().toString() : null,
                    r.getProcessedBy() != null ? r.getProcessedBy().getFirstName() + " " + r.getProcessedBy().getLastName() : null,
                    r.isAcknowledged()
            );
        }
    }
}
