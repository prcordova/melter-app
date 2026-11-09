export type DevicePlatform = 'ios' | 'android';

export interface DeviceCredentialSummary {
  id: string;
  deviceName: string;
  platform: DevicePlatform;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreatedDeviceCredential {
  credentialId: string;
  secret: string;
}
