import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.SecretBytes
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.domains.Domain
import hudson.util.Secret
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.GitSCM
import jenkins.model.Jenkins
import org.jenkinsci.plugins.plaincredentials.impl.FileCredentialsImpl
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import org.jenkinsci.plugins.workflow.job.WorkflowJob

def jenkins = Jenkins.get()
def repository = System.getenv('CAMPUSTRADE_GIT_REPO') ?:
  'https://github.com/Nkinyampraises/smart-campus-market.git'
def branch = System.getenv('CAMPUSTRADE_GIT_BRANCH') ?: '*/main'
def jobName = 'campustrade-ci'

def job = jenkins.getItem(jobName)
if (job == null) {
  job = jenkins.createProject(WorkflowJob, jobName)
}

def scm = new GitSCM(repository)
scm.branches = [new BranchSpec(branch)]
def definition = new CpsScmFlowDefinition(scm, 'campusmarket/Jenkinsfile')
definition.setLightweight(true)
job.setDefinition(definition)
job.setDescription(
  "CampusTrade release gates from GitHub (${branch}). " +
  'The Jenkinsfile polls source control every five minutes. ' +
  'Operations: Jenkins http://localhost:8080, Grafana http://localhost:3009, ' +
  'Prometheus http://localhost:9090, SonarQube http://localhost:9000. ' +
  'Each build archives ci-reports/system-information.html.'
)
job.save()

def envFile = new File('/var/lib/jenkins/campustrade-prod.env')
if (envFile.isFile()) {
  def provider = SystemCredentialsProvider.getInstance()
  def store = provider.getStore()
  def replacement = new FileCredentialsImpl(
    CredentialsScope.GLOBAL,
    'campustrade-prod-env',
    'Azure test VM production environment',
    'campustrade-prod.env',
    SecretBytes.fromBytes(envFile.bytes)
  )
  def existing = provider.getCredentials().find {
    it.id == 'campustrade-prod-env'
  }

  def saved = existing == null ?
    store.addCredentials(Domain.global(), replacement) :
    store.updateCredentials(Domain.global(), existing, replacement)
  if (!saved) {
    throw new IllegalStateException('The production environment credential could not be saved.')
  }
  if (!envFile.delete()) {
    throw new IllegalStateException('The production environment credential was saved but its staging file could not be deleted.')
  }
}

// Claude has one source of truth: /srv/campustrade/shared/ai-provider.env.
// Remove the superseded duplicate file credential if an older release created it.
def credentialProvider = SystemCredentialsProvider.getInstance()
def obsoleteAiCredential = credentialProvider.getCredentials().find {
  it.id == 'campustrade-ai-provider-env'
}
if (obsoleteAiCredential != null &&
    !credentialProvider.getStore().removeCredentials(Domain.global(), obsoleteAiCredential)) {
  throw new IllegalStateException('The obsolete duplicate AI provider credential could not be removed.')
}
def obsoleteAiStage = new File('/var/lib/jenkins/campustrade-ai-provider.env')
if (obsoleteAiStage.exists() && !obsoleteAiStage.delete()) {
  throw new IllegalStateException('The obsolete AI provider staging file could not be deleted.')
}

def sonarTokenFile = new File('/var/lib/jenkins/campustrade-sonar.token')
if (sonarTokenFile.isFile()) {
  def token = sonarTokenFile.text.trim()
  if (!token.isEmpty()) {
    def provider = SystemCredentialsProvider.getInstance()
    def store = provider.getStore()
    def replacement = new StringCredentialsImpl(
      CredentialsScope.GLOBAL,
      'campustrade-sonar-token',
      'CampusTrade SonarQube analysis token',
      Secret.fromString(token)
    )
    def existing = provider.getCredentials().find {
      it.id == 'campustrade-sonar-token'
    }

    if (existing == null) {
      store.addCredentials(Domain.global(), replacement)
    } else {
      store.updateCredentials(Domain.global(), existing, replacement)
    }
  }
}

if ((job.getLastBuild() == null || job.getLastBuild().getResult()?.toString() != 'SUCCESS') &&
    !job.isInQueue() && !job.isBuilding()) {
  job.scheduleBuild2(10)
}
