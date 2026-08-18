import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { Button, IconButton, List, Text } from "react-native-paper";
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

  function handleDeleteLog(item: LogEntry) {
    Alert.alert(
      "Confirm Log Deletion",
      `Are you sure you want to delete this log entry: "${item.action}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("logs").delete().eq("log_id", item.log_id);
            if (!error) {
              loadLogs();
            } else {
              console.warn("[delete log error]:", error.message);
            }
          },
        },
      ]
    );
  }

  function handleClearAllLogs() {
    if (logs.length === 0) return;
    Alert.alert(
      "Clear All Audit Logs",
      "Are you sure you want to permanently delete ALL audit log entries? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("logs").delete().neq("log_id", "00000000-0000-0000-0000-000000000000");
            if (!error) {
              loadLogs();
            } else {
              console.warn("[clear logs error]:", error.message);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {logs.length > 0 && (
        <View style={styles.topBar}>
          <Text variant="bodySmall" style={styles.logCount}>
            {logs.length} audit log {logs.length === 1 ? "entry" : "entries"}
          </Text>
          <Button
            mode="text"
            textColor="#DC2626"
            icon="trash-can-outline"
            compact
            onPress={handleClearAllLogs}
          >
            Clear All
          </Button>
        </View>
      )}

      <FlatList
        data={logs}
        keyExtractor={(item) => item.log_id}
        renderItem={({ item }) => (
          <List.Item
            title={item.action}
            description={`${item.description ?? ""}\n${format(new Date(item.timestamp), "MMM d, yyyy h:mm a")}`}
            descriptionNumberOfLines={2}
            left={(props) => <List.Icon {...props} icon="text-box-check-outline" />}
            right={(props) => (
              <IconButton
                icon="delete-outline"
                iconColor="#94A3B8"
                onPress={() => handleDeleteLog(item)}
              />
            )}
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  logCount: {
    color: "#64748B",
    fontWeight: "600",
  },
  empty: { textAlign: "center", marginTop: 40, color: "#94A3B8" },
});
