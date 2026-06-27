# USER_ROLES.md

# El-bannawy Platform
## User Roles & Permissions

Version: 1.0.0

---

# Purpose

This document defines every user role inside the El-bannawy Platform.

Each role has its own responsibilities, permissions and dashboard.

No permissions may be granted outside this document.

---

# User Roles

The platform contains five primary roles:

- Student
- Teacher
- Secretary
- Support
- Administrator

---

# Student

## Description

A student is the primary user of the platform.

Students consume educational content but cannot manage platform data.

---

## Permissions

Students CAN:

- Login
- Manage Profile
- View Dashboard
- Continue Learning
- Watch Lesson Videos
- Answer Interactive Video Questions
- Access Vocabulary


- Submit Homework
- Take End Lesson Assessments
- View Final Review (when enabled)
- Access Story Module
- Use Educational Games
- Use Ask El-bannawy AI
- Book Live Classes
- Join Live Classes
- View XP
- View Coins
- Invite Friends
- Receive Notifications
- Manage Notification Preferences
- View Reports
- View Achievements
- Access Learn From Mistakes

Students CANNOT:

- Edit Lessons
- Create Content
- Edit Homework
- Modify Quizzes
- Access Admin Panels
- Manage Users
- Change Business Rules

---

# Teacher

## Description

Teachers create and manage educational content.

Teachers monitor student progress.

---

## Permissions

Teachers CAN:

- Login
- Manage Profile
- Create Units
- Edit Units
- Delete Units
- Create Lessons
- Edit Lessons
- Delete Lessons
- Upload Lesson Word Document
- Upload Lesson Videos (multiple per lesson)
- Remove Lesson Videos
- Reorder Lesson Videos
- Enable or Disable Individual Lesson Videos
- Publish Lessons
- Unpublish Lessons
- Archive Lessons
- Make Lesson Free or Premium
- Enable or Disable Lesson Activities (per video)
- Enable or Disable Homework
- Enable or Disable End Lesson Assessment
- Configure Sequential / Any-Order Mode
- Configure Lesson Completion Rules
- Configure Lesson Unlock Rules
- Configure Interactive Timeline Events (per video)
- Add Timeline Events (per video)
- Edit Timeline Events (per video)
- Remove Timeline Events (per video)
- Enable Timeline Events (per video)
- Disable Timeline Events (per video)
- View Auto-Generated Activities
- Configure Interactive Video Questions
- Manage Vocabulary
- Create Homework
- Grade Homework
- Create Quizzes
- Edit Quizzes
- Open Final Review
- Manage Live Classes
- View Student Reports
- View Student Analytics
- Send Notifications
- Schedule Notifications
- Target Notifications by Grade
- Target Notifications by Class
- Target Individual Students
- Send Motivational Messages
- Send Study Tips
- Manage Story Module

Teachers CANNOT:

- Manually Create Activities
- Modify Platform Settings
- Manage Administrators
- Change System Configuration
- Send System-Wide Notifications

---

# Secretary

## Description

Secretaries handle operational tasks.

---

## Permissions

Secretaries CAN:

- Register Students
- Update Student Information
- Manage Subscriptions
- Manage Payments
- Generate Reports
- Contact Parents
- Schedule Live Classes
- View Student Status
- View Payment History

Secretaries CANNOT:

- Create Lessons
- Edit Educational Content
- Access Platform Configuration

---

# Support

## Description

Support staff assist users with technical issues.

---

## Permissions

Support CAN:

- View Users
- Reset Passwords
- Handle Support Tickets
- View Logs
- Assist Students
- Assist Teachers
- Resolve Technical Problems

Support CANNOT:

- Edit Educational Content
- Change Business Rules
- Access Financial Data
- Modify Platform Configuration

---

# Administrator

## Description

Administrators have full platform access.

---

## Permissions

Administrators CAN:

- Manage All Users
- Manage Roles
- Manage Permissions
- Manage Teachers
- Manage Secretaries
- Manage Support Team
- Manage Students
- Manage Content
- Manage Payments
- Manage Reports
- Manage Notifications
- Manage Coins
- Manage XP
- Manage Referral System
- Configure AI
- Configure Live Classes
- Configure Integrations
- Configure WhatsApp
- Configure Email
- Configure Storage
- Configure Security
- Configure Platform Settings
- View Analytics
- Manage Backups

Administrators have unrestricted access.

---

# Permission Principles

Permissions are based on Role-Based Access Control (RBAC).

Every user belongs to one primary role.

Permissions must never be assigned individually.

Permissions are inherited from the assigned role.

---

# Security Rules

Every protected action requires:

- Authentication
- Authorization
- Permission Validation

Never trust client-side permissions.

Server-side authorization is mandatory.

---

# Future Roles

Future versions may introduce:

- Parent
- Content Reviewer
- Sales
- Finance
- Super Administrator

These roles are outside Version 1 scope.

---

# Final Rule

Every permission inside the platform must originate from this document.

No undocumented permission is allowed.

End of Document.