#!/bin/sh
# run before every push: makes phones and browsers load the new files, and tells the app a new build is out
V=$(date +%s)
cd "$(dirname "$0")/.."
sed -i -E "s/\?v=[0-9]+/?v=$V/g" public/index.html
printf '{"v":%s,"apk":"https://github.com/alqadi1423-sketch/gamesx/releases/download/app-latest/alaabna.apk"}\n' "$V" > public/version.json
echo "$V"
