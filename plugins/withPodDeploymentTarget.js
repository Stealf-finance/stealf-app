const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'stealf_pods_deployment_target';

// Resource-bundle targets keep their podspec minimum (SDWebImage: 9.0), which Xcode warns about.
const POD_BLOCK = `
    ${MARKER} = installer.pods_project.build_configurations
      .map { |c| c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] }
      .compact
      .max_by(&:to_f)
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if ${MARKER} && (current.nil? || current.to_f < ${MARKER}.to_f)
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = ${MARKER}
        end
      end
    end
`;

const withPodDeploymentTarget = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile',
      );
      const contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER)) {
        return cfg;
      }
      const anchor = /(react_native_post_install\([\s\S]*?\)\s*\n)/;
      if (!anchor.test(contents)) {
        console.warn(
          '[withPodDeploymentTarget] react_native_post_install anchor not found — pod deployment targets left untouched.',
        );
        return cfg;
      }
      fs.writeFileSync(podfilePath, contents.replace(anchor, `$1${POD_BLOCK}`));
      return cfg;
    },
  ]);

module.exports = withPodDeploymentTarget;
