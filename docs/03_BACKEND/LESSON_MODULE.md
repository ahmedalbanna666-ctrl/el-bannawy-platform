# LESSON_MODULE.md

# El-bannawy Platform
## Lesson Module Requirements

Version: 1.0.0

---

# Purpose

The Lesson Module is the heart of the learning experience.

Every lesson is designed to provide an interactive educational journey rather than simply playing a video.

A Lesson is considered the smallest complete educational unit inside the platform.

---

# Objectives

The Lesson Module must:

- Deliver interactive learning.
- Increase student engagement.
- Track learning progress.
- Prevent passive watching.
- Ensure lesson completion before progression.

---

# Supported Users

Primary User

- Student

Management Users

- Teacher
- Administrator

---

# Lesson Structure

Every Lesson may contain one or more videos.

Each video owns its own Interactive Timeline and activities.

Lesson
 ├── Video 1 (with timeline events + activities)
 ├── Video 2 (with timeline events + activities)
 ├── Video 3 (with timeline events + activities)
 └── Video N

After all videos:

- Homework (optional — teacher enabled)
- End Lesson Assessment (optional — teacher enabled)

Activities belong to the corresponding lesson video — not to the lesson.

---

# Lesson Content

Teachers upload only:

- Microsoft Word Document

The system automatically converts the uploaded Word document into structured lesson content.

The Word document is the only source of lesson content.

Teachers do not manually recreate activities inside the dashboard.

Teachers provide YouTube URLs for one or more lesson videos.

---

# Navigation Flow

Home

↓

Continue Learning

or

Units

↓

Lesson

---

# Lesson Page

The lesson page consists of:

- Video List (one or more videos, sequential or any-order)
  - Video 1 (with Interactive Timeline + Activities)
  - Video 2 (with Interactive Timeline + Activities)
  - Video N (with Interactive Timeline + Activities)
- Homework (if enabled, after all videos)
- End Lesson Assessment (if enabled, after all videos)

Videos may be completed in order (sequential mode) or any order.

Each video has its own timeline events and activities.

---

# Lesson Header

The lesson header displays:

- Lesson Title
- Unit Name
- Lesson Number
- Progress
- Estimated Duration

---

# Lesson Status

Each lesson has one status only.

Possible values:

- Locked

- Available

- In Progress

- Completed

---

# Lesson Settings

The teacher controls:

- Free / Premium
- Published / Hidden
- Sequential Mode / Any-Order Mode
- Activities Enabled / Disabled (per video)
- Homework Enabled / Disabled
- End Lesson Assessment Enabled / Disabled
- Interactive Timeline Enabled / Disabled (per video)

All lesson behavior is configurable from the Teacher Dashboard.

---

# Lesson Completion

Lesson completion is determined after evaluating ALL lesson videos and requirements.

The teacher may require:

- Watching ALL required lesson videos
- Completing required activities across all videos
- Completing homework (if enabled)
- Passing the End Lesson Assessment (if enabled)

Completing a single video never completes the lesson.

The next lesson must remain locked until all configured completion requirements are satisfied.

The teacher controls:

- Passing score
- Retry limit
- Unlock behavior

---

# Lesson Progress

Progress is calculated across all videos:

Completed Videos ÷ Total Videos × weight

+

Completed Activities ÷ Total Activities × weight

Progress updates instantly.

---

# Interactive Videos (Multi-Video)

A lesson may contain one or more videos.

Each video is hosted on YouTube as an Unlisted video.

The platform stores only the video reference — never the video file.

Each video has its own configuration:

- YouTube URL
- Video ID
- Title
- Display Order
- Duration
- Visibility (Enabled / Disabled)

Each video supports:

- Play

- Pause

- Resume

- Seek Forward

- Seek Backward

- Playback Speed

- Quality Selection

---

# Sequential Mode

When sequential mode is enabled:

Video 2 remains locked until Video 1 completion requirements are satisfied.

Video 3 remains locked until Video 2 completion requirements are satisfied.

Teachers may configure whether:

- Videos must be completed in order (Sequential)
- Videos may be watched in any order (Any-Order)

---

# Interactive Timeline (Per Video)

Timeline events never belong directly to the lesson.

Each lesson video has its own independent Interactive Timeline.

The teacher configures timeline events separately for every video:

Video 1
    02:30
    05:10
    08:40

Video 2
    01:20
    04:55

Video 3
    03:15

Timeline events are fully configurable per video.

The teacher may:

- Add events
- Edit events
- Remove events
- Enable events
- Disable events
- Configure events as Required or Optional

Each timeline event belongs to exactly one video.

---

# Activity Engine (Per Video)

Activities belong to the corresponding lesson video — not the lesson.

Each video may have its own independent set of activities.

Examples:

Video 1
 ├── Vocabulary
 ├── Quiz
 └── Speaking

Video 2
 ├── Reading
 ├── Writing
 └── Matching

Video 3
 ├── Conversation
 └── AI Assessment

The architecture must support unlimited activities per video.

All activities are rendered dynamically.

The architecture must support unlimited activity types.

Examples include:

- Vocabulary
- Multiple Choice
- True / False
- Matching
- Fill in the Blanks
- Drag & Drop
- Reading
- Story Questions
- Conversation
- Speaking
- Writing
- Paragraph
- Homework
- End Lesson Assessment

The architecture must allow adding new activity types in the future without changing the lesson architecture.

---

# AI Assessment (Per Video)

Activities that require subjective grading are evaluated by the AI Assessment Engine.

AI assessments may be configured independently per video.

Examples:

- Paragraph
- Writing
- Conversation
- Speaking
- Story Questions
- Reading Questions
- Essay
- Email Writing

The AI Assessment Engine is responsible for:

- Scoring
- Grammar correction
- Vocabulary evaluation
- Feedback
- Personalized recommendations

Activities only collect student responses.

The AI Assessment Engine evaluates them.

---

# Homework

Homework belongs to one lesson.

Homework is optional.

Teachers enable or disable homework.

Students submit answers.

System calculates results.

Teachers may review manually if required.

---

# End Lesson Assessment

The End Lesson Assessment is optional.

Teachers enable or disable it.

Requirements (when enabled):

- Pass minimum score (configured by teacher)
- Complete submission

---

# Continue Learning

If the lesson is unfinished,

Continue Learning always returns here.

The system remembers:

- Last Active Video
- Video Position (per video)
- Activity Progress (per video)
- Homework Status
- Assessment Status

---

# Progress Saving

Student progress is automatically saved per video and per lesson.

Saving occurs:

- Video Progress (per video)

- Timeline Event Progress (per video)

- Activity Progress (per video)

- Homework Progress

- Quiz Attempts

- Lesson Completion

Students should never lose progress.

Each video tracks its own completion independently.

---

# Teacher Permissions

Teachers can:

- Create Lesson

- Edit Lesson

- Delete Lesson

- Publish Lesson

- Unpublish Lesson

- Hide Lesson

- Configure Lesson Order

- Provide YouTube URLs (multiple per lesson)

- Upload Lesson Word Document

- Add lesson videos

- Remove lesson videos

- Reorder lesson videos

- Enable or disable individual videos

- Configure Sequential / Any-Order mode

- Configure Lesson Settings

- Configure Completion Rules

- Configure Unlock Rules

- Configure Interactive Timeline (per video)

---

# Administrator Permissions

Administrators have full control.

---

# Loading State

Display Skeleton UI.

Never display empty screens.

---

# Empty State

If lesson content is unavailable,

Display:

"This lesson is not available yet."

---

# Error State

Display:

Retry Button

Friendly Message

Never expose server errors.

---

# Performance

Lesson should load within:

2 seconds

Interactive Video should initialize smoothly.

---

# Security

Students may access only:

Lessons assigned to their grade.

Unauthorized lesson access is prohibited.

---

# Analytics

Track:

- Lesson Views

- Completion Rate

- Homework Score

- Quiz Score

- Time Spent

- Video Completion

---

# Future Enhancements

Future versions may include:

- AI Notes

- AI Summary

- AI Flashcards

- Voice Practice

- Speaking Evaluation

These are outside Version 1.

---

# Acceptance Criteria

The Lesson Module is complete when:

✓ Lesson opens correctly.

✓ Multiple videos display within a single lesson.

✓ Each video has its own timeline events and activities.

✓ Sequential mode locks videos until prerequisites are met.

✓ Any-Order mode allows free video selection.

✓ Progress is tracked per video and per lesson.

✓ Interactive Videos load.

✓ Timeline events pause video (per video).

✓ Activities render dynamically (per video).

✓ Activity types work correctly.

✓ AI Assessment evaluates subjective activities (per video).

✓ Homework works (when enabled).

✓ End Lesson Assessment works (when enabled).

✓ Lesson Completion Rules are enforced across all videos.

✓ Lesson Unlock Rules are enforced.

✓ Teachers can add, remove, reorder, enable, disable videos.

✓ Progress is automatically saved.

✓ Responsive layout works.

---

# Final Rule

A Lesson is not a video.

A Lesson is a complete interactive learning experience.

End of Document.