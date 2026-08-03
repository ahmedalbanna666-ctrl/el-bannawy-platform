# Coins API

Version: 2.0.0
Source: `apps/backend/src/coins/coins.controller.ts`

## Base And Authorization

Base path: `/api/v1/coins`

All routes require JWT authentication and the `RolesGuard`. Additional role restrictions are listed below. Responses use the normal success envelope.

## Endpoints

| Method | Path                            | Roles                 | Purpose                                                                                               |
| ------ | ------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| GET    | `/packages`                     | Authenticated         | List active packages; administrators can see all active/inactive records through the service behavior |
| GET    | `/packages/all`                 | Administrator         | Administrative package listing                                                                        |
| POST   | `/packages`                     | Administrator         | Create package: name, description, coinAmount, price                                                  |
| PATCH  | `/packages/:id`                 | Administrator         | Update package fields and active state                                                                |
| DELETE | `/packages/:id`                 | Administrator         | Delete package                                                                                        |
| GET    | `/wallet`                       | Authenticated         | Get or initialize the current user's wallet                                                           |
| POST   | `/purchase`                     | Authenticated         | Create pending coin purchase/payment and return checkout data                                         |
| POST   | `/verify`                       | Authenticated         | Verify checkout and credit wallet once                                                                |
| POST   | `/redeem`                       | Authenticated         | Redeem a coin or content activation code                                                              |
| GET    | `/unlock-cost/:targetType`      | Authenticated         | Read current `UNIT` or `TERM` unlock cost                                                            |
| POST   | `/unlock-cost`                  | Administrator/Teacher | Set unit or term unlock cost                                                                         |
| GET    | `/codes`                        | Administrator/Teacher | List activation codes                                                                                 |
| POST   | `/codes`                        | Administrator/Teacher | Create code, optional max uses/expiry/target                                                          |
| POST   | `/codes/:id/toggle`             | Administrator/Teacher | Enable/disable code                                                                                   |
| DELETE | `/codes/:id`                     | Administrator/Teacher | Delete a code and its redemptions                                                                     |
| GET    | `/requests`                     | Authenticated         | List own requests; administrators can filter/list all                                                 |
| POST   | `/requests`                     | Authenticated         | Submit pending unlock request                                                                         |
| POST   | `/requests/:id/resolve`         | Administrator         | Resolve request with status/note                                                                      |
| POST   | `/unlock`                       | Authenticated         | Unlock target with current wallet cost                                                                |
| GET    | `/access/:targetType/:targetId` | Authenticated         | Check content unlock and progress state                                                               |
| GET    | `/my-purchases`                 | Authenticated         | List own coin purchases                                                                               |
| GET    | `/my-unlocks`                   | Authenticated         | List own content unlocks                                                                              |

## Rules

- Package purchase creates a pending `Payment` and `CoinPurchase`.
- Verification is idempotent for already completed payments and credits the wallet only for an incomplete purchase.
- Current dynamic costs are stored in `SystemSetting` under `unit_unlock_cost` (default 50) and `term_unlock_cost` (default 300); lesson-level purchases are disabled.
- A content code creates a `ContentUnlock` with `unlockMethod: CODE` and does not credit coins.
- A coin code credits the wallet and records a `CodeRedemption`.
- Redemption checks usage limits and duplicate redemption inside a transaction.
- A `TERM` unlock makes every unit of that term available; unit availability is derived from unit/term unlocks and `lockedOverride`.
- Coins do not affect XP or leaderboard ranking.

## Known Limitations

- The current wallet schema stores balance only; it does not contain a full immutable coin transaction ledger.
- List endpoints are not paginated.
- Payment gateway verification and production webhook behavior require deployment-specific integration testing.

End of Document.
