package GED.ged_backend.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import com.github.f4b6a3.uuid.UuidCreator;

@Entity
@Table(name = "document_versions", indexes = {
	@Index(name = "idx_ver_document", columnList = "document_id, versionNumber")
})
public class DocumentVersion {

	@Id
	private UUID id;

	@PrePersist
	protected void onCreate() {
		if (this.id == null) {
			this.id = UuidCreator.getTimeOrderedEpoch();
		}
	}

	@Column(nullable = false)
	private Integer versionNumber;

	@Column(nullable = false, length = 512)
	private String storagePath;

	@Column(length = 255)
	private String uploadedBy;

	@Column(nullable = false)
	private Instant createdAt = Instant.now();

	@Lob
	@Column(columnDefinition = "text")
	private String ocrText;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "document_id", nullable = false)
	@com.fasterxml.jackson.annotation.JsonIgnore
	private EmployeeDocument document;

	public UUID getId() {
		return id;
	}

	public Integer getVersionNumber() {
		return versionNumber;
	}

	public void setVersionNumber(Integer versionNumber) {
		this.versionNumber = versionNumber;
	}

	public String getStoragePath() {
		return storagePath;
	}

	public void setStoragePath(String storagePath) {
		this.storagePath = storagePath;
	}

	public String getUploadedBy() {
		return uploadedBy;
	}

	public void setUploadedBy(String uploadedBy) {
		this.uploadedBy = uploadedBy;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}

	public String getOcrText() {
		return ocrText;
	}

	public void setOcrText(String ocrText) {
		this.ocrText = ocrText;
	}

	public EmployeeDocument getDocument() {
		return document;
	}

	public void setDocument(EmployeeDocument document) {
		this.document = document;
	}
}