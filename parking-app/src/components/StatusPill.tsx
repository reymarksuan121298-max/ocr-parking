import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  Parked: { bg: "#DCFCE7", fg: "#166534", dot: "#22C55E" },
  Inside: { bg: "#DCFCE7", fg: "#166534", dot: "#22C55E" },
  Outside: { bg: "#F1F5F9", fg: "#475569", dot: "#94A3B8" },
  Exited: { bg: "#F1F5F9", fg: "#475569", dot: "#94A3B8" },
  Flagged: { bg: "#FEE2E2", fg: "#991B1B", dot: "#EF4444" },
};

export function StatusPill({ status }: { status: string }) {
  const colors = COLORS[status] ?? COLORS.Outside;
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      <Text style={[styles.text, { color: colors.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

