package GED.ged_backend.domain.entity;

import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import com.github.f4b6a3.uuid.UuidCreator;

@Entity
@Table(name = "system_users", indexes = {
	@Index(name = "idx_user_email", columnList = "email", unique = true),
	@Index(name = "idx_user_auth_uid", columnList = "authUid", unique = true)
})
public class SystemUser {

	@Id
	private UUID id;

	@PrePersist
	protected void onCreate() {
		if (this.id == null) {
			this.id = UuidCreator.getTimeOrderedEpoch();
		}
	}

	@Column(nullable = false, unique = true, length = 128)
	private String authUid;

	@Column(nullable = false, unique = true, length = 255)
	private String email;

	@Column(length = 120)
	private String firstName;

	@Column(length = 120)
	private String lastName;

	@Column(nullable = false)
	private boolean active = true;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "manager_id")
	@com.fasterxml.jackson.annotation.JsonIgnore
	private SystemUser manager;

	@OneToOne(mappedBy = "account", fetch = FetchType.LAZY)
	@com.fasterxml.jackson.annotation.JsonIgnore
	private Employee employeeProfile;

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "system_user_roles", joinColumns = @JoinColumn(name = "user_id"))
	@Enumerated(EnumType.STRING)
	@Column(name = "role_name", nullable = false, length = 64)
	private Set<SystemRole> roles = new LinkedHashSet<>();

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "system_user_rh_responsibilities", joinColumns = @JoinColumn(name = "user_id"))
	@Enumerated(EnumType.STRING)
	@Column(name = "document_type", nullable = false, length = 64)
	private Set<DocumentType> rhResponsibilities = new LinkedHashSet<>();

	public UUID getId() {
		return id;
	}

	public String getAuthUid() {
		return authUid;
	}

	public void setAuthUid(String authUid) {
		this.authUid = authUid;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getFirstName() {
		return firstName;
	}

	public void setFirstName(String firstName) {
		this.firstName = firstName;
	}

	public String getLastName() {
		return lastName;
	}

	public void setLastName(String lastName) {
		this.lastName = lastName;
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

	public SystemUser getManager() {
		return manager;
	}

	public void setManager(SystemUser manager) {
		this.manager = manager;
	}

	public Employee getEmployeeProfile() {
		return employeeProfile;
	}

	public void setEmployeeProfile(Employee employeeProfile) {
		this.employeeProfile = employeeProfile;
	}

	public Set<SystemRole> getRoles() {
		return roles;
	}

	public void setRoles(Set<SystemRole> roles) {
		this.roles = roles;
	}

	public Set<DocumentType> getRhResponsibilities() {
		return rhResponsibilities;
	}

	public void setRhResponsibilities(Set<DocumentType> rhResponsibilities) {
		this.rhResponsibilities = rhResponsibilities;
	}
}