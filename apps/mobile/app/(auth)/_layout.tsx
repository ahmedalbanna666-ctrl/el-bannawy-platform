import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../src/lib/auth-store";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);

  if (isAuthenticated) {
    return <Redirect href="/(dashboard)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
