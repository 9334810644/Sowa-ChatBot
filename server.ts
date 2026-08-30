import express from "express";
import path from "path";
import fs from "fs";
import { google } from "googleapis";
import dotenv from "dotenv";
import { exec } from "child_process";
import os from "os";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      geminiKey: process.env.GEMINI_API_KEY || "",
    });
  });

  // PC System Information endpoint for Desktop Mode
  app.get("/api/pc/info", (req, res) => {
    try {
      const userInfo = os.userInfo ? os.userInfo() : { username: 'User' };
      res.json({
        success: true,
        platform: process.platform, // 'win32', 'darwin', 'linux'
        arch: process.arch,
        hostname: os.hostname(),
        username: userInfo?.username || 'User',
        homedir: os.homedir(),
        uptime: Math.round(os.uptime()),
        freeMemMb: Math.round(os.freemem() / (1024 * 1024)),
        totalMemMb: Math.round(os.totalmem() / (1024 * 1024)),
        isDesktop: true
      });
    } catch (e: any) {
      res.json({
        success: false,
        error: e.message || "Failed to retrieve PC info",
        platform: process.platform
      });
    }
  });

  // PC Startup Configuration Endpoint (Auto-launch on Windows Boot)
  app.get("/api/pc/startup", (req, res) => {
    if (process.platform !== "win32") {
      return res.json({ success: true, enabled: false, platform: process.platform });
    }

    exec('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Sowa AI"', (err, stdout) => {
      if (err || !stdout || !stdout.includes("Sowa AI")) {
        exec('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Maya AI"', (err2, stdout2) => {
          const enabled = !err2 && !!stdout2 && stdout2.includes("Maya AI");
          return res.json({ success: true, enabled });
        });
      } else {
        return res.json({ success: true, enabled: true });
      }
    });
  });

  app.post("/api/pc/startup", (req, res) => {
    const { enabled } = req.body;
    if (process.platform !== "win32") {
      return res.json({ success: true, enabled: !!enabled, message: "Only Windows startup management supported natively" });
    }

    if (enabled) {
      let targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
      if (!targetExe || targetExe.toLowerCase().endsWith("node.exe") || targetExe.toLowerCase().endsWith("tsx.exe")) {
        const batchLauncher = path.join(process.cwd(), "Launch-Sowa-AI.bat");
        if (fs.existsSync(batchLauncher)) {
          targetExe = batchLauncher;
        }
      }

      const cmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Sowa AI" /t REG_SZ /d "\"${targetExe}\"" /f`;
      exec(cmd, (err) => {
        if (err) {
          console.warn("[Startup] Registry add failed:", err.message);
          return res.json({ success: false, error: err.message, enabled: false });
        }
        console.log(`[Startup] Enabled Windows startup for: ${targetExe}`);
        return res.json({ success: true, enabled: true });
      });
    } else {
      const cmd = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Sowa AI" /f & reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Maya AI" /f`;
      exec(cmd, () => {
        console.log("[Startup] Disabled Windows startup");
        return res.json({ success: true, enabled: false });
      });
    }
  });

  const executeCommand = (cmd: string): Promise<{ success: boolean; output?: string; error?: string }> => {
    return new Promise((resolve) => {
      exec(cmd, { timeout: 8000, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          console.warn(`[PC Action Error] Command "${cmd}" failed:`, error.message);
          resolve({ success: false, error: error.message, output: stderr });
        } else {
          resolve({ success: true, output: stdout || "Executed successfully" });
        }
      });
    });
  };

  const runFastVBS = (vbsCode: string): Promise<{ success: boolean; output?: string; error?: string }> => {
    return new Promise((resolve) => {
      const tempFile = path.join(os.tmpdir(), `sowa_act_${Date.now()}_${Math.random().toString(36).slice(2)}.vbs`);
      fs.writeFile(tempFile, vbsCode, (err) => {
        if (err) return resolve({ success: false, error: err.message });
        exec(`cscript //nologo "${tempFile}"`, { timeout: 4000, windowsHide: true }, (error, stdout, stderr) => {
          fs.unlink(tempFile, () => {});
          if (error) {
            resolve({ success: false, error: error.message, output: stderr });
          } else {
            resolve({ success: true, output: stdout || "Executed successfully" });
          }
        });
      });
    });
  };

  // Focus Window Endpoint (brings Sowa AI to foreground when wake word is spoken)
  app.post("/api/pc/focus", (req, res) => {
    if (process.platform === "win32") {
      const vbsCode = `Set o = CreateObject("WScript.Shell")\r\no.AppActivate "Sowa AI"\r\no.AppActivate "Maya AI"\r\n`;
      runFastVBS(vbsCode).catch(() => {});
    }
    return res.json({ success: true });
  });

  // Native PC Actions (App Launcher, System Settings, Volume, File Explorer, etc.)
  app.post("/api/pc/action", async (req, res) => {
    const { action, appName, setting, value, path: targetPath, command } = req.body;
    const platform = process.platform;

    console.log(`[PC Action] Requested action="${action}", appName="${appName}", setting="${setting}", val="${value}" on platform="${platform}"`);

    try {
      if (action === "open_app") {
        const name = (appName || "").toLowerCase().trim();
        let cmd = "";

        if (platform === "win32") {
          const winAppMap: Record<string, string> = {
            notepad: "start notepad",
            notes: "start notepad",
            calc: "start calculator: || start calc",
            calculator: "start calculator: || start calc",
            code: "start code || code",
            vscode: "start code || code",
            visualstudiocode: "start code || code",
            chrome: "start chrome",
            googlechrome: "start chrome",
            edge: "start msedge",
            msedge: "start msedge",
            brave: "start brave",
            firefox: "start firefox",
            browser: "start https://google.com",
            spotify: "start spotify:",
            discord: "start discord:",
            telegram: "start tg: || start telegram",
            whatsapp: "start whatsapp:",
            terminal: "start wt || start powershell",
            cmd: "start cmd",
            commandprompt: "start cmd",
            powershell: "start powershell",
            gitbash: "start bash",
            explorer: "start explorer",
            fileexplorer: "start explorer",
            files: "start explorer",
            mycomputer: "start explorer",
            thispc: "start explorer",
            settings: "start ms-settings:",
            systemsettings: "start ms-settings:",
            taskmgr: "start taskmgr",
            taskmanager: "start taskmgr",
            paint: "start mspaint",
            mspaint: "start mspaint",
            camera: "start microsoft.windows.camera:",
            clock: "start ms-clock:",
            alarm: "start ms-clock:",
            timer: "start ms-clock:",
            photos: "start ms-photos:",
            store: "start ms-windows-store:",
            microsoftstore: "start ms-windows-store:",
            youtube: "start https://youtube.com",
            snippingtool: "start snippingtool || start ms-ScreenSketch:",
            sniptool: "start snippingtool || start ms-ScreenSketch:",
            vlc: "start vlc",
            steam: "start steam:",
            epicgames: "start com.epicgames.launcher:",
            control: "start control",
            controlpanel: "start control",
            wordpad: "start wordpad",
            word: "start winword",
            excel: "start excel",
            powerpoint: "start powerpnt",
            photoshop: "start photoshop",
            premiere: "start premiere",
            blender: "start blender",
            obs: "start obs64 || start obs",
            obsstudio: "start obs64 || start obs",
          };

          const lookup = name.replace(/[^a-z0-9]/g, '');
          cmd = winAppMap[lookup] || `start "" "${appName}" || start ${lookup}`;
        } else if (platform === "darwin") {
          const macAppMap: Record<string, string> = {
            calc: 'open -a Calculator',
            calculator: 'open -a Calculator',
            notes: 'open -a Notes',
            textedit: 'open -a TextEdit',
            code: 'open -a "Visual Studio Code" || code',
            vscode: 'open -a "Visual Studio Code" || code',
            chrome: 'open -a "Google Chrome"',
            spotify: 'open -a Spotify',
            discord: 'open -a Discord',
            telegram: 'open -a Telegram',
            whatsapp: 'open -a WhatsApp',
            terminal: 'open -a Terminal',
            finder: 'open .',
            files: 'open .',
            settings: 'open "x-apple.systempreferences:"',
            systempreferences: 'open "x-apple.systempreferences:"',
            activitymonitor: 'open -a "Activity Monitor"',
            taskmgr: 'open -a "Activity Monitor"',
          };

          const lookup = name.replace(/[^a-z0-9]/g, '');
          cmd = macAppMap[lookup] || `open -a "${appName}" || open "${appName}"`;
        } else {
          // Linux
          const linuxAppMap: Record<string, string> = {
            calc: 'gnome-calculator || kcalc || xcalc',
            calculator: 'gnome-calculator || kcalc || xcalc',
            code: 'code',
            vscode: 'code',
            chrome: 'google-chrome || chromium-browser || xdg-open https://google.com',
            terminal: 'gnome-terminal || xterm || konsole',
            files: 'nautilus || dolphin || xdg-open .',
            explorer: 'nautilus || dolphin || xdg-open .',
            settings: 'gnome-control-center || systemsettings5',
            taskmgr: 'gnome-system-monitor || ksysguard',
          };

          const lookup = name.replace(/[^a-z0-9]/g, '');
          cmd = linuxAppMap[lookup] || `xdg-open "${appName}" || ${appName} &`;
        }

        const result = await executeCommand(cmd);
        return res.json({
          success: result.success,
          message: result.success ? `Launched ${appName || 'application'} on PC.` : `Could not open ${appName}: ${result.error}`,
          app: appName,
          platform
        });
      }

      if (action === "search_web" || action === "open_url") {
        const query = (req.body.query || "").trim();
        const targetUrl = (req.body.url || "").trim();
        const engine = (req.body.engine || "google").toLowerCase().trim();
        let finalUrl = targetUrl;

        if (!finalUrl && query) {
          if (engine === "youtube") {
            finalUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          } else if (engine === "wikipedia") {
            finalUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
          } else if (engine === "github") {
            finalUrl = `https://github.com/search?q=${encodeURIComponent(query)}`;
          } else if (engine === "reddit") {
            finalUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`;
          } else if (engine === "amazon") {
            finalUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
          } else {
            finalUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          }
        }

        let cmd = "";
        if (platform === "win32") {
          cmd = `start "" "${finalUrl}"`;
        } else if (platform === "darwin") {
          cmd = `open "${finalUrl}"`;
        } else {
          cmd = `xdg-open "${finalUrl}"`;
        }

        const result = await executeCommand(cmd);
        return res.json({
          success: result.success,
          message: result.success ? `Opened "${finalUrl}" on PC browser.` : `Failed to open URL: ${result.error}`,
          url: finalUrl
        });
      }

      if (action === "open_folder") {
        let folderPath = targetPath || "";
        const homedir = os.homedir();

        if (!folderPath || folderPath.toLowerCase() === "downloads") {
          folderPath = path.join(homedir, "Downloads");
        } else if (folderPath.toLowerCase() === "documents") {
          folderPath = path.join(homedir, "Documents");
        } else if (folderPath.toLowerCase() === "desktop") {
          folderPath = path.join(homedir, "Desktop");
        } else if (folderPath.toLowerCase() === "pictures" || folderPath.toLowerCase() === "photos") {
          folderPath = path.join(homedir, "Pictures");
        } else if (folderPath.toLowerCase() === "music") {
          folderPath = path.join(homedir, "Music");
        } else if (folderPath.toLowerCase() === "home" || folderPath.toLowerCase() === "user") {
          folderPath = homedir;
        }

        let cmd = "";
        if (platform === "win32") {
          cmd = `start explorer "${folderPath}"`;
        } else if (platform === "darwin") {
          cmd = `open "${folderPath}"`;
        } else {
          cmd = `xdg-open "${folderPath}"`;
        }

        const result = await executeCommand(cmd);
        return res.json({
          success: result.success,
          message: result.success ? `Opened ${folderPath} on PC.` : `Could not open folder: ${result.error}`,
          path: folderPath
        });
      }

      // Dedicated Window / PC Page Scroll Action
      if (action === "scroll_pc" || action === "scroll") {
        const direction = (req.body.direction || "down").toLowerCase().trim();
        const amount = (req.body.amount || "medium").toLowerCase().trim();

        if (platform === "win32") {
          let key = direction === "up" ? "{PGUP}" : direction === "top" ? "^{HOME}" : direction === "bottom" ? "^{END}" : "{PGDN}";
          if (amount === "small") key = direction === "up" ? "{UP}{UP}{UP}" : "{DOWN}{DOWN}{DOWN}";
          else if (amount === "large") key = direction === "up" ? "{PGUP}{PGUP}" : "{PGDN}{PGDN}";

          const vbsCode = `Set o = CreateObject("WScript.Shell")\r\no.SendKeys("${key}")\r\n`;
          const result = await runFastVBS(vbsCode);
          return res.json({
            success: result.success,
            message: result.success ? `Scrolled ${direction} on PC.` : `Scroll failed: ${result.error}`,
            direction
          });
        } else if (platform === "darwin") {
          const key = direction === "up" ? 116 : 121; // page up / down key codes
          const cmd = `osascript -e 'tell application "System Events" to key code ${key}'`;
          const result = await executeCommand(cmd);
          return res.json({ success: result.success, direction });
        } else {
          const key = direction === "up" ? "Page_Up" : "Page_Down";
          const result = await executeCommand(`xdotool key ${key}`);
          return res.json({ success: result.success, direction });
        }
      }

      // Mouse Cursor & Accessibility Control
      if (action === "control_mouse" || action === "mouse_action") {
        const mouseAction = (req.body.mouseAction || req.body.subAction || "click").toLowerCase().trim();
        const targetX = req.body.x !== undefined ? Number(req.body.x) : undefined;
        const targetY = req.body.y !== undefined ? Number(req.body.y) : undefined;
        const dx = req.body.dx !== undefined ? Number(req.body.dx) : undefined;
        const dy = req.body.dy !== undefined ? Number(req.body.dy) : undefined;
        const scrollAmount = req.body.scrollAmount !== undefined ? Number(req.body.scrollAmount) : 360;

        let cmd = "";

        if (platform === "win32") {
          if (mouseAction === "scroll_up" || mouseAction === "scroll_down") {
            const key = mouseAction === "scroll_up" ? "{PGUP}" : "{PGDN}";
            const vbsCode = `Set o = CreateObject("WScript.Shell")\r\no.SendKeys("${key}")\r\n`;
            const result = await runFastVBS(vbsCode);
            return res.json({
              success: result.success,
              message: result.success ? `Scrolled ${mouseAction} on PC.` : `Scroll failed: ${result.error}`,
              mouseAction
            });
          } else if (mouseAction === "get_position") {
            cmd = `powershell -c "Add-Type -AssemblyName System.Windows.Forms; $p = [System.Windows.Forms.Cursor]::Position; $s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; Write-Output ($p.X.ToString() + ',' + $p.Y.ToString() + ',' + $s.Width.ToString() + ',' + $s.Height.ToString())"`;
          } else if (mouseAction === "move") {
            if (targetX !== undefined && targetY !== undefined) {
              cmd = `powershell -c "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(targetX)}, ${Math.round(targetY)})"`;
            } else if (dx !== undefined || dy !== undefined) {
              cmd = `powershell -c "Add-Type -AssemblyName System.Windows.Forms; $p = [System.Windows.Forms.Cursor]::Position; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(($p.X + ${Math.round(dx || 0)}), ($p.Y + ${Math.round(dy || 0)}))"`;
            } else {
              // Center of screen default
              cmd = `powershell -c "Add-Type -AssemblyName System.Windows.Forms; $s = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point([int]($s.Width / 2), [int]($s.Height / 2))"`;
            }
          } else if (mouseAction === "click" || mouseAction === "left_click") {
            const moveCode = (targetX !== undefined && targetY !== undefined) ? `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(targetX)}, ${Math.round(targetY)}); ` : '';
            cmd = `powershell -c "Add-Type -AssemblyName System.Windows.Forms; Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int extraInfo);' -Name MouseHook -Namespace Win32; ${moveCode}[Win32.MouseHook]::mouse_event(0x02, 0, 0, 0, 0); [Win32.MouseHook]::mouse_event(0x04, 0, 0, 0, 0)"`;
          } else if (mouseAction === "right_click") {
            const moveCode = (targetX !== undefined && targetY !== undefined) ? `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(targetX)}, ${Math.round(targetY)}); ` : '';
            cmd = `powershell -c "Add-Type -AssemblyName System.Windows.Forms; Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int extraInfo);' -Name MouseHook -Namespace Win32; ${moveCode}[Win32.MouseHook]::mouse_event(0x08, 0, 0, 0, 0); [Win32.MouseHook]::mouse_event(0x10, 0, 0, 0, 0)"`;
          } else if (mouseAction === "double_click") {
            const moveCode = (targetX !== undefined && targetY !== undefined) ? `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${Math.round(targetX)}, ${Math.round(targetY)}); ` : '';
            cmd = `powershell -c "Add-Type -AssemblyName System.Windows.Forms; Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int extraInfo);' -Name MouseHook -Namespace Win32; ${moveCode}[Win32.MouseHook]::mouse_event(0x02, 0, 0, 0, 0); [Win32.MouseHook]::mouse_event(0x04, 0, 0, 0, 0); Start-Sleep -Milliseconds 100; [Win32.MouseHook]::mouse_event(0x02, 0, 0, 0, 0); [Win32.MouseHook]::mouse_event(0x04, 0, 0, 0, 0)"`;
          } else {
            return res.status(400).json({ success: false, error: `Unknown mouse action: ${mouseAction}` });
          }
        } else if (platform === "darwin") {
          if (mouseAction === "click") {
            cmd = `osascript -e 'tell application "System Events" to click'`;
          } else {
            cmd = `osascript -e 'tell application "System Events" to click'`;
          }
        } else {
          // Linux xdotool
          if (mouseAction === "move" && targetX !== undefined && targetY !== undefined) {
            cmd = `xdotool mousemove ${targetX} ${targetY}`;
          } else if (mouseAction === "click") {
            cmd = `xdotool click 1`;
          } else if (mouseAction === "right_click") {
            cmd = `xdotool click 3`;
          } else if (mouseAction === "double_click") {
            cmd = `xdotool click --repeat 2 1`;
          } else if (mouseAction === "scroll_up") {
            cmd = `xdotool click 4`;
          } else if (mouseAction === "scroll_down") {
            cmd = `xdotool click 5`;
          }
        }

        const result = await executeCommand(cmd);

        let positionData: any = null;
        if (mouseAction === "get_position" && result.success && result.output) {
          const parts = result.output.trim().split(",");
          if (parts.length >= 4) {
            positionData = {
              x: Number(parts[0]),
              y: Number(parts[1]),
              screenWidth: Number(parts[2]),
              screenHeight: Number(parts[3])
            };
          }
        }

        return res.json({
          success: result.success,
          message: result.success ? `Executed mouse action: ${mouseAction}` : `Mouse action failed: ${result.error}`,
          mouseAction,
          position: positionData
        });
      }

      if (action === "type_text" || action === "keyboard_type") {
        const textToType = req.body.text || "";
        const pressEnter = !!req.body.pressEnter || !!req.body.press_enter;
        const useClipboard = req.body.useClipboard !== false;

        if (!textToType && !pressEnter) {
          return res.status(400).json({ success: false, error: "Text is required to type." });
        }

        let cmd = "";
        if (platform === "win32") {
          const escaped = textToType.replace(/"/g, '""').replace(/[{}+^%~()\[\]]/g, '{$&}');
          const enterCode = pressEnter ? '\r\no.SendKeys("{ENTER}")\r\n' : '';
          const vbsCode = `Set o = CreateObject("WScript.Shell")\r\no.SendKeys("${escaped}")${enterCode}`;
          const result = await runFastVBS(vbsCode);
          return res.json({
            success: result.success,
            message: result.success ? `Typed "${textToType}"${pressEnter ? ' and pressed Enter' : ''} on PC.` : `Typing failed: ${result.error}`,
            typedText: textToType
          });
        } else if (platform === "darwin") {
          const escaped = textToType.replace(/"/g, '\\"');
          const enterCode = pressEnter ? `\ntell application "System Events" to key code 36` : "";
          cmd = `osascript -e 'tell application "System Events" to keystroke "${escaped}"'${enterCode}`;
        } else {
          const enterCode = pressEnter ? ` && xdotool key Return` : "";
          cmd = `xdotool type --delay 40 "${textToType}"${enterCode}`;
        }

        const result = await executeCommand(cmd);
        return res.json({
          success: result.success,
          message: result.success ? `Typed "${textToType}"${pressEnter ? ' and pressed Enter' : ''} on PC.` : `Typing failed: ${result.error}`,
          typedText: textToType
        });
      }

      if (action === "press_hotkey") {
        const key = (req.body.key || req.body.hotkey || "").toLowerCase().trim();
        let cmd = "";

        if (platform === "win32") {
          const keyMap: Record<string, string> = {
            enter: "{ENTER}",
            return: "{ENTER}",
            tab: "{TAB}",
            escape: "{ESC}",
            esc: "{ESC}",
            space: " ",
            backspace: "{BACKSPACE}",
            copy: "^c",
            "ctrl+c": "^c",
            paste: "^v",
            "ctrl+v": "^v",
            cut: "^x",
            "ctrl+x": "^x",
            undo: "^z",
            "ctrl+z": "^z",
            select_all: "^a",
            "ctrl+a": "^a",
            save: "^s",
            "ctrl+s": "^s",
            close_tab: "^w",
            "ctrl+w": "^w",
            new_tab: "^t",
            "ctrl+t": "^t",
            fullscreen: "{F11}",
            f11: "{F11}",
            desktop: "{LWIN}d",
            "win+d": "{LWIN}d",
            "win+e": "{LWIN}e",
            "win+r": "{LWIN}r",
          };

          const sendStr = keyMap[key] || key;
          const vbsCode = `Set o = CreateObject("WScript.Shell")\r\no.SendKeys("${sendStr}")\r\n`;
          const result = await runFastVBS(vbsCode);
          return res.json({
            success: result.success,
            message: result.success ? `Pressed hotkey "${key}" on PC.` : `Hotkey execution failed: ${result.error}`,
            key
          });
        } else if (platform === "darwin") {
          if (key.includes("c") && key.includes("cmd")) {
            cmd = `osascript -e 'tell application "System Events" to keystroke "c" using command down'`;
          } else if (key.includes("v") && key.includes("cmd")) {
            cmd = `osascript -e 'tell application "System Events" to keystroke "v" using command down'`;
          } else if (key === "enter") {
            cmd = `osascript -e 'tell application "System Events" to key code 36'`;
          } else if (key === "space") {
            cmd = `osascript -e 'tell application "System Events" to key code 49'`;
          } else {
            cmd = `osascript -e 'tell application "System Events" to keystroke "${key}"'`;
          }
        } else {
          cmd = `xdotool key "${key}"`;
        }

        const result = await executeCommand(cmd);
        return res.json({
          success: result.success,
          message: result.success ? `Pressed hotkey "${key}" on PC.` : `Hotkey execution failed: ${result.error}`,
          key
        });
      }

      if (action === "accessibility") {
        const subAction = (req.body.accessibilityAction || req.body.actionType || "").toLowerCase().trim();

        if (subAction === "read_clipboard") {
          let cmd = platform === "win32" ? `powershell -c "Get-Clipboard"` : platform === "darwin" ? `pbpaste` : `xclip -o -selection clipboard`;
          const result = await executeCommand(cmd);
          return res.json({
            success: result.success,
            clipboardText: result.output?.trim() || "",
            message: result.success ? `Retrieved clipboard text.` : `Failed to read clipboard.`
          });
        }

        if (subAction === "set_clipboard") {
          const text = req.body.text || "";
          let cmd = platform === "win32" ? `powershell -c "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"` : platform === "darwin" ? `echo "${text}" | pbcopy` : `echo "${text}" | xclip -selection clipboard`;
          const result = await executeCommand(cmd);
          return res.json({
            success: result.success,
            message: result.success ? `Copied text to clipboard.` : `Failed to copy to clipboard.`
          });
        }

        if (subAction === "open_magnifier") {
          const cmd = platform === "win32" ? `start magnify.exe` : `open -a Zoom`;
          const result = await executeCommand(cmd);
          return res.json({ success: result.success, message: `Opened Screen Magnifier.` });
        }

        if (subAction === "open_osk") {
          const cmd = platform === "win32" ? `start osk.exe` : `open -a "Keyboard Viewer"`;
          const result = await executeCommand(cmd);
          return res.json({ success: result.success, message: `Opened On-Screen Keyboard.` });
        }

        if (subAction === "open_narrator") {
          const cmd = platform === "win32" ? `start narrator.exe` : `open -a VoiceOver`;
          const result = await executeCommand(cmd);
          return res.json({ success: result.success, message: `Opened Windows Narrator / Screen Reader.` });
        }

        if (subAction === "take_screenshot") {
          const screenshotName = `Sowa_Screenshot_${Date.now()}.png`;
          const savePath = path.join(os.homedir(), "Pictures", screenshotName);
          let cmd = "";

          if (platform === "win32") {
            cmd = `powershell -c "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b = New-Object Drawing.Bitmap([Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $g = [Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(0,0,0,0,$b.Size); $b.Save('${savePath.replace(/\\/g, '\\\\')}'); $g.Dispose(); $b.Dispose()"`;
          } else if (platform === "darwin") {
            cmd = `screencapture "${savePath}"`;
          } else {
            cmd = `scrot "${savePath}" || import -window root "${savePath}"`;
          }

          const result = await executeCommand(cmd);
          return res.json({
            success: result.success,
            message: result.success ? `Screenshot captured and saved to ${savePath}.` : `Screenshot capture failed: ${result.error}`,
            path: savePath
          });
        }

        return res.status(400).json({ success: false, error: `Unknown accessibility action: ${subAction}` });
      }

      if (action === "control_volume") {
        const mode = (value || setting || "up").toString().toLowerCase();
        let cmd = "";

        if (platform === "win32") {
          let charCode = 175; // volume up
          if (mode === "down") charCode = 174;
          else if (mode === "mute" || mode === "unmute" || mode === "toggle_mute") charCode = 173;

          let vbsCode = "";
          if (!isNaN(Number(mode))) {
            const pct = Math.max(0, Math.min(100, Number(mode)));
            vbsCode = `Set o = CreateObject("WScript.Shell")\r\nFor i = 1 To 50\r\no.SendKeys(chr(174))\r\nNext\r\nFor i = 1 To ${Math.round(pct/2)}\r\no.SendKeys(chr(175))\r\nNext\r\n`;
          } else {
            vbsCode = `Set o = CreateObject("WScript.Shell")\r\no.SendKeys(chr(${charCode}))\r\n`;
          }

          const result = await runFastVBS(vbsCode);
          return res.json({
            success: result.success,
            message: result.success ? `Adjusted volume: ${mode}` : `Volume adjustment failed: ${result.error}`,
            volume: mode
          });
        } else if (platform === "darwin") {
          if (mode === "up") {
            cmd = `osascript -e "set volume output volume ((output volume of (get volume settings)) + 10)"`;
          } else if (mode === "down") {
            cmd = `osascript -e "set volume output volume ((output volume of (get volume settings)) - 10)"`;
          } else if (mode === "mute") {
            cmd = `osascript -e "set volume output muted true"`;
          } else if (mode === "unmute") {
            cmd = `osascript -e "set volume output muted false"`;
          } else if (!isNaN(Number(mode))) {
            cmd = `osascript -e "set volume output volume ${Number(mode)}"`;
          }
        } else {
          // Linux
          if (mode === "up") {
            cmd = `amixer -D pulse sset Master 5%+ || pactl set-sink-volume @DEFAULT_SINK@ +5%`;
          } else if (mode === "down") {
            cmd = `amixer -D pulse sset Master 5%- || pactl set-sink-volume @DEFAULT_SINK@ -5%`;
          } else if (mode === "mute" || mode === "unmute" || mode === "toggle_mute") {
            cmd = `amixer -D pulse sset Master toggle || pactl set-sink-mute @DEFAULT_SINK@ toggle`;
          } else if (!isNaN(Number(mode))) {
            cmd = `amixer -D pulse sset Master ${Number(mode)}% || pactl set-sink-volume @DEFAULT_SINK@ ${Number(mode)}%`;
          }
        }

        const result = await executeCommand(cmd);
        return res.json({
          success: result.success,
          message: result.success ? `Adjusted PC volume (${mode}).` : `Volume adjustment failed: ${result.error}`,
          volumeAction: mode
        });
      }

      if (action === "system_power") {
        const powerAction = (req.body.powerAction || req.body.command || "").toLowerCase().trim();
        let cmd = "";

        if (powerAction === "shutdown") {
          cmd = platform === "win32" ? `shutdown /s /t 60` : platform === "darwin" ? `osascript -e 'tell app "System Events" to shut down'` : `shutdown -h +1`;
        } else if (powerAction === "restart") {
          cmd = platform === "win32" ? `shutdown /r /t 60` : platform === "darwin" ? `osascript -e 'tell app "System Events" to restart'` : `shutdown -r +1`;
        } else if (powerAction === "abort_shutdown" || powerAction === "cancel_shutdown") {
          cmd = platform === "win32" ? `shutdown /a` : `shutdown -c`;
        } else if (powerAction === "empty_recycle_bin") {
          cmd = platform === "win32" ? `powershell -c "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"` : `rm -rf ~/.Trash/*`;
        } else {
          return res.status(400).json({ success: false, error: `Unknown power action: ${powerAction}` });
        }

        const result = await executeCommand(cmd);
        return res.json({
          success: result.success,
          message: result.success ? `Executed system power command (${powerAction}).` : `Power command failed: ${result.error}`,
          powerAction
        });
      }

      if (action === "pc_setting") {
        const targetSetting = (setting || "").toLowerCase().trim();
        let cmd = "";

        if (targetSetting === "lock" || targetSetting === "lock_screen") {
          if (platform === "win32") {
            cmd = `rundll32.exe user32.dll,LockWorkStation`;
          } else if (platform === "darwin") {
            cmd = `pmset displaysleepnow`;
          } else {
            cmd = `xdg-screensaver lock || gnome-screensaver-command -l`;
          }
        } else if (targetSetting === "sleep") {
          if (platform === "win32") {
            cmd = `rundll32.exe powrprof.dll,SetSuspendState 0,1,0`;
          } else if (platform === "darwin") {
            cmd = `pmset sleepnow`;
          } else {
            cmd = `systemctl suspend`;
          }
        } else if (targetSetting === "settings" || targetSetting === "system_settings") {
          if (platform === "win32") {
            cmd = `start ms-settings:`;
          } else if (platform === "darwin") {
            cmd = `open "x-apple.systempreferences:"`;
          } else {
            cmd = `gnome-control-center || systemsettings5`;
          }
        } else if (targetSetting === "taskmgr" || targetSetting === "task_manager") {
          if (platform === "win32") {
            cmd = `start taskmgr`;
          } else if (platform === "darwin") {
            cmd = `open -a "Activity Monitor"`;
          } else {
            cmd = `gnome-system-monitor || ksysguard`;
          }
        } else if (targetSetting === "media_play" || targetSetting === "media_pause" || targetSetting === "media_play_pause") {
          if (platform === "win32") {
            cmd = `powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]179)"`;
          } else if (platform === "darwin") {
            cmd = `osascript -e 'tell application "Spotify" to playpause' || osascript -e 'tell application "Music" to playpause'`;
          }
        } else if (targetSetting === "media_next") {
          if (platform === "win32") {
            cmd = `powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]176)"`;
          } else if (platform === "darwin") {
            cmd = `osascript -e 'tell application "Spotify" to next track'`;
          }
        } else if (targetSetting === "media_prev") {
          if (platform === "win32") {
            cmd = `powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]177)"`;
          } else if (platform === "darwin") {
            cmd = `osascript -e 'tell application "Spotify" to previous track'`;
          }
        } else {
          return res.status(400).json({ success: false, error: `Unknown setting: ${targetSetting}` });
        }

        const result = await executeCommand(cmd);
        return res.json({
          success: result.success,
          message: result.success ? `Executed ${targetSetting} on PC.` : `Failed to execute ${targetSetting}: ${result.error}`,
          setting: targetSetting
        });
      }

      if (action === "execute_command") {
        if (!command || typeof command !== "string") {
          return res.status(400).json({ success: false, error: "Command string required" });
        }

        const result = await executeCommand(command);
        return res.json({
          success: result.success,
          output: result.output || result.error,
          command
        });
      }

      return res.status(400).json({ success: false, error: "Invalid action specified." });
    } catch (err: any) {
      console.error("PC Action Handler Error:", err);
      res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
  });

  app.get("/api/google/auth/url", (req, res) => {
    const redirectUri = req.query.redirectUri as string;
    
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/tasks',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/user.phonenumbers.read'
    ];

    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: redirectUri // Pass redirectUri securely
    });

    res.json({ url });
  });

  app.get("/api/google/auth/callback", async (req, res) => {
    const { code, state } = req.query;
    try {
      const redirectUri = state as string;
      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      
      const { tokens } = await client.getToken(code as string);
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch(err) {
       console.error("Auth error", err);
       res.status(500).send("Auth error: " + (err as Error).message);
    }
  });

  const getGoogleClient = (req: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error("No authorization header");
    
    try {
      const tokens = JSON.parse(authHeader.replace("Bearer ", ""));
      const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      client.setCredentials(tokens);
      return client;
    } catch (err) {
      console.error("Failed to parse tokens or create client", err);
      throw new Error("Invalid Google authorization");
    }
  };

  const handleGoogleError = (e: any, res: express.Response) => {
    console.error(e);
    let errorMsg = e.message;
    if (e.message?.includes("insufficient authentication scopes") || e.code === 403) {
      errorMsg = "Neural link has insufficient clearance. Please go to Settings -> General and click 'Refresh' in the Google Workspace section to update permissions.";
    }
    // Also handle specific People API disabled message
    if (e.message?.includes("People API has not been used")) {
      errorMsg = "The Google People API is disabled. Please visit the Google Cloud Console to enable it, then Refresh in Settings.";
    }
    res.json({ success: false, error: errorMsg });
  };

  app.post("/api/google/calendar/list", async (req, res) => {
    try {
      const client = getGoogleClient(req);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });
      res.json({ success: true, events: response.data.items });
    } catch (e: any) {
      handleGoogleError(e, res);
    }
  });

  app.post("/api/google/calendar/insert", async (req, res) => {
    try {
      const { summary, description, startDateTime, endDateTime } = req.body;
      const client = getGoogleClient(req);
      const calendar = google.calendar({ version: 'v3', auth: client });
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description,
          start: { dateTime: startDateTime },
          end: { dateTime: endDateTime }
        }
      });
      res.json({ success: true, event: response.data });
    } catch (e: any) {
      handleGoogleError(e, res);
    }
  });

  app.post("/api/google/tasks/list", async (req, res) => {
    try {
      const client = getGoogleClient(req);
      const tasks = google.tasks({ version: 'v1', auth: client });
      const response = await tasks.tasks.list({
        tasklist: '@default',
        showCompleted: false,
        maxResults: 10
      });
      res.json({ success: true, tasks: response.data.items });
    } catch (e: any) {
      handleGoogleError(e, res);
    }
  });

  app.post("/api/google/tasks/insert", async (req, res) => {
    try {
      const { title, notes } = req.body;
      const client = getGoogleClient(req);
      const tasks = google.tasks({ version: 'v1', auth: client });
      const response = await tasks.tasks.insert({
        tasklist: '@default',
        requestBody: { title, notes }
      });
      res.json({ success: true, task: response.data });
    } catch (e: any) {
      handleGoogleError(e, res);
    }
  });

  app.post("/api/google/drive/list", async (req, res) => {
    try {
      const { query } = req.body;
      const client = getGoogleClient(req);
      const drive = google.drive({ version: 'v3', auth: client });
      const response = await drive.files.list({
        q: query ? `name contains '${query}'` : 'trashed = false',
        pageSize: 10,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink)',
      });
      res.json({ success: true, files: response.data.files });
    } catch (e: any) {
      handleGoogleError(e, res);
    }
  });

  app.post("/api/google/drive/create", async (req, res) => {
    try {
      const { title, content } = req.body;
      const client = getGoogleClient(req);
      const drive = google.drive({ version: 'v3', auth: client });
      
      const response = await drive.files.create({
        requestBody: {
          name: title || 'Sowa AI Note',
          mimeType: 'application/vnd.google-apps.document'
        },
        media: {
          mimeType: 'text/plain',
          body: content || ''
        },
        fields: 'id, name, webViewLink'
      });
      res.json({ success: true, file: response.data });
    } catch (e: any) {
      handleGoogleError(e, res);
    }
  });

  app.post("/api/google/gmail", async (req, res) => {
    try {
      const { action, to, subject, body, threadId, messageId, query } = req.body;
      const client = getGoogleClient(req);
      const gmail = google.gmail({ version: 'v1', auth: client });

      if (action === 'list') {
        const response = await gmail.users.messages.list({ 
          userId: 'me', 
          maxResults: 10,
          q: query || ''
        });
        
        let messages: any[] = [];
        if (response.data.messages) {
          messages = await Promise.all(response.data.messages.map(async (msg) => {
            try {
              const details = await gmail.users.messages.get({ 
                userId: 'me', 
                id: msg.id!,
                format: 'minimal' 
              });
              
              const fullDetails = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'Date']
              });

              const headers = fullDetails.data.payload?.headers || [];
              const subjectHeader = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
              const fromHeader = headers.find(h => h.name === 'From')?.value || 'Unknown';
              const dateHeader = headers.find(h => h.name === 'Date')?.value || '';

              return {
                id: msg.id,
                threadId: msg.threadId,
                snippet: details.data.snippet,
                subject: subjectHeader,
                from: fromHeader,
                date: dateHeader
              };
            } catch (err) {
              console.error(`Error fetching message ${msg.id}:`, err);
              return { id: msg.id, threadId: msg.threadId, error: "Failed to fetch details" };
            }
          }));
        }
        res.json({ success: true, messages });
      } else if (action === 'read') {
        const response = await gmail.users.messages.get({ userId: 'me', id: messageId });
        const data = response.data;
        
        // Extract body
        let bodyContent = '';
        if (data.payload?.parts) {
          const textPart = data.payload.parts.find(p => p.mimeType === 'text/plain');
          if (textPart && textPart.body?.data) {
            bodyContent = Buffer.from(textPart.body.data, 'base64').toString();
          } else {
             // Try to find html part if no plain text
             const htmlPart = data.payload.parts.find(p => p.mimeType === 'text/html');
             if (htmlPart && htmlPart.body?.data) {
               bodyContent = Buffer.from(htmlPart.body.data, 'base64').toString().replace(/<[^>]*>?/gm, ''); // Simple strip html
             }
          }
        } else if (data.payload?.body?.data) {
          bodyContent = Buffer.from(data.payload.body.data, 'base64').toString();
        }

        const headers = data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value;
        const from = headers.find(h => h.name === 'From')?.value;
        const date = headers.find(h => h.name === 'Date')?.value;

        res.json({ 
          success: true, 
          message: {
            id: data.id,
            threadId: data.threadId,
            from,
            subject,
            date,
            snippet: data.snippet,
            body: bodyContent
          } 
        });
      } else if (action === 'send' || action === 'compose') {
        const str = [
          `To: ${to}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${subject}`,
          '',
          body
        ].join('\n');
        const encodedMail = Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        
        if (action === 'send') {
          const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMail, threadId }
          });
          res.json({ success: true, message: response.data });
        } else {
          const response = await gmail.users.drafts.create({
            userId: 'me',
            requestBody: { message: { raw: encodedMail, threadId } }
          });
          res.json({ success: true, draft: response.data });
        }
      } else {
        res.status(400).json({ success: false, error: "Invalid Gmail action" });
      }
    } catch (e: any) {
      handleGoogleError(e, res);
    }
  });

  app.post("/api/social_media", async (req, res) => {
    try {
      const { platform, action, content, schedule_time } = req.body;
      console.log(`[Social] ${action} to ${platform}: ${content} (Schedule: ${schedule_time || 'Immediate'})`);
      
      // Simulate API success as requested for high-efficiency persona
      // In a real production app, one would use platform-specific SDKs here
      res.json({ 
        success: true, 
        message: `${action === 'post' ? 'Posted' : 'Scheduled'} to ${platform} successfully!`,
        platform,
        content
      });
    } catch (e: any) {
      console.error(e);
      res.json({ success: false, error: e.message });
    }
  });

  app.post("/api/telegram/send", async (req, res) => {
    try {
      let { recipient, message, token } = req.body;
      if (!token) return res.status(400).json({ success: false, error: "Bot token required" });

      token = token.trim();
      
      // Handle case where user might have prefixed it with "bot" manually
      if (token.toLowerCase().startsWith('bot')) {
        console.warn(`[Telegram] Removing "bot" prefix from token: ${token.substring(0, 10)}...`);
        token = token.substring(3);
      }
      
      // Basic token validation (digits:chars)
      if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
        console.warn(`[Telegram] Potentially invalid token format: "${token.substring(0, 5)}..."`);
      }

      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient,
          text: message
        })
      });

      const data = await response.json();
      if (data.ok) {
        res.json({ success: true, message: "Message sent via Telegram bot!" });
      } else {
        console.error(`[Telegram] API error for token starting with ${token.substring(0, 5)}:`, data.description);
        let errorMsg = `Telegram API error: ${data.description}`;
        if (data.description === "Unauthorized") {
          errorMsg = "Unauthorized: The Bot Token is invalid. Please verify it at @BotFather (ensure no leading 'bot' prefix or extra spaces).";
        }
        res.json({ success: false, error: errorMsg });
      }
    } catch (e: any) {
      console.error("Telegram API Error:", e);
      res.json({ success: false, error: "Failed to connect to Telegram" });
    }
  });

  app.post("/api/google-chat/send", async (req, res) => {
    try {
      const { webhookUrl, message } = req.body;
      if (!webhookUrl) return res.status(400).json({ success: false, error: "Webhook URL required" });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ text: message }),
      });

      if (response.ok) {
        res.json({ success: true, message: "Transmitted to Google Chat successfully!" });
      } else {
        const errorText = await response.text();
        res.json({ success: false, error: `Google Chat API error: ${errorText}` });
      }
    } catch (e: any) {
      console.error("Google Chat Error:", e);
      res.json({ success: false, error: "Failed to connect to Google Chat neural node" });
    }
  });

  app.post("/api/google/contacts/search", async (req, res) => {
    try {
      const { query } = req.body;
      const client = getGoogleClient(req);
      const people = google.people({ version: 'v1', auth: client });
      
      console.log(`[Contacts] Searching for: "${query}"`);
      
      let results: any[] = [];
      try {
        const searchResponse = await people.people.searchContacts({
          query: query,
          readMask: 'names,phoneNumbers,emailAddresses',
        });
        results = searchResponse.data.results || [];
      } catch (e: any) {
        console.warn("[Contacts] Search method failed:", e.message);
      }

      if (results.length === 0) {
        const listResponse = await people.people.connections.list({
          resourceName: 'people/me',
          pageSize: 200,
          personFields: 'names,phoneNumbers,emailAddresses',
        });
        
        const connections = listResponse.data.connections || [];
        const filtered = connections.filter(p => {
          const name = p.names?.[0]?.displayName?.toLowerCase() || "";
          const phone = p.phoneNumbers?.[0]?.value || "";
          const email = p.emailAddresses?.[0]?.value || "";
          const q = (query || "").toLowerCase();
          return name.includes(q) || phone.includes(q) || email.includes(q);
        });

        results = filtered.map(p => ({ person: p }));
      }
      
      if (results.length === 0) {
        try {
          const otherResponse = await people.otherContacts.search({
            query: query,
             readMask: 'names,phoneNumbers,emailAddresses',
          });
          results = (otherResponse.data.results || []).map(r => ({ person: r.person }));
        } catch (e) {}
      }

      const contacts = results.map(r => {
        const p = r.person;
        return {
          name: p?.names?.[0]?.displayName || "Unknown",
          phone: p?.phoneNumbers?.[0]?.value || "No phone",
          email: p?.emailAddresses?.[0]?.value || "No email"
        };
      });

      res.json({ success: true, contacts: contacts.slice(0, 5) });
    } catch (e: any) {
      handleGoogleError(e, res);
    }
  });

  app.post("/api/youtube", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, error: "Query is required" });
      }

      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const html = await response.text();

      // Extract the first video ID from the HTML
      const match = html.match(/"videoId":"([^"]{11})"/);
      if (match && match[1]) {
        const videoId = match[1];
        res.json({ success: true, url: `https://www.youtube.com/watch?v=${videoId}` });
      } else {
        res.json({ success: false, error: "No video found" });
      }
    } catch (error) {
      console.error("YouTube search error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/youtube_search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, error: "Query is required" });
      }

      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const html = await response.text();

      // Attempt to extract title and videoId
      const videos = [];
      const regex = /"title":\{"runs":\[\{"text":"(.*?)"\}\]\}.*?"videoId":"([^"]{11})"/g;
      
      let match;
      while ((match = regex.exec(html)) !== null && videos.length < 5) {
        videos.push({
          title: match[1],
          url: `https://www.youtube.com/watch?v=${match[2]}`
        });
      }

      if (videos.length > 0) {
        res.json({ success: true, videos });
      } else {
        res.json({ success: false, error: "No videos found" });
      }
    } catch (error) {
      console.error("YouTube list search error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.post("/api/browse", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: "URL is required" });

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const html = await response.text();
      
      // Basic text extraction: remove scripts, styles, and tags
      const text = html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 10000); // Limit context size

      res.json({ success: true, url, content: text });
    } catch (error) {
      console.error("Browse error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch website content." });
    }
  });

  // Server Config Check (Gemini & Grok keys)
  app.get("/api/config", (req, res) => {
    res.json({
      success: true,
      hasGeminiKey: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
      hasGrokKey: !!((process.env.GROK_API_KEY && process.env.GROK_API_KEY.trim()) || (process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim())),
    });
  });

  // Grok (xAI) API Proxy Endpoint
  app.post("/api/grok/chat", async (req, res) => {
    try {
      const { messages, apiKey: clientApiKey, model = "grok-2-1212", temperature = 0.7, max_tokens = 2048 } = req.body;
      const apiKey = (clientApiKey || process.env.GROK_API_KEY || process.env.XAI_API_KEY || "").trim();

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: "Grok API Key is missing. Please enter your xAI API key in Settings or configure GROK_API_KEY in .env."
        });
      }

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ success: false, error: "Messages array is required." });
      }

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = typeof data.error === 'string' ? data.error : (data.error?.message || data.message || `xAI API returned status ${response.status}`);
        return res.status(response.status).json({
          success: false,
          error: errorMsg
        });
      }

      const reply = data.choices?.[0]?.message?.content || "";
      res.json({ success: true, reply, usage: data.usage, model: data.model });
    } catch (error: any) {
      console.error("Grok Proxy Error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to reach xAI Grok API." });
    }
  });

  // Static client assets or Vite development middleware
  const possibleDistPaths = [
    path.join(__dirname, '../dist'),
    path.join(__dirname, 'dist'),
    path.join(process.cwd(), 'dist'),
    path.join((process as any).resourcesPath || '', 'app.asar/dist'),
    path.join((process as any).resourcesPath || '', 'dist')
  ];
  const distPath = possibleDistPaths.find(p => p && fs.existsSync(p));

  if (process.env.NODE_ENV !== "production" && !distPath) {
    try {
      const { createServer } = await import("vite");
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[Server] Running in Vite development middleware mode");
    } catch (e) {
      console.warn("[Server] Vite dev server unavailable, using static fallback.");
      if (distPath) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
      }
    }
  } else if (distPath) {
    console.log(`[Server] Serving client assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.warn("[Server] Warning: No dist/ folder found for client assets.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
