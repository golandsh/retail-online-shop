import React, { useState, useEffect } from 'react';
import './LegalModal.scss';

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card legal-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header legal-modal-header">
          <div className="legal-tabs">
            <button
              type="button"
              className={`legal-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
              onClick={() => setActiveTab('terms')}
            >
              📜 תנאי שימוש
            </button>
            <button
              type="button"
              className={`legal-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              🔒 מדיניות פרטיות
            </button>
          </div>
          <button type="button" className="close-x" onClick={onClose} aria-label="סגור">
            ×
          </button>
        </div>

        <div className="modal-body legal-modal-body">
          {activeTab === 'terms' ? (
            <div className="legal-document-content">
              <h2>תנאי שימוש והרכישה</h2>
              <div className="last-updated-tag">עודכן לאחרונה: אוגוסט 2026</div>

              <section>
                <h3>1. כללי</h3>
                <p>
                  ברוכים הבאים לאתר הקניות שלנו. השימוש באתר והרכישות דרכו כפופים לתנאים המפורטים להלן. עצם השימוש באתר וביצוע הזמנה מהווים הסכמה מלאה מצידך לתנאים אלו.
                </p>
              </section>

              <section>
                <h3>2. ביצוע הזמנה ואישור עסקה</h3>
                <p>
                  הרכישה באתר מותרת למשתמשים מגיל 18 ומעלה בעלי כרטיס אשראי תקף. העסקה תושלם רק לאחר קבלת אישור מתאים מחברת האשראי ואימות זמינות המלאי.
                </p>
              </section>

              <section className="legal-highlight-box">
                <h4>3. מדיניות ביטולים ומוצרים שאינם ניתנים להחזרה</h4>
                <p>
                  בהתאם לחוק הגנת הצרכן, התשמ"א-1981 ותקנות הגנת הצרכן (ביטול עסקה), התשע"א-2010:
                </p>
                <ul>
                  <li>
                    <strong>מוצרי מזון פסידים, טריים ומוצרים בקירור/הקפאה:</strong> אינם ניתנים להחזרה או לביטול לאחר יציאת המשלוח, מטעמי בריאות ובטיחות מזון.
                  </li>
                  <li>
                    <strong>מוצרים שפג תוקפם במהירות:</strong> אינם ניתנים להחזרה או להחלפה.
                  </li>
                  <li>
                    <strong>מוצרים שנפתחו או שנפגם אריזתם המקורית:</strong> לא ניתן לבטל את רכישתם לאחר הפתיחה.
                  </li>
                  <li>
                    <strong>מוצרים שיוצרו או הותאמו במיוחד עבור הלקוח:</strong> אינם ניתנים לביטול לאחר תחילת הייצור/הכנה.
                  </li>
                </ul>
                <p>
                  ביטול מוצרים שאינם פסידים ניתן לבצע תוך 14 ימים מקבלת המוצר, כשהם באריזתם המקורית ולא נעשה בהם כל שימוש.
                </p>
              </section>

              <section>
                <h3>4. אספקה ומשלוחים</h3>
                <p>
                  זמני האספקה ומחיר המשלוח מפורטים בעת ביצוע ההזמנה. החברה אינה אחראית לעיכובים הנובעים מאירועים שאינם בשליטתה (כוח עליון, שביתות, מצבי חירום וכיו"ב).
                </p>
              </section>

              <section>
                <h3>5. הגבלת אחריות</h3>
                <p>
                  התמונות באתר מיועדות להמחשה בלבד. החברה עושה כמיטב יכולתה להבטיח את דיוק המידע והמחירים, אך שגיאות קולמוס בתום לב אינן מחייבות את החברה.
                </p>
              </section>

              <section>
                <h3>6. דין וסמכות שיפוט</h3>
                <p>
                  על תנאים אלו יחולו דיני מדינת ישראל בלבד, וסמכות השיפוט הבלעדית בכל עניין הנובע מהם מוקנית לבתי המשפט המוסמכים בישראל.
                </p>
              </section>
            </div>
          ) : (
            <div className="legal-document-content">
              <h2>מדיניות פרטיות</h2>
              <div className="last-updated-tag">עודכן לאחרונה: אוגוסט 2026</div>

              <section>
                <h3>1. כללי</h3>
                <p>
                  אנו מייחסים חשיבות רבה לפרטיות המשתמשים באתר. מסמך זה מפרט מהו המידע הנאסף על ידינו, כיצד אנו משתמשים בו וכיצד אנו מגנים עליו.
                </p>
              </section>

              <section>
                <h3>2. איסוף המידע</h3>
                <p>בעת השימוש באתר ובביצוע הזמנות, אנו עשויים לאסוף את נתוני המידע הבאים:</p>
                <ul>
                  <li>פרטי התקשרות: שם מלא, כתובת דוא"ל, מספר טלפון וכתובת למשלוח.</li>
                  <li>פרטי הזמנה ותשלום: היסטוריית רכישות, נתוני עגלה ופרטי תשלום (המעובדים באופן מאובטח באמצעות ספקי סליקה מורשים).</li>
                  <li>נתוני גלישה טכניים: כתובת IP, סוג דפדפן, מערכת הפעלה ודפי אתר שנסקרו.</li>
                </ul>
              </section>

              <section>
                <h3>3. השימוש במידע</h3>
                <p>המידע הנאסף משמש אותנו למטרות הבאות:</p>
                <ul>
                  <li>עיבוד וביצוע הזמנות ומשלוחים.</li>
                  <li>מתן שירות לקוחות ותמיכה טכנית.</li>
                  <li>שיפור חוויית המשתמש והתאמת השירותים באתר.</li>
                  <li>עמידה בדרישות החוק והרגולציה.</li>
                </ul>
              </section>

              <section>
                <h3>4. העברת מידע לצד שלישי</h3>
                <p>
                  אנו לא נמכור ולא נשכיר את המידע האישי שלך לצדדים שלישיים. מידע יועבר לצדדים שלישיים אך ורק לצורך תפעול השירות (כגון חברות שליחויות וספקי סליקה) או אם נדרש לכך על פי דין.
                </p>
              </section>

              <section>
                <h3>5. אבטחת מידע</h3>
                <p>
                  אנו נוקטים באמצעי אבטחה מקובלים ובטכנולוגיות הצפנה מתקדמות כדי להגן על המידע האישי מפני גישה, שימוש או גילוי בלתי מורשים.
                </p>
              </section>

              <section>
                <h3>6. עוגיות (Cookies)</h3>
                <p>
                  האתר משתמש בקובצי Cookie לשם תפעולו התקין, לשמירת העגלה והגדרות המשתמש, וכן לצורכי אנליטיקה. באפשרותך לנטרל קובצי Cookie דרך הגדרות הדפדפן שלך.
                </p>
              </section>

              <section>
                <h3>7. זכויות המשתמש</h3>
                <p>
                  הנך זכאי לעיין במידע שנאסף אודותיך, לבקש את תיקונו או מחיקתו בהתאם להוראות חוק הגנת הפרטיות, התשמ"א-1981.
                </p>
              </section>
            </div>
          )}
        </div>

        <div className="modal-footer legal-modal-footer">
          <a
            href={activeTab === 'terms' ? '/legal/legal.html' : '/legal/privacy.html'}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link-btn"
          >
            פתח בדף חדש ↗
          </a>
          <button type="button" className="close-btn" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
