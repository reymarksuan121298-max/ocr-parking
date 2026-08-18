export const VEHICLE_TYPES = [
  "CAR",
  "MOTORCYCLE",
  "TRICYCLE",
  "TRUCK",
  "VAN",
  "BUS",
  "SUV",
  "PICKUP",
] as const;

export type VehicleType = typeof VEHICLE_TYPES[number];
