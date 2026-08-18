import React, { useEffect } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
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
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons name="shield-check-outline" size={48} color="#059669" />
        </View>
        <Text variant="titleMedium" style={styles.emptyTitle}>
          No Active Alerts
        </Text>
        <Text style={styles.subtitle}>
          Alerts will appear here when a scanned plate does not match any vehicle in the database.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Surface style={styles.alertCard} elevation={2}>
        <View style={styles.alertHeader}>
          <View style={styles.alertIconCircle}>
            <MaterialCommunityIcons name="alert-decagram" size={28} color="#DC2626" />
          </View>
          <View style={styles.alertHeaderText}>
            <Text variant="titleLarge" style={styles.alertTitle}>
              Unregistered Vehicle
            </Text>
            <Text style={styles.alertSub}>Immediate attention required</Text>
          </View>
        </View>

        <View style={styles.plateContainer}>
          <Text style={styles.plateLabel}>DETECTED PLATE</Text>
          <Text style={styles.plate}>{flaggedPlate}</Text>
        </View>

        {photoUri && (
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
        )}

        <View style={styles.noticeBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#991B1B" style={{ marginRight: 6 }} />
          <Text style={styles.note}>
            This license plate is not found in the school registry. Direct the driver to the admin office if this is a new registration, or follow standard visitor protocol.
          </Text>
        </View>

        <Button
          mode="contained"
          icon="camera"
          onPress={() => navigation.navigate("Scan")}
          style={styles.button}
          contentStyle={{ paddingVertical: 6 }}
          buttonColor="#1E293B"
        >
          Back to Scanner
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F8FAFC",
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  alertIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  alertHeaderText: {
    flex: 1,
  },
  alertTitle: {
    color: "#991B1B",
    fontWeight: "800",
  },
  alertSub: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "500",
  },
  plateContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  plateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#991B1B",
    letterSpacing: 1,
    marginBottom: 4,
  },
  plate: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 3,
    color: "#7F1D1D",
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#E2E8F0",
  },
  noticeBox: {
    flexDirection: "row",
    backgroundColor: "#FFF1F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  note: {
    flex: 1,
    color: "#9F1239",
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    borderRadius: 10,
  },
});

