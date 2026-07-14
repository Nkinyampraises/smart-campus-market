import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.domains.Domain
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl

def tokenFile = new File('/srv/campustrade/shared/sonar-jenkins-token')
if (!tokenFile.exists()) {
  return
}

def token = tokenFile.text.trim()
if (!token) {
  throw new IllegalStateException('The staged SonarQube token is empty.')
}

def store = SystemCredentialsProvider.getInstance().getStore()
store.getCredentials(Domain.global())
  .findAll { credential -> credential.id == 'campustrade-sonar-token' }
  .each { credential -> store.removeCredentials(Domain.global(), credential) }

store.addCredentials(
  Domain.global(),
  new StringCredentialsImpl(
    CredentialsScope.GLOBAL,
    'campustrade-sonar-token',
    'CampusTrade SonarQube analysis token',
    hudson.util.Secret.fromString(token)
  )
)
SystemCredentialsProvider.getInstance().save()
if (!tokenFile.delete()) {
  throw new IllegalStateException('SonarQube token was saved but the staging file could not be deleted.')
}
