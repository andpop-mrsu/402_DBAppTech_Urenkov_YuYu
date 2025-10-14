@echo off
echo Checking PHP files for basic PSR-12 compliance...
for /r src %%f in (*.php) do (
    echo Checking %%~nxf
    type "%%f" | findstr /r "\s$" >nul && echo WARNING: Trailing whitespace in %%f
)
echo Basic check completed.