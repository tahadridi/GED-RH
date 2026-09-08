package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.enums.EmployeeStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {

	Optional<Employee> findByMatricule(String matricule);

	Optional<Employee> findByEmail(String email);

	List<Employee> findByManagerId(UUID managerId);

	Optional<Employee> findTopByMatriculeStartingWithOrderByMatriculeDesc(String prefix);

	long countByStatus(EmployeeStatus status);

	@Query("select count(distinct e.department) from Employee e where e.department is not null")
	long countDistinctDepartments();

	@Query(value = """
		WITH RECURSIVE descendants AS (
			SELECT id FROM employees WHERE manager_id = :managerId
			UNION ALL
			SELECT e.id FROM employees e INNER JOIN descendants d ON e.manager_id = d.id
		)
		SELECT id FROM descendants
	""", nativeQuery = true)
	List<UUID> findAllDescendantIds(@Param("managerId") UUID managerId);
}