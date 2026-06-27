import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/lib/api-client";

interface LessonSummary {
  id: string;
  title: string;
  displayOrder: number;
  estimatedDuration: number;
  isPremium: boolean;
  homeworkEnabled: boolean;
  quizEnabled: boolean;
}

interface Unit {
  id: string;
  title: string;
  description: string;
  displayOrder: number;
  lessons: LessonSummary[];
}

interface Grade {
  id: string;
  name: string;
  displayOrder: number;
  units: Unit[];
}

interface Stage {
  id: string;
  name: string;
  displayOrder: number;
  grades: Grade[];
}

export default function UnitsScreen() {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  async function fetchCurriculum() {
    try {
      const response = await api.get<Stage[]>("/curriculum");
      if (response.data) setStages(response.data);
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchCurriculum();
  }, []);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCurriculum(); }} />
      }
    >
      <Text style={styles.title}>Curriculum</Text>
      <Text style={styles.subtitle}>Browse all units and track your progress</Text>

      {stages.map((stage) => (
        <View key={stage.id} style={styles.stageSection}>
          <Text style={styles.stageName}>{stage.name}</Text>

          {stage.grades.map((grade) => (
            <View key={grade.id} style={styles.gradeSection}>
              <Text style={styles.gradeName}>{grade.name}</Text>

              {grade.units.map((unit) => {
                const isExpanded = expandedUnits.has(unit.id);
                return (
                  <View key={unit.id} style={styles.unitCard}>
                    <TouchableOpacity
                      style={styles.unitHeader}
                      onPress={() => toggleUnit(unit.id)}
                    >
                      <View style={styles.unitInfo}>
                        <Text style={styles.unitOrder}>Unit {unit.displayOrder}</Text>
                        <Text style={styles.unitTitle}>{unit.title}</Text>
                      </View>
                      <View style={styles.unitMeta}>
                        <Text style={styles.lessonCount}>{unit.lessons.length} lessons</Text>
                        <Text style={styles.expandIcon}>{isExpanded ? "▲" : "▼"}</Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.lessonsList}>
                        {unit.lessons.map((lesson) => (
                          <TouchableOpacity
                            key={lesson.id}
                            style={styles.lessonItem}
                            onPress={() => router.push(`/(dashboard)/lessons/${lesson.id}`)}
                          >
                            <View style={[styles.lessonIcon, lesson.isPremium && styles.premiumIcon]}>
                              <Text style={styles.lessonIconText}>{lesson.isPremium ? "★" : "▶"}</Text>
                            </View>
                            <View style={styles.lessonInfo}>
                              <Text style={styles.lessonTitle}>
                                {lesson.displayOrder}. {lesson.title}
                              </Text>
                              <Text style={styles.lessonMeta}>
                                {lesson.estimatedDuration} min
                                {lesson.quizEnabled ? " • Quiz" : ""}
                                {lesson.homeworkEnabled ? " • HW" : ""}
                              </Text>
                            </View>
                            {lesson.isPremium && <Text style={styles.premiumBadge}>Premium</Text>}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 24 },
  stageSection: { marginBottom: 24 },
  stageName: { fontSize: 18, fontWeight: "600", color: "#334155", marginBottom: 12 },
  gradeSection: { marginBottom: 16 },
  gradeName: { fontSize: 14, fontWeight: "500", color: "#94a3b8", marginBottom: 8, textTransform: "uppercase" },
  unitCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  unitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  unitInfo: { flex: 1 },
  unitOrder: { fontSize: 14, fontWeight: "600", color: "#2563eb", marginBottom: 2 },
  unitTitle: { fontSize: 16, fontWeight: "500", color: "#0f172a" },
  unitMeta: { alignItems: "flex-end", gap: 4 },
  lessonCount: { fontSize: 12, color: "#94a3b8" },
  expandIcon: { fontSize: 12, color: "#94a3b8" },
  lessonsList: { borderTopWidth: 1, borderTopColor: "#f1f5f9", padding: 12 },
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: "#f8fafc",
  },
  lessonIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  premiumIcon: { backgroundColor: "#fef9c3" },
  lessonIconText: { fontSize: 14, color: "#16a34a" },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontWeight: "500", color: "#0f172a", marginBottom: 2 },
  lessonMeta: { fontSize: 12, color: "#94a3b8" },
  premiumBadge: { fontSize: 10, color: "#ca8a04", fontWeight: "600", backgroundColor: "#fef9c3", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
});
