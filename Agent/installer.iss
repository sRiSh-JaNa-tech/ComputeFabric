[Setup]
AppName=ComputeAgent
AppVersion=1.1
DefaultDirName={autopf}\ComputeAgent
DefaultGroupName=ComputeAgent
OutputDir=output
OutputBaseFilename=ComputeAgentSetup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

[Files]
; Setup and Updater Scripts
Source: "src\setup\auto_updater.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "src\setup\run_s.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "src\setup\setup.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "src\setup\pyinstaller.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "src\setup\installDev.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "src\setup\requirements.txt"; DestDir: "{app}"; Flags: ignoreversion

; Core Agent Files
Source: "src\agent.py"; DestDir: "{app}"; Flags: ignoreversion
Source: "src\cust_func\*"; DestDir: "{app}\cust_func"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "src\schema\*"; DestDir: "{app}\schema"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
Filename: "{app}\setup.bat"; Description: "Performing initial setup (Python, Git, Venv, Tasks)"; Flags: postinstall waituntilterminated runascurrentuser