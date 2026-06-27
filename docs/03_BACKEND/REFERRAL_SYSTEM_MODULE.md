# REFERRAL_SYSTEM_MODULE.md

# El-bannawy Platform
## Referral System Requirements

Version: 1.0.0

---

# Purpose

The Referral System is designed to encourage students to invite new students to the El-bannawy Platform through a reward-based invitation program.

Each student receives a unique referral link.

When a new student successfully registers using that link and meets the required conditions, rewards are automatically granted.

The Referral System is a marketing feature.

It must never affect educational fairness.

---

# Objectives

The Referral System must:

- Increase platform growth.
- Encourage student invitations.
- Reward successful referrals.
- Prevent abuse.
- Track referral performance.

---

# Core Principle

Students earn rewards only for successful referrals.

A referral becomes successful only after completing all validation rules.

Fake registrations must never generate rewards.

---

# Supported Users

Primary User

- Student

Management Users

- Administrator

Teachers and Secretaries have view-only access.

---

# Referral Flow

Student

↓

Copy Referral Link

↓

Share Link

↓

Friend Opens Link

↓

Friend Registers

↓

Validation

↓

Referral Approved

↓

Reward Granted

---

# Referral Link

Each student owns:

One permanent referral code.

Example

https://el-bannawy.com/r/ABCD1234

Referral codes are unique.

Referral codes never change.

---

# Registration Rules

A referral is considered valid only if:

✓ New account created.

✓ Mobile number verified.

✓ First purchase completed (Configurable).

✓ Account approved.

If any condition fails,

No reward is granted.

---

# Reward Types

Administrators may configure:

- Coins
- XP Bonus (Optional)
- Discount Coupons
- Premium Lessons
- Gift Packages

Version 1

Default Reward

Coins

---

# Reward Timing

Rewards may be granted:

Immediately

OR

After administrative approval.

Configuration is controlled by administrators.

---

# Referral Status

Possible values

- Pending

- Approved

- Rejected

- Expired

---

# Pending

Registration completed.

Validation not finished.

---

# Approved

Validation completed.

Reward granted.

---

# Rejected

Referral failed validation.

No reward.

---

# Expired

Referral exceeded validity period.

No reward.

---

# Referral Dashboard

Students can view:

- Total Invitations
- Successful Referrals
- Pending Referrals
- Rejected Referrals
- Coins Earned
- Referral Ranking

---

# Referral History

Every referral stores:

- Referrer ID
- New Student ID
- Referral Code
- Registration Date
- Approval Date
- Reward Type
- Reward Amount
- Status

History cannot be edited.

---

# Anti-Fraud Rules

Prevent:

- Self Referrals
- Duplicate Accounts
- Fake Mobile Numbers
- Device Farming
- Referral Loops
- Multiple Rewards

Each device may register only according to platform policy.

Administrators may configure fraud detection.

---

# Referral Limits

Administrators may configure:

- Daily Referral Limit
- Monthly Referral Limit
- Maximum Rewards

Version 1

Unlimited successful referrals unless configured.

---

# Notifications

Students receive notifications when:

- Referral Registered
- Referral Approved
- Reward Granted
- Referral Rejected

---

# Reports

Generate:

- Referral Report
- Top Referrers
- Reward Report
- Fraud Report
- Conversion Report

---

# Analytics

Track:

- Total Invitations
- Conversion Rate
- Successful Referrals
- Rejected Referrals
- Average Rewards
- Top Referrers

---

# Teacher Features

Teachers may:

View referral statistics.

Teachers cannot:

Approve referrals.

Modify rewards.

---

# Administrator Features

Administrators may:

- Configure rewards.
- Approve referrals.
- Reject referrals.
- Detect fraud.
- Remove rewards.
- Export reports.
- Configure referral policies.

---

# Performance

Referral validation should complete within:

5 seconds

Reward processing should be automatic.

---

# Security

Referral validation must occur entirely on the server.

Students cannot:

- Generate fake rewards.
- Modify referral codes.
- Modify referral history.

---

# Future Enhancements

Future Versions

- Multi-Level Referral System
- Referral Campaigns
- Referral Competitions
- Seasonal Rewards
- Referral Leaderboards
- Affiliate Dashboard

---

# Acceptance Criteria

The Referral System is complete when:

✓ Unique referral links are generated.

✓ Registration tracking works.

✓ Validation rules work.

✓ Rewards are granted correctly.

✓ Fraud detection works.

✓ Reports are generated.

✓ Analytics are collected.

✓ Responsive design works.

---

# Final Rule

The Referral System exists to grow the platform through genuine student invitations.

Educational integrity must never be compromised by referral rewards.

Rewards must always follow documented validation rules.

End of Document.