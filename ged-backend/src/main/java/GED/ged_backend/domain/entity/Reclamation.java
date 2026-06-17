package GED.ged_backend.domain.entity;

import GED.ged_backend.domain.enums.ReclamationPriority;
import GED.ged_backend.domain.enums.ReclamationStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.github.f4b6a3.uuid.UuidCreator;

@Entity
@Table(name = "reclamations")
public class Reclamation {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private SystemUser employee;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(length = 512)
    private String newValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ReclamationStatus status = ReclamationStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime processedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private SystemUser processedBy;

    @Column(nullable = false)
    private boolean acknowledged = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ReclamationPriority priority = ReclamationPriority.MOYENNE;

    @Column(length = 255)
    private String rejectionReason;

    @Column(columnDefinition = "TEXT")
    private String rejectionComment;

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getRejectionComment() { return rejectionComment; }
    public void setRejectionComment(String rejectionComment) { this.rejectionComment = rejectionComment; }

    public ReclamationPriority getPriority() { return priority; }
    public void setPriority(ReclamationPriority priority) { this.priority = priority; }

    public boolean isAcknowledged() { return acknowledged; }
    public void setAcknowledged(boolean acknowledged) { this.acknowledged = acknowledged; }

    public UUID getId() { return id; }

    public SystemUser getEmployee() { return employee; }
    public void setEmployee(SystemUser employee) { this.employee = employee; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getNewValue() { return newValue; }
    public void setNewValue(String newValue) { this.newValue = newValue; }

    public ReclamationStatus getStatus() { return status; }
    public void setStatus(ReclamationStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }

    public SystemUser getProcessedBy() { return processedBy; }
    public void setProcessedBy(SystemUser processedBy) { this.processedBy = processedBy; }
}
