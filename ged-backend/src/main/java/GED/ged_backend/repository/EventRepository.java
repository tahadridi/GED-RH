package GED.ged_backend.repository;

import GED.ged_backend.domain.entity.Event;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<Event, UUID> {
    List<Event> findAllByOrderByEventDateAsc();
    List<Event> findByAuthor_IdOrderByEventDateAsc(UUID authorId);
    List<Event> findByAuthor_IdAndEventDateOrderByStartTimeAsc(UUID authorId, LocalDate eventDate);
    List<Event> findByAuthor_IdAndEventDateGreaterThanEqualOrderByEventDateAscStartTimeAsc(UUID authorId, LocalDate from);
    List<Event> findByAuthor_IdAndEventDateBetweenOrderByEventDateAscStartTimeAsc(UUID authorId, LocalDate from, LocalDate to);
    List<Event> findByEventDateOrderByStartTimeAsc(LocalDate eventDate);
    List<Event> findByEventDateGreaterThanEqualOrderByEventDateAscStartTimeAsc(LocalDate from);
    List<Event> findByEventDateBetweenOrderByEventDateAscStartTimeAsc(LocalDate from, LocalDate to);
}