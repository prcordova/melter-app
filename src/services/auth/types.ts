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

/** Confirmação de identidade para ativar biometria (dispensada logo após login completo). */
export interface DeviceEnrollmentStepUp {
  password?: string;
  twoFactorCode?: string;
}

export interface CreateDeviceCredentialResponse {
  success: boolean;
  data?: CreatedDeviceCredential;
  message?: string;
  /** `STEP_UP_REQUIRED`: pedir senha (e código 2FA quando `requires2FA`). */
  code?: string;
  requires2FA?: boolean;
}
