package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.EmployeeDocument;
import GED.ged_backend.domain.enums.DocumentType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, UUID>, JpaSpecificationExecutor<EmployeeDocument> {

	List<EmployeeDocument> findByEmployee_Id(UUID employeeId);

	List<EmployeeDocument> findByType(DocumentType type);

	long countByCreatedAtGreaterThanEqual(Instant start);

	@Query("select coalesce(sum(d.fileSize), 0) from EmployeeDocument d")
	long sumFileSize();

	@Query("select count(distinct d.employee.id) from EmployeeDocument d")
	long countDistinctEmployees();

	@Query("select d.type, count(d) from EmployeeDocument d group by d.type")
	List<Object[]> countByType();
}