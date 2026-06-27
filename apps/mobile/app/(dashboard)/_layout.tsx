import { Redirect } from "expo-router";
import { Stack } from "expo-router";
import { useAuthStore } from "../../src/lib/auth-store";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";

export default function DashboardLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#1e293b",
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Dashboard" }} />
      <Stack.Screen name="units" options={{ title: "Curriculum" }} />
      <Stack.Screen name="lessons/[id]" options={{ title: "Lesson" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  logoutButton: { paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: "#2563eb", fontSize: 14, fontWeight: "500" },
});
