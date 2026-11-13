# تشغيل ألعابنا كموقع خاص على Cloudflare

## الفكرة
1. Cloudflare يستضيف الموقع مجانًا ويربطه بهذا المستودع، وكل تعديل يُرفع للمستودع ينشر لحاله
2. كل غرفة لها رمز خاص من 6 خانات، وما يدخلها إلا اللي معه الرمز
3. ما فيه تسجيل دخول

## الملفات المهمة
1. `public/` ملفات الموقع والألعاب
2. `worker/index.js` خادم الغرف: يمرر حالة اللعب بين اللاعبين في نفس الغرفة
3. `wrangler.jsonc` إعدادات النشر على Cloudflare

## خطوات الربط
1. إنشاء حساب في Cloudflare
2. من لوحة التحكم: إنشاء Worker عن طريق ربط مستودع GitHub
3. اختيار هذا المستودع والنشر
4. فتح الرابط اللي يعطيك إياه، وإنشاء غرفة

# مفتاح توقيع تطبيق أندرويد

كل نسخة من التطبيق لازم تنوقّع بنفس المفتاح عشان تنثبّت فوق اللي قبلها. المفتاح القديم كان داخل المستودع، والمستودع عام، يعني أي أحد يقدر يوقّع فيه تطبيق مزيّف ينثبّت فوق تطبيقنا. عشان كذا انشال، وصار المفتاح سرّ في GitHub بس. بدون الأسرار بناء التطبيق يوقف برسالة واضحة (البناء العادي debug ما يحتاجها).

## 1. سوّ مفتاح جديد (مرة وحدة، على جهازك)
```
keytool -genkeypair -v -keystore alaabna-release.jks -alias alaabna -keyalg RSA -keysize 4096 -validity 10000
```
1. يسألك عن كلمة سر: اختر وحدة قوية. keytool يستخدم نفسها للملف وللمفتاح
2. احفظ الملف وكلمة السر برّا المستودع (مثلًا في مدير كلمات السر). لو ضاع المفتاح ما تقدر تحدّث التطبيق فوق النسخ المثبّتة أبد
3. لا ترفعه للمستودع: ملفات `*.jks` و`*.keystore` متجاهلة في `.gitignore`

## 2. حوّل الملف لنص base64
1. لينكس: `base64 -w0 alaabna-release.jks > key.txt`
2. ماك: `base64 -i alaabna-release.jks -o key.txt`
3. ويندوز (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("alaabna-release.jks")) | Out-File key.txt -Encoding ascii`

## 3. أضف 4 أسرار في GitHub
من صفحة المستودع: Settings ← Secrets and variables ← Actions ← New repository secret
1. `ANDROID_KEYSTORE_B64`: كل محتوى `key.txt`
2. `ANDROID_KEYSTORE_PASSWORD`: كلمة السر
3. `ANDROID_KEY_ALIAS`: `alaabna` (الاسم اللي بعد `-alias`)
4. `ANDROID_KEY_PASSWORD`: كلمة السر نفسها

بعدها احذف `key.txt`، وشغّل البناء من جديد: Actions ← Android app ← Run workflow.

## 4. كل جوال عليه التطبيق: احذفه وثبّته من جديد (مرة وحدة بس)
التوقيع تغيّر، فأندرويد يرفض يثبّت النسخة الجديدة فوق القديمة. احذف التطبيق القديم، وبعدين نزّل `alaabna.apk` من إصدار `app-latest` وثبّته. الحذف يمسح المحفوظ في التطبيق (الاسم وآخر غرفة). بعدها التحديثات ترجع تنثبّت فوق بعض عادي.

## 5. (اختياري) امسح المفتاح القديم من تاريخ المستودع
المفتاح القديم انكشف خلاص، والحل الحقيقي هو المفتاح الجديد. لكن لو تبي تشيله من التاريخ، سوّها في نسخة جديدة من المستودع:
```
pip install git-filter-repo
git clone https://github.com/alqadi1423-sketch/Gamesx.git && cd Gamesx
git filter-repo --invert-paths --path app/android/app/alaabna.keystore
git remote add origin https://github.com/alqadi1423-sketch/Gamesx.git
git push --force --all
git push --force --tags
```
`filter-repo` يشيل ربط `origin`، عشان كذا نرجّعه قبل الدفع. أي نسخة أو fork قديم بيظل فيه المفتاح، فاللي عنده نسخة من المستودع يسحبه من جديد.

## بناء نسخة release على جهازك (اختياري)
عرّف هذي المتغيرات قبل `./gradlew assembleRelease` داخل `app/android`:
`ANDROID_KEYSTORE_FILE` (مسار ملف `.jks`) و`ANDROID_KEYSTORE_PASSWORD` و`ANDROID_KEY_ALIAS` و`ANDROID_KEY_PASSWORD`.
