// Expo config plugin — opt the Google Sign-In transitive pod chain into
// modular headers so it integrates as a static library.
//
// Why: GoogleSignIn (pulled in by @react-native-google-signin/google-signin)
// now depends on AppCheckCore, which in turn depends on GoogleUtilities and
// RecaptchaInterop — Swift pods that do NOT define modules. With Expo's
// default static-library linkage, `pod install` aborts with:
//
//   [!] The following Swift pods cannot yet be integrated as static
//   libraries: The Swift pod `AppCheckCore` depends upon `GoogleUtilities`
//   and `RecaptchaInterop`, which do not define modules.
//
// CocoaPods resolves these transitive pods fresh at build time (the npm
// lockfile only pins the JS layer), so a newer GoogleSignIn/AppCheckCore
// silently broke a build config that worked in v1.0.6. Declaring the pods
// with :modular_headers => true generates the module maps CocoaPods needs —
// the fix the error itself recommends — without switching the whole project
// to dynamic/static frameworks (which carries broader side effects).
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'cardpulse-modular-headers';
const PODS = ['GoogleUtilities', 'AppCheckCore', 'RecaptchaInterop'];

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');

      // Idempotent — prebuild can run more than once.
      if (!contents.includes(MARKER)) {
        const podLines = PODS.map(
          (name) => `  pod '${name}', :modular_headers => true`,
        ).join('\n');
        const block =
          `\n  # ${MARKER}: Google Sign-In's AppCheckCore chain needs module maps for static-library integration\n` +
          `${podLines}`;

        // Insert right after the app target opens. Expo prebuild Podfiles
        // always contain exactly one `target '<AppName>' do` for the app;
        // the non-global replace hits only that first target.
        const replaced = contents.replace(
          /(target\s+['"][^'"]+['"]\s+do\b)/,
          `$1${block}`,
        );

        if (replaced === contents) {
          throw new Error(
            '[withModularHeaders] could not find the app target in the Podfile to inject modular headers',
          );
        }
        fs.writeFileSync(podfile, replaced);
      }
      return cfg;
    },
  ]);
};
