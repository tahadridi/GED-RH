package GED.ged_backend.service;

import GED.ged_backend.domain.entity.Department;
import GED.ged_backend.domain.entity.JobPosition;
import GED.ged_backend.repository.DepartmentRepository;
import GED.ged_backend.repository.JobPositionRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class OrganizationService {

    private final DepartmentRepository departmentRepository;
    private final JobPositionRepository jobPositionRepository;

    public OrganizationService(DepartmentRepository departmentRepository, JobPositionRepository jobPositionRepository) {
        this.departmentRepository = departmentRepository;
        this.jobPositionRepository = jobPositionRepository;
    }

    // Departments
    public Department createDepartment(String name, String matriculePrefix, String description) {
        Department d = new Department();
        d.setName(name);
        d.setMatriculePrefix(matriculePrefix);
        d.setDescription(description);
        return departmentRepository.save(d);
    }

    public List<Department> listDepartments() {
        return departmentRepository.findAll();
    }

    public void deleteDepartment(UUID id) {
        departmentRepository.deleteById(id);
    }

    // Positions
    public JobPosition createPosition(UUID departmentId, String title) {
        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Département introuvable."));
        JobPosition p = new JobPosition();
        p.setTitle(title);
        p.setDepartment(dept);
        return jobPositionRepository.save(p);
    }

    public List<JobPosition> listPositions() {
        return jobPositionRepository.findAll();
    }

    public void deletePosition(UUID id) {
        jobPositionRepository.deleteById(id);
    }
}
