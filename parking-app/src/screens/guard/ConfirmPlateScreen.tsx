import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Banner, Button, Text, TextInput } from "react-native-paper";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GuardStackParamList } from "@/navigation/RootNavigator";
import { useVehicleByPlate } from "@/hooks/useVehicleByPlate";
import { useParkingRecords } from "@/hooks/useParkingRecords";
import type { Vehicle } from "@/types/database";

type Props = NativeStackScreenProps<GuardStackParamList, "ConfirmPlate">;

export default function ConfirmPlateScreen({ route, navigation }: Props) {
  const { photoUri, ocrResult } = route.params;
  const { findVehicleByPlate, loading: lookingUp } = useVehicleByPlate();
  const { logEntryOrExit, submitting } = useParkingRecords();

  const [plateNumber, setPlateNumber] = useState(ocrResult.candidatePlate ?? "");
  const [matchedVehicle, setMatchedVehicle] = useState<Vehicle | null>(null);
  const [checked, setChecked] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function handleLookup() {
    if (!plateNumber.trim()) return;
    setChecked(true);
    setNotFound(false);
    const vehicle = await findVehicleByPlate(plateNumber);
    setMatchedVehicle(vehicle);
    setNotFound(!vehicle);
  }

  async function handleConfirmLog() {
    if (!matchedVehicle) return;
    const result = await logEntryOrExit(matchedVehicle, photoUri);
    if (result) {
      navigation.navigate("LiveStatus");
    }
  }

  function handleFlagUnregistered() {
    navigation.navigate("Alerts", { flaggedPlate: plateNumber, photoUri });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />

      {ocrResult.confidence === "low" && (
        <Banner visible icon="alert" style={styles.banner}>
          Low OCR confidence — please verify or retake the photo.
        </Banner>
      )}

      <Text variant="labelLarge" style={styles.label}>
        Recognized Plate Number (edit if needed)
      </Text>
      <TextInput
        value={plateNumber}
        onChangeText={(t) => {
          setPlateNumber(t.toUpperCase());
          setChecked(false);
          setMatchedVehicle(null);
        }}
        autoCapitalize="characters"
        mode="outlined"
        style={styles.input}
      />

      <Button mode="outlined" onPress={handleLookup} loading={lookingUp} style={styles.button}>
        Check Plate
      </Button>

      {checked && matchedVehicle && (
        <View style={styles.matchBox}>
          <Text variant="titleMedium">Vehicle Found</Text>
          <Text>Type: {matchedVehicle.vehicle_type}</Text>
          {matchedVehicle.owner && (
            <Text>
              Owner: {matchedVehicle.owner.fname} {matchedVehicle.owner.lname} (
              {matchedVehicle.owner.type})
            </Text>
          )}
          <Text style={styles.currentStatus}>
            Current status: {matchedVehicle.status}
            {matchedVehicle.status === "Parked" ? " — this scan will log an EXIT" : " — this scan will log an ENTRY"}
          </Text>

          <Button
            mode="contained"
            onPress={handleConfirmLog}
            loading={submitting}
            style={styles.button}
          >
            Confirm & Log {matchedVehicle.status === "Parked" ? "Exit" : "Entry"}
          </Button>
        </View>
      )}

      {checked && notFound && (
        <View style={styles.matchBox}>
          <Text style={styles.notFoundText}>
            No registered vehicle matches this plate number.
          </Text>
          <Button mode="contained-tonal" onPress={handleFlagUnregistered} style={styles.button}>
            Flag as Unregistered / Alert
          </Button>
        </View>
      )}

      <Button mode="text" onPress={() => navigation.goBack()} style={styles.retake}>
        Retake Photo
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#F8FAFC" },
  photo: { width: "100%", height: 220, borderRadius: 12, marginBottom: 16 },
  banner: { marginBottom: 12, borderRadius: 8 },
  label: { marginBottom: 6 },
  input: { marginBottom: 12 },
  button: { marginTop: 8 },
  matchBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    gap: 4,
  },
  currentStatus: { marginTop: 8, fontWeight: "600" },
  notFoundText: { color: "#B91C1C", fontWeight: "600" },
  retake: { marginTop: 20, alignSelf: "center" },
});
