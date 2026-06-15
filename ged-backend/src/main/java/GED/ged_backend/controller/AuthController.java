package GED.ged_backend.controller;

import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.domain.enums.DocumentType;
import GED.ged_backend.domain.enums.SystemRole;
import GED.ged_backend.repository.SystemUserRepository;
import GED.ged_backend.service.AccessControlService;
import GED.ged_backend.service.StorageService;
import java.io.InputStream;
import java.util.Set;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AccessControlService accessControlService;
    private final SystemUserRepository userRepository;
    private final StorageService storageService;

    public AuthController(AccessControlService accessControlService, SystemUserRepository userRepository, StorageService storageService) {
        this.accessControlService = accessControlService;
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    @GetMapping("/me")
    public ProfileResponse me() {
        SystemUser user = accessControlService.getCurrentUser();
        if (user == null) {
            throw new UnauthorizedException();
        }
        return ProfileResponse.from(user);
    }

    @PutMapping("/profile")
    @Transactional
    public ProfileResponse updateProfile(@RequestBody UpdateProfileRequest req) {
        SystemUser user = accessControlService.getCurrentUser();
        if (user == null) throw new UnauthorizedException();
        if (req.firstName != null) user.setFirstName(req.firstName);
        if (req.lastName != null) user.setLastName(req.lastName);
        if (req.email != null) user.setEmail(req.email);
        userRepository.save(user);
        return ProfileResponse.from(user);
    }

    @PostMapping(value = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ProfileResponse uploadPhoto(@RequestPart("file") MultipartFile file) throws Exception {
        SystemUser user = accessControlService.getCurrentUser();
        if (user == null) throw new UnauthorizedException();

        // Delete old photo if exists
        if (user.getPhotoPath() != null) {
            try { storageService.deleteFile(user.getPhotoPath()); } catch (Exception ignored) {}
        }

        String path = "user-photos/" + user.getId() + "_" + file.getOriginalFilename();
        storageService.uploadFile(path, file.getInputStream(), file.getContentType());
        user.setPhotoPath(path);
        userRepository.save(user);
        return ProfileResponse.from(user);
    }

    @GetMapping("/photo/content")
    public ResponseEntity<InputStreamResource> getPhoto() {
        SystemUser user = accessControlService.getCurrentUser();
        if (user == null || user.getPhotoPath() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No photo");
        }
        InputStream is = storageService.downloadFile(user.getPhotoPath());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"photo\"")
                .contentType(MediaType.IMAGE_JPEG)
                .body(new InputStreamResource(is));
    }

    public record ProfileResponse(
            UUID id,
            String email,
            String firstName,
            String lastName,
            Set<SystemRole> roles,
            Set<DocumentType> rhResponsibilities,
            boolean active,
            UUID employeeId,
            String matricule,
            String photoUrl) {

        public static ProfileResponse from(SystemUser user) {
            UUID empId = user.getEmployeeProfile() != null ? user.getEmployeeProfile().getId() : null;
            String matricule = user.getEmployeeProfile() != null ? user.getEmployeeProfile().getMatricule() : null;
            String photoUrl = user.getPhotoPath() != null ? "/auth/photo/content" :
                (user.getEmployeeProfile() != null && user.getEmployeeProfile().getPhotoPath() != null
                    ? "/employees/" + user.getEmployeeProfile().getId() + "/photo/content" : null);
            return new ProfileResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getRoles(),
                    user.getRhResponsibilities(),
                    user.isActive(),
                    empId,
                    matricule,
                    photoUrl);
        }
    }

    public record UpdateProfileRequest(String email, String firstName, String lastName) {}

    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    private static class UnauthorizedException extends RuntimeException {}
}
