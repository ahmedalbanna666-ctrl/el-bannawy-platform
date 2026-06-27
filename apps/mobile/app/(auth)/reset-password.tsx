import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { api } from "../../src/lib/api-client";

export default function ResetPasswordScreen() {
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!mobile.trim() || !code.trim() || !newPassword.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/auth/reset-password", {
        mobile: mobile.trim(),
        code: code.trim(),
        newPassword,
      });
      setSuccess("Password reset successfully!");
      setTimeout(() => router.replace("/(auth)/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter the verification code and your new password</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Mobile Number"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={setMobile}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Verification Code"
          placeholderTextColor="#94a3b8"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <View style={styles.backLink}>
          <Link href="/(auth)/login" style={styles.link}>
            <Text>Back to Sign In</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#1e293b", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748b", textAlign: "center", marginBottom: 32 },
  error: { color: "#ef4444", fontSize: 14, textAlign: "center", marginBottom: 16, backgroundColor: "#fef2f2", padding: 12, borderRadius: 8 },
  success: { color: "#16a34a", fontSize: 14, textAlign: "center", marginBottom: 16, backgroundColor: "#f0fdf4", padding: 12, borderRadius: 8 },
  input: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, color: "#1e293b" },
  button: { backgroundColor: "#2563eb", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  backLink: { alignItems: "center", marginTop: 24 },
  link: { padding: 8 },
});
