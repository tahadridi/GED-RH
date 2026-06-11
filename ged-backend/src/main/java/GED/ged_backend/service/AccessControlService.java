package GED.ged_backend.service;

import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.entity.EmployeeDocument;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.repository.SystemUserRepository;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AccessControlService {

    private final SystemUserRepository systemUserRepository;

    public AccessControlService(SystemUserRepository systemUserRepository) {
        this.systemUserRepository = systemUserRepository;
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

    public boolean canViewEmployee(SystemUser actor, Employee employee) {
        if (actor == null) return false;
        if (hasRole(actor, SystemRole.ADMINISTRATOR) || hasRole(actor, SystemRole.DIRECTION_GENERALE)) {
            return true;
        }
        if (hasRole(actor, SystemRole.MANAGER)) {
            if (actor.getEmployeeProfile() != null) {
                if (actor.getEmployeeProfile().getId().equals(employee.getId())) return true;
                if (employee.getManager() != null &&
                        actor.getEmployeeProfile().getId().equals(employee.getManager().getId())) return true;
            }
        }
        if (hasRole(actor, SystemRole.RH)) {
            return true;
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
            // Can view direct reports' documents
            return document.getEmployee().getManager() != null
                    && actor.getEmployeeProfile().getId().equals(document.getEmployee().getManager().getId());
        }
        if (hasRole(actor, SystemRole.RH)) {
            Set<DocumentType> responsibilities = actor.getRhResponsibilities();
            return responsibilities != null && responsibilities.contains(document.getType());
        }
        return false;
    }

    public boolean canManageDocument(SystemUser actor, EmployeeDocument document) {
        if (actor == null) return false;
        if (hasRole(actor, SystemRole.ADMINISTRATOR)) return true;
        if (hasRole(actor, SystemRole.RH)) {
            Set<DocumentType> responsibilities = actor.getRhResponsibilities();
            return responsibilities != null && responsibilities.contains(document.getType());
        }
        return false;
    }

    private boolean hasRole(SystemUser actor, SystemRole role) {
        return actor != null && actor.getRoles() != null && actor.getRoles().contains(role);
    }
}
