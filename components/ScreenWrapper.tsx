import React from "react";
import { Image, ImageBackground, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

interface Props {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  showHome?: boolean;
}

export default function ScreenWrapper({ title, children, onBack, showHome = true }: Props) {
  return (
    <ImageBackground source={require("../assets/background.png")} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={sw.header}>
          <TouchableOpacity onPress={onBack ?? (() => router.back())} style={sw.backBtn}>
            <Text style={sw.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={sw.title} numberOfLines={1}>{title}</Text>
          <View style={sw.headerRight}>
            <Image source={require("../assets/blueflute-logo.png")} style={sw.bfLogo} resizeMode="contain" />
            {showHome && (
              <TouchableOpacity onPress={() => router.push("/home" as never)} style={sw.homeBtn}>
                <Text style={{ fontSize: 20 }}>🏠</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
        <View style={sw.footer}>
          <Image source={require("../assets/blueflute-logo.png")} style={{ width: 56, height: 20 }} resizeMode="contain" />
          <Text style={{ fontSize: 10, color: "#5A7A8A", fontWeight: "600" }}>  Blue Flute Consulting LLC-FZ  |  www.bluefluteconsulting.com</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const sw = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "web" ? 14 : 8, paddingBottom: 12, backgroundColor: "rgba(255,255,255,0.85)", borderBottomWidth: 1, borderBottomColor: "rgba(27,58,92,0.1)" },
  backBtn: { paddingRight: 8, minWidth: 64 },
  backTxt: { fontSize: 15, color: "#1B3A5C", fontWeight: "600" },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: "#1B3A5C", textAlign: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 64, justifyContent: "flex-end" },
  bfLogo: { width: 90, height: 34 },
  homeBtn: { padding: 4 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.7)", borderTopWidth: 1, borderTopColor: "rgba(27,58,92,0.08)" },
});
