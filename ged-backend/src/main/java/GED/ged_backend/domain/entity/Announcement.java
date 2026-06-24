package GED.ged_backend.domain.entity;

import GED.ged_backend.domain.enums.AnnouncementPriority;
import com.github.f4b6a3.uuid.UuidCreator;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "announcements")
public class Announcement {

    @Id
    private UUID id;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UuidCreator.getTimeOrderedEpoch();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    @Column(nullable = false, length = 255)
    private String title;

    @Lob
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 16, columnDefinition = "varchar(16) default 'NORMALE'")
    private AnnouncementPriority priority = AnnouncementPriority.NORMALE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private SystemUser author;

    public UUID getId() { return id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public AnnouncementPriority getPriority() { return priority != null ? priority : AnnouncementPriority.NORMALE; }
    public void setPriority(AnnouncementPriority priority) { this.priority = priority; }

    public SystemUser getAuthor() { return author; }
    public void setAuthor(SystemUser author) { this.author = author; }
}
