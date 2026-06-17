package GED.ged_backend.controller;

import GED.ged_backend.service.StorageService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/storage")
public class StorageController {

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(storageService.getBucketStats());
    }

    @GetMapping("/disk")
    public ResponseEntity<Map<String, Object>> getDiskInfo() {
        return ResponseEntity.ok(storageService.getDiskInfo());
    }
}
