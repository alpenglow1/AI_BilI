import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>明细</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/home.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>AI 对话</NativeTabs.Trigger.Label>
        {/* 原型用 fa-solid fa-plus，iOS 用 SF Symbol "plus" 视觉最接近；
            Android 退回 PNG（src fallback） */}
        <NativeTabs.Trigger.Icon
          sf="plus"
          src={require("@/assets/images/tabIcons/explore.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>我</NativeTabs.Trigger.Label>
        {/* 原型用 fa-solid fa-user，iOS 用 SF Symbol "person"（选中时 person.fill）；
            Android 退回 PNG（src fallback） */}
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          src={require("@/assets/images/tabIcons/person.png")}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}
