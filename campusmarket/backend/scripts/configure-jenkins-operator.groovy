import hudson.model.User
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import hudson.security.HudsonPrivateSecurityRealm
import jenkins.model.Jenkins

def credentialFile = new File('/var/lib/jenkins/campustrade-operator.properties')
def hookFile = new File('/var/lib/jenkins/init.groovy.d/60-campustrade-operator.groovy')

if (!credentialFile.isFile()) {
  throw new IllegalStateException('The staged Jenkins operator credential is missing.')
}

def credential = new Properties()
credentialFile.withInputStream { stream -> credential.load(stream) }
def username = credential.getProperty('username')?.trim()
def password = credential.getProperty('password')

if (!username || !password) {
  throw new IllegalStateException('The staged Jenkins operator credential is incomplete.')
}

def jenkins = Jenkins.get()
def realm = jenkins.getSecurityRealm()
if (!(realm instanceof HudsonPrivateSecurityRealm)) {
  realm = new HudsonPrivateSecurityRealm(false)
  jenkins.setSecurityRealm(realm)
}

def authorization = new FullControlOnceLoggedInAuthorizationStrategy()
authorization.setAllowAnonymousRead(false)
jenkins.setAuthorizationStrategy(authorization)

if (User.getById(username, false) == null) {
  def account = realm.createAccount(username, password)
  account.setFullName('CampusTrade Administrator')
  account.save()
}
jenkins.save()

if (!credentialFile.delete()) {
  throw new IllegalStateException('Jenkins created the operator but could not remove the staged secret.')
}
if (!hookFile.delete()) {
  throw new IllegalStateException('Jenkins could not remove the one-shot operator hook.')
}
