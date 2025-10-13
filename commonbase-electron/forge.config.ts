import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.bramadams.commonbase-desktop',
    appCategoryType: 'public.app-category.productivity',
    protocols: [
      {
        name: 'commonbase',
        schemes: ['commonbase']
      }
    ]
    // Note: Signing and notarization commented out for initial release
    // Uncomment and configure for production releases:
    // osxSign: {
    //   identity: 'Developer ID Application: Bram Adams'
    // },
    // osxNotarize: {
    //   tool: 'notarytool',
    //   appleId: process.env.APPLE_ID || '',
    //   appleIdPassword: process.env.APPLE_ID_PASSWORD || '',
    //   teamId: process.env.APPLE_TEAM_ID || ''
    // }
  },
  rebuildConfig: {},
  makers: [
    // macOS DMG
    new MakerDMG({
      format: 'ULFO'
    }, ['darwin']),
    // Windows Squirrel installer
    new MakerSquirrel({
      name: 'commonbase_desktop',
      authors: 'Bram Adams',
      exe: 'Commonbase Desktop.exe',
      description: 'Desktop knowledge management system with semantic search and file parsing'
    }, ['win32']),
    // ZIP for manual installation
    new MakerZIP({}, ['darwin', 'linux']),
    // Linux packages
    new MakerRpm({
      options: {
        maintainer: 'Bram Adams',
        homepage: 'https://github.com/bramses/commonbase-electron'
      }
    }, ['linux']),
    new MakerDeb({
      options: {
        maintainer: 'Bram Adams <3282661+bramses@users.noreply.github.com>',
        homepage: 'https://github.com/bramses/commonbase-electron'
      }
    }, ['linux']),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
