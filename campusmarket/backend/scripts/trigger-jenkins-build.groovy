import hudson.model.Cause
import hudson.util.Timer
import jenkins.model.Jenkins
import java.util.concurrent.TimeUnit

def hookFile = new File('/var/lib/jenkins/init.groovy.d/50-campustrade-trigger.groovy')

// Init hooks run before Jenkins has completely settled. Scheduling directly
// here can create a queue item that is discarded later in startup, so defer
// the one-shot action to Jenkins' own managed executor.
Timer.get().schedule({
  def job = Jenkins.get().getItemByFullName('campustrade-ci')

  if (job == null) {
    throw new IllegalStateException('The campustrade-ci Jenkins job does not exist.')
  }

  if (!job.isInQueue() && !job.isBuilding()) {
    def future = job.scheduleBuild2(
      0,
      new Cause.RemoteCause('127.0.0.1', 'Post-push production verification')
    )
    println("CampusTrade one-shot trigger scheduled: ${future != null}")
  }
} as Runnable, 45, TimeUnit.SECONDS)

if (!hookFile.delete()) {
  throw new IllegalStateException('The one-shot Jenkins trigger hook could not delete itself.')
}
