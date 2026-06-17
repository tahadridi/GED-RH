package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.Reclamation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReclamationRepository extends JpaRepository<Reclamation, UUID> {
    List<Reclamation> findAllByOrderByCreatedAtDesc();
    List<Reclamation> findByEmployee_IdOrderByCreatedAtDesc(UUID employeeId);

    @Query("SELECT r FROM Reclamation r WHERE r.employee.manager.id = :managerId ORDER BY r.createdAt DESC")
    List<Reclamation> findByEmployeeManagerIdOrderByCreatedAtDesc(@Param("managerId") UUID managerId);
}
