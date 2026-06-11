package GED.ged_backend.security;

import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.proc.BadJWTException;
import GED.ged_backend.domain.entity.SystemUser;
import GED.ged_backend.repository.SystemUserRepository;
import java.io.IOException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Collection;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.filter.OncePerRequestFilter;

public class SupabaseAuthenticationFilter extends OncePerRequestFilter {

    private final DefaultJWTProcessor<SecurityContext> jwtProcessor;
    private final SystemUserRepository userRepository;

    public SupabaseAuthenticationFilter(DefaultJWTProcessor<SecurityContext> jwtProcessor, SystemUserRepository userRepository) {
        this.jwtProcessor = jwtProcessor;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String auth = request.getHeader("Authorization");
        
        if (auth != null && auth.startsWith("Bearer ")) {
            String token = auth.substring(7);
            try {
                SignedJWT signedJWT = SignedJWT.parse(token);
                var claims = jwtProcessor.process(signedJWT, null);
                String email = (String) claims.getStringClaim("email");

                if (email != null) {
                    var userOpt = userRepository.findByEmail(email);
                    if (userOpt.isPresent()) {
                        SystemUser user = userOpt.get();
                        
                        if (user.isActive()) {
                            Collection<GrantedAuthority> authorities = new ArrayList<>();
                            if (user.getRoles() != null) {
                                user.getRoles().forEach(role -> {
                                    // Map both styles to be 100% bulletproof for matchers
                                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
                                    authorities.add(new SimpleGrantedAuthority(role.name()));
                                });
                            }

                            // FIX: Build a standard Spring UserDetails principal object instead of passing raw entity
                            User principal = new User(user.getEmail(), "", authorities);

                            Authentication authentication = new UsernamePasswordAuthenticationToken(
                                    principal, // ◄── Standard Spring principal
                                    null,      // Clear credentials
                                    authorities
                            );
                            
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                            System.out.println("[AUTH] Successfully synchronized security context for: " + email);
                        }
                    }
                }
            } catch (ParseException | BadJWTException e) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token structure");
                return;
            } catch (Exception ex) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token validation error");
                return;
            }
        }

        // Always executes seamlessly down the filter chain
        filterChain.doFilter(request, response);
    }
}