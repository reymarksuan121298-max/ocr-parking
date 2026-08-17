import React, { useEffect } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GuardStackParamList } from "@/navigation/RootNavigator";
import { useAuditLog } from "@/hooks/useAuditLog";

type Props = NativeStackScreenProps<GuardStackParamList, "Alerts">;

export default function AlertsScreen({ route, navigation }: Props) {
  const flaggedPlate = route.params?.flaggedPlate;
  const photoUri = route.params?.photoUri;
  const { logAction } = useAuditLog();

  useEffect(() => {
    if (flaggedPlate) {
      logAction(
        "Unregistered Plate Alert",
        `Guard flagged plate "${flaggedPlate}" as not found in the vehicle registry.`
      );
    }
  }, [flaggedPlate]);

  if (!flaggedPlate) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">No active alerts</Text>
        <Text style={styles.subtitle}>
          Alerts appear here when a scanned plate doesn't match any registered vehicle.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.alertBox}>
        <Text variant="titleLarge" style={styles.alertTitle}>
          ⚠ Unregistered Vehicle
        </Text>
        <Text style={styles.plate}>{flaggedPlate}</Text>
        {photoUri && <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />}
        <Text style={styles.note}>
          This plate is not in the registered vehicle database. It has been logged for admin
          review. Direct the driver to the admin office if this is a new registration, or treat
          as a visitor per school policy.
        </Text>
        <Button mode="contained" onPress={() => navigation.navigate("Scan")} style={styles.button}>
          Back to Scanner
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  subtitle: { color: "#64748B", marginTop: 8, textAlign: "center" },
  alertBox: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 16 },
  alertTitle: { color: "#991B1B", fontWeight: "700" },
  plate: { fontSize: 28, fontWeight: "800", marginVertical: 12, letterSpacing: 2 },
  photo: { width: "100%", height: 200, borderRadius: 10, marginBottom: 12 },
  note: { color: "#7F1D1D" },
  button: { marginTop: 16 },
});
