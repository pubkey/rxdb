const os = require('os');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

/**
 * `tauri-driver` listens on DRIVER_PORT and proxies the webdriver requests
 * to the `WebKitWebDriver` process that it spawns on NATIVE_DRIVER_PORT.
 */
const DRIVER_HOST = '127.0.0.1';
const DRIVER_PORT = 4444;
const NATIVE_DRIVER_PORT = 4445;
const DRIVER_START_TIMEOUT = 30000;
const DRIVER_STOP_TIMEOUT = 5000;

// keep track of the `tauri-driver` child process
let tauriDriver;
let tauriDriverExit;

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: DRIVER_HOST, port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port) {
  const start = Date.now();
  while (!(await canConnect(port))) {
    if (tauriDriver.exitCode !== null || tauriDriver.signalCode !== null) {
      throw new Error(
        'tauri-driver exited before port ' + port + ' was reachable'
      );
    }
    if (Date.now() - start > DRIVER_START_TIMEOUT) {
      throw new Error(
        'port ' + port + ' not reachable after ' + DRIVER_START_TIMEOUT + 'ms'
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function startTauriDriver() {
  tauriDriver = spawn(
    path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver'),
    ['--port', String(DRIVER_PORT), '--native-port', String(NATIVE_DRIVER_PORT)],
    { stdio: [null, process.stdout, process.stderr] }
  );
  tauriDriverExit = new Promise((resolve) => {
    tauriDriver.once('exit', (code, signal) => {
      console.log(
        'tauri-driver exited with code ' + code + ' and signal ' + signal
      );
      resolve();
    });
    tauriDriver.once('error', (err) => {
      console.error('tauri-driver could not be started: ' + err.message);
      resolve();
    });
  });

  // the session must only be created when both drivers accept connections
  await waitForPort(DRIVER_PORT);
  await waitForPort(NATIVE_DRIVER_PORT);
}

async function stopTauriDriver() {
  if (!tauriDriver) {
    return;
  }
  tauriDriver.kill();
  const forceKill = setTimeout(
    () => tauriDriver.kill('SIGKILL'),
    DRIVER_STOP_TIMEOUT
  );

  // wait for the exit so that the ports are free when the spec file is retried
  await tauriDriverExit;
  clearTimeout(forceKill);
}

// never leave a `tauri-driver` behind that blocks the ports for the next worker
process.on('exit', () => {
  if (tauriDriver) {
    tauriDriver.kill('SIGKILL');
  }
});

exports.config = {
  specs: ['./test/specs/**/*.js'],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: './src-tauri/target/debug/tauri',
      },
    },
  ],
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
  },

  /**
   * On the CI runners the app sometimes dies or hangs right after it was started,
   * which ends in an "invalid session id" error for all following commands.
   * A lost session cannot be recovered from inside of the test,
   * so the whole spec file is retried. Each retry runs in a new worker
   * which runs beforeSession() and afterSession() again
   * and therefore gets a new `tauri-driver`, a new session and a new app process.
   */
  specFileRetries: 3,
  specFileRetriesDelay: 5,
  specFileRetriesDeferred: false,

  // ensure we are running `tauri-driver` before the session starts so that we can proxy the webdriver requests
  beforeSession: () => startTauriDriver(),

  // clean up the `tauri-driver` process we spawned at the start of the session
  afterSession: () => stopTauriDriver(),
};
