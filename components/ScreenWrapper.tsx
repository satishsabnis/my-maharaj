import React, { useEffect, useRef } from "react";
import { Animated, Image, ImageBackground, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useLang } from "../lib/LanguageProvider";
import { TICKER_TEXT } from "../lib/constants";

interface Props {
  title?: string;
  children: React.ReactNode;
  onBack?: () => void;
  showHome?: boolean;
}

export default function ScreenWrapper({ title, children, onBack, showHome = true }: Props) {
  const { t, toggleEnglish, isEnglish, lang } = useLang();
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scrollX.setValue(-600);
    const anim = Animated.loop(
      Animated.timing(scrollX, {
        toValue: 0,
        duration: 12000,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <ImageBackground source={require("../assets/background.png")} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sw.header}>
          <TouchableOpacity onPress={onBack ?? (() => router.back())} style={sw.backBtn}>
            <Text style={sw.backTxt}>{t.back}</Text>
          </TouchableOpacity>
          <Image source={require("../assets/logo.png")} style={sw.maharajLogo} resizeMode="contain" />
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
        <View style={sw.ticker}>
          <Animated.Text style={[sw.tickerTxt, { transform: [{ translateX: scrollX }] }]}>
            {TICKER_TEXT}
          </Animated.Text>
        </View>
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
  backBtn:      { paddingRight: 8, minWidth: 60 },
  backTxt:      { fontSize: 15, color: "#1B3A5C", fontWeight: "600" },
  maharajLogo:  { flex: 1, height: 60, maxWidth: 220 },
  headerRight:  { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 60, justifyContent: "flex-end" },
  langToggle:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(27,58,92,0.3)", backgroundColor: "rgba(255,255,255,0.8)" },
  langToggleActive: { backgroundColor: "#1B3A5C", borderColor: "#1B3A5C" },
  langToggleTxt:    { fontSize: 11, fontWeight: "700", color: "#1B3A5C" },
  langToggleTxtActive: { color: "#FFFFFF" },
  homeBtn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(27,58,92,0.25)", backgroundColor: "rgba(255,255,255,0.8)" },
  homeTxt:      { fontSize: 12, fontWeight: "700", color: "#1B3A5C" },
  ticker:       { backgroundColor: "#F59E0B", overflow: "hidden", paddingVertical: 4 },
  tickerTxt:    { fontSize: 11, color: "#FFFFFF", fontWeight: "600", width: 1200 },
  footer:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.7)", borderTopWidth: 1, borderTopColor: "rgba(27,58,92,0.08)" },
});
