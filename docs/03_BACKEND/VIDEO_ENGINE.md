# VIDEO_ENGINE.md

# El-bannawy Platform
## Interactive Video Engine

Version: 1.0.0

---

# Purpose

The Interactive Video Engine is the core educational component of the El-bannawy Platform.

A lesson may contain one or more videos — each with its own Interactive Timeline, activities, and configuration.

Unlike traditional video players, this engine transforms passive watching into an active learning experience.

Students cannot simply watch a lesson.

They must actively participate across all lesson videos.

---

# Multi-Video Architecture

A lesson may contain unlimited videos.

Video 1
Video 2
Video 3
...
Video N

Each video within a lesson owns its own:

- YouTube URL
- Video ID
- Title
- Display Order
- Duration
- Visibility
- Timeline Events
- Activities
- Completion Status

Timeline events belong to the video — not the lesson.

Activities triggered by timeline events belong to the video — not the lesson.

---

# Video Delivery Architecture

The platform does NOT upload or store lesson video files.

All lesson videos are hosted on external provider platforms.

The Teacher Dashboard allows teachers to provide YouTube Unlisted URLs for each video.

The platform must automatically:

- Validate each URL
- Extract the Video ID
- Read the video metadata
- Associate the video with the lesson
- Store only the video reference and metadata

The platform must never store lesson video files.

---

# Video Provider Abstraction

Lesson logic must remain provider-independent.

The architecture must abstract the video provider so it can be replaced in the future without changing lesson logic.

Current Provider

- YouTube (Unlisted)

Future Providers

- Vimeo
- Bunny Stream
- Mux
- Cloudflare Stream

The system stores provider-agnostic data:

- External Video ID
- Provider Name
- Duration
- Thumbnail
- Metadata

Never couple lesson logic to a specific video provider.

---

# Objectives

The Interactive Video Engine must:

- Increase engagement.
- Verify understanding during playback.
- Prevent passive learning.
- Prevent video skipping.
- Track real learning progress.

---

# Primary User

Student

Management Users

- Teacher
- Administrator

---

# Current Video Provider

Version 1

YouTube (Unlisted)

Teachers provide a YouTube Unlisted URL.

The system validates the URL and extracts:

- Video ID
- Duration
- Thumbnail
- Metadata

The platform stores only the video reference — never the video file.

Teachers never upload video files to the platform.

---

# Video Flow (Sequential Mode)

Student

↓

Open Lesson

↓

Video 1 Loads

↓

Student Watches

↓

Timeline Events (auto-pause, activities)

↓

Video 1 Ends

↓

Video 1 Activities Section

↓

Video 2 Loads (if unlocked)

↓

Student Watches

↓

Timeline Events (auto-pause, activities)

↓

Video 2 Ends

↓

Video 2 Activities Section

↓

Video N (continues sequentially)

↓

All Videos Completed

↓

Homework (if enabled)

↓

End Lesson Assessment (if enabled)

---

# Video Flow (Any-Order Mode)

Student

↓

Open Lesson

↓

Choose any available video

↓

Video Loads

↓

Timeline Events (auto-pause, activities)

↓

Video Ends

↓

Video Activities Section

↓

Return to Video Selection

↓

Student chooses next video

↓

All Videos Completed

↓

Homework (if enabled)

↓

End Lesson Assessment (if enabled)

---

# Video Player Controls

Allowed

- Play
- Pause
- Volume
- Playback Speed
- Full Screen
- Captions
- Seek Forward
- Seek Backward

Restricted

- Skip past timeline events without completing the associated activity
- Bypass activity after a timeline event triggers

---

# Timeline Events Belong to Video

Timeline events never belong directly to the lesson.

Each lesson video has an independent Interactive Timeline.

Timeline Events are configured separately for every video.

Example

Video 1
    02:30
    05:10
    08:40

Video 2
    01:20
    04:55

Video 3
    03:15

---

# Interactive Timeline Events

Teachers can configure timeline events at any timestamp in each lesson video.

Each timeline event contains:

- Timestamp
- Associated Activity
- Enabled / Disabled
- Required / Optional
- Video ID (owner)

---

# Timeline Event Behavior

When playback reaches a configured timeline event:

Video pauses immediately.

The configured activity opens automatically.

Background interaction is disabled.

For Required activities:

Student must complete the activity.

Video resumes only after completion.

For Optional activities:

Student may skip the activity.

Video resumes when the student dismisses the activity.

---

# Timeline Event Configuration

The teacher may configure each video independently:

- Add events at any timestamp
- Edit existing events
- Remove events
- Enable events
- Disable events
- Configure events as Required or Optional

Timeline events can be associated with any activity type.

Each video has its own independent set of timeline events.

---

# Activity Trigger Flow

Student

↓

Timeline Event Reached

↓

Video Pauses

↓

Activity Opens

↓

Student Completes Activity

↓

Save Progress

↓

Resume Video

---

# Seek Rules

Backward Seeking

Allowed

Forward Seeking

Allowed

---

# Progress Tracking (Per Video)

Save automatically for each video:

- Current Position
- Last Completed Timeline Event
- Completed Timeline Events
- Watch Percentage
- Video Completion Status

Lesson-level progress aggregates all video progress.

---

# Resume Playback

When reopening a lesson:

Resume from:

Last Saved Position of the last active video.

Never restart automatically unless requested.

The system remembers which video the student was watching.

---

# Video Completion

Each video is considered completed only when:

- Playback reaches 100%

Watching without completing all timeline event activities is insufficient.

Lesson completion requires ALL required videos to reach completion, plus any configured homework and assessment requirements.

---

# Learn From Mistakes Integration

Every incorrect answer is automatically added to:

Learn From Mistakes

Data stored:

- Lesson
- Timestamp
- Question
- Student Answer
- Correct Answer
- Attempt Count

---

# Teacher Features

Teachers can manage multiple videos per lesson:

- Add multiple lesson videos
- Remove videos
- Reorder videos
- Edit video information
- Enable or disable individual videos
- Provide YouTube Unlisted URL per video
- Validate video URL
- Configure Sequential or Any-Order mode
- Enable or disable Interactive Timeline per video
- Add timeline events per video
- Edit timeline events per video
- Delete timeline events per video
- Enable timeline events per video
- Disable timeline events per video
- Configure events as Required or Optional per video
- Change timestamps per video
- Associate activities with timeline events per video

---

# Administrator Features

Administrators can:

- Manage all videos
- Review analytics
- Force republishing

---

# Analytics

Track per video:

- Watch Time
- Completion Rate
- Average Watch Duration
- Drop-off Points
- Timeline Event Completion Rate
- Retry Count
- Student Engagement Score
- Video Order Completion

---

# Error Handling

If the video provider fails:

Display:

Unable to load video.

Retry

Contact Support

Never expose internal errors.

The error handling must be provider-independent.

Each provider may have different failure modes.

The system must handle all provider errors gracefully.

---

# Offline Behavior

Version 1

Not Supported

---

# Performance

Video startup:

< 2 seconds

Timeline event display:

Instant

Resume playback:

< 500ms

---

# Security

Students cannot:

- Download videos
- Access unpublished videos
- Access locked videos (sequential mode)
- Modify timestamps
- Bypass required timeline events
- Skip required timeline event activities
- Access external video provider admin features

---

# Acceptance Criteria

The Interactive Video Engine is complete when:

✓ Multiple videos per lesson work.

✓ Each video has its own YouTube URL, timeline events, and activities.

✓ Timeline events belong to the video, not the lesson.

✓ YouTube URL validation works per video.

✓ Video ID extraction works per video.

✓ Video metadata is retrieved automatically per video.

✓ Videos load successfully from external provider.

✓ Timeline events pause playback at configured timestamps.

✓ Activities open automatically at timeline events.

✓ Required activities cannot be bypassed.

✓ Optional activities can be skipped.

✓ Teachers can add, edit, remove, enable, disable timeline events per video.

✓ Teachers can configure Required / Optional activities per video.

✓ Teachers can add, remove, reorder, enable, disable videos.

✓ Teachers can configure Sequential or Any-Order mode.

✓ Sequential mode locks videos until prerequisites are met.

✓ Seek forward and backward work.

✓ Progress is saved automatically per video.

✓ Lesson progress aggregates all video progress.

✓ Provider abstraction supports future provider replacement.

✓ Analytics are collected per video.

✓ Responsive behavior works across all devices.

---

# Final Rule

The Interactive Video Engine is the educational heart of the El-bannawy Platform.

A lesson may contain one or more videos — each with its own Interactive Timeline and activities.

Timeline events and activities belong to the video, not the lesson.

The video provider must remain abstract and replaceable without changing lesson logic.

End of Document.