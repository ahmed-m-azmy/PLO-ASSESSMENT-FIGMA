import * as React from "react";
import * as XLSX from "xlsx";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface ExcelImportProps {
  onImportDirect: (data: any[]) => void;
  onImportIndirect: (data: any[]) => void;
  isDisabled?: boolean;
}

export function ExcelImport({ onImportDirect, onImportIndirect, isDisabled = false }: ExcelImportProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const directFileRef = React.useRef<HTMLInputElement>(null);
  const indirectFileRef = React.useRef<HTMLInputElement>(null);

  const handleDirectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processedData = jsonData.map((row: any) => ({
          program: row.Program || row.program,
          courseCode: row.CourseCode || row.courseCode || row.course_code,
          cloDescription: row.CLO_Description || row.clo_description || row.description,
          plo: row.PLO || row.plo,
          mapping: row.Mapping || row.mapping,
          achievement: row.Achievement || row.achievement,
          weight: row.Weight || row.weight,
          year: row.Year || row.year,
        }));

        onImportDirect(processedData);
        toast.success(`تم استيراد ${processedData.length} سجل من ملف Direct`);

        if (directFileRef.current) {
          directFileRef.current.value = "";
        }
      } catch (error) {
        toast.error("خطأ في قراءة ملف Direct");
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleIndirectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processedData = jsonData.map((row: any) => ({
          program: row.Program || row.program,
          plo: row.PLO || row.plo,
          indirect: row.Indirect || row.indirect,
          year: row.Year || row.year,
        }));

        onImportIndirect(processedData);
        toast.success(`تم استيراد ${processedData.length} سجل من ملف Indirect`);

        if (indirectFileRef.current) {
          indirectFileRef.current.value = "";
        }
      } catch (error) {
        toast.error("خطأ في قراءة ملف Indirect");
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isDisabled}>
          <Upload className="mr-2 h-4 w-4" />
          Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>استيراد من ملفات Excel</DialogTitle>
          <DialogDescription>
            قم برفع ملفات Excel للتقييمات المباشرة وغير المباشرة
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="direct-file">ملف Direct Assessments</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => directFileRef.current?.click()}
                className="w-full"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                اختر ملف Direct
              </Button>
              <input
                ref={directFileRef}
                id="direct-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleDirectFile}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              الأعمدة: Program, CourseCode, CLO_Description, PLO, Mapping, Achievement, Weight, Year
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="indirect-file">ملف Indirect Assessments</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => indirectFileRef.current?.click()}
                className="w-full"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                اختر ملف Indirect
              </Button>
              <input
                ref={indirectFileRef}
                id="indirect-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleIndirectFile}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              الأعمدة: Program, PLO, Indirect, Year
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
