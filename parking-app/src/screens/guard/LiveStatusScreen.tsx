import React from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { RecordCard } from "@/components/RecordCard";
import { useLiveParkedVehicles } from "@/hooks/useParkingRecords";

export default function LiveStatusScreen() {
  const { records, loading, refetch } = useLiveParkedVehicles();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          Currently Parked
        </Text>
        <Text variant="bodyMedium" style={styles.count}>
          {records.length} vehicle{records.length === 1 ? "" : "s"} on campus
        </Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.record_id}
        renderItem={({ item }) => <RecordCard record={item} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No vehicles currently parked.</Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { padding: 16, paddingBottom: 4 },
  title: { fontWeight: "700" },
  count: { color: "#64748B", marginTop: 2 },
  empty: { textAlign: "center", marginTop: 40, color: "#94A3B8" },
});
