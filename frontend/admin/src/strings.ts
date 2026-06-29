export const strings = {
  he: {
    appTitle: "מערכת ניהול חנות",
    loginTitle: "התחברות מנהל מערכת",
    loginSubtitle: "כניסה מוגנת באמצעות חשבון Google מורשה",
    loginButton: "התחברות עם Google",
    logoutButton: "התנתקות",
    welcome: "שלום, {name}",
    uploadButtonText: "העלאת קובץ נתונים",
    modalTitle: "טעינת קובץ CSV או JSON",
    modalSubtitle: "בחר או גרור קובץ CSV/JSON כדי להעלות ל-Firebase Storage",
    dragAreaText: "גרור ושחרר קובץ כאן, או לחץ לבחירת קובץ מהמחשב",
    selectedFile: "קובץ שנבחר:",
    uploadingText: "מעלה קובץ... {progress}%",
    uploadSuccessText: "הקובץ {filename} הועלה בהצלחה!",
    uploadErrorText: "שגיאה במהלך העלאת הקובץ לשרת.",
    closeButton: "סגור",
    submitButton: "בצע העלאה",
    noFileSelected: "אנא בחר קובץ לפני לחיצה על העלאה.",
    invalidFileType: "סוג קובץ שגוי. ניתן להעלות קובצי CSV או JSON בלבד.",
    authError: "חיבור נכשל. ודא כי נעשה שימוש בחשבון מורשה.",
    footerText: "מערכת ניהול - retail-online-shop"
  }
};

export type Locale = 'he';
export type StringKey = keyof typeof strings['he'];

let currentLocale: Locale = 'he';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function t(key: StringKey, params?: Record<string, string | number>): string {
  let text = strings[currentLocale][key] || '';
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}
