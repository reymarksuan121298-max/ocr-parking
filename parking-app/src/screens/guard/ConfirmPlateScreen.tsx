import React, { useEffect, useState } from "react";
import { FlatList, Image, ScrollView, StyleSheet, View } from "react-native";
import { Banner, Button, Dialog, Divider, List, Portal, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { GuardStackParamList } from "@/navigation/RootNavigator";
import { useVehicleByPlate } from "@/hooks/useVehicleByPlate";
import { useParkingRecords } from "@/hooks/useParkingRecords";
import { useAuditLog } from "@/hooks/useAuditLog";
import { supabase } from "@/lib/supabase";
import { VEHICLE_TYPES } from "@/constants/vehicleTypes";
import type { OwnerType, Vehicle, VehicleOwner } from "@/types/database";

type Props = NativeStackScreenProps<GuardStackParamList, "ConfirmPlate">;

const registerSchema = z.object({
  plate_number: z.string().min(3, "Plate number is required"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  owner_mode: z.enum(["new", "existing"]),
  owner_id: z.string().optional(),
  fname: z.string().optional(),
  mname: z.string().optional(),
  lname: z.string().optional(),
  contact_no: z.string().optional(),
  type: z.enum(["Student", "Faculty", "Staff", "Visitor"]).default("Visitor"),
}).superRefine((data, ctx) => {
  if (data.owner_mode === "existing") {
    if (!data.owner_id || !data.owner_id.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select an existing owner",
        path: ["owner_id"],
      });
    }
  } else {
    if (!data.fname || !data.fname.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "First name is required",
        path: ["fname"],
      });
    }
    if (!data.lname || !data.lname.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Last name is required",
        path: ["lname"],
      });
    }
  }
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function ConfirmPlateScreen({ route, navigation }: Props) {
  const { photoUri, ocrResult } = route.params;
  const { findVehicleByPlate, loading: lookingUp } = useVehicleByPlate();
  const { logEntryOrExit, submitting } = useParkingRecords();
  const { logAction } = useAuditLog();

  const [plateNumber, setPlateNumber] = useState(ocrResult.candidatePlate ?? "");
  const [matchedVehicle, setMatchedVehicle] = useState<Vehicle | null>(null);
  const [checked, setChecked] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Registration modal states
  const [registerDialogVisible, setRegisterDialogVisible] = useState(false);
  const [existingOwners, setExistingOwners] = useState<VehicleOwner[]>([]);
  const [ownerSelectVisible, setOwnerSelectVisible] = useState(false);
  const [typeSelectVisible, setTypeSelectVisible] = useState(false);
  const [ownerTypePickerVisible, setOwnerTypePickerVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      plate_number: ocrResult.candidatePlate ?? "",
      vehicle_type: "CAR",
      owner_mode: "new",
      owner_id: "",
      fname: "",
      mname: "",
      lname: "",
      contact_no: "",
      type: "Visitor",
    },
  });

  const selectedVehicleType = watch("vehicle_type");
  const selectedOwnerType = watch("type");
  const ownerMode = watch("owner_mode");
  const selectedOwnerId = watch("owner_id");
  const selectedOwner = existingOwners.find((o) => o.owner_id === selectedOwnerId);

  async function loadOwners() {
    const { data } = await supabase
      .from("vehicle_owners")
      .select("*")
      .order("lname", { ascending: true });
    if (data) setExistingOwners(data as VehicleOwner[]);
  }

  useEffect(() => {
    loadOwners();
  }, []);

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

  function openRegisterDialog() {
    setRegisterError(null);
    reset({
      plate_number: plateNumber.trim().toUpperCase(),
      vehicle_type: "Motorcycle",
      owner_mode: "new",
      owner_id: "",
      fname: "",
      mname: "",
      lname: "",
      contact_no: "",
      type: "Visitor",
    });
    loadOwners();
    setRegisterDialogVisible(true);
  }

  async function onRegisterSubmit(values: RegisterForm) {
    setRegistering(true);
    setRegisterError(null);
    try {
      let finalOwnerId = values.owner_id;

      // 1. If creating a new owner
      if (values.owner_mode === "new") {
        const ownerPayload = {
          fname: values.fname!.trim(),
          mname: values.mname?.trim() || null,
          lname: values.lname!.trim(),
          contact_no: values.contact_no?.trim() || null,
          type: values.type,
        };

        const { data: newOwner, error: ownerError } = await (supabase
          .from("vehicle_owners") as any)
          .insert(ownerPayload)
          .select("*")
          .single();

        if (ownerError || !newOwner) {
          throw new Error(ownerError?.message || "Failed to create vehicle owner.");
        }
        finalOwnerId = newOwner.owner_id;
        await logAction("Guard Registered Owner", `Guard registered new owner: ${newOwner.fname} ${newOwner.lname} (${newOwner.type})`);
      }

      // 2. Insert vehicle
      const vehiclePayload = {
        plate_number: values.plate_number.trim().toUpperCase(),
        vehicle_type: values.vehicle_type.trim(),
        owner_id: finalOwnerId,
        status: "Outside",
      };

      const { data: newVehicle, error: vehicleError } = await (supabase
        .from("vehicles") as any)
        .insert(vehiclePayload)
        .select("*, owner:vehicle_owners(*)")
        .single();

      if (vehicleError || !newVehicle) {
        throw new Error(vehicleError?.message || "Failed to register vehicle.");
      }

      await logAction("Guard Registered Vehicle", `Guard registered vehicle ${newVehicle.plate_number} (${newVehicle.vehicle_type})`);

      // 3. Update state
      setRegisterDialogVisible(false);
      setPlateNumber(newVehicle.plate_number);
      setMatchedVehicle(newVehicle as Vehicle);
      setChecked(true);
      setNotFound(false);
    } catch (err: any) {
      setRegisterError(err.message || "Registration failed.");
    } finally {
      setRegistering(false);
    }
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
            buttonColor="#0267D2"
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
            No registered vehicle matches plate "{plateNumber}".
          </Text>
          
          <Button
            mode="contained"
            icon="plus-circle"
            buttonColor="#16A34A"
            onPress={openRegisterDialog}
            style={styles.button}
          >
            Register Vehicle & Owner
          </Button>

          <Button
            mode="contained-tonal"
            icon="alert-octagon-outline"
            onPress={handleFlagUnregistered}
            style={styles.button}
          >
            Flag as Unregistered / Alert
          </Button>
        </View>
      )}

      <Button mode="text" onPress={() => navigation.goBack()} style={styles.retake}>
        Retake Photo
      </Button>

      {/* Registration Dialog */}
      <Portal>
        <Dialog visible={registerDialogVisible} onDismiss={() => !registering && setRegisterDialogVisible(false)}>
          <Dialog.Title>Register Vehicle & Owner</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 460, paddingHorizontal: 16 }}>
            <ScrollView contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
              <Controller
                control={control}
                name="plate_number"
                render={({ field }) => (
                  <TextInput
                    label="Plate Number"
                    value={field.value}
                    onChangeText={(t) => field.onChange(t.toUpperCase())}
                    autoCapitalize="characters"
                    mode="outlined"
                    error={!!errors.plate_number}
                  />
                )}
              />

              <View>
                <Text variant="bodySmall" style={{ color: "#64748B", marginBottom: 4 }}>Vehicle Type</Text>
                <Button
                  mode="outlined"
                  icon="menu-down"
                  contentStyle={{ flexDirection: "row-reverse", justifyContent: "space-between" }}
                  onPress={() => setTypeSelectVisible(true)}
                >
                  {selectedVehicleType || "Select Vehicle Type"}
                </Button>
                {errors.vehicle_type && (
                  <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>
                    {errors.vehicle_type.message}
                  </Text>
                )}
              </View>

              <Divider style={{ marginVertical: 4 }} />
              <Text variant="titleSmall" style={{ fontWeight: "700" }}>Vehicle Owner</Text>

              <Controller
                control={control}
                name="owner_mode"
                render={({ field }) => (
                  <SegmentedButtons
                    value={field.value}
                    onValueChange={field.onChange}
                    buttons={[
                      { value: "new", label: "New Owner" },
                      { value: "existing", label: "Existing Owner" },
                    ]}
                  />
                )}
              />

              {ownerMode === "existing" ? (
                <View style={{ marginTop: 4 }}>
                  <Button mode="outlined" onPress={() => setOwnerSelectVisible(true)}>
                    {selectedOwner
                      ? `${selectedOwner.fname} ${selectedOwner.lname} (${selectedOwner.type})`
                      : "Select Existing Owner"}
                  </Button>
                  {errors.owner_id && (
                    <Text style={{ color: "#DC2626", marginTop: 4 }}>{errors.owner_id.message}</Text>
                  )}
                </View>
              ) : (
                <>
                  <Controller
                    control={control}
                    name="fname"
                    render={({ field }) => (
                      <TextInput
                        label="First Name *"
                        value={field.value}
                        onChangeText={field.onChange}
                        mode="outlined"
                        error={!!errors.fname}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="mname"
                    render={({ field }) => (
                      <TextInput
                        label="Middle Name (optional)"
                        value={field.value}
                        onChangeText={field.onChange}
                        mode="outlined"
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="lname"
                    render={({ field }) => (
                      <TextInput
                        label="Last Name *"
                        value={field.value}
                        onChangeText={field.onChange}
                        mode="outlined"
                        error={!!errors.lname}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="contact_no"
                    render={({ field }) => (
                      <TextInput
                        label="Contact Number (optional)"
                        value={field.value}
                        onChangeText={field.onChange}
                        mode="outlined"
                        keyboardType="phone-pad"
                      />
                    )}
                  />

                  <View style={{ marginTop: 8 }}>
                    <Text variant="bodySmall" style={{ color: "#64748B", marginBottom: 4 }}>Owner Category</Text>
                    <Button
                      mode="outlined"
                      icon="menu-down"
                      contentStyle={{ flexDirection: "row-reverse", justifyContent: "space-between" }}
                      onPress={() => setOwnerTypePickerVisible(true)}
                    >
                      {selectedOwnerType || "Select Category"}
                    </Button>
                  </View>
                </>
              )}

              {registerError && (
                <Text style={{ color: "#DC2626", marginTop: 6 }}>{registerError}</Text>
              )}
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions>
            <Button disabled={registering} onPress={() => setRegisterDialogVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={registering}
              disabled={registering}
              onPress={handleSubmit(onRegisterSubmit)}
            >
              Save & Register
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Vehicle Type Selector Dialog */}
        <Dialog visible={typeSelectVisible} onDismiss={() => setTypeSelectVisible(false)}>
          <Dialog.Title>Select Vehicle Type</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 350, paddingHorizontal: 0 }}>
            <FlatList
              data={VEHICLE_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <List.Item
                  title={item}
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={selectedVehicleType === item ? "check-circle" : "circle-outline"}
                      color={selectedVehicleType === item ? "#0267D2" : "#94A3B8"}
                    />
                  )}
                  onPress={() => {
                    setValue("vehicle_type", item);
                    setTypeSelectVisible(false);
                  }}
                />
              )}
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setTypeSelectVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Existing Owner Selector Dialog */}
        <Dialog visible={ownerSelectVisible} onDismiss={() => setOwnerSelectVisible(false)}>
          <Dialog.Title>Select Existing Owner</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 380, paddingHorizontal: 0 }}>
            <FlatList
              data={existingOwners}
              keyExtractor={(o) => o.owner_id}
              renderItem={({ item: o }) => (
                <List.Item
                  title={`${o.fname} ${o.lname}`}
                  description={`${o.type}${o.contact_no ? " · " + o.contact_no : ""}`}
                  onPress={() => {
                    setValue("owner_id", o.owner_id);
                    setOwnerSelectVisible(false);
                  }}
                />
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", padding: 16, color: "#64748B" }}>
                  No existing owners found. Please create a new owner.
                </Text>
              }
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setOwnerSelectVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Owner Category Selector Dialog */}
        <Dialog visible={ownerTypePickerVisible} onDismiss={() => setOwnerTypePickerVisible(false)}>
          <Dialog.Title>Select Owner Category</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 260, paddingHorizontal: 0 }}>
            <FlatList
              data={["Student", "Faculty", "Staff", "Visitor"] as OwnerType[]}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <List.Item
                  title={item}
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={selectedOwnerType === item ? "check-circle" : "circle-outline"}
                      color={selectedOwnerType === item ? "#0267D2" : "#94A3B8"}
                    />
                  )}
                  onPress={() => {
                    setValue("type", item);
                    setOwnerTypePickerVisible(false);
                  }}
                />
              )}
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setOwnerTypePickerVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  notFoundText: { color: "#B91C1C", fontWeight: "600", marginBottom: 4 },
  retake: { marginTop: 20, alignSelf: "center" },
});

