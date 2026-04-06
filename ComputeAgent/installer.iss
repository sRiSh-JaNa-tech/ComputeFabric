[Setup]
AppName=ComputeAgent
AppVersion=1.1

; Install directly in C:\ComputeAgent
DefaultDirName={sd}\ComputeAgent

DefaultGroupName=ComputeAgent
OutputDir=output
OutputBaseFilename=ComputeAgentSetup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

; IMPORTANT: force this directory (ignore previous installs)
UsePreviousAppDir=no

; Optional: hide directory selection (force install path)
DisableDirPage=yes


[Files]
; Setup and Updater Scripts
Source: "Scripts\gitinstaller.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\pyinstaller.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\SetGit.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\CheckUpdates.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\sch.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\Sins.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\RS.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Scripts\setup.bat"; DestDir: "{app}"; Flags: ignoreversion

[Run]
Filename: "{app}\setup.bat"; Description: "Performing initial setup (Python, Git, Venv, Tasks)"; Flags: postinstall waituntilterminated runascurrentuser