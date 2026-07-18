import hudson.model.Cause
import hudson.model.CauseAction
import jenkins.model.Jenkins
import jenkins.util.Timer
import java.util.concurrent.TimeUnit

def hookFile = new File('/var/lib/jenkins/init.groovy.d/50-campustrade-trigger.groovy')

// Init hooks run before Jenkins has completely settled. Scheduling directly
// here can create a queue item that is discarded later in startup, so defer
// the one-shot action to Jenkins' own managed executor.
def attempts = 0
def scheduleTrigger
scheduleTrigger = {
  attempts++
  def job = Jenkins.get().getItemByFullName('campustrade-ci')

  if (job != null && !job.isInQueue()) {
    def future = job.scheduleBuild2(0, new CauseAction(
      new Cause.RemoteCause('127.0.0.1', 'Protected configuration or source deployment verification')
    ))
    if (future != null) {
      println('CampusTrade one-shot production verification was queued.')
      if (!hookFile.delete()) {
        throw new IllegalStateException('The one-shot Jenkins trigger hook could not delete itself.')
      }
      return
    }
  }

  if (attempts < 20) {
    Timer.get().schedule(scheduleTrigger as Runnable, 15, TimeUnit.SECONDS)
  } else {
    println('ERROR: CampusTrade production verification could not be queued; trigger hook retained for the next restart.')
  }
}

Timer.get().schedule(scheduleTrigger as Runnable, 45, TimeUnit.SECONDS)
