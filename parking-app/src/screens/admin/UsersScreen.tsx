import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  SegmentedButtons,
  Snackbar,
  TextInput,
} from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { AppUser, UserRole } from "@/types/database";
import Config from "react-native-config";
import { createClient } from "@supabase/supabase-js";

const userSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
  role: z.enum(["admin", "guard"]),
  contact_no: z.string().optional(),
});
type UserForm = z.infer<typeof userSchema>;

export default function UsersScreen() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { logAction } = useAuditLog();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { full_name: "", email: "", password: "", role: "guard", contact_no: "" },
  });

  async function loadUsers() {
    const { data, error } = await supabase.from("users").select("*").order("full_name");
    if (!error) setUsers((data as AppUser[]) ?? []);
  }

  useEffect(() => {
    loadUsers();

    const channel = supabase
      .channel("users_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => loadUsers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function openCreate() {
    setEditing(null);
    reset({ full_name: "", email: "", password: "", role: "guard", contact_no: "" });
    setDialogVisible(true);
  }

  function openEdit(user: AppUser) {
    setEditing(user);
    reset({
      full_name: user.full_name,
      email: "", // We don't allow editing email/password from here for simplicity
      password: "",
      role: user.role,
      contact_no: user.contact_no ?? "",
    });
    setDialogVisible(true);
  }

  async function onSubmit(values: UserForm) {
    if (!Config.SUPABASE_SERVICE_ROLE_KEY) {
      setErrorMsg("Service Role Key is missing in .env. Rebuild the app after adding it.");
      return;
    }

    const adminClient = createClient(Config.SUPABASE_URL!, Config.SUPABASE_SERVICE_ROLE_KEY!);

    if (editing) {
      const { error: profileError } = await adminClient.from("users").update({
        full_name: values.full_name,
        role: values.role,
        contact_no: values.contact_no || null,
      }).eq("id", editing.id);

      if (profileError) {
        setErrorMsg(profileError.message);
        return;
      }

      await logAction("Update User Account", `Updated account for ${values.full_name}`);
    } else {
      if (!values.email || !values.password) {
        setErrorMsg("Email and password are required for new accounts");
        return;
      }
      
      // 1. Create the Auth User
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true,
      });

      if (createError || !created.user) {
        setErrorMsg(createError?.message ?? "User creation failed");
        return;
      }

      // 2. Create the Public Profile
      const { error: profileError } = await adminClient.from("users").insert({
        id: created.user.id,
        full_name: values.full_name,
        role: values.role,
        contact_no: values.contact_no || null,
      });

      if (profileError) {
        setErrorMsg(profileError.message);
        return;
      }

      await logAction("Create User Account", `Created ${values.role} account for ${values.full_name}`);
    }
    
    setDialogVisible(false);
    loadUsers();
  }

  function handleDelete(user: AppUser) {
    Alert.alert(
      "Confirm Account Deletion",
      `Are you sure you want to permanently delete the account for "${user.full_name}" (${user.role.toUpperCase()})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!Config.SUPABASE_SERVICE_ROLE_KEY) {
              setErrorMsg("Service Role Key is missing in .env.");
              return;
            }
            const adminClient = createClient(Config.SUPABASE_URL!, Config.SUPABASE_SERVICE_ROLE_KEY!);
            
            const { error } = await adminClient.auth.admin.deleteUser(user.id);
            if (error) {
              setErrorMsg(error.message);
            } else {
              await supabase.from("users").delete().eq("id", user.id);
              await logAction("Delete User", `Deleted account for ${user.full_name}`);
              loadUsers();
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.full_name}
            description={`${item.role.toUpperCase()}${item.contact_no ? " · " + item.contact_no : ""}`}
            left={(props) => <List.Icon {...props} icon={item.role === "admin" ? "shield-account" : "account"} />}
            onPress={() => openEdit(item)}
            right={(props) => (
              <IconButton icon="delete-outline" iconColor={props.color} onPress={() => handleDelete(item)} />
            )}
          />
        )}
        ItemSeparatorComponent={List.Item}
      />

      <FAB icon="plus" color="#FFFFFF" style={styles.fab} onPress={openCreate} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>{editing ? "Edit User" : "New User Account"}</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Controller
              control={control}
              name="full_name"
              render={({ field }) => (
                <TextInput
                  label="Full Name"
                  value={field.value}
                  onChangeText={field.onChange}
                  mode="outlined"
                  outlineColor="#CBD5E1"
                  activeOutlineColor="#0267D2"
                  error={!!errors.full_name}
                />
              )}
            />
            {!editing && (
              <>
                <Controller
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <TextInput
                      label="Email"
                      value={field.value}
                      onChangeText={field.onChange}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      mode="outlined"
                      outlineColor="#CBD5E1"
                      activeOutlineColor="#0267D2"
                      error={!!errors.email}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="password"
                  render={({ field }) => (
                    <TextInput
                      label="Temporary Password"
                      value={field.value}
                      onChangeText={field.onChange}
                      secureTextEntry={!showPassword}
                      mode="outlined"
                      outlineColor="#CBD5E1"
                      activeOutlineColor="#0267D2"
                      left={<TextInput.Icon icon="lock-outline" color="#0267D2" />}
                      right={
                        <TextInput.Icon
                          icon={showPassword ? "eye-off-outline" : "eye-outline"}
                          color="#64748B"
                          onPress={() => setShowPassword((prev) => !prev)}
                          forceTextInputFocus={false}
                        />
                      }
                      error={!!errors.password}
                    />
                  )}
                />
              </>
            )}
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
                />
              )}
            />
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <SegmentedButtons
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as UserRole)}
                  buttons={[
                    { value: "guard", label: "Security Guard" },
                    { value: "admin", label: "Administrator" },
                  ]}
                />
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor="#64748B" onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#0267D2" onPress={handleSubmit(onSubmit)}>{editing ? "Save" : "Create"}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!errorMsg} onDismiss={() => setErrorMsg(null)} duration={4000}>
        {errorMsg}
      </Snackbar>
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
});
