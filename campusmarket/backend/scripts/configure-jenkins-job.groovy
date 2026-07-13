import com.cloudbees.plugins.credentials.CredentialsScope
import com.cloudbees.plugins.credentials.SecretBytes
import com.cloudbees.plugins.credentials.SystemCredentialsProvider
import com.cloudbees.plugins.credentials.domains.Domain
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.GitSCM
import jenkins.model.Jenkins
import org.jenkinsci.plugins.plaincredentials.impl.FileCredentialsImpl
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
  'The Jenkinsfile polls source control every five minutes.'
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

  if (existing == null) {
    store.addCredentials(Domain.global(), replacement)
  } else {
    store.updateCredentials(Domain.global(), existing, replacement)
  }
}

if ((job.getLastBuild() == null || job.getLastBuild().getResult()?.toString() != 'SUCCESS') &&
    !job.isInQueue() && !job.isBuilding()) {
  job.scheduleBuild2(10)
}
