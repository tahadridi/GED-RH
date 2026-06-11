package GED.ged_backend.config;

import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.util.DefaultResourceRetriever;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.JWSAlgorithm;
import java.net.MalformedURLException;
import java.net.URL;
import java.time.Duration;
import java.util.Objects;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableConfigurationProperties(SupabaseProperties.class)
public class SupabaseConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    @ConditionalOnProperty(prefix = "app.supabase", name = "enabled", havingValue = "true")
    public DefaultJWTProcessor<SecurityContext> jwtProcessor(SupabaseProperties properties) throws MalformedURLException {
        String jwks = properties.getJwksUrl();
        if (jwks == null || jwks.isBlank()) {
            // default JWKS endpoint for Supabase
            jwks = properties.getUrl();
            if (!jwks.endsWith("/")) jwks += "/";
            jwks += "auth/v1/.well-known/jwks.json";
        }

        URL jwksUrl = new URL(jwks);
        DefaultResourceRetriever retriever = new DefaultResourceRetriever((int) Duration.ofSeconds(5).toMillis(), (int) Duration.ofSeconds(5).toMillis());
        JWKSource<SecurityContext> jwkSource = new RemoteJWKSet<>(jwksUrl, retriever);

        DefaultJWTProcessor<SecurityContext> jwtProcessor = new DefaultJWTProcessor<>();
        JWSKeySelector<SecurityContext> keySelector = new JWSVerificationKeySelector<>(JWSAlgorithm.ES256, jwkSource);
        jwtProcessor.setJWSKeySelector(keySelector);
        return jwtProcessor;
    }

    @Bean
    @ConditionalOnProperty(prefix = "app.supabase", name = "enabled", havingValue = "true")
    public SupabaseAdminClient supabaseAdminClient(SupabaseProperties properties, RestTemplate restTemplate) {
        return new SupabaseAdminClient(properties.getUrl(), properties.getServiceRoleKey(), restTemplate);
    }
}
