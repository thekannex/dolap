export type BackType = 'routed' | 'nailed';
export type JointType = 'confirmat' | 'minifix' | 'dowel';
export type AssemblyType = 'sides_out' | 'sides_in';
export type DoorOverlayType = 'full' | 'half' | 'inset';

export interface ConstructionParams {
  bodyMaterialId: string;
  bodyThickness: number;
  backType: BackType;
  backMaterialId: string;
  backThickness: number;
  backChannelInset: number; // g
  backChannelDepth: number; // k
  jointType: JointType;
  assemblyType: AssemblyType;
  doorGap: number; // d
  doorOverlayType: DoorOverlayType;
  halfOverlayAmount?: number;
}

export interface ConstructionPreset {
  id: string;
  name: string;
  assemblyType: AssemblyType;
  backType: BackType;
  bodyThickness: number;
  backThickness: number;
  backChannelInset: number;
  backChannelDepth: number;
  jointType: JointType;
  doorGap: number;
  doorOverlayType: DoorOverlayType;
}
