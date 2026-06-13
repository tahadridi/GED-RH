package GED.ged_backend.domain.entity;

import GED.ged_backend.domain.enums.DocumentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "employee_documents")
public class EmployeeDocument {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, unique = true, length = 80)
	private String documentReference;

	@Column(nullable = false, length = 255)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 64)
	private DocumentType type;

	@Column(nullable = false)
	private Integer currentVersion = 1;

	@Column(nullable = false)
	private Instant createdAt = Instant.now();

	@Column(nullable = false)
	private Instant updatedAt = Instant.now();

	@Column(length = 255)
	private String author;

	@Column(nullable = false, length = 512)
	private String storagePath;

	@Lob
	@Column(columnDefinition = "text")
	private String ocrText;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "employee_id", nullable = false)
	@com.fasterxml.jackson.annotation.JsonIgnore
	private Employee employee;

	@OneToMany(mappedBy = "document", fetch = FetchType.LAZY)
	@com.fasterxml.jackson.annotation.JsonIgnore
	private Set<DocumentVersion> versions = new LinkedHashSet<>();

	public UUID getId() {
		return id;
	}

	public String getDocumentReference() {
		return documentReference;
	}

	public void setDocumentReference(String documentReference) {
		this.documentReference = documentReference;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public DocumentType getType() {
		return type;
	}

	public void setType(DocumentType type) {
		this.type = type;
	}

	public Integer getCurrentVersion() {
		return currentVersion;
	}

	public void setCurrentVersion(Integer currentVersion) {
		this.currentVersion = currentVersion;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(Instant updatedAt) {
		this.updatedAt = updatedAt;
	}

	public String getAuthor() {
		return author;
	}

	public void setAuthor(String author) {
		this.author = author;
	}

	public String getStoragePath() {
		return storagePath;
	}

	public void setStoragePath(String storagePath) {
		this.storagePath = storagePath;
	}

	public String getOcrText() {
		return ocrText;
	}

	public void setOcrText(String ocrText) {
		this.ocrText = ocrText;
	}

	public Employee getEmployee() {
		return employee;
	}

	public void setEmployee(Employee employee) {
		this.employee = employee;
	}

	public Set<DocumentVersion> getVersions() {
		return versions;
	}

	public void setVersions(Set<DocumentVersion> versions) {
		this.versions = versions;
	}
}