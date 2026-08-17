import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { format } from "date-fns";
import { StatusPill } from "@/components/StatusPill";
import type { ParkingRecord } from "@/types/database";

export function RecordCard({ record, onPress }: { record: ParkingRecord; onPress?: () => void }) {
  const vehicle = record.vehicle;
  const owner = vehicle?.owner;

  return (
    <Card style={styles.card} mode="contained" onPress={onPress}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.plate}>
            {vehicle?.plate_number ?? "Unknown plate"}
          </Text>
          <StatusPill status={record.status} />
        </View>

        {owner && (
          <Text variant="bodyMedium" style={styles.owner}>
            {owner.fname} {owner.lname} · {owner.type}
          </Text>
        )}

        <View style={styles.timesRow}>
          <Text variant="bodySmall">In: {format(new Date(record.time_in), "MMM d, h:mm a")}</Text>
          {record.time_out && (
            <Text variant="bodySmall">
              Out: {format(new Date(record.time_out), "MMM d, h:mm a")}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginVertical: 6, marginHorizontal: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  plate: { fontWeight: "700", letterSpacing: 1 },
  owner: { marginTop: 4, color: "#475569" },
  timesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
});

