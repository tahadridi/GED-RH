package GED.ged_backend.service;

import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.repository.SystemUserRepository;
import GED.ged_backend.repository.EmployeeRepository;
import GED.ged_backend.domain.entity.Employee;
import GED.ged_backend.config.SupabaseAdminClient;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class AdminUserService {

	private final SystemUserRepository systemUserRepository;
	private final EmployeeRepository employeeRepository;
	private final org.springframework.beans.factory.ObjectProvider<SupabaseAdminClient> supabaseClientProvider;

	public AdminUserService(SystemUserRepository systemUserRepository, EmployeeRepository employeeRepository, org.springframework.beans.factory.ObjectProvider<SupabaseAdminClient> supabaseClientProvider) {
		this.systemUserRepository = systemUserRepository;
		this.employeeRepository = employeeRepository;
		this.supabaseClientProvider = supabaseClientProvider;
	}

	public SystemUser createUser(CreateAdminUserCommand command) {
		if (systemUserRepository.findByEmail(command.email()).isPresent()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
		}

		SystemUser user = new SystemUser();
		user.setEmail(command.email());
		user.setFirstName(command.firstName());
		user.setLastName(command.lastName());
		user.setActive(true);
		user.setRoles(new LinkedHashSet<>(command.roles()));
		user.setRhResponsibilities(new LinkedHashSet<>(command.rhResponsibilities()));
		user.setAuthUid(createSupabaseAccountIfPossible(command));

		if (command.managerId() != null) {
			user.setManager(findUser(command.managerId()));
		}

		SystemUser savedUser = systemUserRepository.save(user);

		// Mandatory link to employee
		Employee emp = employeeRepository.findById(command.employeeId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee not found"));
		emp.setAccount(savedUser);
		employeeRepository.save(emp);

		return savedUser;
	}

	public SystemUser updateUser(UUID userId, UpdateAdminUserCommand command) {
		SystemUser user = findUser(userId);
		user.setEmail(command.email());
		user.setFirstName(command.firstName());
		user.setLastName(command.lastName());
		user.setActive(command.active());
		user.setRoles(new LinkedHashSet<>(command.roles()));
		user.setRhResponsibilities(new LinkedHashSet<>(command.rhResponsibilities()));

		if (command.managerId() != null) {
			user.setManager(findUser(command.managerId()));
		}
		else {
			user.setManager(null);
		}

		SystemUser savedUser = systemUserRepository.save(user);

		// Sync employee profile info if exists
		employeeRepository.findByEmail(command.email()).ifPresent(emp -> {
			emp.setFirstName(command.firstName());
			emp.setLastName(command.lastName());
			emp.setAccount(savedUser);
			employeeRepository.save(emp);
		});

		return savedUser;
	}

	public SystemUser deactivateUser(UUID userId) {
		SystemUser user = findUser(userId);
		user.setActive(false);
		return systemUserRepository.save(user);
	}

	public void deleteUser(UUID userId) {
		SystemUser user = findUser(userId);
		// Delete from Supabase Auth first
		SupabaseAdminClient client = supabaseClientProvider.getIfAvailable();
		if (client != null && user.getAuthUid() != null && !user.getAuthUid().startsWith("local-")) {
			try {
				client.deleteUser(user.getAuthUid());
			} catch (Exception e) {
				System.err.println("[SUPABASE] Could not delete user from Supabase: " + e.getMessage());
			}
		}
		// Delete from local DB
		systemUserRepository.delete(user);
	}

	public Map<String, String> resetPassword(UUID userId) {
		SystemUser user = findUser(userId);
		SupabaseAdminClient client = supabaseClientProvider.getIfAvailable();
		if (client == null) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Supabase admin is not enabled");
		}

		String tempPassword = generateTemporaryPassword();
		try {
			client.updateUser(user.getAuthUid(), Map.of("password", tempPassword));
		} catch (Exception exception) {
			throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to reset Supabase password", exception);
		}

		return Map.of("temporaryPassword", tempPassword);
	}

	public SystemUser assignManager(UUID userId, UUID managerId) {
		SystemUser user = findUser(userId);
		user.setManager(managerId == null ? null : findUser(managerId));
		return systemUserRepository.save(user);
	}

	public SystemUser assignRhResponsibilities(UUID userId, Set<DocumentType> responsibilities) {
		SystemUser user = findUser(userId);
		user.setRhResponsibilities(new LinkedHashSet<>(responsibilities));
		return systemUserRepository.save(user);
	}

	@Transactional(readOnly = true)
	public SystemUser getUser(UUID userId) {
		return findUser(userId);
	}

	@Transactional(readOnly = true)
	public Set<SystemUser> listUsers() {
		return new LinkedHashSet<>(systemUserRepository.findAll());
	}

	private SystemUser findUser(UUID userId) {
		return systemUserRepository.findById(userId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
	}

	private String createSupabaseAccountIfPossible(CreateAdminUserCommand command) {
		SupabaseAdminClient client = supabaseClientProvider.getIfAvailable();
		if (client == null) {
			return "local-" + UUID.randomUUID();
		}

		try {
			var resp = client.createUser(command.email(), command.temporaryPassword(), command.firstName() + " " + command.lastName());
			Object id = resp.get("id");
			return id == null ? "supabase-" + UUID.randomUUID() : id.toString();
		} catch (org.springframework.web.client.HttpClientErrorException e) {
			System.err.println("[SUPABASE] HTTP error creating user: " + e.getStatusCode() + " - " + e.getResponseBodyAsString());
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Supabase error: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e);
		} catch (Exception exception) {
			System.err.println("[SUPABASE] Exception creating user: " + exception.getMessage());
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to create Supabase user", exception);
		}
	}

	private String generateTemporaryPassword() {
		return "Temp!" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
	}

	public record CreateAdminUserCommand(
			String email,
			String firstName,
			String lastName,
			UUID managerId,
			UUID employeeId,
			Set<SystemRole> roles,
			Set<DocumentType> rhResponsibilities,
			String temporaryPassword) {
	}

	public record UpdateAdminUserCommand(
			String email,
			String firstName,
			String lastName,
			boolean active,
			UUID managerId,
			Set<SystemRole> roles,
			Set<DocumentType> rhResponsibilities) {
	}
}