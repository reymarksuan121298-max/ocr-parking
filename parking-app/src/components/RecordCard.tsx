import React from "react";
import { StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { format } from "date-fns";
import { StatusPill } from "@/components/StatusPill";
import type { ParkingRecord } from "@/types/database";

export function RecordCard({ record, onPress }: { record: ParkingRecord; onPress?: () => void }) {
  const vehicle = record.vehicle;
  const owner = vehicle?.owner;

  return (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.headerRow}>
        <View style={styles.plateContainer}>
          <MaterialCommunityIcons name="car-side" size={18} color="#1E293B" style={{ marginRight: 6 }} />
          <Text variant="titleMedium" style={styles.plate}>
            {vehicle?.plate_number ?? "Unknown plate"}
          </Text>
        </View>
        <StatusPill status={record.status} />
      </View>

      {owner ? (
        <View style={styles.ownerRow}>
          <MaterialCommunityIcons name="account-outline" size={16} color="#64748B" style={{ marginRight: 4 }} />
          <Text variant="bodyMedium" style={styles.owner}>
            {owner.fname} {owner.lname}
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{owner.type}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.timesRow}>
        <View style={styles.timeItem}>
          <MaterialCommunityIcons name="login" size={14} color="#059669" style={{ marginRight: 4 }} />
          <Text variant="bodySmall" style={styles.timeLabel}>
            In: <Text style={styles.timeValue}>{format(new Date(record.time_in), "MMM d, h:mm a")}</Text>
          </Text>
        </View>
        {record.time_out ? (
          <View style={styles.timeItem}>
            <MaterialCommunityIcons name="logout" size={14} color="#DC2626" style={{ marginRight: 4 }} />
            <Text variant="bodySmall" style={styles.timeLabel}>
              Out: <Text style={styles.timeValue}>{format(new Date(record.time_out), "MMM d, h:mm a")}</Text>
            </Text>
          </View>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  plateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  plate: {
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#0F172A",
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  owner: {
    fontWeight: "600",
    color: "#334155",
    marginRight: 8,
  },
  typeBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3730A3",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  timesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeLabel: {
    color: "#64748B",
  },
  timeValue: {
    color: "#1E293B",
    fontWeight: "600",
  },
});


