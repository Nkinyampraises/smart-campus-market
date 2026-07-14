# CampusTrade user manual

## About CampusTrade

CampusTrade is a campus marketplace for buying, selling, discovering, and negotiating goods and services with other students. The production application is available at `http://4.168.192.5`.

Platform administrators should use the separate [production operations runbook](../operations/PLATFORM_OPERATIONS_RUNBOOK.md) for service accounts, dashboards, deployments, health checks, backups, and stop/start/restart commands.

## Roles

| Role | Main capabilities |
|---|---|
| Visitor | Browse active listings, search, view public marketplace statistics |
| Student | Manage a profile, publish listings, save favourites, make offers, chat, receive notifications, report content |
| Moderator / administrator | Review reports and fraud flags, suspend users, remove listings, view operational statistics |

## Create an account and sign in

1. Open the application and select **Sign up**.
2. Enter your name, campus email, and a strong password.
3. Submit the form and complete email verification when SMTP delivery is configured.
4. Return to **Sign in**, enter the same email and password, and continue to the marketplace.

Use **Forgot password** if access is lost. The reset link expires and can be used only for the intended account. Never share access or refresh tokens.

## Browse and search

The home and explore screens show active marketplace listings. Use search text together with category, campus zone, condition, minimum price, maximum price, and sort order. Search suggestions help complete listing titles, while trending results surface recent interest.

Open a listing to view its description, seller, condition, location, images, price, and trust indicators. The view is recorded once per caching interval to avoid inflating popularity.

## Publish a listing

1. Sign in and select the **Sell** action.
2. Provide a clear title and description.
3. Select a category, item condition, campus zone, and price in FCFA.
4. Add relevant images and tags.
5. Review the AI-assisted price range when enough comparable history exists.
6. Publish the listing.

Only the owner can edit, mark sold, upload more images, or remove the listing. Avoid sharing personal identity documents, payment secrets, or off-platform credentials in the description.

## Wishlist and discovery

Use the save control on a listing to add or remove it from the wishlist. The wishlist is private to the signed-in user. Similar-listing and trending features help discover alternatives without changing the original listing.

## Offers and negotiation

1. Open an active listing belonging to another seller.
2. Submit an offer amount.
3. The seller may accept, decline, or counter.
4. The buyer may withdraw a pending offer.
5. Use the linked conversation to agree on a safe campus meeting point.

The system prevents offers on your own listing and rejects operations by users who are not part of the transaction.

## Messages

The conversation list contains marketplace discussions involving the signed-in user. Open a conversation to retrieve its message history and send messages in real time. Read status is updated for conversation members only.

Do not send passwords, verification codes, or banking secrets through chat. Report suspicious behavior rather than engaging with it.

## Notifications

Notifications report offers, accepted offers, messages, listing expiry, moderation actions, and account events. Users can mark one notification or all notifications as read. Browser push is optional and can be unsubscribed at any time.

## Profile, history, and reviews

The profile records public campus-marketplace information and transaction statistics. Users can view purchase/sale history and submit a rating after a transaction. Reviews must use the permitted rating range and should describe the marketplace interaction honestly.

## Reports and safety

Use the report action when a listing is fraudulent, prohibited, misleading, or abusive. Repeated reports can automatically hide a listing pending moderator review. Automated fraud checks may flag unusually low/high prices or spam-rate behavior; a moderator makes the final decision.

For safe exchanges:

- Meet in a well-lit campus location.
- Inspect the item before payment.
- Keep negotiation in the application where possible.
- Do not follow links requesting credentials or one-time codes.
- Report harassment, impersonation, and suspicious pricing.

## Administrator guide

Administrators authenticate through the same account flow and access protected administrative screens. They can review pending reports and unresolved fraud flags, resolve or remove reported listings, suspend or unsuspend users, and inspect platform statistics. Every protected admin API verifies the administrator role; sharing an admin account defeats this control and is prohibited.

## Troubleshooting

| Symptom | Action |
|---|---|
| Page does not load | Confirm network access and retry `http://4.168.192.5` |
| Sign-in rejected | Check email/password, account suspension, and reset the password if needed |
| Search returns no result | Remove filters or try a broader term |
| Offer rejected | Confirm the listing is active, belongs to another seller, and the amount is valid |
| Push notifications absent | Re-enable browser permission and subscribe again |
| Suspected incident | Stop sharing data, preserve relevant details, and contact the project operator |

## Privacy and account security

Passwords are stored as hashes, API traffic is rate limited, and database access is parameterized. Users remain responsible for strong unique passwords and safe transaction behavior. A future production domain should enable end-to-end TLS before sensitive real-world use beyond the examination environment.
