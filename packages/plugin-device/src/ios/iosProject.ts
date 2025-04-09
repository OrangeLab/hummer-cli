import { NativeProject, Device } from "../base/nativeProject";
import * as path from 'path';
import * as child_process from 'child_process';
import {
  ChildProcess,
  // @ts-ignore
  SpawnOptionsWithoutStdio,
} from 'child_process';
import { CLIError } from "../tools/errors";
import findMatchingSimulator from "./findMatchingSimulator";
import findXcodeProject, { ProjectInfo } from "./findXcodeProject";
import { info, error, chalk, ora } from '@hummer/cli-utils';

type FlagsT = {
  simulator?: string;
  configuration: string;
  scheme?: string;
  projectPath: string;
  device?: string | true;
  udid?: string;
  destination: string;
};

export class IosProject extends NativeProject {


  private async runOnDevice(device: Device, xcodeProject: ProjectInfo) {
    //todo

  }

  private async runOnSimulator(device: Device, xcodeProject: ProjectInfo) {
    // boot device 
    const activeDeveloperDir = child_process
      .execFileSync('xcode-select', ['-p'], { encoding: 'utf8' })
      .trim();

    child_process.execFileSync('open', [
      `${activeDeveloperDir}/Applications/Simulator.app`,
      '--args',
      '-CurrentDeviceUDID',
      device.udid,
    ]);

    if (!device.booted) {
      this.bootSimulator(device);
    }
    // build
    let destination = 'platform=iOS Simulator,name=' + device.name + ',OS=' + device.version.split(" ")[1]
    let args: FlagsT = { configuration: "Debug", projectPath: this.launchData.projectPath, destination: destination }
    const buildOutput = await this.buildProject(
      xcodeProject,
      device.udid,
      xcodeProject.name,
      args,
    );

    const appPath = this.getBuildPath(
      xcodeProject,
      args.configuration,
      'iphonesimulator',
      xcodeProject.name,
    );

    info(`Installing "${chalk.bold(appPath)}"`);

    child_process.spawnSync(
      'xcrun',
      ['simctl', 'install', device.udid, appPath],
      { stdio: 'inherit' },
    );

    const bundleID = child_process
      .execFileSync(
        '/usr/libexec/PlistBuddy',
        ['-c', 'Print:CFBundleIdentifier', path.join(appPath, 'Info.plist')],
        { encoding: 'utf8' },
      )
      .trim();

    info(`Launching "${chalk.bold(bundleID)}"`);

    const result = child_process.spawnSync('xcrun', [
      'simctl',
      'launch',
      device.udid,
      bundleID,
    ]);

    if (result.status === 0) {
      info('Successfully launched the app on the simulator');
    } else {
      error('Failed to launch the app on simulator', result.stderr as unknown as string);
    }
  }

  valid(){
    let xcodeProject = findXcodeProject([this.launchData.projectPath])
    if (xcodeProject == null){
      throw Error('Can not find xcode project at'+this.launchData.projectPath);
    }
  }
  /**
   * phase 1: find xcode project
   * phase 2: find simulators
   * phase 3: build
   * phase 4: install
   * phase 5: launch 
   */
  async run() {

    let xcodeProject = findXcodeProject([this.launchData.projectPath])
    let device = this.findDevice();
    if (device.type == 'simulator') {
      return await this.runOnSimulator(device, xcodeProject);
    } else {
      return await this.runOnDevice(device, xcodeProject);
    }
  }

  private formattedDeviceName(simulator: Device) {
    return simulator.version
      ? `${simulator.name} (${simulator.version})`
      : simulator.name;
  }
  private bootSimulator(selectedSimulator: Device) {
    const simulatorFullName = this.formattedDeviceName(selectedSimulator);
    info(`Launching ${simulatorFullName}`);
    try {
      child_process.spawnSync('xcrun', [
        'instruments',
        '-w',
        selectedSimulator.udid,
      ]);
    } catch (_ignored) {
      // instruments always fail with 255 because it expects more arguments,
      // but we want it to only launch the simulator
    }
  }

  private buildProject(
    xcodeProject: ProjectInfo,
    udid: string | undefined,
    scheme: string,
    args: FlagsT,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xcodebuildArgs = [
        xcodeProject.isWorkspace ? '-workspace' : '-project',
        xcodeProject.path,
        '-configuration',
        args.configuration,
        '-scheme',
        scheme,
        '-destination',
        args.destination,
      ];
      const loader = ora();
      info(
        `Building ${chalk.dim(
          `(using "xcodebuild ${xcodebuildArgs.join(' ')}")`,
        )}`,
      );
      const buildProcess = child_process.spawn(
        'xcodebuild',
        xcodebuildArgs
      );
      let buildOutput = '';
      let errorOutput = '';
      buildProcess.stdout.on('data', (data: Buffer) => {
        const stringData = data.toString();
        buildOutput += stringData;

        loader.start(
          `Building the app${'.'.repeat(buildOutput.length % 10)}`,
        );
      });
      buildProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data;
      });
      buildProcess.on('close', (code: number) => {
        loader.stop();
        if (code !== 0) {
          reject(
            new CLIError(
              `
            Failed to build iOS project.

            We ran "xcodebuild" command but it exited with error code ${code}. To debug build
            logs further, consider building your app with Xcode.app, by opening
            ${xcodeProject.path}.
          `,
              buildOutput + '\n' + errorOutput,
            ),
          );
          return;
        }
        info('Successfully built the app');
        resolve(buildOutput);
      });
    });
  }

  private xcprettyAvailable() {
    try {
      child_process.execSync('xcpretty --version', {
        stdio: [0, 'pipe', 'ignore'],
      });
    } catch (error) {
      return false;
    }
    return true;
  }

  private getBuildPath(
    xcodeProject: ProjectInfo,
    configuration: string,
    platformName: string,
    scheme: string,
  ) {
    const buildSettings = child_process.execFileSync(
      'xcodebuild',
      [
        xcodeProject.isWorkspace ? '-workspace' : '-project',
        xcodeProject.path,
        '-scheme',
        scheme,
        '-sdk',
        platformName,
        '-configuration',
        configuration,
        '-showBuildSettings',
        '-json',
      ],
      { encoding: 'utf8' },
    );
    const { targetBuildDir, executableFolderPath } = this.getTargetPaths(buildSettings);

    if (!targetBuildDir) {
      throw new CLIError('Failed to get the target build directory.');
    }

    if (!executableFolderPath) {
      throw new CLIError('Failed to get the app name.');
    }

    return `${targetBuildDir}/${executableFolderPath}`;
  }

  getTargetPaths(buildSettings: string) {
    const settings = JSON.parse(buildSettings);

    // Find app in all building settings - look for WRAPPER_EXTENSION: 'app',
    for (const i in settings) {
      const wrapperExtension = settings[i].buildSettings.WRAPPER_EXTENSION;

      if (wrapperExtension === 'app') {
        return {
          targetBuildDir: settings[i].buildSettings.TARGET_BUILD_DIR,
          executableFolderPath: settings[i].buildSettings.EXECUTABLE_FOLDER_PATH,
        };
      }
    }

    return {};
  }
  private findDevice(): Device {
    // find all device 
    let simulators: { devices: { [index: string]: Array<Device> } };
    try {
      simulators = JSON.parse(
        child_process.execFileSync(
          'xcrun',
          ['simctl', 'list', '--json', 'devices'],
          { encoding: 'utf8' },
        ),
      );
    } catch (error) {
      let err = new CLIError(
        'Could not get the simulator list from Xcode. Please open Xcode and try running project directly from there to resolve the remaining issues.',
        error,
      );
      throw err;
    }
    /**
     * If provided simulator does not exist, try simulators in following order
     * - iPhone 12
     * - iPhone 11
     * - iPhone 8
     */
    const fallbackSimulators = ['iPhone 12', 'iPhone 11', 'iPhone 8'];
    var selectedDevice;
    if (!this.launchData.deviceOption) {
      selectedDevice = fallbackSimulators.reduce((simulator, fallback) => {
        return (
          simulator || findMatchingSimulator(simulators, { simulator: fallback })
        );
      }, findMatchingSimulator(simulators, null));
    } else {
      // 
    }
    if (!selectedDevice) {
      throw new CLIError('No simulator available');
    }
    return selectedDevice;
  }
}
