@echo off
cls
echo ===============================================================================
echo.
echo  WARNING: LAUNCHING A CHROME BROWSER WITH WEB SECURITY DISABLED
echo.
echo ===============================================================================
echo.
echo  This is for development purposes ONLY. It allows this application to
echo  run correctly from your local files.
echo.
echo  [!] DO NOT use this browser window for any other activity or web browsing.
echo.
echo  Please close the browser and this window when you are finished.
echo.
echo ===============================================================================
echo.
echo Searching for Google Chrome...

REM --- Try to find Chrome in the most common installation locations ---
set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

REM --- Check if Chrome was found ---
if not exist "%CHROME_PATH%" (
    echo.
    echo ERROR: Google Chrome could not be found.
    echo This script cannot continue. Please use a local web server as
    echo described in the README.md file.
    echo.
    pause
    exit /b
)

echo Found Chrome: %CHROME_PATH%
echo.

REM --- Set a relative path to the index.html file ---
set "INDEX_PATH=%~dp0index.html"
set "USER_DATA_DIR=%TEMP%\chrome-dev-session-%RANDOM%"

echo Launching application...
echo.

REM --- Launch a new, isolated Chrome instance with security disabled ---
start "Q&A Generator (Dev Mode)" "%CHROME_PATH%" --disable-web-security --user-data-dir="%USER_DATA_DIR%" "file:///%INDEX_PATH%"

exit 