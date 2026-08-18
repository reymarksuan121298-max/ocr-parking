import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Card, Surface, Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
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

    const channel = supabase
      .channel("dashboard_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_records" },
        () => loadStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        () => loadStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cards = [
    {
      label: "Currently Parked",
      value: stats?.parkedNow,
      color: "#059669",
      bgColor: "#ECFDF5",
      icon: "car-clock",
      desc: "Live vehicles on campus",
    },
    {
      label: "Entries Today",
      value: stats?.entriesToday,
      color: "#2563EB",
      bgColor: "#EFF6FF",
      icon: "car-arrow-right",
      desc: "Total recorded check-ins",
    },
    {
      label: "Exits Today",
      value: stats?.exitsToday,
      color: "#7C3AED",
      bgColor: "#F5F3FF",
      icon: "car-arrow-left",
      desc: "Total departed vehicles",
    },
    {
      label: "Registered Vehicles",
      value: stats?.registeredVehicles,
      color: "#D97706",
      bgColor: "#FFFBEB",
      icon: "shield-car",
      desc: "Total enrolled in system",
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} colors={["#2563EB"]} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          System Overview
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Real-time activity & parking metrics
        </Text>
      </View>

      <View style={styles.grid}>
        {cards.map((c) => (
          <Surface key={c.label} style={styles.card} elevation={1}>
            <View style={styles.cardTop}>
              <View style={[styles.iconWrapper, { backgroundColor: c.bgColor }]}>
                <MaterialCommunityIcons name={c.icon as any} size={24} color={c.color} />
              </View>
            </View>
            <Text variant="displaySmall" style={[styles.value, { color: c.color }]}>
              {c.value !== undefined ? c.value : "—"}
            </Text>
            <Text variant="titleSmall" style={styles.label}>
              {c.label}
            </Text>
            <Text variant="bodySmall" style={styles.desc}>
              {c.desc}
            </Text>
          </Surface>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#64748B",
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontWeight: "800",
    fontSize: 32,
    lineHeight: 38,
  },
  label: {
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 6,
  },
  desc: {
    color: "#94A3B8",
    marginTop: 2,
    fontSize: 11,
  },
});

