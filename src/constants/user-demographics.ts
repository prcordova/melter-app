export const USER_GENDER_IDENTITY_VALUES = [
  'CIS_MAN',
  'NON_CIS_MAN',
  'CIS_WOMAN',
  'NON_CIS_WOMAN',
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

export const USER_SEXUAL_ORIENTATION_VALUES = [
  'HETEROSEXUAL',
  'BISEXUAL',
  'HOMOSEXUAL',
  'PANSEXUAL',
  'NON_BINARY',
  'CURIOUS',
  'ASEXUAL',
  'DEMISEXUAL',
  'OTHER',
] as const
export type UserSexualOrientation = (typeof USER_SEXUAL_ORIENTATION_VALUES)[number]

export const USER_GENDER_LABELS: Record<UserGenderIdentity, string> = {
  CIS_MAN: 'Homem cis',
  NON_CIS_MAN: 'Homem não cis',
  CIS_WOMAN: 'Mulher cis',
  NON_CIS_WOMAN: 'Mulher não cis',
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
  NON_BINARY: 'Pessoas não binárias',
  OTHER: 'Outros',
}

export const USER_SEXUAL_ORIENTATION_LABELS: Record<UserSexualOrientation, string> = {
  HETEROSEXUAL: 'Heterossexual',
  BISEXUAL: 'Bissexual',
  HOMOSEXUAL: 'Homossexual',
  PANSEXUAL: 'Pansexual',
  NON_BINARY: 'Espectro não binário',
  CURIOUS: 'Em descoberta',
  ASEXUAL: 'Assexual',
  DEMISEXUAL: 'Demissexual',
  OTHER: 'Outros',
}
