package GED.ged_backend.service;

import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.EmployeeStatus;
import GED.ged_backend.repository.EmployeeRepository;
import GED.ged_backend.repository.EmployeeSpecifications;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final GED.ged_backend.repository.DepartmentRepository departmentRepository;

    public EmployeeService(EmployeeRepository employeeRepository, GED.ged_backend.repository.DepartmentRepository departmentRepository) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
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

    public void deactivateEmployee(UUID id) {
        Employee e = employeeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
        e.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(e);
    }

    public void deleteEmployee(UUID id) {
        if (!employeeRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found");
        }
        employeeRepository.deleteById(id);
    }

    public void assignDirectReports(UUID managerId, Set<UUID> reportIds) {
        Employee manager = managerId == null ? null : employeeRepository.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Manager not found"));

        for (UUID reportId : reportIds) {
            Employee report = employeeRepository.findById(reportId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee report not found"));
            report.setManager(manager);
            employeeRepository.save(report);
        }
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
