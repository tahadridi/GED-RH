package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.Event;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.EventPriority;
import GED.ged_backend.service.AccessControlService;
import GED.ged_backend.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/events")
@Tag(name = "Événements", description = "Calendrier interne — création, consultation, modification et suppression d'activités")
public class EventController {

    private final EventService eventService;
    private final AccessControlService accessControlService;

    public EventController(EventService eventService, AccessControlService accessControlService) {
        this.eventService = eventService;
        this.accessControlService = accessControlService;
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Créer un événement", description = "Ajoute une activité au calendrier.")
    public EventResponse create(@RequestBody CreateEventRequest req) {
        SystemUser author = accessControlService.getCurrentUser();
        if (author == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        Event e = eventService.create(
                new EventService.CreateEventCommand(req.title(), req.description(), req.eventDate(), req.startTime(), req.priority()), author);
        return EventResponse.from(e);
    }

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Lister les événements", description = "Retourne les événements de l'utilisateur connecté triés par date croissante.")
    public List<EventResponse> list() {
        SystemUser author = accessControlService.getCurrentUser();
        if (author == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return eventService.listAllForUser(author).stream().map(EventResponse::from).toList();
    }

    @GetMapping("/upcoming")
    @Transactional(readOnly = true)
    @Operation(summary = "Événements à venir", description = "Retourne les événements à venir de l'utilisateur connecté à partir d'une date (aujourd'hui par défaut).")
    public List<EventResponse> upcoming(
            @RequestParam(name = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from) {
        SystemUser author = accessControlService.getCurrentUser();
        if (author == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        LocalDate start = from != null ? from : LocalDate.now();
        return eventService.listUpcomingForUser(author, start).stream().map(EventResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    @Operation(summary = "Obtenir un événement par ID")
    public EventResponse get(@PathVariable UUID id) {
        SystemUser author = accessControlService.getCurrentUser();
        if (author == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return EventResponse.from(eventService.getByIdForUser(id, author));
    }

    @PutMapping("/{id}")
    @Transactional
    @Operation(summary = "Modifier un événement", description = "Modifie un événement appartenant à l'utilisateur connecté.")
    public EventResponse update(@PathVariable UUID id, @RequestBody CreateEventRequest req) {
        SystemUser author = accessControlService.getCurrentUser();
        if (author == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        Event e = eventService.updateForUser(id,
                new EventService.CreateEventCommand(req.title(), req.description(), req.eventDate(), req.startTime(), req.priority()), author);
        return EventResponse.from(e);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un événement", description = "Supprime un événement appartenant à l'utilisateur connecté.")
    public void delete(@PathVariable UUID id) {
        SystemUser author = accessControlService.getCurrentUser();
        if (author == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        eventService.deleteForUser(id, author);
    }

    @Schema(description = "Requête de création/modification d'un événement")
    public record CreateEventRequest(
            @NotBlank @Schema(description = "Titre", example = "Réunion d'équipe") String title,
            @Schema(description = "Description") String description,
            @NotNull @Schema(description = "Date de l'événement", example = "2026-09-05") LocalDate eventDate,
            @Schema(description = "Heure de début", example = "10:00") LocalTime startTime,
            @Schema(description = "Priorité (NORMALE, MOYENNE, HAUTE, CRITIQUE)", example = "HAUTE") EventPriority priority) {}

    @Schema(description = "Événement du calendrier")
    public record EventResponse(
            @Schema(description = "ID") UUID id,
            @Schema(description = "Titre") String title,
            @Schema(description = "Description") String description,
            @Schema(description = "Date de l'événement") LocalDate eventDate,
            @Schema(description = "Heure de début") LocalTime startTime,
            @Schema(description = "Priorité") String priority,
            @Schema(description = "Date de création") LocalDateTime createdAt,
            @Schema(description = "ID de l'auteur") UUID authorId,
            @Schema(description = "Nom de l'auteur") String authorName) {

        public static EventResponse from(Event e) {
            SystemUser author = e.getAuthor();
            return new EventResponse(
                    e.getId(),
                    e.getTitle(),
                    e.getDescription(),
                    e.getEventDate(),
                    e.getStartTime(),
                    e.getPriority().name(),
                    e.getCreatedAt(),
                    author.getId(),
                    author.getFirstName() + " " + author.getLastName());
        }
    }
}