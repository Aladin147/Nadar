@echo off
echo ========================================
echo Nadar Mobile Connectivity Troubleshooter
echo ========================================
echo.

echo [1/6] Checking network configuration...
ipconfig | findstr "IPv4 Address"
echo.

echo [2/6] Testing server accessibility on localhost...
curl -s http://localhost:4000/health
if %errorlevel% equ 0 (
    echo ✅ Server is running on localhost
) else (
    echo ❌ Server is not accessible on localhost
    echo Please start the server with: cd server && npm run dev
)
echo.

echo [3/6] Testing server accessibility on LAN IP...
curl -s http://192.168.100.24:4000/health
if %errorlevel% equ 0 (
    echo ✅ Server is accessible on LAN IP
) else (
    echo ❌ Server is not accessible on LAN IP
    echo This might be a firewall issue
)
echo.

echo [4/6] Checking Windows Firewall for port 4000...
netsh advfirewall firewall show rule name="Node.js Server Port 4000" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Firewall rule exists for port 4000
) else (
    echo ⚠️  No firewall rule found for port 4000
    echo Creating firewall rule...
    netsh advfirewall firewall add rule name="Node.js Server Port 4000" dir=in action=allow protocol=TCP localport=4000
    if %errorlevel% equ 0 (
        echo ✅ Firewall rule created successfully
    ) else (
        echo ❌ Failed to create firewall rule (run as administrator)
    )
)
echo.

echo [5/6] Testing Metro bundler port 8081...
netstat -an | findstr ":8081"
if %errorlevel% equ 0 (
    echo ✅ Metro bundler is running on port 8081
) else (
    echo ❌ Metro bundler is not running
    echo Please start the app with: cd app && npm run web
)
echo.

echo [6/6] Network summary:
echo.
echo Your server should be accessible at:
echo - Web: http://localhost:4000
echo - Mobile (same network): http://192.168.100.24:4000
echo.
echo Your app should be accessible at:
echo - Web: http://localhost:8081
echo - Mobile (tunnel): Use QR code from Expo
echo - Mobile (LAN): exp://192.168.100.24:8081
echo.

echo ========================================
echo Troubleshooting Steps:
echo ========================================
echo.
echo If mobile still can't connect:
echo 1. Disable VPN temporarily (NordVPN detected)
echo 2. Ensure both devices are on same WiFi network
echo 3. Use tunnel mode: cd app && npm run mobile
echo 4. In app Settings, set API Base to: http://192.168.100.24:4000
echo 5. Use the Test Connection button in Settings
echo.
echo If app won't load without tunnel:
echo 1. Check that both devices are on same WiFi
echo 2. Temporarily disable Windows Firewall
echo 3. Try: cd app && expo start --lan
echo.
pause
