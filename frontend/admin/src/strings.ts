export const strings = {
  he: {
    appTitle: "מערכת ניהול חנות",
    loginTitle: "התחברות מנהל מערכת",
    loginSubtitle: "כניסה מוגנת באמצעות אימייל וסיסמה",
    loginButton: "התחברות",
    logoutButton: "התנתקות",
    welcome: "שלום, {name}",
    emailLabel: "אימייל",
    emailPlaceholder: "שם משתמש / אימייל",
    passwordLabel: "סיסמה",
    passwordPlaceholder: "סיסמה",
    invalidCredentials: "אימייל או סיסמה שגויים.",
    uploadButtonText: "העלאת קובץ נתונים",
    modalTitle: "יצירה וטעינת קובץ מוצרים",
    modalSubtitle: "בחר להעלות קובץ או ליצור/לערוך קובץ מוצרים CSV באופן אינטראקטיבי",
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
    unauthorizedEmail: "כתובת הדוא\"ל {email} אינה מורשת לגשת למערכת הניהול. אנא פנה למנהל המערכת.",
    footerText: "מערכת ניהול - retail-online-shop",
    tabUpload: "העלאת קבצים",
    tabOrders: "ניהול הזמנות נכנסות",
    searchPlaceholder: "חיפוש לפי טלפון...",
    statusFilterLabel: "סטטוס:",
    statusAll: "הכל",
    statusOpen: "פתוח",
    statusCompleted: "הושלם",
    statusCancelled: "בוטל",
    showPastOrders: "הצג הזמנות עבר (עד 30 יום)",
    thOrderId: "מזהה הזמנה",
    thCustomer: "לקוח / טלפון",
    thDate: "תאריך יצירה",
    thPreAuth: "אישור מראש",
    thFinalPrice: "מחיר סופי",
    thStatus: "סטטוס",
    thActions: "פעולות",
    btnDetails: "פרטים",
    btnSave: "שמור",
    btnSaving: "שומר...",
    detailsTitle: "פרטי הזמנה {id}",
    detailsAddress: "כתובת משלוח",
    detailsItems: "פריטים בהזמנה",
    detailsNotes: "הערות להזמנה",
    itemDesc: "תיאור מוצר",
    itemQty: "כמות / משקל",
    itemUnitPrice: "מחיר ליחידה",
    itemTotal: "סה\"כ",
    noOrdersFound: "לא נמצאו הזמנות התואמות את הסינון.",
    saveSuccess: "ההזמנה עודכנה בהצלחה!",
    invalidPrice: "מחיר לא תקין",
    shippingTo: "{name}, {city}, {street} {number}, דירה {apartment} ({type})",

    // CSV Creator Strings
    modeUploadExisting: "העלאת קובץ קיים",
    modeCreateCsv: "עריכת / יצירת קובץ מוצרים",
    csvFileNameLabel: "שם הקובץ לשמירה:",
    csvFileNamePlaceholder: "sample-products.csv",
    openExistingCsvBtn: "פתיחת קובץ CSV קיים...",
    loadSampleDataBtn: "טעינת מוצרים לדוגמה",
    addProductRowBtn: "הוסף מוצר חדש",
    downloadCsvBtn: "שמירה לקובץ CSV",
    saveAndUploadBtn: "שמור והעלה לשרת",
    saveCsvBtn: "שמירה לקובץ CSV",
    uploadServiceBtn: "העלאת קובץ לשרת",
    colProductId: "מזהה מוצר (ID)",
    colDescription: "תיאור מוצר",
    colIsWeightable: "נשקל?",
    colCategoryId: "מזהה קטגוריה (Hash)",
    colCategoryName: "שם קטגוריה",
    colSubCategoryId: "מזהה תת-קטגוריה",
    colSubCategoryName: "שם תת-קטגוריה",
    colImageUrl: "כתובת תמונה (URL)",
    colPrice: "מחיר",
    colActions: "פעולות",
    noProductsInTable: "אין מוצרים בטבלה. הוסף מוצר חדש או טען מוצרים לדוגמה.",
    csvLoadSuccess: "הקובץ נטען בהצלחה! נטענו {count} מוצרים.",
    csvLoadError: "שגיאה בטעינת קובץ ה-CSV.",
    emptyRowsError: "אנא הוסף לפחות מוצר אחד עם תיאור ומחיר לפני שמירה.",
    duplicateRowTooltip: "שכפל שורה",
    deleteRowTooltip: "מחק שורה",
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
