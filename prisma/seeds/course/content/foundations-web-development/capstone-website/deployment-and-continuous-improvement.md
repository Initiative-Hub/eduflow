## Deployment and Continuous Improvement

Deployment moves a project into a real environment. Paths, environment variables, caching, network speed, and user behavior may differ from local development. Shipping starts a feedback cycle.

### Prepare the release

Before deploying, verify repository status, production configuration, asset paths, metadata, and error handling. Environment variable names should be documented, but secret values should stay outside source control.

- Required environment variable names are known.
- Public routes load without local-only assumptions.
- Images and fonts have valid paths.
- Forms show success and failure states.
- The repository has a clear final commit.

### Verify production behavior

After deployment, test the public URL from a fresh browser or device. Local success does not prove production success. Case-sensitive paths, missing variables, and blocked network requests often appear only after release.

```text
Smoke test
1. Open the home page.
2. Navigate to the main detail page.
3. Submit the primary form with valid data.
4. Submit the form with invalid data.
5. Test keyboard navigation.
```

### Learn after launch

Collect feedback, support questions, and simple measurements. Look for failed tasks, slow pages, unclear copy, and missing content. Convert observations into prioritized improvements.

### Improvement backlog

A useful backlog item includes the problem, impact, and proposed next step.

- Problem: users miss the pricing link.
- Impact: they cannot compare options before contacting us.
- Next step: move pricing into the main navigation and re-test.

> A launched site is not finished; it is ready to be measured.

### Guided practice

Create a release checklist, deploy the capstone, and run a smoke test from a different browser. Record one immediate fix and two lower-priority improvements with user impact.

### Key takeaway

Responsible deployment pairs release preparation, production verification, and an evidence-based improvement loop.
