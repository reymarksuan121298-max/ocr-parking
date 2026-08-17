import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Dialog, FAB, IconButton, List, Menu, Portal, Text, TextInput } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuditLog } from "@/hooks/useAuditLog";
import { StatusPill } from "@/components/StatusPill";
import type { Vehicle, VehicleOwner } from "@/types/database";

const vehicleSchema = z.object({
  plate_number: z.string().min(3, "Plate number is required"),
  owner_id: z.string().min(1, "Select an owner"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
});
type VehicleForm = z.infer<typeof vehicleSchema>;

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [owners, setOwners] = useState<VehicleOwner[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [ownerSelectVisible, setOwnerSelectVisible] = useState(false);
  const { logAction } = useAuditLog();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { plate_number: "", owner_id: "", vehicle_type: "" },
  });

  const selectedOwnerId = watch("owner_id");
  const selectedOwner = owners.find((o) => o.owner_id === selectedOwnerId);

  async function loadData() {
    const [{ data: v }, { data: o }] = await Promise.all([
      supabase.from("vehicles").select("*, owner:vehicle_owners(*)").order("plate_number"),
      supabase.from("vehicle_owners").select("*").order("lname"),
    ]);
    setVehicles((v as Vehicle[]) ?? []);
    setOwners((o as VehicleOwner[]) ?? []);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditing(null);
    reset({ plate_number: "", owner_id: "", vehicle_type: "" });
    setDialogVisible(true);
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle);
    reset({
      plate_number: vehicle.plate_number,
      owner_id: vehicle.owner_id,
      vehicle_type: vehicle.vehicle_type,
    });
    setDialogVisible(true);
  }

  async function onSubmit(values: VehicleForm) {
    const payload = { ...values, plate_number: values.plate_number.toUpperCase() };
    if (editing) {
      const { error } = await (supabase
        .from("vehicles") as any)
        .update(payload)
        .eq("vehicle_id", editing.vehicle_id);
      if (!error) await logAction("Update Vehicle", `Updated vehicle ${payload.plate_number}`);
    } else {
      const { error } = await (supabase
        .from("vehicles") as any)
        .insert({ ...payload, status: "Outside" });
      if (!error) await logAction("Register Vehicle", `Registered vehicle ${payload.plate_number}`);
    }
    setDialogVisible(false);
    loadData();
  }

  async function handleDelete(vehicle: Vehicle) {
    const { error } = await supabase.from("vehicles").delete().eq("vehicle_id", vehicle.vehicle_id);
    if (!error) {
      await logAction("Delete Vehicle", `Removed vehicle ${vehicle.plate_number}`);
      loadData();
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.vehicle_id}
        renderItem={({ item }) => (
          <List.Item
            title={item.plate_number}
            description={`${item.vehicle_type}${item.owner ? " · " + item.owner.fname + " " + item.owner.lname : ""}`}
            onPress={() => openEdit(item)}
            left={() => (
              <View style={styles.pillWrap}>
                <StatusPill status={item.status} />
              </View>
            )}
            right={(props) => (
              <IconButton icon="delete-outline" iconColor={props.color} onPress={() => handleDelete(item)} />
            )}
          />
        )}
      />

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add Vehicle" />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? "Edit Vehicle" : "Register Vehicle"}</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
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
            <Controller
              control={control}
              name="vehicle_type"
              render={({ field }) => (
                <TextInput
                  label="Vehicle Type (Car, Motorcycle, Van...)"
                  value={field.value}
                  onChangeText={field.onChange}
                  mode="outlined"
                  error={!!errors.vehicle_type}
                />
              )}
            />

            <Button mode="outlined" onPress={() => setOwnerSelectVisible(true)}>
              {selectedOwner
                ? `${selectedOwner.fname} ${selectedOwner.lname}`
                : "Select Owner"}
            </Button>
            {errors.owner_id && <Text style={{ color: "#DC2626" }}>{errors.owner_id.message}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSubmit(onSubmit)}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={ownerSelectVisible} onDismiss={() => setOwnerSelectVisible(false)}>
          <Dialog.Title>Select Owner</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400, paddingHorizontal: 0 }}>
            <FlatList
              data={owners}
              keyExtractor={(o) => o.owner_id}
              renderItem={({ item: o }) => (
                <List.Item
                  title={`${o.fname} ${o.lname}`}
                  description={o.type}
                  onPress={() => {
                    setValue("owner_id", o.owner_id);
                    setOwnerSelectVisible(false);
                  }}
                />
              )}
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setOwnerSelectVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  fab: { position: "absolute", right: 16, bottom: 16 },
  pillWrap: { justifyContent: "center", paddingLeft: 8 },
});
