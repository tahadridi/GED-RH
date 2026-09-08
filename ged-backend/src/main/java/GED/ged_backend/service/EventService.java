package GED.ged_backend.service;

import GED.ged_backend.domain.entity.Event;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.EventPriority;
import GED.ged_backend.repository.EventRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class EventService {

    private final EventRepository eventRepository;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    public Event create(CreateEventCommand cmd, SystemUser author) {
        Event e = new Event();
        e.setTitle(cmd.title());
        e.setDescription(cmd.description());
        e.setEventDate(cmd.eventDate());
        e.setStartTime(cmd.startTime());
        if (cmd.priority() != null) {
            e.setPriority(cmd.priority());
        }
        e.setAuthor(author);
        return eventRepository.save(e);
    }

    @Transactional(readOnly = true)
    public List<Event> listAll() {
        return eventRepository.findAllByOrderByEventDateAsc();
    }

    @Transactional(readOnly = true)
    public List<Event> listAllForUser(SystemUser author) {
        return eventRepository.findByAuthor_IdOrderByEventDateAsc(author.getId());
    }

    @Transactional(readOnly = true)
    public List<Event> listByDate(LocalDate date) {
        return eventRepository.findByEventDateOrderByStartTimeAsc(date);
    }

    @Transactional(readOnly = true)
    public List<Event> listByDateForUser(SystemUser author, LocalDate date) {
        return eventRepository.findByAuthor_IdAndEventDateOrderByStartTimeAsc(author.getId(), date);
    }

    @Transactional(readOnly = true)
    public List<Event> listUpcoming(LocalDate from) {
        return eventRepository.findByEventDateGreaterThanEqualOrderByEventDateAscStartTimeAsc(from);
    }

    @Transactional(readOnly = true)
    public List<Event> listUpcomingForUser(SystemUser author, LocalDate from) {
        return eventRepository.findByAuthor_IdAndEventDateGreaterThanEqualOrderByEventDateAscStartTimeAsc(author.getId(), from);
    }

    @Transactional(readOnly = true)
    public List<Event> listRange(LocalDate from, LocalDate to) {
        return eventRepository.findByEventDateBetweenOrderByEventDateAscStartTimeAsc(from, to);
    }

    @Transactional(readOnly = true)
    public List<Event> listRangeForUser(SystemUser author, LocalDate from, LocalDate to) {
        return eventRepository.findByAuthor_IdAndEventDateBetweenOrderByEventDateAscStartTimeAsc(author.getId(), from, to);
    }

    @Transactional(readOnly = true)
    public Event getById(UUID id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Événement introuvable"));
    }

    @Transactional(readOnly = true)
    public Event getByIdForUser(UUID id, SystemUser author) {
        Event e = eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Événement introuvable"));
        if (!e.getAuthor().getId().equals(author.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Événement introuvable");
        }
        return e;
    }

    public Event update(UUID id, CreateEventCommand cmd) {
        Event e = getById(id);
        e.setTitle(cmd.title());
        e.setDescription(cmd.description());
        e.setEventDate(cmd.eventDate());
        e.setStartTime(cmd.startTime());
        if (cmd.priority() != null) {
            e.setPriority(cmd.priority());
        }
        return eventRepository.save(e);
    }

    public Event updateForUser(UUID id, CreateEventCommand cmd, SystemUser author) {
        Event e = getByIdForUser(id, author);
        e.setTitle(cmd.title());
        e.setDescription(cmd.description());
        e.setEventDate(cmd.eventDate());
        e.setStartTime(cmd.startTime());
        if (cmd.priority() != null) {
            e.setPriority(cmd.priority());
        }
        return eventRepository.save(e);
    }

    public void delete(UUID id) {
        Event e = getById(id);
        eventRepository.delete(e);
    }

    public void deleteForUser(UUID id, SystemUser author) {
        Event e = getByIdForUser(id, author);
        eventRepository.delete(e);
    }

    public record CreateEventCommand(String title, String description, LocalDate eventDate,
                                     java.time.LocalTime startTime, EventPriority priority) {}
}