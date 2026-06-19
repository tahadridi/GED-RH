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
    public ReclamationResponse approve(@PathVariable UUID id) {
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
    public ReclamationResponse applyEmailChange(@PathVariable UUID id) {
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
    public ReclamationResponse acknowledge(@PathVariable UUID id) {
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
    public ReclamationResponse reject(@PathVariable UUID id, @RequestBody(required = false) RejectRequest req) {
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

    public record DepartmentStats(String department, int total, int pending, int approved, int rejected) {}

    public record CreateReclamationRequest(String title, String message, String newValue, String priority) {}

    public record RejectRequest(String reason, String comment) {}

    public record ReclamationResponse(
            UUID id,
            UUID employeeId,
            String employeeFirstName,
            String employeeLastName,
            String employeeEmail,
            String employeeMatricule,
            String employeeManagerId,
            String employeeManagerName,
            String title,
            String message,
            String newValue,
            String priority,
            String status,
            String rejectionReason,
            String rejectionComment,
            String createdAt,
            String processedAt,
            String processedByName,
            boolean acknowledged
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
