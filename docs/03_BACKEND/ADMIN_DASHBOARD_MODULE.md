# ADMIN_DASHBOARD_MODULE.md

# El-bannawy Platform
## Administration Dashboard Requirements

Version: 1.0.0

---

# Purpose

The Administration Dashboard is the central control center of the El-bannawy Platform.

It provides administrators with complete visibility and control over every system, user, educational resource, financial operation and platform configuration.

Only authorized administrators can access this dashboard.

---

# Objectives

The Administration Dashboard must:

- Monitor platform activity.
- Manage users.
- Manage educational content.
- Configure platform settings.
- Monitor financial performance.
- View analytics.
- Ensure platform security.

---

# Supported Users

Primary User

- Administrator

Future Versions

- Super Administrator

---

# Dashboard Home

Display:

- Total Students
- Active Students
- Teachers
- Secretaries
- Support Staff
- Active Live Classes
- Today's Revenue
- XP Statistics
- Coins Statistics
- New Registrations
- Platform Health

---

# Main Navigation

Dashboard

↓

Students

↓

Teachers

↓

Content

↓

Payments

↓

Reports

↓

Analytics

↓

Notifications

↓

Settings

↓

Security

↓

System Logs

---

# Student Management

Administrators can:

- Create Students
- Edit Students
- Suspend Students
- Delete Students
- Reset Passwords
- Change Grade
- Change Stage
- View Reports
- View Payments
- View Activity

---

# Teacher Management

Administrators can:

- Create Teachers
- Edit Teachers
- Suspend Teachers
- Assign Grades
- Assign Subjects
- View Statistics

---

# Secretary Management

Administrators can:

- Create Accounts
- Assign Permissions
- Monitor Activity

---

# Support Management

Administrators can:

- Create Support Accounts
- Monitor Tickets
- Assign Requests

---

# Educational Content

Administrators can manage:

- Units
- Lessons
- Story
- Vocabulary
- Homework
- Quizzes
- Games
- Final Review

---

# AI Management

Administrators can configure:

- AI Provider
- API Keys
- Prompt Templates
- Knowledge Sources
- RAG Settings
- Usage Limits

---

# Payment Management

Manage:

- Transactions
- Coin Packages
- Refunds
- Revenue
- Payment Methods

---

# Notification Center

Manage:

- WhatsApp Templates
- Push Notifications
- Email Templates
- Broadcast Messages

---

# Reports

Access:

- Financial Reports
- Student Reports
- Teacher Reports
- AI Reports
- Referral Reports
- Platform Reports

---

# Analytics

Display:

- DAU
- MAU
- Lesson Completion
- Quiz Success Rate
- Homework Completion
- Revenue Growth
- AI Usage
- Retention Rate

---

# Platform Settings

Configure:

- Academic Year
- Educational Stages
- Grades
- Coins
- XP
- Referral
- Live Classes
- Maintenance Mode

---

# Security

Administrators can:

- Manage Roles
- Manage Permissions
- View Audit Logs
- View Login History
- Force Logout
- Manage JWT Settings

---

# Audit Logs

Every administrative action must be logged.

Stored Information:

- Administrator
- Action
- Resource
- Date
- IP Address
- Device
- Previous Value
- New Value

Audit logs cannot be edited.

---

# System Health

Display:

- API Status
- Database Status
- Redis Status
- Queue Status
- Storage Status
- AI Status
- Notification Status

---

# Performance

Dashboard loading time:

Less than 2 seconds.

Heavy analytics should load asynchronously.

---

# Security Rules

Every administrative action requires:

- Authentication
- Authorization
- Audit Logging

Sensitive actions require password confirmation.

Future Version:

Two-Factor Authentication.

---

# Future Enhancements

Future Versions

- Multi-Tenant Support
- Multi-School Support
- AI Platform Monitoring
- Advanced Business Intelligence
- Predictive Analytics
- Workflow Automation

---

# Acceptance Criteria

The Administration Dashboard is complete when:

✓ User management works.

✓ Content management works.

✓ Financial management works.

✓ Analytics work.

✓ Reports work.

✓ Audit logs work.

✓ Platform settings work.

✓ System health monitoring works.

✓ Responsive design works.

---

# Final Rule

The Administration Dashboard is the highest authority inside the El-bannawy Platform.

Every administrative action must be secure, traceable and fully auditable.

End of Document.