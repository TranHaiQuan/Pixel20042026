export interface ShooterData {
  id: number;
  ammo: number;
  material: number;
}

export interface ShooterQueueData {
  shooters: ShooterData[];
}

export interface ShooterQueueGroupData {
  shooterQueues: ShooterQueueData[];
}

export interface SurpriseShootersData {
  Shooters: number[];
}

export interface ConnectedShooterData {
  Id: number;
  Shooters: number[];
  Nodes: string[];
}

export interface ConnectedShootersData {
  Connections: ConnectedShooterData[];
}

export interface LocksData {
  Shooters: number[];
}

export interface LevelData {
  Difficulty: string;
  HasTimeLimit: boolean;
  TimeLimit: number;
  SlotCount: number;
  ConveyorLimit: number;
  QueueGroup: ShooterQueueGroupData;
  SurpriseShooters: SurpriseShootersData;
  ConnectedShooters: ConnectedShootersData;
  Locks: LocksData;
  id: number;
  ImageId: number;
}
