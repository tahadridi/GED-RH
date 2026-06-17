package GED.ged_backend.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import GED.ged_backend.domain.entity.DocTypeEntity;
import java.util.Optional;

public interface DocTypeEntityRepository extends JpaRepository<DocTypeEntity, UUID> {
    Optional<DocTypeEntity> findByName(String name);
}
