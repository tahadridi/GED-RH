package GED.ged_backend.service;

import java.util.Map;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class ReclamationWebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public ReclamationWebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyReclamationUpdate(String userId, Map<String, String> payload) {
        messagingTemplate.convertAndSend("/topic/reclamations/" + userId, payload);
    }

    public void notifyReclamationUpdateAdmin(Map<String, String> payload) {
        messagingTemplate.convertAndSend("/topic/reclamations/admin", payload);
    }
}
