CREATE TYPE public."AccountStatus" AS ENUM (
    'ACTIVE',
    'PENDING_VERIFICATION',
    'SUSPENDED',
    'DELETED'
);
CREATE TYPE public."ActivityType" AS ENUM (
    'VOCABULARY',
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'MATCHING',
    'FILL_IN_BLANKS',
    'DRAG_DROP',
    'READING',
    'STORY_QUESTIONS',
    'CONVERSATION',
    'SPEAKING',
    'WRITING',
    'PARAGRAPH'
);
CREATE TYPE public."LessonStatus" AS ENUM (
    'LOCKED',
    'AVAILABLE',
    'IN_PROGRESS',
    'COMPLETED'
);
CREATE TYPE public."UserRole" AS ENUM (
    'STUDENT',
    'TEACHER',
    'SECRETARY',
    'SUPPORT',
    'ADMINISTRATOR'
);
CREATE TABLE public.activities (
    id uuid NOT NULL,
    "videoId" uuid NOT NULL,
    type public."ActivityType" NOT NULL,
    title text NOT NULL,
    instructions text,
    config text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    required boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.activity_progress (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "activityId" uuid NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    score integer,
    response text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);
CREATE TABLE public.activity_questions (
    id uuid NOT NULL,
    "activityId" uuid NOT NULL,
    question text NOT NULL,
    options text,
    "correctAnswer" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.attendance_records (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    present boolean DEFAULT true NOT NULL
);
CREATE TABLE public.coin_wallets (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.grades (
    id uuid NOT NULL,
    name text NOT NULL,
    "stageId" uuid NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.homework (
    id uuid NOT NULL,
    "lessonId" uuid NOT NULL,
    title text DEFAULT 'Homework'::text NOT NULL,
    "passingScore" integer DEFAULT 70 NOT NULL,
    "maxAttempts" integer DEFAULT 3 NOT NULL,
    "xpReward" integer DEFAULT 50 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.homework_questions (
    id uuid NOT NULL,
    "homeworkId" uuid NOT NULL,
    question text NOT NULL,
    options text,
    "correctAnswer" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.lesson_documents (
    id uuid NOT NULL,
    "lessonId" uuid NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileSize" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.lesson_progress (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "lessonId" uuid NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    progress double precision DEFAULT 0 NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);
CREATE TABLE public.lesson_settings (
    id uuid NOT NULL,
    "lessonId" uuid NOT NULL,
    "allowRetry" boolean DEFAULT true NOT NULL,
    "showAnswers" boolean DEFAULT true NOT NULL,
    "unlockNextOnComplete" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.lesson_videos (
    id uuid NOT NULL,
    "lessonId" uuid NOT NULL,
    title text NOT NULL,
    "youtubeUrl" text NOT NULL,
    "youtubeId" text NOT NULL,
    duration integer DEFAULT 0 NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "interactiveTimelineEnabled" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.lesson_vocabulary (
    id uuid NOT NULL,
    "lessonId" uuid NOT NULL,
    word text NOT NULL,
    translation text NOT NULL,
    definition text,
    example text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.lessons (
    id uuid NOT NULL,
    title text NOT NULL,
    "unitId" uuid NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "estimatedDuration" integer DEFAULT 0 NOT NULL,
    "isPremium" boolean DEFAULT false NOT NULL,
    published boolean DEFAULT true NOT NULL,
    "isHidden" boolean DEFAULT false NOT NULL,
    "sequentialMode" boolean DEFAULT true NOT NULL,
    "homeworkEnabled" boolean DEFAULT false NOT NULL,
    "quizEnabled" boolean DEFAULT false NOT NULL,
    "passingScore" integer DEFAULT 70 NOT NULL,
    "maxAttempts" integer DEFAULT 3 NOT NULL,
    "xpReward" integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.login_history (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    success boolean NOT NULL,
    "failureReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.password_resets (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "verificationCode" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.quiz_answers (
    id uuid NOT NULL,
    "attemptId" uuid NOT NULL,
    "questionId" uuid NOT NULL,
    answer text,
    "isCorrect" boolean,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.quiz_attempts (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "quizId" uuid NOT NULL,
    score integer,
    passed boolean,
    submitted boolean DEFAULT false NOT NULL,
    "attemptNum" integer DEFAULT 1 NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "submittedAt" timestamp(3) without time zone
);
CREATE TABLE public.quiz_questions (
    id uuid NOT NULL,
    "quizId" uuid NOT NULL,
    question text NOT NULL,
    options text,
    "correctAnswer" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.quizzes (
    id uuid NOT NULL,
    "lessonId" uuid NOT NULL,
    title text DEFAULT 'End Lesson Assessment'::text NOT NULL,
    "passingScore" integer DEFAULT 70 NOT NULL,
    "maxAttempts" integer DEFAULT 3 NOT NULL,
    "xpReward" integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone
);
CREATE TABLE public.sessions (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.stages (
    id uuid NOT NULL,
    name text NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.student_homework_attempts (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "homeworkId" uuid NOT NULL,
    score integer,
    passed boolean,
    submitted boolean DEFAULT false NOT NULL,
    "attemptNum" integer DEFAULT 1 NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "submittedAt" timestamp(3) without time zone
);
CREATE TABLE public.timeline_events (
    id uuid NOT NULL,
    "videoId" uuid NOT NULL,
    "timestamp" integer NOT NULL,
    title text,
    required boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.units (
    id uuid NOT NULL,
    title text NOT NULL,
    description text,
    "gradeId" uuid NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isPremium" boolean DEFAULT false NOT NULL,
    published boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.user_achievements (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    "earnedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.users (
    id uuid NOT NULL,
    "fullName" text NOT NULL,
    "mobileNumber" text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."UserRole" NOT NULL,
    status public."AccountStatus" DEFAULT 'PENDING_VERIFICATION'::public."AccountStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);
CREATE TABLE public.video_progress (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "videoId" uuid NOT NULL,
    "watchedSeconds" integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "lastPosition" integer DEFAULT 0 NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE TABLE public.xp_transactions (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL,
    reference text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.activity_progress
    ADD CONSTRAINT activity_progress_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT activity_questions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.coin_wallets
    ADD CONSTRAINT coin_wallets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.homework_questions
    ADD CONSTRAINT homework_questions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lesson_documents
    ADD CONSTRAINT lesson_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lesson_settings
    ADD CONSTRAINT lesson_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lesson_videos
    ADD CONSTRAINT lesson_videos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lesson_vocabulary
    ADD CONSTRAINT lesson_vocabulary_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.student_homework_attempts
    ADD CONSTRAINT student_homework_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.video_progress
    ADD CONSTRAINT video_progress_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.xp_transactions
    ADD CONSTRAINT xp_transactions_pkey PRIMARY KEY (id);
CREATE INDEX "activities_displayOrder_idx" ON public.activities USING btree ("displayOrder");
CREATE INDEX "activities_videoId_idx" ON public.activities USING btree ("videoId");
CREATE INDEX "activity_progress_activityId_idx" ON public.activity_progress USING btree ("activityId");
CREATE UNIQUE INDEX "activity_progress_userId_activityId_key" ON public.activity_progress USING btree ("userId", "activityId");
CREATE INDEX "activity_progress_userId_idx" ON public.activity_progress USING btree ("userId");
CREATE INDEX "activity_questions_activityId_idx" ON public.activity_questions USING btree ("activityId");
CREATE INDEX attendance_records_date_idx ON public.attendance_records USING btree (date);
CREATE UNIQUE INDEX "attendance_records_userId_date_key" ON public.attendance_records USING btree ("userId", date);
CREATE INDEX "attendance_records_userId_idx" ON public.attendance_records USING btree ("userId");
CREATE UNIQUE INDEX "coin_wallets_userId_key" ON public.coin_wallets USING btree ("userId");
CREATE INDEX "grades_displayOrder_idx" ON public.grades USING btree ("displayOrder");
CREATE INDEX "grades_stageId_idx" ON public.grades USING btree ("stageId");
CREATE UNIQUE INDEX "homework_lessonId_key" ON public.homework USING btree ("lessonId");
CREATE INDEX "homework_questions_homeworkId_idx" ON public.homework_questions USING btree ("homeworkId");
CREATE UNIQUE INDEX "lesson_documents_lessonId_key" ON public.lesson_documents USING btree ("lessonId");
CREATE INDEX "lesson_progress_lessonId_idx" ON public.lesson_progress USING btree ("lessonId");
CREATE INDEX "lesson_progress_userId_idx" ON public.lesson_progress USING btree ("userId");
CREATE UNIQUE INDEX "lesson_progress_userId_lessonId_key" ON public.lesson_progress USING btree ("userId", "lessonId");
CREATE UNIQUE INDEX "lesson_settings_lessonId_key" ON public.lesson_settings USING btree ("lessonId");
CREATE INDEX "lesson_videos_displayOrder_idx" ON public.lesson_videos USING btree ("displayOrder");
CREATE INDEX "lesson_videos_lessonId_idx" ON public.lesson_videos USING btree ("lessonId");
CREATE INDEX "lesson_vocabulary_lessonId_idx" ON public.lesson_vocabulary USING btree ("lessonId");
CREATE INDEX "lessons_displayOrder_idx" ON public.lessons USING btree ("displayOrder");
CREATE INDEX "lessons_unitId_idx" ON public.lessons USING btree ("unitId");
CREATE INDEX "login_history_createdAt_idx" ON public.login_history USING btree ("createdAt");
CREATE INDEX "login_history_userId_idx" ON public.login_history USING btree ("userId");
CREATE INDEX "password_resets_userId_idx" ON public.password_resets USING btree ("userId");
CREATE INDEX "password_resets_verificationCode_idx" ON public.password_resets USING btree ("verificationCode");
CREATE INDEX "quiz_answers_attemptId_idx" ON public.quiz_answers USING btree ("attemptId");
CREATE INDEX "quiz_answers_questionId_idx" ON public.quiz_answers USING btree ("questionId");
CREATE INDEX "quiz_attempts_quizId_idx" ON public.quiz_attempts USING btree ("quizId");
CREATE INDEX "quiz_attempts_userId_idx" ON public.quiz_attempts USING btree ("userId");
CREATE INDEX "quiz_questions_quizId_idx" ON public.quiz_questions USING btree ("quizId");
CREATE UNIQUE INDEX "quizzes_lessonId_key" ON public.quizzes USING btree ("lessonId");
CREATE INDEX refresh_tokens_token_idx ON public.refresh_tokens USING btree (token);
CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);
CREATE INDEX "refresh_tokens_userId_idx" ON public.refresh_tokens USING btree ("userId");
CREATE INDEX sessions_token_idx ON public.sessions USING btree (token);
CREATE UNIQUE INDEX sessions_token_key ON public.sessions USING btree (token);
CREATE INDEX "sessions_userId_idx" ON public.sessions USING btree ("userId");
CREATE INDEX "stages_displayOrder_idx" ON public.stages USING btree ("displayOrder");
CREATE INDEX "student_homework_attempts_homeworkId_idx" ON public.student_homework_attempts USING btree ("homeworkId");
CREATE INDEX "student_homework_attempts_userId_idx" ON public.student_homework_attempts USING btree ("userId");
CREATE INDEX timeline_events_timestamp_idx ON public.timeline_events USING btree ("timestamp");
CREATE INDEX "timeline_events_videoId_idx" ON public.timeline_events USING btree ("videoId");
CREATE INDEX "units_displayOrder_idx" ON public.units USING btree ("displayOrder");
CREATE INDEX "units_gradeId_idx" ON public.units USING btree ("gradeId");
CREATE INDEX "user_achievements_userId_idx" ON public.user_achievements USING btree ("userId");
CREATE UNIQUE INDEX "user_achievements_userId_type_key" ON public.user_achievements USING btree ("userId", type);
CREATE INDEX "users_mobileNumber_idx" ON public.users USING btree ("mobileNumber");
CREATE UNIQUE INDEX "users_mobileNumber_key" ON public.users USING btree ("mobileNumber");
CREATE INDEX users_role_idx ON public.users USING btree (role);
CREATE INDEX users_status_idx ON public.users USING btree (status);
CREATE INDEX "video_progress_userId_idx" ON public.video_progress USING btree ("userId");
CREATE UNIQUE INDEX "video_progress_userId_videoId_key" ON public.video_progress USING btree ("userId", "videoId");
CREATE INDEX "video_progress_videoId_idx" ON public.video_progress USING btree ("videoId");
CREATE INDEX "xp_transactions_createdAt_idx" ON public.xp_transactions USING btree ("createdAt");
CREATE INDEX "xp_transactions_userId_idx" ON public.xp_transactions USING btree ("userId");
ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "activities_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES public.lesson_videos(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.activity_progress
    ADD CONSTRAINT "activity_progress_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public.activities(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.activity_progress
    ADD CONSTRAINT "activity_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.activity_questions
    ADD CONSTRAINT "activity_questions_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public.activities(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "attendance_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.coin_wallets
    ADD CONSTRAINT "coin_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.grades
    ADD CONSTRAINT "grades_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public.stages(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.homework
    ADD CONSTRAINT "homework_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.homework_questions
    ADD CONSTRAINT "homework_questions_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES public.homework(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_documents
    ADD CONSTRAINT "lesson_documents_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT "lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_settings
    ADD CONSTRAINT "lesson_settings_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_videos
    ADD CONSTRAINT "lesson_videos_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.lesson_vocabulary
    ADD CONSTRAINT "lesson_vocabulary_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT "lessons_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT "quiz_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES public.quiz_attempts(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public.quiz_questions(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzes(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzes(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT "quizzes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.student_homework_attempts
    ADD CONSTRAINT "student_homework_attempts_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES public.homework(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.student_homework_attempts
    ADD CONSTRAINT "student_homework_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT "timeline_events_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES public.lesson_videos(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.units
    ADD CONSTRAINT "units_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES public.grades(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.video_progress
    ADD CONSTRAINT "video_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.xp_transactions
    ADD CONSTRAINT "xp_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
