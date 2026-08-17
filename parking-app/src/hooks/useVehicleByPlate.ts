import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Vehicle } from "@/types/database";

export function useVehicleByPlate() {
  const [loading, setLoading] = useState(false);

  async function findVehicleByPlate(plateNumber: string): Promise<Vehicle | null> {
    setLoading(true);
    try {
      const normalized = plateNumber.trim().toUpperCase();
      const { data, error } = await supabase
        .from("vehicles")
        .select("*, owner:vehicle_owners(*)")
        .eq("plate_number", normalized)
        .maybeSingle();

      if (error) {
        console.warn("[vehicle lookup] error:", error.message);
        return null;
      }
      return (data as unknown as Vehicle) ?? null;
    } finally {
      setLoading(false);
    }
  }

  return { findVehicleByPlate, loading };
}
