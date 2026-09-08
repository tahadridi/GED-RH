package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.Announcement;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.AnnouncementPriority;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.service.AccessControlService;
import GED.ged_backend.service.AnnouncementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/announcements")
@Tag(name = "Annonces", description = "Gestion des annonces internes — creation, consultation, suppression")
public class AnnouncementController {

    private final AnnouncementService announcementService;
    private final AccessControlService accessControlService;

    public AnnouncementController(AnnouncementService announcementService, AccessControlService accessControlService) {
        this.announcementService = announcementService;
        this.accessControlService = accessControlService;
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Creer une annonce", description = "Reserve aux administrateurs et a la direction generale.")
    public AnnouncementResponse create(@RequestBody CreateAnnouncementRequest req) {
        SystemUser author = accessControlService.getCurrentUser();
        if (author == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!accessControlService.canSendAnnouncements(author)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Seuls l'administrateur et la direction generale peuvent publier des annonces.");
        }
        Announcement a = announcementService.create(
                new AnnouncementService.CreateAnnouncementCommand(req.title, req.content, req.priority()), author);
        return AnnouncementResponse.from(a);
    }

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Lister les annonces", description = "Retourne toutes les annonces triees par date descendante.")
    public List<AnnouncementResponse> list() {
        return announcementService.listAll().stream().map(AnnouncementResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    @Operation(summary = "Obtenir une annonce par ID")
    public AnnouncementResponse get(@PathVariable UUID id) {
        return AnnouncementResponse.from(announcementService.getById(id));
    }

    @PutMapping("/{id}")
    @Transactional
    @Operation(summary = "Modifier une annonce")
    public AnnouncementResponse update(@PathVariable UUID id, @RequestBody CreateAnnouncementRequest req) {
        requireAnnouncementEditor();
        Announcement a = announcementService.update(id, new AnnouncementService.CreateAnnouncementCommand(req.title, req.content, req.priority()));
        return AnnouncementResponse.from(a);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une annonce")
    public void delete(@PathVariable UUID id) {
        requireAnnouncementEditor();
        announcementService.delete(id);
    }

    private void requireAnnouncementEditor() {
        SystemUser actor = accessControlService.getCurrentUser();
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (!accessControlService.canSendAnnouncements(actor)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Seuls l'administrateur et la direction generale peuvent gerer des annonces.");
        }
    }

    @Schema(description = "Requete de creation d'une annonce")
    public record CreateAnnouncementRequest(
            @NotBlank @Schema(description = "Titre", example = "Nouvelle politique RH") String title,
            @NotBlank @Schema(description = "Contenu") String content,
            @Schema(description = "Priorite (NORMALE, HAUTE, CRITIQUE)", example = "HAUTE") AnnouncementPriority priority) {}

    @Schema(description = "Annonce interne")
    public record AnnouncementResponse(
            @Schema(description = "ID") UUID id,
            @Schema(description = "Titre") String title,
            @Schema(description = "Contenu") String content,
            @Schema(description = "Priorite") String priority,
            @Schema(description = "Date de creation") LocalDateTime createdAt,
            @Schema(description = "ID de l'auteur") UUID authorId,
            @Schema(description = "Nom de l'auteur") String authorName,
            @Schema(description = "Role de l'auteur (ADMINISTRATOR ou DIRECTION_GENERALE)") String authorRole) {

        public static AnnouncementResponse from(Announcement a) {
            String authorRole = "";
            if (a.getAuthor().getRoles() != null) {
                authorRole = a.getAuthor().getRoles().contains(SystemRole.DIRECTION_GENERALE)
                        ? "DIRECTION_GENERALE"
                        : a.getAuthor().getRoles().contains(SystemRole.ADMINISTRATOR) ? "ADMINISTRATOR" : "";
            }
            return new AnnouncementResponse(
                    a.getId(),
                    a.getTitle(),
                    a.getContent(),
                    a.getPriority().name(),
                    a.getCreatedAt(),
                    a.getAuthor().getId(),
                    a.getAuthor().getFirstName() + " " + a.getAuthor().getLastName(),
                    authorRole);
        }
    }
}
