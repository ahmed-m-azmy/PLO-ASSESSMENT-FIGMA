# تفعيل جدول Indirect PLO Assessments

## الخطوات:

### 1. تسجيل الدخول إلى Supabase Dashboard
- اذهب إلى [https://app.supabase.com](https://app.supabase.com)
- اختر مشروعك

### 2. فتح SQL Editor
- من القائمة اليسرى، اختر **SQL Editor**
- اضغط **New Query**

### 3. نسخ وتنفيذ SQL
انسخ الكود من ملف `supabase/migrations/create_indirect_assessments.sql` وألصقه في SQL Editor، ثم اضغط **Run**.

```sql
CREATE TABLE IF NOT EXISTS indirect_plo_assessments (
  id BIGSERIAL PRIMARY KEY,
  plo_id BIGINT NOT NULL REFERENCES plos(id) ON DELETE CASCADE,
  program_id BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  indirect_value DECIMAL(5, 2) NOT NULL,
  assessment_name VARCHAR(255),
  weight INT DEFAULT 40,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_indirect_plo_year ON indirect_plo_assessments(plo_id, academic_year, program_id);
CREATE INDEX idx_indirect_program_year ON indirect_plo_assessments(program_id, academic_year);

ALTER TABLE indirect_plo_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow viewing indirect assessments for program" ON indirect_plo_assessments
  FOR SELECT
  USING (true);

CREATE POLICY "Allow inserting indirect assessments" ON indirect_plo_assessments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow updating indirect assessments" ON indirect_plo_assessments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow deleting indirect assessments" ON indirect_plo_assessments
  FOR DELETE
  USING (true);
```

### 4. التحقق من النجاح
- في Supabase Dashboard، اذهب إلى **Tables** (أو **Database** حسب الإصدار)
- يجب أن تظهر جدول جديد باسم `indirect_plo_assessments`

### 5. ارجع إلى التطبيق
- جرّب استيراد ملف Indirect Excel
- البيانات ستحفظ الآن في الجدول الجديد بشكل دائم
- ستظهر في جدول **PLO Results** فوراً

## الآن:
✅ قيم الـ Indirect تحفظ في جدول مخصص  
✅ تظهر تلقائياً عند تحميل الصفحة  
✅ تستمر بعد الـ Refresh والـ Reload  
✅ تظهر في جميع الحسابات (Direct + Indirect = Total)
