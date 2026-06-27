import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../../src/lib/api-client";

interface LessonDetail {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
  estimatedDuration: number;
  isPremium: boolean;
  sequentialMode: boolean;
  homeworkEnabled: boolean;
  quizEnabled: boolean;
  progress: { progress: number; completed: boolean } | null;
  unit: { id: string; title: string; grade: { id: string; name: string } };
  videos: LessonVideo[];
  vocabulary: LessonVocabulary[];
  settings: LessonSettings | null;
}

interface LessonVideo {
  id: string;
  title: string;
  url: string;
  duration: number;
  displayOrder: number;
  timelineEvents: { id: string; timestamp: number; title: string }[];
  activities: { id: string; type: string; title: string; displayOrder: number }[];
}

interface LessonVocabulary {
  id: string;
  word: string;
  translation: string;
  definition: string;
  example: string | null;
  phonetic: string | null;
}

interface LessonSettings {
  requiresCamera: boolean;
  requiresMicrophone: boolean;
  minScoreToPass: number;
  allowSkipping: boolean;
}

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  async function fetchLesson() {
    try {
      const response = await api.get<LessonDetail>(`/lessons/${id}`);
      if (response.data) {
        setLesson(response.data);
        if (response.data.videos.length > 0) {
          setActiveVideoId(response.data.videos[0].id);
        }
      }
    } catch {
      // handled by empty render
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLesson();
  }, [id]);

  const handleCompleteVideo = async (videoId: string) => {
    try {
      await api.post(`/videos/${videoId}/complete`);
      fetchLesson();
    } catch {
      // handled silently
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Lesson not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeVideo = lesson.videos.find((v) => v.id === activeVideoId);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.gradeLabel}>
        {lesson.unit.grade.name} — {lesson.unit.title}
      </Text>
      <Text style={styles.lessonTitle}>
        {lesson.displayOrder}. {lesson.title}
      </Text>

      {lesson.progress?.completed && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>✓ Completed</Text>
        </View>
      )}

      {/* Progress */}
      {lesson.progress != null && !lesson.progress.completed && lesson.progress.progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={{ flex: lesson.progress.progress, height: "100%", backgroundColor: "#2563eb", borderRadius: 4 }} />
            <View style={{ flex: 100 - (lesson.progress.progress as number), height: "100%", backgroundColor: "transparent" }} />
          </View>
          <Text style={styles.progressText}>{Math.round(lesson.progress.progress)}%</Text>
        </View>
      )}

      {/* Video Placeholder */}
      {activeVideo && (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.playIcon}>▶</Text>
          <Text style={styles.videoTitle}>{activeVideo.title}</Text>
          <Text style={styles.videoDuration}>{activeVideo.duration} seconds</Text>
        </View>
      )}

      {/* Video List */}
      <Text style={styles.sectionTitle}>Videos</Text>
      {lesson.videos.map((video) => (
        <TouchableOpacity
          key={video.id}
          style={[styles.videoItem, activeVideoId === video.id && styles.activeVideo]}
          onPress={() => setActiveVideoId(video.id)}
        >
          <View style={styles.videoInfo}>
            <Text style={styles.videoName}>{video.title}</Text>
            <Text style={styles.videoMeta}>{video.duration}s • {video.timelineEvents.length} events</Text>
          </View>
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => handleCompleteVideo(video.id)}
          >
            <Text style={styles.completeBtnText}>✓</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {/* Timeline Events */}
      {activeVideo != null && activeVideo.timelineEvents.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {activeVideo.timelineEvents.map((event) => (
            <View key={event.id} style={styles.timelineItem}>
              <View style={styles.timelineDot}>
                <Text style={styles.timelineTime}>{event.timestamp}s</Text>
              </View>
              <Text style={styles.timelineTitle}>{event.title}</Text>
            </View>
          ))}
        </>
      )}

      {/* Vocabulary */}
      {lesson.vocabulary.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Vocabulary</Text>
          {lesson.vocabulary.map((word) => (
            <View key={word.id} style={styles.vocabItem}>
              <Text style={styles.vocabWord}>{word.word}</Text>
              {word.phonetic && <Text style={styles.vocabPhonetic}>{word.phonetic}</Text>}
              <Text style={styles.vocabTranslation}>{word.translation}</Text>
              <Text style={styles.vocabDefinition}>{word.definition}</Text>
            </View>
          ))}
        </>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {lesson.homeworkEnabled && (
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>📝 View Homework</Text>
          </TouchableOpacity>
        )}
        {lesson.quizEnabled && (
          <TouchableOpacity style={[styles.actionBtn, styles.quizBtn]}>
            <Text style={[styles.actionBtnText, styles.quizBtnText]}>🎯 Take Quiz</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings */}
      {lesson.settings && (
        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {lesson.settings.requiresCamera && <Text style={styles.settingText}>📷 Camera Required</Text>}
          {lesson.settings.requiresMicrophone && <Text style={styles.settingText}>🎤 Microphone Required</Text>}
          <Text style={styles.settingText}>Pass score: {lesson.settings.minScoreToPass}%</Text>
          <Text style={styles.settingText}>Skipping: {lesson.settings.allowSkipping ? "Allowed" : "Disabled"}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 18, fontWeight: "600", color: "#0f172a", marginBottom: 12 },
  backLink: { color: "#2563eb", fontSize: 16 },
  backButton: { marginBottom: 12 },
  backText: { color: "#2563eb", fontSize: 16, fontWeight: "500" },
  gradeLabel: { fontSize: 14, color: "#64748b", marginBottom: 4 },
  lessonTitle: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  completedBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  completedText: { color: "#16a34a", fontSize: 13, fontWeight: "600" },
  progressContainer: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 },
  progressBar: { flex: 1, height: 8, flexDirection: "row", backgroundColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#2563eb", borderRadius: 4 },
  progressText: { fontSize: 12, color: "#64748b", width: 40, textAlign: "right" },
  videoPlaceholder: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  playIcon: { fontSize: 48, color: "rgba(255,255,255,0.6)", marginBottom: 8 },
  videoTitle: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  videoDuration: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#0f172a", marginTop: 16, marginBottom: 12 },
  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  activeVideo: { borderWidth: 2, borderColor: "#2563eb" },
  videoInfo: { flex: 1 },
  videoName: { fontSize: 15, fontWeight: "500", color: "#0f172a", marginBottom: 2 },
  videoMeta: { fontSize: 12, color: "#94a3b8" },
  completeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  completeBtnText: { fontSize: 16, color: "#475569" },
  timelineItem: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  timelineDot: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineTime: { fontSize: 11, fontWeight: "600", color: "#2563eb" },
  timelineTitle: { fontSize: 14, color: "#334155", flex: 1 },
  vocabItem: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  vocabWord: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  vocabPhonetic: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  vocabTranslation: { fontSize: 14, color: "#475569", marginTop: 4 },
  vocabDefinition: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  actionBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionBtnText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  quizBtn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  quizBtnText: { color: "#ffffff" },
  settingsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  settingText: { fontSize: 14, color: "#475569", marginBottom: 6 },
});
