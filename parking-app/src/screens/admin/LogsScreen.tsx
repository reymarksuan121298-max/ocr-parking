import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { List, Text } from "react-native-paper";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { LogEntry } from "@/types/database";

export default function LogsScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(200);
    if (!error) setLogs((data as LogEntry[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel("logs_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "logs" },
        () => loadLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.log_id}
        renderItem={({ item }) => (
          <List.Item
            title={item.action}
            description={`${item.description ?? ""}\n${format(new Date(item.timestamp), "MMM d, yyyy h:mm a")}`}
            descriptionNumberOfLines={2}
            left={(props) => <List.Icon {...props} icon="text-box-check-outline" />}
          />
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No audit log entries yet.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  empty: { textAlign: "center", marginTop: 40, color: "#94A3B8" },
});
