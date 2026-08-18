import React from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { RecordCard } from "@/components/RecordCard";
import { useLiveParkedVehicles } from "@/hooks/useParkingRecords";

export default function LiveStatusScreen() {
  const { records, loading, refetch } = useLiveParkedVehicles();

  return (
    <View style={styles.container}>
      <Surface style={styles.headerCard} elevation={1}>
        <View style={styles.headerLeft}>
          <Text variant="titleLarge" style={styles.title}>
            Currently Parked
          </Text>
          <Text variant="bodyMedium" style={styles.count}>
            {records.length} vehicle{records.length === 1 ? "" : "s"} on campus
          </Text>
        </View>
        <View style={styles.badgeContainer}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </Surface>

      <FlatList
        data={records}
        keyExtractor={(item) => item.record_id}
        renderItem={({ item }) => <RecordCard record={item} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} colors={["#2563EB"]} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="car-off" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Parked Vehicles</Text>
              <Text style={styles.emptySubtitle}>All registered vehicles are currently off campus.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontWeight: "800",
    color: "#0F172A",
  },
  count: {
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginRight: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },
});

