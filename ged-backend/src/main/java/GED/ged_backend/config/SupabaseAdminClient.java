package GED.ged_backend.config;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

public class SupabaseAdminClient {

    private final String supabaseUrl;
    private final String serviceRoleKey;
    private final RestTemplate restTemplate;

    public SupabaseAdminClient(String supabaseUrl, String serviceRoleKey, RestTemplate restTemplate) {
        this.supabaseUrl = supabaseUrl;
        this.serviceRoleKey = serviceRoleKey;
        this.restTemplate = restTemplate;
    }

    public Map<?, ?> createUser(String email, String password, String displayName) {
        String url = supabaseUrl + "/auth/v1/admin/users";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        Map<String, Object> body = Map.of(
            "email", email,
            "password", password,
            "email_confirm", true,
            "user_metadata", Map.of("display_name", displayName)
        );
        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
        return restTemplate.postForObject(url, req, Map.class);
    }

    public Map<?, ?> updateUser(String uid, Map<String, Object> updates) {
        String url = supabaseUrl + "/auth/v1/admin/users/" + uid;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        HttpEntity<Map<String, Object>> req = new HttpEntity<>(updates, headers);
        var response = restTemplate.exchange(url, org.springframework.http.HttpMethod.PUT, req, Map.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Supabase admin API returned " + response.getStatusCode());
        }
        return response.getBody() != null ? response.getBody() : Map.of();
    }

    public void deleteUser(String uid) {
        String url = supabaseUrl + "/auth/v1/admin/users/" + uid;
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        restTemplate.delete(url, headers);
    }

    public void revokeSessions(String uid) {
        String url = supabaseUrl + "/auth/v1/admin/users/" + uid + "/sessions";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        restTemplate.exchange(url, HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);
    }
}
