/**
 * android.versionCode derivado do "version" do app.json (única fonte de versão):
 * maior * 10000 + menor * 100 + correção → 1.0.19 = 10019, 1.2.3 = 10203.
 * Sync com melter/src/config/app/version-code.ts (admin calcula o mesmo número).
 */
const APP_VERSION_PATTERN = /^(\d{1,3})\.(\d{1,2})\.(\d{1,2})$/;

function appVersionToCode(version) {
  const match = APP_VERSION_PATTERN.exec(String(version ?? '').trim());
  if (!match) {
    throw new Error(`app.json "version" inválida: "${version}". Use maior.menor.correção (ex.: 1.0.19), menor/correção até 99.`);
  }
  const [, major, minor, patch] = match.map(Number);
  return major * 10000 + minor * 100 + patch;
}

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: appVersionToCode(config.version),
  },
});
