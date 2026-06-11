package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.domain.enums.EmployeeStatus;
import GED.ged_backend.service.EmployeeService;
import GED.ged_backend.service.AccessControlService;
import GED.ged_backend.domain.entity.SystemUser;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final AccessControlService accessControlService;

    public EmployeeController(EmployeeService employeeService, AccessControlService accessControlService) {
        this.employeeService = employeeService;
        this.accessControlService = accessControlService;
    }

    @GetMapping
    public Set<EmployeeResponse> list() {
        SystemUser actor = accessControlService.getCurrentUser();
        return employeeService.listEmployees().stream()
                .filter(e -> accessControlService.canViewEmployee(actor, e))
                .map(EmployeeResponse::from)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @GetMapping("/{id}")
    public EmployeeResponse get(@PathVariable UUID id) {
        SystemUser actor = accessControlService.getCurrentUser();
        Employee e = employeeService.getEmployee(id);
        if (!accessControlService.canViewEmployee(actor, e)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied");
        }
        return EmployeeResponse.from(e);
    }

    @PostMapping
    public EmployeeResponse create(@RequestBody CreateEmployeeRequest req) {
        Employee e = employeeService.createEmployee(new EmployeeService.CreateEmployeeCommand(
                req.matricule, req.firstName, req.lastName, req.email,
                req.phoneNumber, req.address,
                req.department, req.position, req.hireDate, req.status, req.managerId));
        return EmployeeResponse.from(e);
    }

    @PutMapping("/{id}")
    public EmployeeResponse update(@PathVariable UUID id, @RequestBody UpdateEmployeeRequest req) {
        Employee e = employeeService.updateEmployee(id, new EmployeeService.UpdateEmployeeCommand(
                req.firstName, req.lastName, req.email, req.phoneNumber, req.address,
                req.department, req.position, req.hireDate, req.status, req.managerId));
        return EmployeeResponse.from(e);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        employeeService.deleteEmployee(id);
    }

    @PostMapping("/{managerId}/reports")
    public void assignReports(@PathVariable UUID managerId, @RequestBody Set<UUID> reportIds) {
        employeeService.assignDirectReports(managerId, reportIds);
    }

    public static class CreateEmployeeRequest {
        public String matricule;
        @NotBlank public String firstName;
        @NotBlank public String lastName;
        @Email public String email;
        public String phoneNumber;
        public String address;
        public String department;
        public String position;
        public LocalDate hireDate;
        public EmployeeStatus status;
        public UUID managerId;
    }

    public static class UpdateEmployeeRequest {
        @NotBlank public String firstName;
        @NotBlank public String lastName;
        @Email public String email;
        public String phoneNumber;
        public String address;
        public String department;
        public String position;
        public LocalDate hireDate;
        public EmployeeStatus status;
        public UUID managerId;
    }

    public record EmployeeResponse(
            UUID id,
            String matricule,
            String firstName,
            String lastName,
            String email,
            String phoneNumber,
            String address,
            String department,
            String position,
            LocalDate hireDate,
            EmployeeStatus status,
            UUID managerId) {

        public static EmployeeResponse from(Employee e) {
            return new EmployeeResponse(
                    e.getId(), e.getMatricule(), e.getFirstName(), e.getLastName(), e.getEmail(),
                    e.getPhoneNumber(), e.getAddress(),
                    e.getDepartment(), e.getPosition(), e.getHireDate(), e.getStatus(),
                    e.getManager() == null ? null : e.getManager().getId());
        }
    }
}
