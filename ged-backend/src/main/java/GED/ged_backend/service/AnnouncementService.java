package GED.ged_backend.service;

import GED.ged_backend.domain.entity.Announcement;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.AnnouncementPriority;
import GED.ged_backend.repository.AnnouncementRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;

    public AnnouncementService(AnnouncementRepository announcementRepository) {
        this.announcementRepository = announcementRepository;
    }

    public Announcement create(CreateAnnouncementCommand cmd, SystemUser author) {
        Announcement a = new Announcement();
        a.setTitle(cmd.title());
        a.setContent(cmd.content());
        if (cmd.priority() != null) {
            a.setPriority(cmd.priority());
        }
        a.setAuthor(author);
        return announcementRepository.save(a);
    }

    @Transactional(readOnly = true)
    public List<Announcement> listAll() {
        return announcementRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Announcement getById(UUID id) {
        return announcementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Annonce introuvable"));
    }

    public Announcement update(UUID id, CreateAnnouncementCommand cmd) {
        Announcement a = getById(id);
        a.setTitle(cmd.title());
        a.setContent(cmd.content());
        if (cmd.priority() != null) {
            a.setPriority(cmd.priority());
        }
        return announcementRepository.save(a);
    }

    public void delete(UUID id) {
        Announcement a = getById(id);
        announcementRepository.delete(a);
    }

    public record CreateAnnouncementCommand(String title, String content, AnnouncementPriority priority) {}
}
