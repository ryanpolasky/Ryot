/**
 * Foreground-window watcher (Windows only).
 *
 * The overlay is an in-game HUD, so it should be visible only while the League
 * *game* window is the active (foreground) window - when you alt-tab to a
 * browser etc. it should disappear. Electron exposes no API for the OS
 * foreground window, and the alternatives are native (ABI-sensitive) modules
 * that complicate the Electron build/packaging. Instead we run a single
 * long-lived PowerShell process that polls GetForegroundWindow -> the owning
 * process name and prints it; we map that to "is the League game focused?".
 *
 * Fails open: on any error (PowerShell missing, spawn failure, non-Windows) we
 * report the game as focused so the overlay can never get stuck hidden.
 */
import { spawn, type ChildProcess } from "node:child_process";

// The in-game executable is "League of Legends.exe", whose process name (no
// extension) is "League of Legends". The launcher is "LeagueClientUx".
const GAME_PROCESS = "league of legends";

// Polls the foreground window's owning process name every 600ms and writes it
// to stdout, one line per tick. Add-Type compiles a tiny P/Invoke shim for
// GetForegroundWindow + GetWindowThreadProcessId (both benign, widely used).
// $procId (not $pid - that's an automatic variable for the current process).
const PS_SCRIPT = [
  `$sig = 'using System; using System.Runtime.InteropServices; public static class Fg { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid); }'`,
  `Add-Type -TypeDefinition $sig`,
  `while ($true) {`,
  `  try {`,
  `    $h = [Fg]::GetForegroundWindow()`,
  `    $procId = 0`,
  `    [void][Fg]::GetWindowThreadProcessId($h, [ref]$procId)`,
  `    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue`,
  `    if ($p) { [Console]::Out.WriteLine($p.ProcessName) } else { [Console]::Out.WriteLine('') }`,
  `  } catch { [Console]::Out.WriteLine('') }`,
  `  [Console]::Out.Flush()`,
  `  Start-Sleep -Milliseconds 600`,
  `}`,
].join("\n");

export interface ForegroundWatcher {
  stop(): void;
}

/**
 * Start watching the foreground window. Calls `onChange(true)` when the League
 * game window becomes active and `onChange(false)` when it loses focus (only on
 * actual transitions). No-ops to "always focused" on non-Windows. Returns a
 * handle whose `stop()` tears the watcher down.
 */
export function watchLeagueForeground(
  onChange: (isLeagueGame: boolean) => void,
): ForegroundWatcher {
  if (process.platform !== "win32") {
    onChange(true); // can't poll -> behave as before (overlay always shows)
    return { stop() {} };
  }

  let child: ChildProcess | null = null;
  let stopped = false;
  let last: boolean | null = null;
  let restart: ReturnType<typeof setTimeout> | null = null;

  const emit = (isGame: boolean) => {
    if (isGame !== last) {
      last = isGame;
      onChange(isGame);
    }
  };

  const start = () => {
    if (stopped) return;
    // -EncodedCommand (UTF-16LE base64) avoids all shell-quoting/newline issues.
    const encoded = Buffer.from(PS_SCRIPT, "utf16le").toString("base64");
    try {
      child = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-EncodedCommand",
          encoded,
        ],
        { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch {
      emit(true); // can't watch -> keep overlay visible
      return;
    }

    let buf = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      for (;;) {
        const nl = buf.indexOf("\n");
        if (nl === -1) break;
        const name = buf.slice(0, nl).trim().toLowerCase();
        buf = buf.slice(nl + 1);
        emit(name === GAME_PROCESS);
      }
    });

    child.on("error", () => emit(true));
    child.on("exit", () => {
      child = null;
      if (!stopped) restart = setTimeout(start, 2000); // respawn if it dies
    });
  };

  start();

  return {
    stop() {
      stopped = true;
      if (restart) clearTimeout(restart);
      child?.kill();
      child = null;
    },
  };
}
