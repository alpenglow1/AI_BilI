import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import "../global.css";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { LoginScreen } from "@/screens/login-screen";
import { RegisterScreen } from "@/screens/register-screen";
import { useAuthStore } from "@/store/auth-store";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const initialize = useAuthStore((s) => s.initialize);
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);

  // 未登录时本地切换 login / register 视图
  // 不走 expo-router 路由：避免和 NativeTabs 的导航系统冲突
  const [authView, setAuthView] = useState<"login" | "register">("login");

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  // auth-store 还在拉初始 session：仅显示 splash，不渲染任何路由
  if (!initialized) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" />
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {session ? (
        <>
          <AnimatedSplashOverlay />
          <AppTabs />
        </>
      ) : authView === "login" ? (
        <LoginScreen onSwitchToRegister={() => setAuthView("register")} />
      ) : (
        <RegisterScreen onSwitchToLogin={() => setAuthView("login")} />
      )}
    </ThemeProvider>
  );
}
