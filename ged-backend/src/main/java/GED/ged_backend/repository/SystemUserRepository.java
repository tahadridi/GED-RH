package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.SystemUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemUserRepository extends JpaRepository<SystemUser, UUID> {

	Optional<SystemUser> findByAuthUid(String authUid);

	Optional<SystemUser> findByEmail(String email);
}