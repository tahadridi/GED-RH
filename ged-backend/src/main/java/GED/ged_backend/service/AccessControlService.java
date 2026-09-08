package GED.ged_backend.service;

import GED.ged_backend.domain.entity.DocumentVersion;
import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.entity.EmployeeDocument;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.repository.DocumentVersionRepository;
import GED.ged_backend.repository.EmployeeDocumentRepository;
import GED.ged_backend.repository.EmployeeRepository;
import GED.ged_backend.repository.SystemUserRepository;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AccessControlService {

    private final SystemUserRepository systemUserRepository;
    private final EmployeeDocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final EmployeeRepository employeeRepository;

    public AccessControlService(SystemUserRepository systemUserRepository,
            EmployeeDocumentRepository documentRepository,
            DocumentVersionRepository versionRepository,
            EmployeeRepository employeeRepository) {
        this.systemUserRepository = systemUserRepository;
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.employeeRepository = employeeRepository;
    }

    public SystemUser getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;

        Object principal = auth.getPrincipal();

        // Case 1: principal is already a SystemUser (old filter style)
        if (principal instanceof SystemUser su) return su;

        // Case 2: principal is Spring User — extract email from getName()
        String email = principal instanceof org.springframework.security.core.userdetails.User u
                ? u.getUsername()
                : principal.toString();

        return systemUserRepository.findByEmail(email).orElse(null);
    }

    public boolean canViewEmployee(Object principal, UUID employeeId) {
        SystemUser actor = resolveActor(principal);
        Employee employee = employeeRepository.findById(employeeId).orElse(null);
        if (employee == null) return false;
        return canViewEmployee(actor, employee);
    }

    public boolean canViewDocument(Object principal, UUID documentId) {
        SystemUser actor = resolveActor(principal);
        EmployeeDocument document = documentRepository.findById(documentId).orElse(null);
        if (document == null) return false;
        return canViewDocument(actor, document);
    }

    public boolean canManageDocument(Object principal, UUID documentId) {
        SystemUser actor = resolveActor(principal);
        EmployeeDocument document = documentRepository.findById(documentId).orElse(null);
        if (document == null) return false;
        return canManageDocument(actor, document);
    }

    public boolean canManageDocument(Object principal, DocumentType type) {
        SystemUser actor = resolveActor(principal);
        if (actor == null) return false;
        if (hasRole(actor, SystemRole.ADMINISTRATOR) || hasRole(actor, SystemRole.DIRECTION_GENERALE)) return true;
        return hasRole(actor, SystemRole.RH);
    }

    public boolean canViewVersion(Object principal, UUID versionId) {
        SystemUser actor = resolveActor(principal);
        DocumentVersion version = versionRepository.findById(versionId).orElse(null);
        if (version == null) return false;
        return canViewDocument(actor, version.getDocument());
    }

    private SystemUser resolveActor(Object principal) {
        if (principal instanceof SystemUser su) return su;
        if (principal instanceof org.springframework.security.core.userdetails.User u) {
            return systemUserRepository.findByEmail(u.getUsername()).orElse(null);
        }
        return getCurrentUser();
    }

    public boolean canViewEmployee(SystemUser actor, Employee employee) {
        if (actor == null) return false;
        if (hasRole(actor, SystemRole.ADMINISTRATOR) || hasRole(actor, SystemRole.DIRECTION_GENERALE)) {
            return true;
        }
        if (hasRole(actor, SystemRole.MANAGER)) {
            if (actor.getEmployeeProfile() != null) {
                if (actor.getEmployeeProfile().getId().equals(employee.getId())) return true;
                // Check transitive manager chain: walk up from employee to find actor
                if (isManagerInChain(employee, actor.getEmployeeProfile())) return true;
            }
        }
        if (hasRole(actor, SystemRole.RH)) {
            return true;
        }
        return false;
    }

    private boolean isManagerInChain(Employee target, Employee potentialManager) {
        Employee current = target.getManager();
        while (current != null) {
            if (current.getId().equals(potentialManager.getId())) return true;
            // Fetch next manager (Lazy might need reload)
            if (current.getManager() == null) break;
            current = current.getManager();
        }
        return false;
    }

    public boolean canViewDocument(SystemUser actor, EmployeeDocument document) {
        if (actor == null) return false;
        if (hasRole(actor, SystemRole.ADMINISTRATOR) || hasRole(actor, SystemRole.DIRECTION_GENERALE)) {
            return true;
        }
        if (hasRole(actor, SystemRole.MANAGER)) {
            if (actor.getEmployeeProfile() == null) return false;
            // Can view own documents
            if (document.getEmployee().getId().equals(actor.getEmployeeProfile().getId())) return true;
            // Can view transitive subordinates' documents
            return isManagerInChain(document.getEmployee(), actor.getEmployeeProfile());
        }
        return hasRole(actor, SystemRole.RH);
    }

    public boolean canManageDocument(SystemUser actor, EmployeeDocument document) {
        if (actor == null) return false;
        if (hasRole(actor, SystemRole.ADMINISTRATOR) || hasRole(actor, SystemRole.DIRECTION_GENERALE)) return true;
        return hasRole(actor, SystemRole.RH);
    }

    /** Annonces internes : seuls l'administrateur et la direction generale peuvent publier. */
    public boolean canSendAnnouncements(SystemUser actor) {
        if (actor == null || actor.getRoles() == null) return false;
        return actor.getRoles().contains(SystemRole.ADMINISTRATOR)
                || actor.getRoles().contains(SystemRole.DIRECTION_GENERALE);
    }

    private boolean hasRole(SystemUser actor, SystemRole role) {
        return actor != null && actor.getRoles() != null && actor.getRoles().contains(role);
    }
}
