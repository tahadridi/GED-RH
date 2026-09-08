package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.EmployeeDocument;
import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.service.DocumentService;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public class DocumentSpecifications {

    public static Specification<EmployeeDocument> withSearchCriteria(DocumentService.SearchCriteria criteria, SystemUser actor) {
        return (root, query, cb) -> {
            // Explicit fetch to avoid LazyInitializationException with open-in-view=false
            root.fetch("employee", JoinType.INNER);
            List<Predicate> predicates = new ArrayList<>();

            // 1. Security Filtering (Database Level)
            if (actor != null) {
                if (!actor.getRoles().contains(SystemRole.ADMINISTRATOR)
                        && !actor.getRoles().contains(SystemRole.DIRECTION_GENERALE)
                        && !actor.getRoles().contains(SystemRole.RH)) {
                    if (actor.getRoles().contains(SystemRole.MANAGER)) {
                        // Manager can see own and direct reports' documents
                        if (actor.getEmployeeProfile() != null) {
                            predicates.add(cb.or(
                                cb.equal(root.get("employee").get("id"), actor.getEmployeeProfile().getId()),
                                cb.equal(root.get("employee").get("manager").get("id"), actor.getEmployeeProfile().getId())
                            ));
                        } else {
                            predicates.add(cb.disjunction());
                        }
                    } else {
                        // Regular employee can only see their own documents
                        if (actor.getEmployeeProfile() != null) {
                            predicates.add(cb.equal(root.get("employee").get("id"), actor.getEmployeeProfile().getId()));
                        } else {
                            predicates.add(cb.disjunction());
                        }
                    }
                }
            }

            // 2. Functional Filtering
            if (criteria.query() != null && !criteria.query().isBlank()) {
                String pattern = "%" + criteria.query().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("documentReference")), pattern),
                    cb.like(cb.lower(root.get("employee").get("firstName")), pattern),
                    cb.like(cb.lower(root.get("employee").get("lastName")), pattern),
                    cb.like(cb.lower(root.get("employee").get("matricule")), pattern)
                ));
            }
            if (criteria.type() != null) {
                predicates.add(cb.equal(root.get("type"), criteria.type()));
            }
            if (criteria.employeeId() != null) {
                predicates.add(cb.equal(root.get("employee").get("id"), criteria.employeeId()));
            }
            if (criteria.department() != null && !criteria.department().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("employee").get("department")), criteria.department().toLowerCase()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
