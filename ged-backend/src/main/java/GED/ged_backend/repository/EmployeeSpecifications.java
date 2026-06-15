package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.SystemRole;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public class EmployeeSpecifications {

    public static Specification<Employee> withSecurityFilter(SystemUser actor) {
        return (root, query, cb) -> {
            if (actor == null) return cb.disjunction();

            if (actor.getRoles().contains(SystemRole.ADMINISTRATOR) || 
                actor.getRoles().contains(SystemRole.DIRECTION_GENERALE) ||
                actor.getRoles().contains(SystemRole.RH)) {
                return cb.conjunction(); // Can see all
            }

            if (actor.getRoles().contains(SystemRole.MANAGER)) {
                if (actor.getEmployeeProfile() != null) {
                    return cb.equal(root.get("manager").get("id"), actor.getEmployeeProfile().getId());
                }
            }

            // Regular user sees only themselves
            if (actor.getEmployeeProfile() != null) {
                return cb.equal(root.get("id"), actor.getEmployeeProfile().getId());
            }

            return cb.disjunction();
        };
    }
}
