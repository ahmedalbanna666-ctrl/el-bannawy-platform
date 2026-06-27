# LESSON_QUIZ_MODULE.md

# El-bannawy Platform
## End Lesson Assessment Module Requirements

Version: 1.0.0

---

# Purpose

The End Lesson Assessment Module is the final assessment of every lesson.

It determines whether the student is allowed to proceed to the next lesson (when configured).

It is the official lesson completion checkpoint.

---

# Objectives

The End Lesson Assessment must:

- Measure lesson mastery.
- Verify learning outcomes.
- Control lesson progression (when enabled).
- Award XP.
- Record learning analytics.
- Detect weak concepts.

---

# Supported Users

Primary User

- Student

Management Users

- Teacher
- Administrator

---

# Navigation Flow

Lesson

↓

Activities

↓

Homework (if enabled)

↓

End Lesson Assessment (if enabled)

↓

Answer Questions

↓

Submit Assessment

↓

Auto Evaluation

↓

Pass (if required for completion)

↓

Unlock Next Lesson (if configured)

OR

Fail

↓

Retry

---

# Lesson Relationship

Each Lesson may have one End Lesson Assessment.

The End Lesson Assessment is optional.

Teachers enable or disable it.

An End Lesson Assessment cannot exist without a Lesson.

---

# Assessment Status

Each assessment has one status.

Possible values:

- Locked
- Available
- In Progress
- Submitted
- Passed
- Failed
- Completed

---

# Unlock Conditions

The End Lesson Assessment becomes available only after:

✓ All Interactive Videos Completed (per lesson)
✓ Activities Completed

✓ Homework Submitted (if enabled)

Students cannot access the End Lesson Assessment before meeting these requirements.

---

# Passing Rules

Teachers define:

Minimum Passing Score.

Example

70%

Students must reach or exceed the minimum score.

---

# Lesson Completion Rules

The teacher controls lesson completion requirements.

The teacher may require:

✓ All Interactive Videos completed (per lesson)

✓ Activities completed

✓ Homework submitted (if enabled)

✓ End Lesson Assessment passed (if enabled)

Missing any required requirement means:

Lesson remains In Progress.

---

# Supported Assessment Types

Version 1

- Multiple Choice
- Multiple Response
- True / False
- Fill in the Blank
- Matching
- Ordering

Future Versions

- Essay
- Speaking
- Writing
- Listening
- AI Evaluation

---

# Assessment Attempts

Teachers configure:

Unlimited Attempts

or

Maximum Attempts

Attempt history must always be stored.

---

# Retry Rules

If the student fails:

↓

Display Result

↓

Show Weak Areas

↓

Retry Quiz

↓

Previous attempts remain stored.

---

# Score Calculation

Quiz Score

=

Correct Answers

÷

Total Questions

×

100

---

# XP Rewards

XP is awarded only after passing.

No XP for failed attempts.

Teachers configure:

XP Reward

per Quiz.

---

# Coins

Coins are NOT awarded automatically.

Coins require documented reward rules.

---

# Learn From Mistakes Integration

Every incorrect answer is stored.

Stored Data

- Lesson
- Quiz
- Question
- Student Answer
- Correct Answer
- Attempt Number
- Timestamp

---

# Review Mode

After submission students may review:

- Score
- Correct Answers
- Wrong Answers
- Explanation

Teachers control visibility.

---

# Quiz Analytics

Collect:

- Average Score
- Pass Rate
- Failure Rate
- Average Completion Time
- Retry Count
- Most Missed Questions
- Student Ranking

---

# Teacher Features

Teachers can:

- Enable End Lesson Assessment
- Disable End Lesson Assessment
- Create Assessment
- Edit Assessment
- Delete Assessment
- Duplicate Assessment
- Configure Passing Score
- Configure Attempts
- Configure XP Reward
- Publish Assessment
- Hide Assessment

---

# Administrator Features

Administrators have full access.

---

# Security

Students may submit only:

Their own quiz.

Quiz answers cannot be modified after submission unless another attempt is allowed.

---

# Performance

Quiz Loading

< 2 seconds

Submission

< 1 second

Automatic grading

Immediate

---

# Empty State

Display

No quiz available.

---

# Error State

Display

Unable to submit quiz.

Retry

---

# Future Enhancements

Future Versions

- Adaptive Quiz
- AI Generated Questions
- Timed Exams
- Random Question Pools
- Difficulty Levels
- Anti-Cheating Detection

---

# Acceptance Criteria

End Lesson Assessment Module is complete when:

✓ Assessment loads correctly.

✓ Question types work.

✓ Submission works.

✓ Auto grading works.

✓ Passing score works.

✓ Enable/Disable toggle works.

✓ Next lesson unlocks correctly (when configured).

✓ XP is awarded correctly.

✓ Learn From Mistakes integration works.

✓ Analytics are collected.

✓ Responsive design works.

---

# Final Rule

The End Lesson Assessment is the official gatekeeper of student progression (when enabled).

No student may unlock the next lesson without successfully passing the End Lesson Assessment (if required by teacher configuration).

End of Document.