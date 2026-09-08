package GED.ged_backend.domain.entity;

import GED.ged_backend.domain.enums.EmployeeStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "employees")
public class Employee {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, unique = true, length = 50)
	private String matricule;

	@Column(nullable = false, length = 120)
	private String firstName;

	@Column(nullable = false, length = 120)
	private String lastName;

	@Column(length = 255)
	private String email;

	@Column(length = 20)
	private String phoneNumber;

	@Column(length = 500)
	private String address;

	@Column(length = 500)
	private String photoPath;

	@Column(length = 120)
	private String department;

	@Column(length = 120)
	private String position;

	private LocalDate hireDate;

	private LocalDate terminationDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 32)
	private EmployeeStatus status = EmployeeStatus.ACTIVE;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "manager_id")
	@com.fasterxml.jackson.annotation.JsonIgnore
	private Employee manager;

	@OneToMany(mappedBy = "manager", fetch = FetchType.LAZY)
	@com.fasterxml.jackson.annotation.JsonIgnore
	private Set<Employee> directReports = new LinkedHashSet<>();

	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "account_id", unique = true)
	@com.fasterxml.jackson.annotation.JsonIgnore
	private SystemUser account;

	@OneToMany(mappedBy = "employee", fetch = FetchType.LAZY)
	@com.fasterxml.jackson.annotation.JsonIgnore
	private Set<EmployeeDocument> documents = new LinkedHashSet<>();

	public UUID getId() {
		return id;
	}

	public String getMatricule() {
		return matricule;
	}

	public void setMatricule(String matricule) {
		this.matricule = matricule;
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

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPhoneNumber() {
		return phoneNumber;
	}

	public void setPhoneNumber(String phoneNumber) {
		this.phoneNumber = phoneNumber;
	}

	public String getAddress() {
		return address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public String getDepartment() {
		return department;
	}

	public void setDepartment(String department) {
		this.department = department;
	}

	public String getPosition() {
		return position;
	}

	public void setPosition(String position) {
		this.position = position;
	}

	public LocalDate getHireDate() {
		return hireDate;
	}

	public void setHireDate(LocalDate hireDate) {
		this.hireDate = hireDate;
	}

	public LocalDate getTerminationDate() {
		return terminationDate;
	}

	public void setTerminationDate(LocalDate terminationDate) {
		this.terminationDate = terminationDate;
	}

	public String getPhotoPath() {
		return photoPath;
	}

	public void setPhotoPath(String photoPath) {
		this.photoPath = photoPath;
	}

	public EmployeeStatus getStatus() {
		return status;
	}

	public void setStatus(EmployeeStatus status) {
		this.status = status;
	}

	public Employee getManager() {
		return manager;
	}

	public void setManager(Employee manager) {
		this.manager = manager;
	}

	public Set<Employee> getDirectReports() {
		return directReports;
	}

	public void setDirectReports(Set<Employee> directReports) {
		this.directReports = directReports;
	}

	public SystemUser getAccount() {
		return account;
	}

	public void setAccount(SystemUser account) {
		this.account = account;
	}

	public Set<EmployeeDocument> getDocuments() {
		return documents;
	}

	public void setDocuments(Set<EmployeeDocument> documents) {
		this.documents = documents;
	}
}