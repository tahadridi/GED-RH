package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.service.AccessControlService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AccessControlService accessControlService;

    public AuthController(AccessControlService accessControlService) {
        this.accessControlService = accessControlService;
    }

    @GetMapping("/me")
    public ProfileResponse me() {
        SystemUser user = accessControlService.getCurrentUser();
        if (user == null) {
            throw new UnauthorizedException();
        }
        return ProfileResponse.from(user);
    }

    public record ProfileResponse(
            UUID id,
            String email,
            String firstName,
            String lastName,
            Set<SystemRole> roles,
            Set<DocumentType> rhResponsibilities,
            boolean active) {

        public static ProfileResponse from(SystemUser user) {
            return new ProfileResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getRoles(),
                    user.getRhResponsibilities(),
                    user.isActive());
        }
    }

    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    private static class UnauthorizedException extends RuntimeException {}
}
