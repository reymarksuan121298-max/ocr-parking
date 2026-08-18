import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { BarChart } from "react-native-gifted-charts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/lib/supabase";

interface DayCount {
  label: string;
  value: number;
}

export default function ReportsScreen() {
  const [entryData, setEntryData] = useState<DayCount[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadWeeklyEntries() {
    setLoading(true);
    const days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));

    const counts = await Promise.all(
      days.map(async (day) => {
        const { count } = await supabase
          .from("parking_records")
          .select("*", { count: "exact", head: true })
          .gte("time_in", startOfDay(day).toISOString())
          .lte("time_in", endOfDay(day).toISOString());
        return { label: format(day, "EEE"), value: count ?? 0 };
      })
    );

    setEntryData(counts);
    setLoading(false);
  }

  useEffect(() => {
    loadWeeklyEntries();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>
        Weekly Entry Report
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Vehicle entries logged per day, last 7 days
      </Text>

      {!loading && (
        <View style={styles.chartWrap}>
          <BarChart
            data={entryData.map((d) => ({ value: d.value, label: d.label }))}
            barWidth={28}
            barBorderRadius={6}
            frontColor="#0267D2"
            yAxisThickness={0}
            xAxisThickness={1}
            noOfSections={4}
            height={220}
          />
        </View>
      )}

      <Text variant="bodySmall" style={styles.note}>
        Extend this screen with date-range pickers, CSV export, or per-owner-type breakdowns as
        needed by the school's reporting requirements.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#F8FAFC" },
  title: { fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", marginTop: 2, marginBottom: 16 },
  chartWrap: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  note: { marginTop: 20, color: "#94A3B8" },
});
