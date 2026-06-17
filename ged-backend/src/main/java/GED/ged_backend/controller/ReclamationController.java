package GED.ged_backend.controller;

import GED.ged_backend.config.SupabaseAdminClient;
import GED.ged_backend.domain.entity.Reclamation;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.ReclamationStatus;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.repository.ReclamationRepository;
import GED.ged_backend.repository.SystemUserRepository;
import GED.ged_backend.service.AccessControlService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
    private final AccessControlService accessControlService;
    private final ObjectProvider<SupabaseAdminClient> supabaseAdminClientProvider;

    public ReclamationController(ReclamationRepository reclamationRepository, SystemUserRepository systemUserRepository, AccessControlService accessControlService, ObjectProvider<SupabaseAdminClient> supabaseAdminClientProvider) {
        this.reclamationRepository = reclamationRepository;
        this.systemUserRepository = systemUserRepository;
        this.accessControlService = accessControlService;
        this.supabaseAdminClientProvider = supabaseAdminClientProvider;
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
        reclamationRepository.save(r);
        reclamationRepository.flush();
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
        return reclamationRepository.findByEmployeeManagerIdOrderByCreatedAtDesc(user.getId())
                .stream().map(ReclamationResponse::from).toList();
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ReclamationResponse> listAll() {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        SystemUser user = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        // Admin sees all, Manager sees their team + their own
        if (user.getRoles().contains(SystemRole.ADMINISTRATOR)) {
            return reclamationRepository.findAllByOrderByCreatedAtDesc()
                    .stream().map(ReclamationResponse::from).toList();
        }
        if (user.getRoles().contains(SystemRole.MANAGER)) {
            var team = reclamationRepository.findByEmployeeManagerIdOrderByCreatedAtDesc(user.getId());
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
        SystemUser admin = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!admin.getRoles().contains(SystemRole.ADMINISTRATOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Reclamation r = reclamationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (r.getStatus() != ReclamationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reclamation already processed");
        }
        r.setStatus(ReclamationStatus.APPROVED);
        r.setProcessedAt(LocalDateTime.now());
        r.setProcessedBy(admin);
        reclamationRepository.save(r);
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
    public ReclamationResponse reject(@PathVariable UUID id) {
        SystemUser current = accessControlService.getCurrentUser();
        if (current == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        SystemUser admin = systemUserRepository.findById(current.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (!admin.getRoles().contains(SystemRole.ADMINISTRATOR)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        Reclamation r = reclamationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (r.getStatus() != ReclamationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reclamation already processed");
        }
        r.setStatus(ReclamationStatus.REJECTED);
        r.setProcessedAt(LocalDateTime.now());
        r.setProcessedBy(admin);
        reclamationRepository.save(r);
        return ReclamationResponse.from(r);
    }

    public record CreateReclamationRequest(String title, String message, String newValue) {}

    public record ReclamationResponse(
            UUID id,
            UUID employeeId,
            String employeeFirstName,
            String employeeLastName,
            String employeeEmail,
            String employeeManagerId,
            String employeeManagerName,
            String title,
            String message,
            String newValue,
            String status,
            String createdAt,
            String processedAt,
            String processedByName,
            boolean acknowledged
    ) {
        public static ReclamationResponse from(Reclamation r) {
            SystemUser emp = r.getEmployee();
            SystemUser mgr = emp.getManager();
            return new ReclamationResponse(
                    r.getId(),
                    emp.getId(),
                    emp.getFirstName(),
                    emp.getLastName(),
                    emp.getEmail(),
                    mgr != null ? mgr.getId().toString() : null,
                    mgr != null ? mgr.getFirstName() + " " + mgr.getLastName() : null,
                    r.getTitle(),
                    r.getMessage(),
                    r.getNewValue(),
                    r.getStatus().name(),
                    r.getCreatedAt() != null ? r.getCreatedAt().toString() : null,
                    r.getProcessedAt() != null ? r.getProcessedAt().toString() : null,
                    r.getProcessedBy() != null ? r.getProcessedBy().getFirstName() + " " + r.getProcessedBy().getLastName() : null,
                    r.isAcknowledged()
            );
        }
    }
}
