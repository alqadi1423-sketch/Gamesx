#!/bin/sh
# run before every push: makes phones and browsers load the new files, and tells the app a new build is out
# the app link opens the release page, whose notes say to uninstall first when the signing key changed
V=$(date +%s)
cd "$(dirname "$0")/.."
sed -i -E "s/\?v=[0-9]+/?v=$V/g" public/index.html
printf '{"v":%s,"apk":"https://github.com/alqadi1423-sketch/gamesx/releases/tag/app-latest"}\n' "$V" > public/version.json
echo "$V"
