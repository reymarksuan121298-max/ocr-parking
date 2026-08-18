import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { OwnerType, VehicleOwner } from "@/types/database";

const OWNER_TYPES: OwnerType[] = ["Student", "Faculty", "Staff", "Visitor"];

const ownerSchema = z.object({
  fname: z.string().min(1, "First name is required"),
  mname: z.string().optional(),
  lname: z.string().min(1, "Last name is required"),
  contact_no: z.string().optional(),
  type: z.enum(["Student", "Faculty", "Staff", "Visitor"]),
});
type OwnerForm = z.infer<typeof ownerSchema>;

export default function OwnersScreen() {
  const [owners, setOwners] = useState<VehicleOwner[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<VehicleOwner | null>(null);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const { logAction } = useAuditLog();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OwnerForm>({
    resolver: zodResolver(ownerSchema),
    defaultValues: { fname: "", mname: "", lname: "", contact_no: "", type: "Student" },
  });

  const selectedType = watch("type");

  async function loadOwners() {
    const { data, error } = await supabase
      .from("vehicle_owners")
      .select("*")
      .order("lname", { ascending: true });
    if (!error) setOwners((data as VehicleOwner[]) ?? []);
  }

  useEffect(() => {
    loadOwners();

    const channel = supabase
      .channel("owners_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_owners" },
        () => loadOwners()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function openCreate() {
    setEditing(null);
    reset({ fname: "", mname: "", lname: "", contact_no: "", type: "Student" });
    setDialogVisible(true);
  }

  function openEdit(owner: VehicleOwner) {
    setEditing(owner);
    reset({
      fname: owner.fname,
      mname: owner.mname ?? "",
      lname: owner.lname,
      contact_no: owner.contact_no ?? "",
      type: owner.type,
    });
    setDialogVisible(true);
  }

  async function onSubmit(values: OwnerForm) {
    const payload = {
      fname: values.fname.trim(),
      mname: values.mname?.trim() || null,
      lname: values.lname.trim(),
      contact_no: values.contact_no?.trim() || null,
      type: values.type,
    };
    if (editing) {
      const { error } = await (supabase
        .from("vehicle_owners") as any)
        .update(payload)
        .eq("owner_id", editing.owner_id);
      if (!error) await logAction("Update Owner", `Updated owner ${payload.fname} ${payload.lname}`);
    } else {
      const { error } = await (supabase.from("vehicle_owners") as any).insert(payload);
      if (!error) await logAction("Create Owner", `Created owner ${payload.fname} ${payload.lname}`);
    }
    setDialogVisible(false);
    loadOwners();
  }

  function handleDelete(owner: VehicleOwner) {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to remove owner "${owner.fname} ${owner.lname}"? This will also remove all vehicles registered under this owner.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("vehicle_owners")
              .delete()
              .eq("owner_id", owner.owner_id);
            if (!error) {
              await logAction("Delete Owner", `Removed owner ${owner.fname} ${owner.lname}`);
              loadOwners();
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={owners}
        keyExtractor={(item) => item.owner_id}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.fname} ${item.mname ? item.mname + " " : ""}${item.lname}`}
            description={`${item.type}${item.contact_no ? " · " + item.contact_no : ""}`}
            onPress={() => openEdit(item)}
            left={(props) => <List.Icon {...props} icon="account" />}
            right={(props) => (
              <IconButton icon="delete-outline" iconColor={props.color} onPress={() => handleDelete(item)} />
            )}
          />
        )}
      />

      <FAB icon="plus" color="#FFFFFF" style={styles.fab} onPress={openCreate} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{editing ? "Edit Owner" : "New Vehicle Owner"}</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <Controller
              control={control}
              name="fname"
              render={({ field }) => (
                <TextInput
                  label="First Name"
                  value={field.value}
                  onChangeText={field.onChange}
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0267D2"
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
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0267D2"
                />
              )}
            />
            <Controller
              control={control}
              name="lname"
              render={({ field }) => (
                <TextInput
                  label="Last Name"
                  value={field.value}
                  onChangeText={field.onChange}
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0267D2"
                  error={!!errors.lname}
                />
              )}
            />
            <Controller
              control={control}
              name="contact_no"
              render={({ field }) => (
                <TextInput
                  label="Contact Number"
                  value={field.value}
                  onChangeText={field.onChange}
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0267D2"
                  keyboardType="phone-pad"
                />
              )}
            />

            <View>
              <Text variant="bodySmall" style={{ color: "#64748B", marginBottom: 4 }}>Owner Category</Text>
              <Button
                mode="outlined"
                icon="menu-down"
                contentStyle={{ flexDirection: "row-reverse", justifyContent: "space-between" }}
                onPress={() => setTypePickerVisible(true)}
                textColor="#0F172A"
                style={styles.pickerButton}
              >
                {selectedType}
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor="#64748B" onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#0267D2" onPress={handleSubmit(onSubmit)}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Owner Category Picker Dialog */}
        <Dialog visible={typePickerVisible} onDismiss={() => setTypePickerVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Select Category</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 260, paddingHorizontal: 0 }}>
            <FlatList
              data={OWNER_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <List.Item
                  title={item}
                  titleStyle={selectedType === item ? { color: "#0267D2", fontWeight: "700" } : undefined}
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={selectedType === item ? "check-circle" : "circle-outline"}
                      color={selectedType === item ? "#0267D2" : "#94A3B8"}
                    />
                  )}
                  onPress={() => {
                    setValue("type", item);
                    setTypePickerVisible(false);
                  }}
                />
              )}
            />
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button textColor="#0267D2" onPress={() => setTypePickerVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0267D2",
    elevation: 5,
    shadowColor: "#0267D2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dialog: { backgroundColor: "#FFFFFF", borderRadius: 16 },
  dialogTitle: { fontWeight: "800", color: "#0B192C" },
  pickerButton: { borderColor: "#CBD5E1", borderRadius: 8 },
});
