import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { OwnerType, VehicleOwner } from "@/types/database";

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
  const { logAction } = useAuditLog();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OwnerForm>({
    resolver: zodResolver(ownerSchema),
    defaultValues: { fname: "", mname: "", lname: "", contact_no: "", type: "Student" },
  });

  async function loadOwners() {
    const { data, error } = await supabase
      .from("vehicle_owners")
      .select("*")
      .order("lname", { ascending: true });
    if (!error) setOwners((data as VehicleOwner[]) ?? []);
  }

  useEffect(() => {
    loadOwners();
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
    if (editing) {
      const { error } = await (supabase
        .from("vehicle_owners") as any)
        .update(values)
        .eq("owner_id", editing.owner_id);
      if (!error) await logAction("Update Owner", `Updated owner ${values.fname} ${values.lname}`);
    } else {
      const { error } = await (supabase.from("vehicle_owners") as any).insert(values);
      if (!error) await logAction("Create Owner", `Registered owner ${values.fname} ${values.lname}`);
    }
    setDialogVisible(false);
    loadOwners();
  }

  async function handleDelete(owner: VehicleOwner) {
    const { error } = await supabase.from("vehicle_owners").delete().eq("owner_id", owner.owner_id);
    if (!error) {
      await logAction("Delete Owner", `Removed owner ${owner.fname} ${owner.lname}`);
      loadOwners();
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={owners}
        keyExtractor={(item) => item.owner_id}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.fname} ${item.lname}`}
            description={`${item.type}${item.contact_no ? " · " + item.contact_no : ""}`}
            onPress={() => openEdit(item)}
            right={(props) => (
              <IconButton icon="delete-outline" iconColor={props.color} onPress={() => handleDelete(item)} />
            )}
          />
        )}
        ItemSeparatorComponent={List.Item}
      />

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add Owner" />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editing ? "Edit Owner" : "New Vehicle Owner"}</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Controller
              control={control}
              name="fname"
              render={({ field }) => (
                <TextInput
                  label="First Name"
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
                  label="Last Name"
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
                  label="Contact Number"
                  value={field.value}
                  onChangeText={field.onChange}
                  mode="outlined"
                  keyboardType="phone-pad"
                />
              )}
            />
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <SegmentedButtons
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as OwnerType)}
                  buttons={[
                    { value: "Student", label: "Student" },
                    { value: "Faculty", label: "Faculty" },
                    { value: "Staff", label: "Staff" },
                    { value: "Visitor", label: "Visitor" },
                  ]}
                />
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSubmit(onSubmit)}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  fab: { position: "absolute", right: 16, bottom: 16 },
});
