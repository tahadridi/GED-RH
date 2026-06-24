package GED.ged_backend.config;

import GED.ged_backend.repository.EmployeeRepository;
import GED.ged_backend.repository.EmployeeSpecifications;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SpecificationsConfig {

    private final EmployeeRepository employeeRepository;

    public SpecificationsConfig(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @PostConstruct
    public void init() {
        EmployeeSpecifications.setEmployeeRepository(employeeRepository);
    }
}