import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Dialog, FAB, IconButton, List, Portal, Text, TextInput } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuditLog } from "@/hooks/useAuditLog";
import { StatusPill } from "@/components/StatusPill";
import { VEHICLE_TYPES } from "@/constants/vehicleTypes";
import type { Vehicle, VehicleOwner } from "@/types/database";

const vehicleSchema = z.object({
  plate_number: z.string().min(3, "Plate number is required"),
  owner_id: z.string().min(1, "Select an owner"),
  vehicle_type: z.string().min(1, "Select a vehicle type"),
});
type VehicleForm = z.infer<typeof vehicleSchema>;

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [owners, setOwners] = useState<VehicleOwner[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [ownerSelectVisible, setOwnerSelectVisible] = useState(false);
  const [typeSelectVisible, setTypeSelectVisible] = useState(false);
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
    defaultValues: { plate_number: "", owner_id: "", vehicle_type: "CAR" },
  });

  const selectedOwnerId = watch("owner_id");
  const selectedOwner = owners.find((o) => o.owner_id === selectedOwnerId);
  const selectedType = watch("vehicle_type");

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
    reset({ plate_number: "", owner_id: "", vehicle_type: "CAR" });
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
    if (editing) {
      const { error } = await (supabase
        .from("vehicles") as any)
        .update({
          plate_number: values.plate_number.trim(),
          owner_id: values.owner_id,
          vehicle_type: values.vehicle_type,
        })
        .eq("vehicle_id", editing.vehicle_id);
      if (!error) {
        await logAction("Update Vehicle", `Updated vehicle ${values.plate_number}`);
      }
    } else {
      const { error } = await (supabase.from("vehicles") as any).insert({
        plate_number: values.plate_number.trim(),
        owner_id: values.owner_id,
        vehicle_type: values.vehicle_type,
      });
      if (!error) {
        await logAction("Register Vehicle", `Registered vehicle ${values.plate_number}`);
      }
    }
    setDialogVisible(false);
    loadData();
  }

  async function handleDelete() {
    if (!editing) return;
    const { error } = await supabase.from("vehicles").delete().eq("vehicle_id", editing.vehicle_id);
    if (!error) {
      await logAction("Delete Vehicle", `Deleted vehicle ${editing.plate_number}`);
      setDialogVisible(false);
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
            left={(props) => <List.Icon {...props} icon="car" />}
            right={() => (
              <View style={styles.pillWrap}>
                <StatusPill status={item.status} />
              </View>
            )}
            onPress={() => openEdit(item)}
          />
        )}
      />

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Register Vehicle" />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? "Edit Vehicle" : "Register Vehicle"}</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
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
                {selectedType || "Select Vehicle Type"}
              </Button>
              {errors.vehicle_type && <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{errors.vehicle_type.message}</Text>}
            </View>

            <View>
              <Text variant="bodySmall" style={{ color: "#64748B", marginBottom: 4 }}>Vehicle Owner</Text>
              <Button
                mode="outlined"
                icon="account"
                contentStyle={{ flexDirection: "row-reverse", justifyContent: "space-between" }}
                onPress={() => setOwnerSelectVisible(true)}
              >
                {selectedOwner
                  ? `${selectedOwner.fname} ${selectedOwner.lname} (${selectedOwner.type})`
                  : "Select Owner"}
              </Button>
              {errors.owner_id && <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>{errors.owner_id.message}</Text>}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            {editing && (
              <Button textColor="#DC2626" onPress={handleDelete}>
                Delete
              </Button>
            )}
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSubmit(onSubmit)}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Vehicle Type Picker Dialog */}
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
                      icon={selectedType === item ? "check-circle" : "circle-outline"}
                      color={selectedType === item ? "#0267D2" : "#94A3B8"}
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

        {/* Owner Picker Dialog */}
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
  fab: { position: "absolute", right: 16, bottom: 16, backgroundColor: "#0267D2" },
  pillWrap: { justifyContent: "center", paddingLeft: 8 },
});
