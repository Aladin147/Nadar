@echo off
echo 🚀 Setting up Fly.io for Nadar...
echo.

REM Check if fly CLI is installed
fly version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Fly.io CLI already installed
    fly version
) else (
    echo 📦 Installing Fly.io CLI...
    powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
    echo ✅ Fly.io CLI installed
)

echo.
echo 🔐 Setting up authentication...
echo Please run ONE of the following commands:
echo.
echo   Option 1 - Login via browser:
echo   fly auth login
echo.
echo   Option 2 - Use your token directly:
echo   fly auth token FlyV1 fm2_lJPECAAAAAAACbadxBByu1BWuBkJm+nk8+lg871owrVodHRwczovL2FwaS5mbHkuaW8vdjGUAJLOABKy5x8Lk7lodHRwczovL2FwaS5mbHkuaW8vYWFhL3YxxDzphWIJYTSs2k60kU39ZWrU99o/J6Ms/fIUNGzHeX//APdWhOFtHdx/jNalCF2MzeeS7mcb9H976yVZimXEToSdCjOnusGNtcQV0x8ChPCVVewFLmPhwbV0nnnkyDyDUvZKUY0rn+bMfTuztLIsMWp4bdvyMp1+chEvuy5azu3qkpvwCNHo5lg1Uy93rcQgM19q4QF9fUPJBM6fTssQewF7SoUW9IHeEMUKBFXZTzg=
echo.
echo 🎯 After authentication, run:
echo   npm run deploy:fly:secure
echo.
pause
