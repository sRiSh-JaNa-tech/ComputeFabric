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
Source: "Scripts\gitinstaller.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\pyinstaller.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\SetGit.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\CheckUpdates.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\sch.bat"; DestDir: "{app}"; Flags: ignoreversion

[Run]
Filename: "{app}\setup.bat"; Description: "Performing initial setup (Python, Git, Venv, Tasks)"; Flags: postinstall waituntilterminated runascurrentuser