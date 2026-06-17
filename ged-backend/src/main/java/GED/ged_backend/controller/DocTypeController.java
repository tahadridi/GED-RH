package GED.ged_backend.controller;

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

import GED.ged_backend.domain.entity.DocTypeEntity;
import GED.ged_backend.repository.DocTypeEntityRepository;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/doc-types")
public class DocTypeController {

    private final DocTypeEntityRepository repository;

    public DocTypeController(DocTypeEntityRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<DocTypeResponse> list() {
        return repository.findAll().stream()
                .map(DocTypeResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DocTypeResponse create(@RequestBody CreateDocTypeRequest req) {
        DocTypeEntity entity = new DocTypeEntity();
        entity.setName(req.name());
        entity.setDescription(req.description());
        return DocTypeResponse.from(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        repository.deleteById(id);
    }

    public record CreateDocTypeRequest(@NotBlank String name, String description) {}

    public record DocTypeResponse(UUID id, String name, String description) {
        public static DocTypeResponse from(DocTypeEntity e) {
            return new DocTypeResponse(e.getId(), e.getName(), e.getDescription());
        }
    }
}
