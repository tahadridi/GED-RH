package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.Employee;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {

	Optional<Employee> findByMatricule(String matricule);

	Optional<Employee> findByEmail(String email);

	List<Employee> findByManagerId(UUID managerId);

	Optional<Employee> findTopByMatriculeStartingWithOrderByMatriculeDesc(String prefix);
}