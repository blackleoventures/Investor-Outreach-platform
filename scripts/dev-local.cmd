@echo off
REM Detect the first non-loopback IPv4 address
for /f "tokens=14" %%a in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
  set ip=%%a
  goto :found
)

:found
if "%ip%"=="" set ip=0.0.0.0

echo Starting Next.js on %ip%:3000 (also on localhost:3000)
set PORT=3000
set HOSTNAME=%ip%

REM Run Next with explicit host and port
npx next dev --turbo --port %PORT% --hostname %HOSTNAME%