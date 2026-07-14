import hudson.model.Cause
import jenkins.model.Jenkins

def hookFile = new File('/var/lib/jenkins/init.groovy.d/50-campustrade-trigger.groovy')
def job = Jenkins.get().getItemByFullName('campustrade-ci')

if (job == null) {
  throw new IllegalStateException('The campustrade-ci Jenkins job does not exist.')
}

if (!job.isInQueue() && !job.isBuilding()) {
  job.scheduleBuild2(
    10,
    new Cause.RemoteCause('127.0.0.1', 'Post-push production verification')
  )
}

if (!hookFile.delete()) {
  throw new IllegalStateException('The one-shot Jenkins trigger hook could not delete itself.')
}
