package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.Department;
import GED.ged_backend.domain.entity.JobPosition;
import GED.ged_backend.repository.DepartmentRepository;
import GED.ged_backend.repository.JobPositionRepository;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/organization")
public class OrganizationController {

    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;

    public OrganizationController(DepartmentRepository departmentRepository,
            JobPositionRepository jobPositionRepository) {
        this.departmentRepository = departmentRepository;
        this.jobPositionRepository = jobPositionRepository;
    }

    @GetMapping("/departments")
    public List<DepartmentResponse> listDepartments() {
        return departmentRepository.findAll().stream()
                .map(DepartmentResponse::from)
                .toList();
    }

    @PostMapping("/departments")
    @ResponseStatus(HttpStatus.CREATED)
    public DepartmentResponse createDepartment(@RequestBody CreateDepartmentRequest req) {
        Department dept = new Department();
        dept.setName(req.name());
        dept.setMatriculePrefix(req.matriculePrefix());
        dept.setDescription(req.description());
        return DepartmentResponse.from(departmentRepository.save(dept));
    }

    @DeleteMapping("/departments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDepartment(@PathVariable UUID id) {
        departmentRepository.deleteById(id);
    }

    @PostMapping("/departments/{deptId}/positions")
    @ResponseStatus(HttpStatus.CREATED)
    public PositionResponse createPosition(@PathVariable UUID deptId, @RequestBody CreatePositionRequest req) {
        Department dept = departmentRepository.findById(deptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Département introuvable."));
        JobPosition pos = new JobPosition();
        pos.setTitle(req.title());
        pos.setDepartment(dept);
        return PositionResponse.from(jobPositionRepository.save(pos));
    }

    @DeleteMapping("/positions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePosition(@PathVariable UUID id) {
        jobPositionRepository.deleteById(id);
    }

    public record CreateDepartmentRequest(@NotBlank String name, @NotBlank String matriculePrefix, String description) {}
    public record CreatePositionRequest(@NotBlank String title) {}

    public record PositionResponse(UUID id, String title) {
        public static PositionResponse from(JobPosition p) {
            return new PositionResponse(p.getId(), p.getTitle());
        }
    }

    public record DepartmentResponse(
            UUID id, String name, String matriculePrefix, String description,
            List<PositionResponse> positions) {

        public static DepartmentResponse from(Department d) {
            return new DepartmentResponse(
                    d.getId(), d.getName(), d.getMatriculePrefix(), d.getDescription(),
                    d.getPositions().stream().map(PositionResponse::from).toList());
        }
    }
}
