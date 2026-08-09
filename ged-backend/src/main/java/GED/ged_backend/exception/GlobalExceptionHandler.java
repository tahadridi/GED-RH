package GED.ged_backend.exception;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
		int status = ex.getStatusCode().value();
		String message = ex.getReason();
		if (message == null || message.isBlank()) {
			message = defaultMessageFor(status);
		}
		return ResponseEntity.status(ex.getStatusCode()).body(body(message, status));
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<Map<String, Object>> handleMaxUpload(MaxUploadSizeExceededException ex) {
		return ResponseEntity.status(HttpStatusCode.valueOf(413))
				.body(body("Le fichier est trop volumineux. Taille maximale autorisée : 10 Mo.", 413));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
		ResponseStatus rs = ex.getClass().getAnnotation(ResponseStatus.class);
		if (rs != null) {
			int status = rs.value().value();
			return ResponseEntity.status(status).body(body(defaultMessageFor(status), status));
		}
		log.error("Unhandled exception", ex);
		return ResponseEntity.status(HttpStatusCode.valueOf(500))
				.body(body("Une erreur interne est survenue. Veuillez réessayer plus tard.", 500));
	}

	private Map<String, Object> body(String message, int status) {
		Map<String, Object> map = new LinkedHashMap<>();
		map.put("message", message);
		map.put("status", status);
		return map;
	}

	private String defaultMessageFor(int status) {
		return switch (status) {
			case 400 -> "La demande est invalide. Vérifiez les informations saisies.";
			case 401 -> "Votre session a expiré. Veuillez vous reconnecter.";
			case 403 -> "Vous n'avez pas les droits nécessaires pour effectuer cette action.";
			case 404 -> "La ressource demandée est introuvable.";
			case 409 -> "Conflit de données : la ressource existe peut-être déjà.";
			case 413 -> "Le fichier est trop volumineux. Taille maximale autorisée : 10 Mo.";
			case 422 -> "Les données envoyées sont invalides.";
			case 502, 503, 504 -> "Le service est temporairement indisponible. Réessayez plus tard.";
			default -> "Une erreur est survenue. Veuillez réessayer.";
		};
	}
}
