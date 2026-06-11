package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.JobPosition;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobPositionRepository extends JpaRepository<JobPosition, UUID> {
}
