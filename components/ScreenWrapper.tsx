import React from "react";
import { Image, ImageBackground, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useLang } from "../lib/LanguageProvider";
import MarqueeTicker from "./MarqueeTicker";

interface Props {
  title?: string;
  children: React.ReactNode;
  onBack?: () => void;
  showHome?: boolean;
}

export default function ScreenWrapper({ title, children, onBack, showHome = true }: Props) {
  const { t, toggleEnglish, isEnglish, lang } = useLang();

  return (
    <ImageBackground source={require("../assets/background.png")} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sw.header}>
          <TouchableOpacity onPress={onBack ?? (() => router.back())} style={sw.backBtn}>
            <Text style={sw.backTxt}>Back</Text>
          </TouchableOpacity>
          <Text style={sw.headerTitle}>{title ?? ''}</Text>
          <View style={sw.headerRight}>
            {lang !== 'en' && (
              <TouchableOpacity onPress={toggleEnglish} style={[sw.langToggle, isEnglish && sw.langToggleActive]}>
                <Text style={[sw.langToggleTxt, isEnglish && sw.langToggleTxtActive]}>EN</Text>
              </TouchableOpacity>
            )}
            {showHome && (
              <TouchableOpacity onPress={() => router.push("/home" as never)} style={sw.homeBtn}>
                <Text style={sw.homeTxt}>Home</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <MarqueeTicker />
        <View style={{ flex: 1 }}>{children}</View>
        <View style={sw.footer}>
          <Image source={require("../assets/blueflute-logo.png")} style={{ width: 56, height: 20 }} resizeMode="contain" />
          <Text style={{ fontSize: 10, color: "#5A7A8A", fontWeight: "600" }}>  {t.poweredBy}</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const sw = StyleSheet.create({
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 25 : Platform.OS === "web" ? 14 : 8, paddingBottom: 12, backgroundColor: "rgba(255,255,255,0.85)", borderBottomWidth: 1, borderBottomColor: "rgba(27,58,92,0.1)" },
  backBtn:      { borderWidth: 1.5, borderColor: "#2E5480", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  backTxt:      { fontSize: 15, fontWeight: "700", color: "#2E5480" },
  headerTitle:  { fontSize: 16, fontWeight: "700", color: "#2E5480", textAlign: "center", flex: 1 },
  headerRight:  { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end" },
  langToggle:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(27,58,92,0.3)", backgroundColor: "rgba(255,255,255,0.8)" },
  langToggleActive: { backgroundColor: "#2E5480", borderColor: "#2E5480" },
  langToggleTxt:    { fontSize: 11, fontWeight: "700", color: "#2E5480" },
  langToggleTxtActive: { color: "#FFFFFF" },
  homeBtn:      { backgroundColor: "#2E5480", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  homeTxt:      { fontSize: 15, fontWeight: "700", color: "white" },
  footer:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.7)", borderTopWidth: 1, borderTopColor: "rgba(27,58,92,0.08)" },
});
