# Coins And Content Unlock Module

Version: 2.0.0
Source: `apps/backend/src/coins`

## Responsibility

Manages coin packages, pending purchases, wallet crediting after verification, activation codes, dynamic unit/term unlock costs, content unlock records, and unlock requests.

## Persisted Model

`CoinWallet`, `CoinPackage`, `CoinPurchase`, `Payment`, `UnlockCode`, `CodeRedemption`, `ContentUnlock`, `UnlockRequest`, and `SystemSetting`.

## Flows

### Purchase

```text
Package -> pending Payment/CoinPurchase -> verify -> completed records -> wallet credit
```

Verification returns no additional credit for an already completed payment.

### Activation Code

Codes are generated or supplied by an administrator/teacher, may have expiry and usage limits, and may target a unit or a term. A code is redeemed once per user. A target code creates a content unlock; a coins-only code increments the wallet.

### Paid Unlock

The service reads `unit_unlock_cost` or `term_unlock_cost`, checks the wallet, decrements the balance, and creates a unique content unlock.

- A `UNIT` unlock unlocks one unit.
- A `TERM` unlock unlocks every unit belonging to that term for the student.
- Lesson-level purchases are disabled; lessons inherit the lock state of their parent unit.

## Authorization

- Students can view wallet/packages, purchase, redeem, request, and unlock.
- Teachers can manage codes/costs within controller rules and their effective permissions.
- Administrators manage packages, codes, costs, and request resolution.

## Current Limitations

- Wallet balance is implemented, but a complete immutable coin transaction ledger is not.
- Referral, reward, and refund flows are not exposed by the current module.
- High-volume list endpoints need pagination.

See `docs/05_API/COINS_SYSTEM_API.md` for the actual endpoint contract.

End of Document.
