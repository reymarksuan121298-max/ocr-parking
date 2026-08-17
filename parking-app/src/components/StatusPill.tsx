import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

const COLORS: Record<string, { bg: string; fg: string }> = {
  Parked: { bg: "#DCFCE7", fg: "#166534" },
  Inside: { bg: "#DCFCE7", fg: "#166534" },
  Outside: { bg: "#F1F5F9", fg: "#475569" },
  Exited: { bg: "#F1F5F9", fg: "#475569" },
  Flagged: { bg: "#FEE2E2", fg: "#991B1B" },
};

export function StatusPill({ status }: { status: string }) {
  const colors = COLORS[status] ?? COLORS.Outside;
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
