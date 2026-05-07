const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const POD_BLOCK = `
    # Mopro xcframework only ships an arm64 simulator slice (no x86_64) —
    # Apple Silicon hosts must drop x86_64 from simulator builds or the
    # linker fails with "Undefined symbols for architecture x86_64".
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'x86_64'
    end
    installer.aggregate_targets.each do |agg|
      agg.user_project.build_configurations.each do |c|
        c.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'x86_64'
      end
      agg.user_project.save
    end
`;

const withPodfilePatch = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes("EXCLUDED_ARCHS[sdk=iphonesimulator*]")) {
        return cfg;
      }
      contents = contents.replace(
        /(react_native_post_install\([\s\S]*?\)\s*\n)/,
        `$1${POD_BLOCK}`
      );
      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);

const withProjectPatch = (config) =>
  withXcodeProject(config, (cfg) => {
    const xcodeProject = cfg.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    Object.keys(configurations).forEach((key) => {
      const buildSettings = configurations[key].buildSettings;
      if (buildSettings) {
        buildSettings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'x86_64';
      }
    });
    return cfg;
  });

module.exports = (config) => withProjectPatch(withPodfilePatch(config));
