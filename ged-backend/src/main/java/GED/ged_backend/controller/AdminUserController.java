package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.service.AdminUserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

	private final AdminUserService adminUserService;

	public AdminUserController(AdminUserService adminUserService) {
		this.adminUserService = adminUserService;
	}

	@GetMapping("/test")
	public String test() {
		return "OK - admin endpoint reached";
	}

	@PostMapping("/test")
	public String testPost(@RequestBody(required = false) String body) {
		return "POST OK - reached controller";
	}

	@GetMapping
	public Set<UserResponse> listUsers() {
		Set<UserResponse> responses = new LinkedHashSet<>();
		for (SystemUser user : adminUserService.listUsers()) {
			responses.add(UserResponse.from(user));
		}
		return responses;
	}

	@GetMapping("/{userId}")
	public UserResponse getUser(@PathVariable UUID userId) {
		return UserResponse.from(adminUserService.getUser(userId));
	}

	@PostMapping
	public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
		System.out.println("[ADMIN] createUser called: " + request.email());
		return UserResponse.from(adminUserService.createUser(request.toCommand()));
	}

	@PutMapping("/{userId}")
	public UserResponse updateUser(@PathVariable UUID userId, @Valid @RequestBody UpdateUserRequest request) {
		return UserResponse.from(adminUserService.updateUser(userId, request.toCommand()));
	}

	@DeleteMapping("/{userId}/deactivate")
	public UserResponse deactivateUser(@PathVariable UUID userId) {
		return UserResponse.from(adminUserService.deactivateUser(userId));
	}

	@DeleteMapping("/{userId}")
	public void deleteUser(@PathVariable UUID userId) {
		adminUserService.deleteUser(userId);
	}

	@PostMapping("/{userId}/reset-password")
	public void resetPassword(@PathVariable UUID userId) {
		adminUserService.resetPassword(userId);
	}

	@PostMapping("/{userId}/assign-manager/{managerId}")
	public UserResponse assignManager(@PathVariable UUID userId, @PathVariable UUID managerId) {
		return UserResponse.from(adminUserService.assignManager(userId, managerId));
	}

	@PostMapping("/{userId}/rh-responsibilities")
	public UserResponse assignRhResponsibilities(@PathVariable UUID userId, @Valid @RequestBody AssignResponsibilitiesRequest request) {
		return UserResponse.from(adminUserService.assignRhResponsibilities(userId, request.rhResponsibilities()));
	}

	public record CreateUserRequest(
			@NotBlank @Email String email,
			@NotBlank String firstName,
			@NotBlank String lastName,
			UUID managerId,
			@NotEmpty Set<SystemRole> roles,
			Set<DocumentType> rhResponsibilities,
			@NotBlank String temporaryPassword) {

		public AdminUserService.CreateAdminUserCommand toCommand() {
			return new AdminUserService.CreateAdminUserCommand(
					email,
					firstName,
					lastName,
					managerId,
					roles,
					rhResponsibilities == null ? Set.of() : rhResponsibilities,
					temporaryPassword);
		}
	}

	public record UpdateUserRequest(
			@NotBlank @Email String email,
			@NotBlank String firstName,
			@NotBlank String lastName,
			boolean active,
			UUID managerId,
			@NotEmpty Set<SystemRole> roles,
			Set<DocumentType> rhResponsibilities) {

		public AdminUserService.UpdateAdminUserCommand toCommand() {
			return new AdminUserService.UpdateAdminUserCommand(
					email,
					firstName,
					lastName,
					active,
					managerId,
					roles,
					rhResponsibilities == null ? Set.of() : rhResponsibilities);
		}
	}

	public record AssignResponsibilitiesRequest(@NotEmpty Set<DocumentType> rhResponsibilities) {
	}

	    public record UserResponse(
		    UUID id,
		    String authUid,
			String email,
			String firstName,
			String lastName,
			boolean active,
			UUID managerId,
			UUID employeeProfileId,
			Set<SystemRole> roles,
			Set<DocumentType> rhResponsibilities) {

		public static UserResponse from(SystemUser user) {
			return new UserResponse(
					user.getId(),
					user.getAuthUid(),
					user.getEmail(),
					user.getFirstName(),
					user.getLastName(),
					user.isActive(),
					user.getManager() == null ? null : user.getManager().getId(),
					user.getEmployeeProfile() == null ? null : user.getEmployeeProfile().getId(),
					user.getRoles(),
					user.getRhResponsibilities());
		}
	}
}