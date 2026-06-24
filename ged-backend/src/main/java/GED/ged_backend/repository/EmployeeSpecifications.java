package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.EmployeeStatus;
import GED.ged_backend.domain.enums.SystemRole;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public class EmployeeSpecifications {

    private static EmployeeRepository employeeRepository;

    public static void setEmployeeRepository(EmployeeRepository repo) {
        employeeRepository = repo;
    }

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
                    UUID actorId = actor.getEmployeeProfile().getId();
                    // See own profile + all transitive descendants
                    List<UUID> descendantIds = employeeRepository.findAllDescendantIds(actorId);
                    descendantIds.add(actorId);
                    return root.get("id").in(descendantIds);
                }
            }

            // Regular user sees only themselves
            if (actor.getEmployeeProfile() != null) {
                return cb.equal(root.get("id"), actor.getEmployeeProfile().getId());
            }

            return cb.disjunction();
        };
    }

    public static Specification<Employee> withFilters(String search, String department, EmployeeStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("firstName")), pattern),
                    cb.like(cb.lower(root.get("lastName")), pattern),
                    cb.like(cb.lower(root.get("matricule")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern),
                    cb.like(cb.lower(root.get("department")), pattern),
                    cb.like(cb.lower(root.get("position")), pattern)
                ));
            }

            if (department != null && !department.isBlank()) {
                predicates.add(cb.equal(root.get("department"), department));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
