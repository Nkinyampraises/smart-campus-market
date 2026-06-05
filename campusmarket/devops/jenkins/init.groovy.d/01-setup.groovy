import jenkins.model.*
import hudson.security.*

def instance = Jenkins.getInstance()

// ── Create admin user (skip if already configured) ───────────────────────────
if (!(instance.getSecurityRealm() instanceof HudsonPrivateSecurityRealm)) {
  def realm = new HudsonPrivateSecurityRealm(false)
  // Admin password is set via JENKINS_ADMIN_PASSWORD env var, or falls back to the default
  // The setup-devops.sh script also injects credentials via the Jenkins Script Console
  def adminPass = System.getenv('JENKINS_ADMIN_PASSWORD') ?: 'nkinyam2023'
  realm.createAccount('admin', adminPass)
  instance.setSecurityRealm(realm)

  def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
  strategy.setAllowAnonymousRead(false)
  instance.setAuthorizationStrategy(strategy)
}

// ── CSRF ────────────────────────────────────────────────────────────────────
def csrf = instance.getCrumbIssuer()
if (csrf == null) {
  instance.setCrumbIssuer(new hudson.security.csrf.DefaultCrumbIssuer(true))
}

instance.save()
// Credentials (DockerHub, SonarQube) are injected by setup-devops.sh after first boot
println '✅ Jenkins init: admin user created, CSRF configured'
