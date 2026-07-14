# Clean VPS Rebuild Checklist

- [x] Generate protected production configuration reproducibly
- [ ] Reinstall Jenkins plugins/configuration from code
- [x] Guard and validate the destructive reset
- [x] Create idempotent users and image-backed marketplace seed data
- [x] Add seed regression and production verification checks
- [ ] Pass Jenkins tests, coverage, audits, SonarQube, and Trivy on the VPS
- [ ] Wipe CampusTrade platform state from the VPS
- [ ] Rebuild Jenkins, SonarQube, K3s, monitoring, and the application
- [ ] Run and pass the clean production pipeline
- [ ] Provision accounts and seed data
- [ ] Verify all public/private services and dashboards
- [ ] Capture evidence and update operating instructions
