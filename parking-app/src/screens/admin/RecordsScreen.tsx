import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Dialog, FAB, List, Portal, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RecordCard } from "@/components/RecordCard";
import { supabase } from "@/lib/supabase";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { ParkingRecord, Vehicle } from "@/types/database";

type Filter = "all" | "parked" | "exited";

const recordSchema = z.object({
  vehicle_id: z.string().min(1, "Select a vehicle"),
  time_in: z.string().min(1, "Time in is required"),
  time_out: z.string().optional().or(z.literal("")),
  status: z.enum(["Parked", "Exited"]),
});
type RecordForm = z.infer<typeof recordSchema>;

export default function RecordsScreen() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [records, setRecords] = useState<ParkingRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<ParkingRecord | null>(null);
  const [vehicleSelectVisible, setVehicleSelectVisible] = useState(false);
  const { logAction } = useAuditLog();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: { vehicle_id: "", time_in: "", time_out: "", status: "Parked" },
  });

  const selectedVehicleId = watch("vehicle_id");
  const selectedVehicle = vehicles.find((v) => v.vehicle_id === selectedVehicleId);

  async function loadData() {
    setLoading(true);
    let query = supabase
      .from("parking_records")
      .select("*, vehicle:vehicles(*, owner:vehicle_owners(*))")
      .order("time_in", { ascending: false })
      .limit(100);

    if (filter === "parked") query = query.eq("status", "Parked");
    if (filter === "exited") query = query.eq("status", "Exited");

    const [{ data: rData, error: rError }, { data: vData }] = await Promise.all([
      query,
      supabase.from("vehicles").select("*, owner:vehicle_owners(*)").order("plate_number"),
    ]);

    if (!rError) {
      let results = (rData as ParkingRecord[]) ?? [];
      if (search.trim()) {
        const term = search.trim().toUpperCase();
        results = results.filter((r) => r.vehicle?.plate_number?.includes(term));
      }
      setRecords(results);
    }
    setVehicles((vData as Vehicle[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [filter]);

  function openCreate() {
    setEditing(null);
    reset({
      vehicle_id: "",
      time_in: new Date().toISOString(),
      time_out: "",
      status: "Parked",
    });
    setDialogVisible(true);
  }

  function openEdit(record: ParkingRecord) {
    setEditing(record);
    reset({
      vehicle_id: record.vehicle_id,
      time_in: record.time_in,
      time_out: record.time_out ?? "",
      status: record.status,
    });
    setDialogVisible(true);
  }

  async function onSubmit(values: RecordForm) {
    const payload = {
      vehicle_id: values.vehicle_id,
      time_in: values.time_in,
      time_out: values.time_out ? values.time_out : null,
      status: values.status,
      // For manual creation, user_id would be the current admin's ID, but the schema doesn't enforce user_id from client 
      // or we can fetch the auth session user_id. Let's fetch session.
    };

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (editing) {
      const { error } = await (supabase
        .from("parking_records") as any)
        .update(payload)
        .eq("record_id", editing.record_id);
      if (!error) await logAction("Update Record", `Updated parking record for vehicle ${selectedVehicle?.plate_number}`);
    } else {
      const { error } = await (supabase
        .from("parking_records") as any)
        .insert({ ...payload, user_id: userId });
      if (!error) await logAction("Create Record", `Manually created parking record for vehicle ${selectedVehicle?.plate_number}`);
    }
    setDialogVisible(false);
    loadData();
  }

  async function handleDelete() {
    if (!editing) return;
    const { error } = await supabase.from("parking_records").delete().eq("record_id", editing.record_id);
    if (!error) {
      await logAction("Delete Record", `Deleted parking record for vehicle ${editing.vehicle?.plate_number}`);
      setDialogVisible(false);
      loadData();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          placeholder="Search by plate number"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadData}
          mode="outlined"
          autoCapitalize="characters"
          style={styles.search}
          right={<TextInput.Icon icon="magnify" onPress={loadData} />}
        />
        <SegmentedButtons
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          buttons={[
            { value: "all", label: "All" },
            { value: "parked", label: "Parked" },
            { value: "exited", label: "Exited" },
          ]}
          style={styles.segmented}
        />
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.record_id}
        renderItem={({ item }) => <RecordCard record={item} onPress={() => openEdit(item)} />}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No matching records.</Text> : null
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add Record" />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? "Edit Record" : "New Parking Record"}</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Button mode="outlined" onPress={() => setVehicleSelectVisible(true)}>
              {selectedVehicle
                ? `${selectedVehicle.plate_number} (${selectedVehicle.vehicle_type})`
                : "Select Vehicle"}
            </Button>
            {errors.vehicle_id && <Text style={{ color: "#DC2626" }}>{errors.vehicle_id.message}</Text>}

            <Controller
              control={control}
              name="time_in"
              render={({ field }) => (
                <TextInput
                  label="Time In (ISO 8601 String)"
                  value={field.value}
                  onChangeText={field.onChange}
                  mode="outlined"
                  error={!!errors.time_in}
                />
              )}
            />

            <Controller
              control={control}
              name="time_out"
              render={({ field }) => (
                <TextInput
                  label="Time Out (Optional)"
                  value={field.value}
                  onChangeText={field.onChange}
                  mode="outlined"
                  error={!!errors.time_out}
                />
              )}
            />

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <SegmentedButtons
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as "Parked" | "Exited")}
                  buttons={[
                    { value: "Parked", label: "Parked" },
                    { value: "Exited", label: "Exited" },
                  ]}
                />
              )}
            />
          </Dialog.Content>
          <Dialog.Actions style={editing ? { justifyContent: 'space-between' } : undefined}>
            {editing && <Button textColor="#DC2626" onPress={handleDelete}>Delete</Button>}
            <View style={{ flexDirection: 'row' }}>
              <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
              <Button onPress={handleSubmit(onSubmit)}>Save</Button>
            </View>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={vehicleSelectVisible} onDismiss={() => setVehicleSelectVisible(false)}>
          <Dialog.Title>Select Vehicle</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400, paddingHorizontal: 0 }}>
            <FlatList
              data={vehicles}
              keyExtractor={(v) => v.vehicle_id}
              renderItem={({ item: v }) => (
                <List.Item
                  title={v.plate_number}
                  description={`${v.vehicle_type} · ${v.owner?.fname} ${v.owner?.lname}`}
                  onPress={() => {
                    setValue("vehicle_id", v.vehicle_id);
                    setVehicleSelectVisible(false);
                  }}
                />
              )}
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setVehicleSelectVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  filters: { padding: 16, paddingBottom: 8, gap: 10 },
  search: {},
  segmented: {},
  empty: { textAlign: "center", marginTop: 40, color: "#94A3B8" },
  fab: { position: "absolute", right: 16, bottom: 16 },
});

