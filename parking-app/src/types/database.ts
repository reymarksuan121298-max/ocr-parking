export type UserRole = "admin" | "guard";
export type OwnerType = "Student" | "Faculty" | "Staff" | "Visitor";
export type VehicleStatus = "Inside" | "Outside" | "Parked";
export type ParkingStatus = "Parked" | "Exited";

export interface AppUser {
  id: string;
  full_name: string;
  role: UserRole;
  contact_no: string | null;
  created_at: string;
}

export interface VehicleOwner {
  owner_id: string;
  fname: string;
  mname: string | null;
  lname: string;
  contact_no: string | null;
  type: OwnerType;
  created_at: string;
}

export interface Vehicle {
  vehicle_id: string;
  plate_number: string;
  owner_id: string;
  vehicle_type: string;
  status: VehicleStatus;
  created_at: string;
  // populated by joined queries
  owner?: VehicleOwner;
}

export interface ParkingRecord {
  record_id: string;
  user_id: string;
  vehicle_id: string;
  time_in: string;
  time_out: string | null;
  status: ParkingStatus;
  image_path: string | null;
  // populated by joined queries
  vehicle?: Vehicle;
}

export interface LogEntry {
  log_id: string;
  user_id: string;
  action: string;
  description: string | null;
  timestamp: string;
}

// Minimal PostgREST-shaped Database type so supabase-js generics are useful
// without requiring the full `supabase gen types` output.
export interface Database {
  public: {
    Tables: {
      users: { Row: AppUser; Insert: Partial<AppUser> & { id: string }; Update: Partial<AppUser> };
      vehicle_owners: {
        Row: VehicleOwner;
        Insert: Omit<VehicleOwner, "owner_id" | "created_at"> & { owner_id?: string };
        Update: Partial<VehicleOwner>;
      };
      vehicles: {
        Row: Vehicle;
        Insert: Omit<Vehicle, "vehicle_id" | "created_at" | "owner"> & { vehicle_id?: string };
        Update: Partial<Vehicle>;
      };
      parking_records: {
        Row: ParkingRecord;
        Insert: Omit<ParkingRecord, "record_id" | "vehicle"> & { record_id?: string };
        Update: Partial<ParkingRecord>;
      };
      logs: {
        Row: LogEntry;
        Insert: Omit<LogEntry, "log_id" | "timestamp"> & { log_id?: string };
        Update: Partial<LogEntry>;
      };
    };
  };
}
