package GED.ged_backend.controller;

import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

	@GetMapping("/api/health")
	public Map<String, Object> health() {
		return Map.of(
				"status", "UP",
				"service", "ged-backend",
				"timestamp", Instant.now().toString());
	}
}