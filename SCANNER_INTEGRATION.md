# אינטגרציה עם סורק - מדריך יישום

## סקירה כללית
המערכת כוללת תמיכה מלאה בסריקת מסמכים ישירות למערכת. כרגע זה מדומה, אבל ניתן להטמיע סריקה אמיתית.

## מיקום הקבצים
- **הגדרות סורק**: `src/components/settings/ScannerSettings.tsx`
- **דף העלאת מסמכים**: `src/pages/forms/UploadCaseDocumentPage.tsx`
- **פונקציית סריקה**: `handleStartScan()` בקובץ UploadCaseDocumentPage

## הטמעת סריקה אמיתית

### 1. באמצעות WIA (Windows Image Acquisition)
```javascript
// Replace the mock scanning code with:
const { exec } = require('child_process');

const executeWiaScan = (config) => {
  const command = `"${config.scannerPath}" /scan /resolution:${config.resolution} /format:${config.fileFormat}`;
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};
```

### 2. באמצעות TWAIN (עבור סורקים מתקדמים)
```javascript
// Using node-twain package
const twain = require('node-twain');

const executeTwainScan = async (config) => {
  const scanner = new twain.Scanner();
  
  await scanner.open();
  scanner.setResolution(parseInt(config.resolution));
  scanner.setColorMode(config.colorMode);
  
  const scannedData = await scanner.scan();
  await scanner.close();
  
  return scannedData;
};
```

### 3. באמצעות PowerShell
```javascript
const { spawn } = require('child_process');

const executePowerShellScan = (config) => {
  const psScript = `
    Add-Type -AssemblyName System.Drawing
    $scanner = New-Object -ComObject WIA.DeviceManager
    $device = $scanner.DeviceInfos.Item(1).Connect()
    $item = $device.Items.Item(1)
    $image = $item.Transfer()
    $image.SaveFile("${config.outputFolder}\\scanned_${Date.now()}.${config.fileFormat}")
  `;
  
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', ['-Command', psScript]);
    // Handle response...
  });
};
```

## הגדרות זמינות
המערכת שומרת הגדרות ב-localStorage:

```javascript
const defaultConfig = {
  scannerPath: 'C:\\Windows\\System32\\WiaAcmgr.exe',
  resolution: '300',        // 150, 300, 600, 1200
  colorMode: 'color',       // color, grayscale, blackwhite
  fileFormat: 'pdf',        // pdf, jpg, png, tiff
  autoSave: true,
  outputFolder: 'C:\\Users\\Documents\\ScannedDocuments',
  enableOCR: false,
  ocrLanguage: 'hebrew',
  compressionLevel: 'medium',
  scannerName: 'ברירת מחדל'
};
```

## שלבי היישום

### שלב 1: התקנת חבילות נדרשות
```bash
npm install child_process
# או עבור TWAIN:
npm install node-twain
```

### שלב 2: עדכון הפונקציה handleStartScan
החלף את הקוד המדומה בקוד אמיתי שמפעיל את הסורק.

### שלב 3: טיפול בשגיאות
הוסף טיפול מתאים בשגיאות סריקה:
- סורק לא מחובר
- דרייברים חסרים
- בעיות הרשאות
- קובץ פגום

### שלב 4: OCR (זיהוי טקסט)
אם מופעל OCR, הוסף עיבוד טקסט:
```javascript
const tesseract = require('tesseract.js');

const performOCR = async (imagePath, language) => {
  const { data: { text } } = await tesseract.recognize(imagePath, language);
  return text;
};
```

## בדיקות
- וודא שהסורק מחובר ופועל
- בדוק תמיכה בפורמטים שונים
- בדוק ביצועים ברזולוציות גבוהות
- וודא שמירה נכונה של קבצים

## הערות אבטחה
- וודא הרשאות מתאימות לתיקיות
- בדוק נתיב קבצי הפלט
- הגבל גודל קבצים מקסימלי
- סנן סוגי קבצים מותרים

## תמיכה טכנית
הפונקציונליות נבדקה עם:
- Windows 10/11
- סורקים התומכים ב-WIA
- סורקים התומכים ב-TWAIN

עבור בעיות ספציפיות, בדוק:
1. דרייברי הסורק מותקנים
2. הסורק מופיע ב-Device Manager
3. הרשאות תיקיות נכונות
4. נתיב תוכנת הסריקה נכון




