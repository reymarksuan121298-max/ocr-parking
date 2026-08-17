import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { supabase } from "@/lib/supabase";

interface Stats {
  parkedNow: number;
  entriesToday: number;
  exitsToday: number;
  registeredVehicles: number;
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    setLoading(true);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [{ count: parkedNow }, { count: entriesToday }, { count: exitsToday }, { count: registeredVehicles }] =
      await Promise.all([
        supabase.from("parking_records").select("*", { count: "exact", head: true }).eq("status", "Parked"),
        supabase
          .from("parking_records")
          .select("*", { count: "exact", head: true })
          .gte("time_in", startOfDay.toISOString()),
        supabase
          .from("parking_records")
          .select("*", { count: "exact", head: true })
          .eq("status", "Exited")
          .gte("time_out", startOfDay.toISOString()),
        supabase.from("vehicles").select("*", { count: "exact", head: true }),
      ]);

    setStats({
      parkedNow: parkedNow ?? 0,
      entriesToday: entriesToday ?? 0,
      exitsToday: exitsToday ?? 0,
      registeredVehicles: registeredVehicles ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  const cards: { label: string; value: number | undefined; color: string }[] = [
    { label: "Currently Parked", value: stats?.parkedNow, color: "#166534" },
    { label: "Entries Today", value: stats?.entriesToday, color: "#1D4ED8" },
    { label: "Exits Today", value: stats?.exitsToday, color: "#7C3AED" },
    { label: "Registered Vehicles", value: stats?.registeredVehicles, color: "#B45309" },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
    >
      <Text variant="titleLarge" style={styles.title}>
        Admin Dashboard
      </Text>

      <View style={styles.grid}>
        {cards.map((c) => (
          <Card key={c.label} style={styles.card} mode="contained">
            <Card.Content>
              <Text variant="displaySmall" style={[styles.value, { color: c.color }]}>
                {c.value ?? "—"}
              </Text>
              <Text variant="bodyMedium" style={styles.label}>
                {c.label}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#F8FAFC" },
  title: { fontWeight: "700", marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  card: { width: "47%", marginBottom: 12 },
  value: { fontWeight: "800" },
  label: { color: "#64748B", marginTop: 4 },
});
