export const USER_GENDER_IDENTITY_VALUES = [
  'CIS_MAN',
  'BI_MAN',
  'CIS_WOMAN',
  'BI_WOMAN',
  'TRANS_MAN',
  'TRANS_WOMAN',
  'NON_BINARY',
  'OTHER',
] as const
export type UserGenderIdentity = (typeof USER_GENDER_IDENTITY_VALUES)[number]

export const USER_GENDER_VALUES = USER_GENDER_IDENTITY_VALUES
export type UserGender = UserGenderIdentity

export const USER_INTERESTED_IN_VALUES = [
  'MEN',
  'WOMEN',
  'TRANS_MEN',
  'TRANS_WOMEN',
  'NON_BINARY',
  'OTHER',
] as const
export type UserInterestedIn = (typeof USER_INTERESTED_IN_VALUES)[number]

export const USER_GENDER_LABELS: Record<UserGenderIdentity, string> = {
  CIS_MAN: 'Homem cis',
  BI_MAN: 'Homem bi',
  CIS_WOMAN: 'Mulher cis',
  BI_WOMAN: 'Mulher bi',
  TRANS_MAN: 'Homem trans',
  TRANS_WOMAN: 'Mulher trans',
  NON_BINARY: 'Não binário',
  OTHER: 'Outros',
}

export const USER_INTERESTED_IN_LABELS: Record<UserInterestedIn, string> = {
  MEN: 'Homens',
  WOMEN: 'Mulheres',
  TRANS_MEN: 'Homens trans',
  TRANS_WOMEN: 'Mulheres trans',
  NON_BINARY: 'Não binário',
  OTHER: 'Outros',
}
