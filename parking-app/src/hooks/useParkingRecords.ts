import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import type { ParkingRecord, Vehicle } from "@/types/database";

interface LogEntryExitResult {
  action: "entry" | "exit";
  record: ParkingRecord;
}

/**
 * Encapsulates the guard-side "confirm plate -> log entry or exit" flow:
 * - If the vehicle has no open (status='Parked') record, this is an ENTRY:
 *   create a new parking_records row and flip vehicles.status -> 'Parked'.
 * - If it does have an open record, this is an EXIT: close that record
 *   (time_out=now, status='Exited') and flip vehicles.status -> 'Outside'.
 */
export function useParkingRecords() {
  const { profile } = useAuth();
  const { logAction } = useAuditLog();
  const [submitting, setSubmitting] = useState(false);

  const uploadPlateImage = useCallback(async (localUri: string, plateNumber: string) => {
    const fileName = `${plateNumber}-${Date.now()}.jpg`;
    const response = await fetch(localUri);
    const blob = await response.blob();
    const { data, error } = await supabase.storage
      .from("plate-images")
      .upload(fileName, blob, { contentType: "image/jpeg" });
    if (error) {
      console.warn("[storage upload] failed:", error.message);
      return null;
    }
    return data?.path ?? null;
  }, []);

  const logEntryOrExit = useCallback(
    async (vehicle: Vehicle, photoUri?: string): Promise<LogEntryExitResult | null> => {
      if (!profile) return null;
      setSubmitting(true);
      try {
        const { data: openRecord } = await (supabase
          .from("parking_records") as any)
          .select("*")
          .eq("vehicle_id", vehicle.vehicle_id)
          .eq("status", "Parked")
          .maybeSingle();

        const imagePath = photoUri
          ? await uploadPlateImage(photoUri, vehicle.plate_number)
          : null;

        if (openRecord) {
          // EXIT
          const { data: updated, error } = await (supabase
            .from("parking_records") as any)
            .update({ time_out: new Date().toISOString(), status: "Exited" })
            .eq("record_id", openRecord.record_id)
            .select("*")
            .single();
          if (error) throw error;

          await (supabase.from("vehicles") as any).update({ status: "Outside" }).eq(
            "vehicle_id",
            vehicle.vehicle_id
          );

          await logAction(
            "Vehicle Exit",
            `Plate ${vehicle.plate_number} logged as exited by guard.`
          );

          return { action: "exit", record: updated as ParkingRecord };
        }

        // ENTRY
        const { data: created, error } = await (supabase
          .from("parking_records") as any)
          .insert({
            user_id: profile.id,
            vehicle_id: vehicle.vehicle_id,
            time_in: new Date().toISOString(),
            status: "Parked",
            image_path: imagePath,
          })
          .select("*")
          .single();
        if (error) throw error;

        await (supabase.from("vehicles") as any).update({ status: "Parked" }).eq(
          "vehicle_id",
          vehicle.vehicle_id
        );

        await logAction(
          "Vehicle Entry",
          `Plate ${vehicle.plate_number} logged as parked by guard.`
        );

        return { action: "entry", record: created as ParkingRecord };
      } catch (err) {
        console.warn("[logEntryOrExit] failed:", err);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [profile, logAction, uploadPlateImage]
  );

  return { logEntryOrExit, submitting };
}

/** Realtime-subscribed list of vehicles currently parked on campus. */
export function useLiveParkedVehicles() {
  const [records, setRecords] = useState<ParkingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from("parking_records")
      .select("*, vehicle:vehicles(*, owner:vehicle_owners(*))")
      .eq("status", "Parked")
      .order("time_in", { ascending: false });
    if (!error) setRecords((data as ParkingRecord[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords();

    const channel = supabase
      .channel("parking_records_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_records" },
        () => fetchRecords()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  return { records, loading, refetch: fetchRecords };
}
