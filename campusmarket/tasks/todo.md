# Claude and University-Domain Delivery Checklist

- [ ] Capture baseline revision, production health, user/relationship counts,
  and protected backups without printing secrets
- [ ] Prove migration/seed tests fail in an isolated VPS test workspace
- [ ] Implement and verify backward-compatible account/seed migration release
- [ ] Review, commit, push, pass Jenkins/SonarQube, and deploy phase 1
- [ ] Migrate production accounts and credentials; verify logins and data links
- [ ] Prove strict-auth and Claude tests fail in an isolated VPS test workspace
- [ ] Implement backend, frontend, schema, gateway, and dedicated-secret changes
- [ ] Review, commit, push, pass Jenkins/SonarQube, and deploy phase 2
- [ ] Install protected Claude configuration in canonical and Jenkins stores
- [ ] Reseed twice and run auth, Claude, smoke, security, and persistence checks
- [ ] Perform controlled full-platform restart and verify every component
- [ ] Confirm no secret leakage, no local runtime services, and clean Git state
