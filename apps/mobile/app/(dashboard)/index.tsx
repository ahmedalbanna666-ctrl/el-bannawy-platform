import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { api } from "../../src/lib/api-client";
import { useAuthStore } from "../../src/lib/auth-store";

interface DashboardData {
  user: { id: string; fullName: string; role: string };
  xp: { total: number; level: number; nextLevelXp: number };
  coins: number;
  achievements: number;
  streak: number;
  continueLearning: {
    unitName: string;
    lessonName: string;
    progress: number;
    lessonId: string;
  } | null;
  recentActivity: { id: string; type: string; description: string; createdAt: string }[];
  upcomingLiveClasses: { id: string; title: string; date: string; teacherName: string }[];
  stats: {
    completedLessons: number;
    totalLessons: number;
    homeworkPending: number;
    quizPassRate: number;
    attendanceRate: number;
  };
}

export default function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const fetchDashboard = async () => {
    try {
      const response = await api.get<DashboardData>("/home");
      if (response.data) setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); void fetchDashboard(); }}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Banner */}
      <View style={styles.banner}>
        <Text style={styles.greeting}>
          Welcome{data?.user?.fullName ? `, ${data.user.fullName.split(" ")[0]}` : ""}!
        </Text>
        <Text style={styles.bannerSub}>Ready to continue learning?</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Text style={styles.statLabel}>Level {data?.xp.level ?? 1}</Text>
            <Text style={styles.statValue}>{data?.xp.total ?? 0} XP</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statLabel}>Coins</Text>
            <Text style={styles.statValue}>{data?.coins ?? 0}</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>{data?.streak ?? 0}d</Text>
          </View>
        </View>
      </View>

      {/* Continue Learning */}
      {data?.continueLearning && (
        <TouchableOpacity style={styles.continueCard}>
          <Text style={styles.continueUnit}>{data.continueLearning.unitName}</Text>
          <Text style={styles.continueLesson}>{data.continueLearning.lessonName}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${data.continueLearning.progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(data.continueLearning.progress)}% complete</Text>
        </TouchableOpacity>
      )}

      {/* Stats Grid */}
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridValue}>{data?.stats.completedLessons ?? 0}/{data?.stats.totalLessons ?? 0}</Text>
          <Text style={styles.gridLabel}>Lessons</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridValue}>{data?.stats.homeworkPending ?? 0}</Text>
          <Text style={styles.gridLabel}>Homework</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridValue}>{data?.stats.quizPassRate ?? 0}%</Text>
          <Text style={styles.gridLabel}>Pass Rate</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridValue}>{data?.stats.attendanceRate ?? 0}%</Text>
          <Text style={styles.gridLabel}>Attendance</Text>
        </View>
      </View>

      {/* Section Links */}
      {[
        { title: "Ask AI", icon: "🤖" },
        { title: "Book Live Class", icon: "🎯" },
        { title: "Curriculum Units", icon: "📚" },
        { title: "Story", icon: "📖" },
        { title: "Final Review", icon: "📝", locked: true },
        { title: "Learn From Mistakes", icon: "🔄" },
        { title: "Educational Games", icon: "🎮" },
      ].map((section, i) => (
        <TouchableOpacity key={i} style={[styles.sectionCard, section.locked && styles.lockedSection]}>
          <Text style={styles.sectionIcon}>{section.icon}</Text>
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, section.locked && styles.lockedText]}>{section.title}</Text>
            {section.locked && <Text style={styles.sectionSub}>Available during official revision period</Text>}
          </View>
        </TouchableOpacity>
      ))}

      {/* XP Progress */}
      <View style={styles.xpCard}>
        <Text style={styles.xpTitle}>Level {data?.xp.level ?? 1} Progress</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(data?.xp.total ?? 0) % 1000 / 10}%`, backgroundColor: "#f59e0b" }]} />
        </View>
        <Text style={styles.xpDetail}>
          {(data?.xp.total ?? 0) % 1000} / {data?.xp.nextLevelXp ?? 1000} XP
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  errorText: { color: "#ef4444", fontSize: 16, marginBottom: 16 },
  retryButton: { backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: "#ffffff", fontWeight: "600" },
  banner: { backgroundColor: "#2563eb", borderRadius: 16, padding: 20 },
  greeting: { fontSize: 24, fontWeight: "700", color: "#ffffff" },
  bannerSub: { fontSize: 14, color: "#bfdbfe", marginTop: 4, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 8 },
  statBadge: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, flex: 1 },
  statLabel: { fontSize: 12, color: "#bfdbfe" },
  statValue: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  continueCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  continueUnit: { fontSize: 12, color: "#2563eb", fontWeight: "500" },
  continueLesson: { fontSize: 18, fontWeight: "600", color: "#1e293b", marginVertical: 4 },
  progressBar: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, marginTop: 8 },
  progressFill: { height: "100%", backgroundColor: "#2563eb", borderRadius: 3 },
  progressText: { fontSize: 12, color: "#64748b", marginTop: 4 },
  grid: { flexDirection: "row", gap: 8 },
  gridItem: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, flex: 1, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  gridValue: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  gridLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  sectionCard: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  lockedSection: { opacity: 0.5 },
  sectionIcon: { fontSize: 24 },
  sectionContent: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#1e293b" },
  lockedText: { color: "#94a3b8" },
  sectionSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  xpCard: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  xpTitle: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginBottom: 8 },
  xpDetail: { fontSize: 12, color: "#64748b", marginTop: 6, textAlign: "right" },
});
