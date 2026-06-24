package GED.ged_backend.service;

import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.EmployeeStatus;
import GED.ged_backend.repository.EmployeeRepository;
import GED.ged_backend.repository.EmployeeSpecifications;
import java.io.InputStream;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final GED.ged_backend.repository.DepartmentRepository departmentRepository;
    private final StorageService storageService;

    public EmployeeService(EmployeeRepository employeeRepository, GED.ged_backend.repository.DepartmentRepository departmentRepository, StorageService storageService) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.storageService = storageService;
    }

    public Employee createEmployee(CreateEmployeeCommand cmd) {
        String matricule = cmd.matricule();
        if (matricule == null || matricule.isBlank()) {
            matricule = generateMatricule(cmd.department());
        }

        if (employeeRepository.findByMatricule(matricule).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Matricule already exists: " + matricule);
        }

        Employee e = new Employee();
        e.setMatricule(matricule);
        e.setFirstName(cmd.firstName());
        e.setLastName(cmd.lastName());
        e.setEmail(cmd.email());
        e.setPhoneNumber(cmd.phoneNumber());
        e.setAddress(cmd.address());
        e.setDepartment(cmd.department());
        e.setPosition(cmd.position());
        e.setHireDate(cmd.hireDate());
        e.setStatus(cmd.status() == null ? EmployeeStatus.ACTIVE : cmd.status());

        if (cmd.managerId() != null) {
            Employee mgr = employeeRepository.findById(cmd.managerId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found"));
            e.setManager(mgr);
        }

        return employeeRepository.save(e);
    }

    private String generateMatricule(String departmentName) {
        if (departmentName == null || departmentName.isBlank()) return "EMP-" + System.currentTimeMillis();
        
        var deptOpt = departmentRepository.findAll().stream()
                .filter(d -> d.getName().equalsIgnoreCase(departmentName))
                .findFirst();
        
        String prefix = deptOpt.map(d -> d.getMatriculePrefix()).orElse("EMP");
        String searchPrefix = prefix + "-";
        
        return employeeRepository.findTopByMatriculeStartingWithOrderByMatriculeDesc(searchPrefix)
                .map(last -> {
                    String lastMat = last.getMatricule();
                    try {
                        int num = Integer.parseInt(lastMat.substring(searchPrefix.length()));
                        return searchPrefix + String.format("%03d", num + 1);
                    } catch (Exception e) {
                        return searchPrefix + String.format("%03d", 1);
                    }
                })
                .orElse(searchPrefix + "001");
    }

    public Employee updateEmployee(UUID id, UpdateEmployeeCommand cmd) {
        Employee e = employeeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));

        e.setFirstName(cmd.firstName());
        e.setLastName(cmd.lastName());
        e.setEmail(cmd.email());
        e.setPhoneNumber(cmd.phoneNumber());
        e.setAddress(cmd.address());
        e.setDepartment(cmd.department());
        e.setPosition(cmd.position());
        e.setHireDate(cmd.hireDate());
        if (cmd.status() != null) e.setStatus(cmd.status());

        if (cmd.managerId() != null) {
            Employee mgr = employeeRepository.findById(cmd.managerId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found"));
            e.setManager(mgr);
        } else {
            e.setManager(null);
        }

        return employeeRepository.save(e);
    }

    @Transactional(readOnly = true)
    public Employee getEmployee(UUID id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
    }

    @Transactional(readOnly = true)
    public Set<Employee> listEmployees(SystemUser actor) {
        return new LinkedHashSet<>(employeeRepository.findAll(EmployeeSpecifications.withSecurityFilter(actor)));
    }

    @Transactional(readOnly = true)
    public Set<Employee> listEmployees() {
        return new LinkedHashSet<>(employeeRepository.findAll());
    }

    @Transactional(readOnly = true)
    public Page<Employee> listEmployeesPaginated(SystemUser actor, String search, String department, EmployeeStatus status, Pageable pageable) {
        Specification<Employee> spec = Specification
            .where(EmployeeSpecifications.withSecurityFilter(actor))
            .and(EmployeeSpecifications.withFilters(search, department, status));
        return employeeRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Employee> getTopLevelManagers() {
        return employeeRepository.findAll().stream()
                .filter(e -> e.getManager() == null)
                .toList();
    }

    public void deactivateEmployee(UUID id) {
        Employee e = employeeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
        e.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(e);
    }

    public void deleteEmployee(UUID id) {
        Employee e = employeeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
        
        // Remove this employee as manager from all subordinates first to avoid FK constraint error
        employeeRepository.findAll().stream()
                .filter(report -> report.getManager() != null && report.getManager().getId().equals(id))
                .forEach(report -> {
                    report.setManager(null);
                    employeeRepository.save(report);
                });

        employeeRepository.delete(e);
    }

    public void assignDirectReports(UUID managerId, Set<UUID> reportIds) {
        Employee manager = managerId == null ? null : employeeRepository.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found"));

        // Unassign reports that were removed
        if (managerId != null) {
            employeeRepository.findByManagerId(managerId).stream()
                    .filter(report -> !reportIds.contains(report.getId()))
                    .forEach(report -> {
                        report.setManager(null);
                        employeeRepository.save(report);
                    });
        }

        // Assign new reports
        for (UUID reportId : reportIds) {
            Employee report = employeeRepository.findById(reportId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee report not found"));
            report.setManager(manager);
            employeeRepository.save(report);
        }
    }

    public Employee savePhoto(UUID id, InputStream fileStream, String contentType, String originalFilename) {
        Employee e = employeeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));

        // Delete old photo if exists
        if (e.getPhotoPath() != null) {
            storageService.deleteFile(e.getPhotoPath());
        }

        // Extract extension from the uploaded file
        String ext = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        String fileName = "photos/" + id + ext;
        storageService.uploadFile(fileName, fileStream, contentType);
        e.setPhotoPath(fileName);
        return employeeRepository.save(e);
    }

    public record CreateEmployeeCommand(
            String matricule,
            String firstName,
            String lastName,
            String email,
            String phoneNumber,
            String address,
            String department,
            String position,
            java.time.LocalDate hireDate,
            EmployeeStatus status,
            UUID managerId) {
    }

    public record UpdateEmployeeCommand(
            String firstName,
            String lastName,
            String email,
            String phoneNumber,
            String address,
            String department,
            String position,
            java.time.LocalDate hireDate,
            EmployeeStatus status,
            UUID managerId) {
    }
}
