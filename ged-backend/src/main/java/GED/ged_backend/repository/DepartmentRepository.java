package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.Department;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
}
