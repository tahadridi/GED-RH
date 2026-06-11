package GED.ged_backend.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "departments")
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 10)
    private String matriculePrefix;

    @Column(length = 255)
    private String description;

    @OneToMany(mappedBy = "department", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private java.util.List<JobPosition> positions = new java.util.ArrayList<>();

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getMatriculePrefix() {
        return matriculePrefix;
    }

    public void setMatriculePrefix(String matriculePrefix) {
        this.matriculePrefix = matriculePrefix;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public java.util.List<JobPosition> getPositions() {
        return positions;
    }

    public void setPositions(java.util.List<JobPosition> positions) {
        this.positions = positions;
    }
}
