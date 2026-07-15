# CampusTrade visual evidence catalog

These screenshots were captured on 14 July 2026 from the deployed CampusTrade
system at `http://4.168.192.5`. They are evidence of the real VPS-hosted release,
not design mockups or a locally started application.

## Capture profiles

| Collection | Viewport | Files | Purpose |
|---|---:|---:|---|
| Android UI | 412 x 915 CSS-pixel target | 33 PNGs | Phone layout, route coverage, authentication and role states |
| Operations dashboards | 1440-pixel-wide desktop target | 4 PNGs | CI/CD, code quality, monitoring, and scrape-target evidence |

The Android viewport represents a common modern Android phone. Full-page
capture, document height, browser device scale, and dashboard content make the
stored PNG dimensions vary from the CSS viewport. Browser automation waited for
the deployed React application and authenticated API requests to settle before
each capture. Account passwords and session tokens do not appear in the
repository or screenshot metadata. All 37 PNGs were decoded successfully during
the evidence integrity check.

## Android route inventory

### Public and account routes

| Screenshot | Route or state |
|---|---|
| `android/home.png` | Marketplace home |
| `android/browse.png` | Browse listings |
| `android/search.png` | Search results |
| `android/about.png` | About page |
| `android/login.png` | Sign in |
| `android/register.png` | Registration |
| `android/signup.png` | Signup alias |
| `android/forgot-password.png` | Password recovery |
| `android/profile.png` | Public profile entry |
| `android/public-profile-empty.png` | Nonexistent public profile handling |
| `android/listing-detail-empty.png` | Nonexistent listing handling |
| `android/listing-expired.png` | Expired listing state |
| `android/receipt-empty.png` | Nonexistent receipt handling |
| `android/forbidden.png` | Authorization failure state |
| `android/not-found.png` | Unknown route handling |
| `android/suspended.png` | Suspended-account state |

### Authenticated student routes

| Screenshot | Route or state |
|---|---|
| `android/create-listing.png` | Create listing |
| `android/sell.png` | Sell entry point |
| `android/my-listings.png` | Seller listings |
| `android/edit-listing-empty.png` | Invalid edit target handling |
| `android/my-profile.png` | Account profile |
| `android/wishlist.png` | Wishlist |
| `android/my-wishlist.png` | Wishlist alias |
| `android/offers.png` | Offers |
| `android/transactions.png` | Transactions |
| `android/inbox.png` | Conversations |
| `android/chat-empty.png` | Invalid conversation handling |
| `android/notifications.png` | Notifications |

### Administrator routes

| Screenshot | Route or state |
|---|---|
| `android/admin-dashboard.png` | Administration overview |
| `android/admin-listings.png` | Listing moderation |
| `android/admin-users.png` | User administration |
| `android/admin-reports.png` | Reports queue |
| `android/admin-fraud.png` | Fraud review |

Empty and invalid-identifier screenshots deliberately use placeholder UUIDs.
They prove that protected routes and error states render safely; they are not
claims that a real marketplace record exists for those identifiers.

## Operations dashboard inventory

| Screenshot | Evidence |
|---|---|
| `dashboards/jenkins-pipeline.png` | CampusTrade Jenkins pipeline and build result |
| `dashboards/sonarqube-campusmarket.png` | SonarQube CampusTrade analysis measures |
| `dashboards/grafana-dashboards.png` | Live CampusTrade and VPS metrics in Grafana |
| `dashboards/prometheus-targets.png` | Prometheus target health |

Jenkins, SonarQube, Grafana, and Prometheus use private VPS upstreams. Capture
and normal operator access use their authenticated Traefik TLS routes as
documented in `../../operations/PLATFORM_OPERATIONS_RUNBOOK.md`.

## Re-capture acceptance rules

Before replacing evidence, verify all of the following:

1. The source URL is the public VPS or an authenticated VPS dashboard route.
2. The viewport matches the collection profile above.
3. Authenticated screenshots use the dedicated demonstration or administrator
   account and contain no credential fields, tokens, or secret values.
4. The application health endpoint passes and the Jenkins release is green.
5. Only PNG evidence and this catalog are committed; browser storage and
   automation traces stay outside the repository.
