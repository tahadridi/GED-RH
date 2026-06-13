package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.EmployeeDocument;
import GED.ged_backend.domain.enums.DocumentType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EmployeeDocumentRepository extends JpaRepository<EmployeeDocument, UUID>, JpaSpecificationExecutor<EmployeeDocument> {

	List<EmployeeDocument> findByEmployeeId(UUID employeeId);

	List<EmployeeDocument> findByType(DocumentType type);
}