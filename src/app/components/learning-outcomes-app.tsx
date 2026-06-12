import * as React from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "../../supabase";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, Trash2, TrendingUp, Target, BookOpen, GraduationCap, Lock, LockOpen, LogOut, Upload, FileSpreadsheet, Pencil } from "lucide-react";
import * as XLSX from "xlsx";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ExcelImport } from "./excel-import";
import { ReportExport } from "./report-export";
import { DepartmentLogin } from "./department-login";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
}

interface Program {
  id: string;
  name: string;
  departmentId: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  programId: string;
}

interface CLO {
  id: string;
  code: string;
  description: string;
  courseId: string;
  ploId: string;
  achievement: number;
  weight: number;
  targetValue: number;
}

interface PLO {
  id: string;
  code: string;
  description: string;
  targetValue: number;
  programId: string;
}

interface Assessment {
  id: string;
  type: "direct" | "indirect";
  name: string;
  weight: number;
  value: number;
  academicYear: string;
  programId: string;
  outcomeType: "CLO" | "PLO";
  outcomeId: string;
}

interface IndirectSurveyDetail {
  id: string;
  ploId: string;
  programId: string;
  academicYear: string;
  faculty: number;
  alumni: number;
  employers: number;
  exitInterviews: number;
  indirectTotal: number;
}

export function LearningOutcomesApp() {
  const DEPARTMENT_SESSION_KEY = "department_auth_session";

  const [departments, setDepartments] = React.useState<Department[]>([
    { id: "2c326074-9095-4f66-8998-bb06d8fd66c4", name: "Department of Architecture" },
    { id: "a16d7d12-1cf5-4600-a5ba-6b26ed1c1b44", name: "Department of Planning" },
  ]);

  const [programs, setPrograms] = React.useState<Program[]>([
    { id: "4", name: "Architecture Program", departmentId: "2c326074-9095-4f66-8998-bb06d8fd66c4" },
    { id: "5", name: "Urban Planning Program", departmentId: "a16d7d12-1cf5-4600-a5ba-6b26ed1c1b44" },
    { id: "6", name: "Interior Design Program", departmentId: "2c326074-9095-4f66-8998-bb06d8fd66c4" },
  ]);

  const [courses, setCourses] = React.useState<Course[]>([
    { id: "1", code: "ARCH101", name: "Introduction to Architecture", programId: "1" },
    { id: "2", code: "ARCH201", name: "Architectural Design Studio", programId: "1" },
  ]);

  const [clos, setCLOs] = React.useState<CLO[]>([
    { id: "1", code: "CLO 1.1.1", description: "Apply design principles", courseId: "1", ploId: "1", achievement: 88, weight: 10, targetValue: 75 },
    { id: "2", code: "CLO 1.1.1", description: "Demonstrate technical skills", courseId: "2", ploId: "1", achievement: 85, weight: 5, targetValue: 80 },
  ]);

const [plos, setPLOs] = React.useState<PLO[]>([
  {
    id: "1",
    code: "PLO-1",
    description: "Professional competence in architecture",
    targetValue: 70,
    programId: "1",
  },
  {
    id: "2",
    code: "PLO-2",
    description: "Critical thinking and problem solving",
    targetValue: 75,
    programId: "1",
  },
]);
  const [selectedProgram, setSelectedProgram] = React.useState("4");

const visiblePLOs = React.useMemo(() =>
  plos.filter(p => p.programId.toString() === selectedProgram),
[plos, selectedProgram]);
``
  const [assessments, setAssessments] = React.useState<Assessment[]>([
    {
      id: "1",
      type: "direct",
      name: "Final Project",
      weight: 60,
      value: 82,
      academicYear: "2024-2025",
      programId: "1",
      outcomeType: "CLO",
      outcomeId: "1",
    },
    {
      id: "2",
      type: "indirect",
      name: "Student Survey",
      weight: 40,
      value: 78,
      academicYear: "2024-2025",
      programId: "1",
      outcomeType: "CLO",
      outcomeId: "1",
    },
    {
      id: "3",
      type: "direct",
      name: "Design Portfolio",
      weight: 60,
      value: 85,
      academicYear: "2024-2025",
      programId: "1",
      outcomeType: "PLO",
      outcomeId: "1",
    },
    {
      id: "4",
      type: "indirect",
      name: "Alumni Survey",
      weight: 40,
      value: 80,
      academicYear: "2024-2025",
      programId: "1",
      outcomeType: "PLO",
      outcomeId: "1",
    },
    {
      id: "5",
      type: "direct",
      name: "Thesis Project",
      weight: 60,
      value: 88,
      academicYear: "2024-2025",
      programId: "1",
      outcomeType: "PLO",
      outcomeId: "2",
    },
    {
      id: "6",
      type: "indirect",
      name: "Employer Feedback",
      weight: 40,
      value: 82,
      academicYear: "2024-2025",
      programId: "1",
      outcomeType: "PLO",
      outcomeId: "2",
    },
    {
      id: "7",
      type: "direct",
      name: "Design Portfolio",
      weight: 60,
      value: 78,
      academicYear: "2023-2024",
      programId: "1",
      outcomeType: "PLO",
      outcomeId: "1",
    },
    {
      id: "8",
      type: "indirect",
      name: "Alumni Survey",
      weight: 40,
      value: 75,
      academicYear: "2023-2024",
      programId: "1",
      outcomeType: "PLO",
      outcomeId: "1",
    },
    {
      id: "9",
      type: "direct",
      name: "Thesis Project",
      weight: 60,
      value: 82,
      academicYear: "2023-2024",
      programId: "1",
      outcomeType: "PLO",
      outcomeId: "2",
    },
    {
      id: "10",
      type: "indirect",
      name: "Employer Feedback",
      weight: 40,
      value: 79,
      academicYear: "2023-2024",
      programId: "1",
      outcomeType: "PLO",
      outcomeId: "2",
    },
  ]);

  const [loggedInDepartment, setLoggedInDepartment] = React.useState<string | null>(null);
  const [sessionBootstrapped, setSessionBootstrapped] = React.useState(false);
  const [departmentAuthError, setDepartmentAuthError] = React.useState<string | null>(null);
  const [departmentAuthLoading, setDepartmentAuthLoading] = React.useState(false);
  const [selectedDepartment, setSelectedDepartment] = React.useState("1");
  const [selectedYear, setSelectedYear] = React.useState("2024-2025");
  const [lockedYears, setLockedYears] = React.useState<string[]>([]);

  // Filter programs by logged in department only
const filteredPrograms = programs.filter(
  (p) =>
    p.departmentId &&
    loggedInDepartment &&
    p.departmentId.toString() === loggedInDepartment.toString()
);

  React.useEffect(() => {
    try {
      const sessionRaw = window.localStorage.getItem(DEPARTMENT_SESSION_KEY);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        const departmentId = String(parsed?.departmentId || "");
        if (departmentId) {
          setLoggedInDepartment(departmentId);
          setSelectedDepartment(departmentId);
        }
      }
    } catch {
      window.localStorage.removeItem(DEPARTMENT_SESSION_KEY);
    } finally {
      setSessionBootstrapped(true);
    }
  }, []);

  const handleDepartmentLogin = async (departmentId: string, password: string) => {
    setDepartmentAuthError(null);
    setDepartmentAuthLoading(true);

    const { data, error } = await supabase.rpc("authenticate_department_password", {
      p_department_id: departmentId,
      p_password: password.trim(),
    });

    setDepartmentAuthLoading(false);

    if (error) {
      setDepartmentAuthError(error.message || "Login failed");
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const authenticated = Boolean(row?.authenticated);

    if (!authenticated) {
      setDepartmentAuthError("Invalid password");
      toast.error("Invalid password");
      return;
    }

    setLoggedInDepartment(departmentId);
    setSelectedDepartment(departmentId);
    window.localStorage.setItem(
      DEPARTMENT_SESSION_KEY,
      JSON.stringify({
        departmentId,
        loginAt: new Date().toISOString(),
      })
    );

    const firstProgram = programs.find((p) => String(p.departmentId) === String(departmentId));
    if (firstProgram) {
      setSelectedProgram(String(firstProgram.id));
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout? You will need to select your department again.")) {
      setLoggedInDepartment(null);
      setDepartmentAuthError(null);
      window.localStorage.removeItem(DEPARTMENT_SESSION_KEY);
      toast.success("Logged out successfully");
    }
  };

  // Update selected program when programs change
  React.useEffect(() => {
    const firstProgram = filteredPrograms[0];
    if (firstProgram && !filteredPrograms.find((p) => p.id === selectedProgram)) {
      setSelectedProgram(firstProgram.id);
    }
  }, [filteredPrograms, selectedProgram]);
  const [isAddProgramOpen, setIsAddProgramOpen] = React.useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = React.useState(false);
  const [isAddCLOOpen, setIsAddCLOOpen] = React.useState(false);
  const [isAddPLOOpen, setIsAddPLOOpen] = React.useState(false);
  const [isEditPLOOpen, setIsEditPLOOpen] = React.useState(false);
  const [editingPLO, setEditingPLO] = React.useState<PLO | null>(null);
  const [isImportIndirectPLOOpen, setIsImportIndirectPLOOpen] = React.useState(false);
  const [isAddAssessmentOpen, setIsAddAssessmentOpen] = React.useState(false);
  const [isEditProgramOpen, setIsEditProgramOpen] = React.useState(false);
  const [isEditCourseOpen, setIsEditCourseOpen] = React.useState(false);
  const [editingProgram, setEditingProgram] = React.useState<Program | null>(null);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);
  const [isManageYearsOpen, setIsManageYearsOpen] = React.useState(false);
  const [isImportCoursesOpen, setIsImportCoursesOpen] = React.useState(false);
  const [isImportCLOsOpen, setIsImportCLOsOpen] = React.useState(false);
  const [isManageCLOTargetsOpen, setIsManageCLOTargetsOpen] = React.useState(false);
  const [isManagePLOTargetsOpen, setIsManagePLOTargetsOpen] = React.useState(false);
  const [indirectSurveyDetails, setIndirectSurveyDetails] = React.useState<IndirectSurveyDetail[]>([]);

  const [academicYears, setAcademicYears] = React.useState<string[]>([
    "2022-2023",
    "2023-2024",
    "2024-2025",
    "2025-2026",
  ]);

  const [comparisonYears, setComparisonYears] = React.useState<string[]>([
    "2023-2024",
    "2024-2025",
  ]);

  const [analyticsSelectedYear, setAnalyticsSelectedYear] = React.useState("2024-2025");

  const toggleComparisonYear = (year: string) => {
    if (comparisonYears.includes(year)) {
      setComparisonYears(comparisonYears.filter(y => y !== year));
    } else {
      setComparisonYears([...comparisonYears, year]);
    }
  };

  const fetchIndirectAssessments = async (): Promise<Assessment[]> => {
    if (!selectedProgram) return [];

    const { data, error } = await supabase
      .from("indirect_plo_assessments")
      .select("*")
      .eq("program_id", selectedProgram);

    if (error) {
      console.error("Error fetching indirect assessments:", error);
      return [];
    }

    return (data?.map((a: any) => ({
      id: `indirect-${a.id}`,
      type: "indirect" as const,
      name: `${a.plo_id} - Indirect`,
      weight: 40,
      value: Number(a.indirect_value),
      academicYear: a.academic_year,
      programId: String(a.program_id),
      outcomeType: "PLO" as const,
      outcomeId: String(a.plo_id),
    })) || []);
  };

  const mergeAssessments = (baseItems: Assessment[], extraItems: Assessment[]) => {
    const byKey = new Map<string, Assessment>();
    [...baseItems, ...extraItems].forEach((item) => {
      const key = [
        item.type,
        item.programId,
        item.academicYear,
        item.outcomeType,
        item.outcomeId,
        item.name,
        Number(item.value).toFixed(2),
      ].join("|");

      byKey.set(key, item);
    });
    return Array.from(byKey.values());
  };

  const normalizePLOIdentifier = (value: any) =>
    String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

  const assessmentMatchesPLO = (assessment: Assessment, plo: PLO) => {
    const outcomeIdNormalized = normalizePLOIdentifier(assessment.outcomeId);
    const ploIdNormalized = normalizePLOIdentifier(plo.id);
    const ploCodeNormalized = normalizePLOIdentifier(plo.code);
    const ploDescriptionNormalized = normalizePLOIdentifier(plo.description);
    const assessmentNameNormalized = normalizePLOIdentifier(assessment.name);

    return (
      outcomeIdNormalized === ploIdNormalized ||
      outcomeIdNormalized === ploCodeNormalized ||
      outcomeIdNormalized === ploDescriptionNormalized ||
      (assessmentNameNormalized.includes(ploCodeNormalized) && assessmentNameNormalized.includes("indirect"))
    );
  };

  const calculateWeightedScore = (outcomeId: string, outcomeType: "CLO" | "PLO") => {
    if (outcomeType === "PLO") {
      // For PLO: 60% direct (from weighted CLOs) + 40% indirect PLO
      const relatedCLOs = clos.filter((clo) => clo.ploId === outcomeId);

      let directFromCLOs = 0;
      if (relatedCLOs.length > 0) {
        const totalWeight = relatedCLOs.reduce((sum, clo) => sum + clo.weight, 0);
        const weightedSum = relatedCLOs.reduce((sum, clo) => sum + (clo.achievement * clo.weight), 0);
        directFromCLOs = totalWeight > 0 ? weightedSum / totalWeight : 0;
      }

      // Get indirect assessments for this PLO
      const relatedPLO = plos.find((p) => p.id === outcomeId);
      const indirectAssessments = assessments.filter(
        (a) =>
          a.type === "indirect" &&
          a.outcomeType === "PLO" &&
          a.programId === selectedProgram &&
          a.academicYear === selectedYear &&
          (a.outcomeId === outcomeId || (relatedPLO ? assessmentMatchesPLO(a, relatedPLO) : false))
      );

      const indirectAvg = indirectAssessments.length > 0
        ? indirectAssessments.reduce((sum, a) => sum + a.value, 0) / indirectAssessments.length
        : 0;

      return Math.round((directFromCLOs * 0.6) + (indirectAvg * 0.4));
    } else {
      // For CLO: use assessments as before
      const relevantAssessments = assessments.filter(
        (a) => a.outcomeId === outcomeId &&
               a.outcomeType === outcomeType &&
               a.programId === selectedProgram &&
               a.academicYear === selectedYear
      );

      const totalWeight = relevantAssessments.reduce((sum, a) => sum + a.weight, 0);
      if (totalWeight === 0) return 0;

      const weightedSum = relevantAssessments.reduce((sum, a) => sum + (a.value * a.weight), 0);
      return Math.round(weightedSum / totalWeight);
    }
  };

  const toggleYearLock = () => {
    if (lockedYears.includes(selectedYear)) {
      setLockedYears(lockedYears.filter((year) => year !== selectedYear));
      toast.success(`Academic Year ${selectedYear} has been unlocked`);
    } else {
      setLockedYears([...lockedYears, selectedYear]);
      toast.success(`Academic Year ${selectedYear} has been locked`);
    }
  };

  const isYearLocked = lockedYears.includes(selectedYear);

  const addAcademicYear = (year: string) => {
    if (academicYears.includes(year)) {
      toast.error("This academic year already exists");
      return;
    }
    setAcademicYears([...academicYears, year].sort());
    toast.success(`Academic Year ${year} added successfully`);
  };

  const deleteAcademicYear = (year: string) => {
    if (lockedYears.includes(year)) {
      toast.error("Cannot delete a locked year. Unlock it first.");
      return;
    }
    if (selectedYear === year) {
      toast.error("Cannot delete the currently selected year");
      return;
    }
    const yearAssessments = assessments.filter((a) => a.academicYear === year);
    if (yearAssessments.length > 0) {
      if (!confirm(`This year has ${yearAssessments.length} assessments. Are you sure you want to delete it? All assessments will be removed.`)) {
        return;
      }
      setAssessments(assessments.filter((a) => a.academicYear !== year));
    }
    setAcademicYears(academicYears.filter((y) => y !== year));
    toast.success(`Academic Year ${year} deleted successfully`);
  };



const fetchPrograms = async () => {

  if (!loggedInDepartment) {
    return;
  }

  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("department_id", loggedInDepartment);

  if (error) {
    console.log(error);
  } else {
  const mapped = data.map((p: any) => ({
  id: String(p.id),
  name: p.name,
  departmentId: String(p.department_id),
}));

setPrograms(mapped);

  }
};
const fetchCourses = async () => {
  if (!selectedProgram) return;

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("program_id", selectedProgram);

  if (error) {
    console.log(error);
  } else {
    const mapped = data.map((c: any) => ({
  id: String(c.id),
  code: c.code,
  name: c.name,
  programId: c.program_id ? String(c.program_id) : "",
}));

setCourses(mapped);
``
  }
};
const fetchCLOs = async () => {
  if (!selectedProgram) {
    setCLOs([]);
    return;
  }

  const selectedProgramCourseIds = courses
    .filter((c) => String(c.programId) === String(selectedProgram))
    .map((c) => String(c.id));

  if (selectedProgramCourseIds.length === 0) {
    setCLOs([]);
    return;
  }

  const { data, error } = await supabase
    .from("clos")
    .select("*")
    .in("course_id", selectedProgramCourseIds);

  if (error) {
    console.log(error);
  } else {
    let cloTargetMap = new Map<string, number>();
    if (selectedProgram && selectedYear) {
      const { data: cloTargets, error: cloTargetError } = await supabase
        .from("clo_targets")
        .select("clo_id, target_value")
        .eq("program_id", selectedProgram)
        .eq("academic_year", selectedYear);

      if (!cloTargetError && cloTargets) {
        cloTargetMap = new Map<string, number>(
          cloTargets.map((t: any) => [String(t.clo_id), Number(t.target_value)])
        );
      }
    }

    const mapped = data.map((c: any) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      courseId: c.course_id,
      ploId: c.plo_id,
      achievement: c.achievement,
      weight: c.weight,
      targetValue: cloTargetMap.get(String(c.id)) ?? c.target_value,
    }));

    setCLOs(mapped);
  }
};
const fetchPLOs = async () => {
  if (!selectedProgram) return;

  const { data, error } = await supabase
    .from("plos")
    .select("*")
    .eq("program_id", selectedProgram);

  if (!error) {
    let ploTargetMap = new Map<string, number>();
    if (selectedYear) {
      const { data: ploTargets, error: ploTargetError } = await supabase
        .from("plo_targets")
        .select("plo_id, target_value")
        .eq("program_id", selectedProgram)
        .eq("academic_year", selectedYear);

      if (!ploTargetError && ploTargets) {
        ploTargetMap = new Map<string, number>(
          ploTargets.map((t: any) => [String(t.plo_id), Number(t.target_value)])
        );
      }
    }

    const mapped = data.map((p: any) => ({
      id: p.id,
      code: p.code,
      description: p.description,
      targetValue: ploTargetMap.get(String(p.id)) ?? p.target_value,
      programId: String(p.program_id), 
    }));

    setPLOs(mapped); 
  }
};
const fetchAssessments = async () => {
  const query = supabase.from("assessments").select("*");

  const { data, error } = selectedProgram
    ? await query.eq("program_id", selectedProgram)
    : await query;

  if (error) {
    const indirectAssessments = await fetchIndirectAssessments();
    setAssessments(indirectAssessments);
    return;
  }

  if (data) {
    const mapped = data.map((a: any) => ({
      id: String(a.id),
      type: a.type,
      name: a.name,
      weight: a.weight,
      value: a.value,
      academicYear: a.academic_year,
      programId: String(a.program_id),
      outcomeType: a.outcome_type,
      outcomeId: String(a.outcome_id),
    }));

    const indirectFromDB = await fetchIndirectAssessments();
    setAssessments(mergeAssessments(mapped, indirectFromDB));
  }
};
React.useEffect(() => {
  if (loggedInDepartment) {
    fetchPrograms();
  }
}, [loggedInDepartment]);
React.useEffect(() => {
  fetchCourses();
}, [selectedProgram]);
React.useEffect(() => {
  fetchCLOs();
}, [selectedProgram, selectedYear, courses]);
React.useEffect(() => {
  if (selectedProgram) {
    fetchPLOs();
  }
}, [selectedProgram, selectedYear]);
React.useEffect(() => {
  fetchAssessments();
}, [selectedProgram]);


const addProgram = async (name: string, departmentId: string) => {

  console.log("Adding program to department:", departmentId);

  const { data, error } = await supabase
    .from("programs")
    .insert([
      {
        name: name,
        department_id: departmentId,
      },
    ])
    .select();   // ✅ دي مهمة جدًا

  console.log("RESULT:", data);
  console.log("ERROR:", error);

  if (error) {
    alert("❌ Error: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    alert("⚠️ No data inserted");
    return;
  }

  alert("Program added ✅");

  await fetchPrograms();
};



  const updateProgram = (id: string, name: string, departmentId: string) => {
    setPrograms(programs.map((p) => (p.id === id ? { ...p, name, departmentId } : p)));
    setIsEditProgramOpen(false);
    setEditingProgram(null);
  };


const deleteProgram = async (id: string) => {
  const { error } = await supabase
    .from("programs")
    .delete()
    .eq("id", id);

  if (error) {
    console.log(error);
    alert("Error deleting ❌");
  } else {
    alert("Deleted ✅");
    await fetchPrograms(); // refresh
  }
};


const addCourse = async (code: string, name: string, programId: string) => {
  const { error } = await supabase
    .from("courses")
    .insert([
      {
        code,
        name,
program_id: Number(selectedProgram)
      },
    ]);

  if (error) {
    console.log(error);
    alert(error.message);
  } else {
    fetchCourses();
  }
};
const updateCourse = (id: string, code: string, name: string, programId: string) => {
    setCourses(courses.map((c) => (c.id === id ? { ...c, code, name, programId } : c)));
    setIsEditCourseOpen(false);
    setEditingCourse(null);
    toast.success("Course updated successfully");
  };

const deleteCourse = async (id: string) => {
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id);

  if (error) {
    console.log(error);
  } else {
    fetchCourses();
  }
};

const handleImportCourses = async (data: any[]) => {
     const newCourses: Course[] = [];
    const baseTimestamp = Date.now();

    for (let index = 0; index < data.length; index++) {
  const row = data[index];
      let program = programs.find((p) => p.name === row.program || p.id === row.programId);
      if (!program) {
        program = filteredPrograms[0]; // Default to first program in department
      }

      if (program && row.code && row.name) {
let course = courses.find(
  (c) =>
    c.code === (row.code || row.Code || row.courseCode) ||
    c.name === (row.name || row.Name || row.courseName)
);

if (!course) {
  console.log("Creating new course:", row.code);

  const { data: courseData, error: courseError } = await supabase
    .from("courses")
    .insert([
      {
        code: row.code,
        name: row.name,
        program_id: program.id,
      },
    ])
    .select()
    .single();

  if (!courseError && courseData) {
    course = {
      id: courseData.id,
      code: courseData.code,
      name: courseData.name,
      programId: courseData.program_id,
    };
  }

if (course) {
  newCourses.push(course);
}
}
}
// ✅ بعد انتهاء اللوب
if (newCourses.length > 0) {
  setCourses([...courses, ...newCourses]);
  toast.success(`Imported ${newCourses.length} courses successfully`);
} else {
  toast.error("No valid courses found in the file");
}

}
}

const addCLO = async (
  code: string,
  description: string,
  courseId: string,
  ploId: string,
  achievement: number,
  weight: number
) => {
  const { error } = await supabase
    .from("clos")
    .insert([
      {
        code,
        description,
        course_id: courseId,
        plo_id: ploId,
        achievement,
        weight,
        target_value: 75,
      },
    ]);

  if (error) {
    console.log(error);
    alert(error.message);
  } else {
    fetchCLOs();
  }
};
const handleImportCLOs = async (data: any[]) => {
  const normalize = (value: any) => String(value ?? "").trim();
  const normalizeKey = (value: any) => normalize(value).toLowerCase().replace(/[\s_\-]+/g, "");
  const parseNumber = (value: any, fallback: number) => {
    const parsed = Number(normalize(value));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const getField = (row: any, aliases: string[]) => {
    const keys = Object.keys(row || {});
    for (const alias of aliases) {
      const aliasNormalized = normalizeKey(alias);
      const matchedKey = keys.find((k) => normalizeKey(k) === aliasNormalized);
      if (matchedKey) {
        const value = normalize(row[matchedKey]);
        if (value) return value;
      }
    }
    return "";
  };
  const normalizePLOCode = (raw: string) => {
    const value = normalize(raw);
    if (!value) return "";
    const upper = value.toUpperCase().replace(/\s+/g, "");
    if (upper.startsWith("PLO-")) return upper;
    if (upper.startsWith("PLO")) {
      const suffix = upper.replace(/^PLO/, "").replace(/^-+/, "");
      return suffix ? `PLO-${suffix}` : "";
    }
    return /^\d/.test(upper) ? `PLO-${upper}` : upper;
  };

  const courseCache: Course[] = [...courses];
  const ploCache: PLO[] = [...plos];
  const importedCLOs: CLO[] = [];

  let importedCount = 0;
  let createdCoursesCount = 0;
  let createdPLOsCount = 0;
  let skippedRowsCount = 0;
  let failedRowsCount = 0;

  for (const row of data) {
    const courseCode = getField(row, ["Course Code", "courseCode", "course code", "course"]);
    const courseName = getField(row, ["Course Name", "courseName", "course name"]);
    const ploRaw = getField(row, ["PLO Code", "PLO", "plo"]);
    const cloDescription = getField(row, ["CLO Description", "description", "CLO", "clo"]);
    const achievementRaw = getField(row, ["Achievement", "Achievement (%)", "achieve", "achievement"]);
    const weightRaw = getField(row, ["Weight", "weight"]);
    const targetRaw = getField(row, ["Target", "target"]);

    if (!courseCode && !courseName) {
      skippedRowsCount += 1;
      continue;
    }
    if (!ploRaw || !cloDescription || !achievementRaw || !weightRaw) {
      skippedRowsCount += 1;
      continue;
    }

    let course = courseCache.find(
      (c) =>
        c.programId === selectedProgram &&
        ((courseCode && normalizeKey(c.code) === normalizeKey(courseCode)) ||
          (courseName && normalizeKey(c.name) === normalizeKey(courseName)))
    );

    if (!course) {
      const coursePayload = {
        code: courseCode || courseName,
        name: courseName || courseCode,
        program_id: Number(selectedProgram),
      };

      const { data: createdCourse, error: createCourseError } = await supabase
        .from("courses")
        .insert([coursePayload])
        .select()
        .single();

      if (createCourseError || !createdCourse) {
        failedRowsCount += 1;
        continue;
      }

      course = {
        id: String(createdCourse.id),
        code: createdCourse.code,
        name: createdCourse.name,
        programId: String(createdCourse.program_id),
      };
      courseCache.push(course);
      createdCoursesCount += 1;
    }

    const ploCode = normalizePLOCode(ploRaw);
    if (!ploCode) {
      skippedRowsCount += 1;
      continue;
    }

    let plo = ploCache.find(
      (p) => p.programId === selectedProgram && normalizeKey(p.code) === normalizeKey(ploCode)
    );

    if (!plo) {
      const { data: createdPLO, error: createPLOError } = await supabase
        .from("plos")
        .insert([
          {
            code: ploCode,
            description: ploCode,
            target_value: 70,
            program_id: Number(selectedProgram),
          },
        ])
        .select()
        .single();

      if (createPLOError || !createdPLO) {
        failedRowsCount += 1;
        continue;
      }

      plo = {
        id: String(createdPLO.id),
        code: createdPLO.code,
        description: createdPLO.description,
        targetValue: createdPLO.target_value,
        programId: String(createdPLO.program_id),
      };
      ploCache.push(plo);
      createdPLOsCount += 1;
    }

    const achievement = parseNumber(achievementRaw, NaN);
    const weight = parseNumber(weightRaw, NaN);
    if (!Number.isFinite(achievement) || !Number.isFinite(weight)) {
      skippedRowsCount += 1;
      continue;
    }

    const cloPayload = {
      code: cloDescription,
      description: cloDescription,
      course_id: course.id,
      plo_id: plo.id,
      achievement,
      weight,
      target_value: parseNumber(targetRaw, 75),
    };

    const { data: createdCLO, error: createCLOError } = await supabase
      .from("clos")
      .insert([cloPayload])
      .select()
      .single();

    if (createCLOError || !createdCLO) {
      failedRowsCount += 1;
      continue;
    }

    importedCLOs.push({
      id: String(createdCLO.id),
      code: createdCLO.code,
      description: createdCLO.description,
      courseId: String(createdCLO.course_id),
      ploId: String(createdCLO.plo_id),
      achievement: createdCLO.achievement,
      weight: createdCLO.weight,
      targetValue: createdCLO.target_value,
    });

    await supabase.from("clo_targets").upsert(
      [
        {
          clo_id: String(createdCLO.id),
          program_id: Number(selectedProgram),
          academic_year: selectedYear,
          target_value: createdCLO.target_value,
        },
      ],
      { onConflict: "clo_id,program_id,academic_year" }
    );

    importedCount += 1;
  }

  await Promise.all([fetchCourses(), fetchPLOs(), fetchCLOs()]);

  if (importedCount > 0) {
    setCLOs((prev) => [...prev, ...importedCLOs]);
    toast.success(`Imported ${importedCount} CLOs, ${createdCoursesCount} Courses, ${createdPLOsCount} PLOs`);
  } else {
    toast.error(`Imported 0 CLOs, ${createdCoursesCount} Courses, ${createdPLOsCount} PLOs`);
  }

  if (skippedRowsCount > 0 || failedRowsCount > 0) {
    toast.error(`Skipped ${skippedRowsCount} rows, Failed ${failedRowsCount} rows`);
  }
};
const addPLO = async (code: string, description: string, targetValue: number) => {

  console.log("PROGRAM:", selectedProgram);

  if (!selectedProgram) {
    alert("No program selected ❌");
    return;
  }

  const { data: createdPLO, error } = await supabase
    .from("plos")
    .insert([
      {
        code,
        description,
        target_value: targetValue,
        program_id: Number(selectedProgram),
      },
    ])
    .select()
    .single();

  if (error) {
    console.log("ERROR:", error);
    alert(error.message);
  } else {
    if (createdPLO?.id) {
      await supabase.from("plo_targets").upsert(
        [
          {
            plo_id: String(createdPLO.id),
            program_id: Number(selectedProgram),
            academic_year: selectedYear,
            target_value: targetValue,
          },
        ],
        { onConflict: "plo_id,program_id,academic_year" }
      );
    }
    fetchPLOs();
  }
};


  const editPLO = async (id: string, code: string, description: string, targetValue: number) => {
    const { error: updateError } = await supabase
      .from("plos")
      .update({
        code,
        description,
        target_value: targetValue,
      })
      .eq("id", id);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    const { error: targetError } = await supabase.from("plo_targets").upsert(
      [
        {
          plo_id: id,
          program_id: Number(selectedProgram),
          academic_year: selectedYear,
          target_value: targetValue,
        },
      ],
      { onConflict: "plo_id,program_id,academic_year" }
    );

    if (targetError) {
      toast.error(targetError.message);
      return;
    }

    await fetchPLOs();
    setIsEditPLOOpen(false);
    setEditingPLO(null);
    toast.success("PLO updated successfully");
  };

  const upsertPLOTarget = async (ploId: string, targetValue: number, silent = false) => {
    const programIdNumber = Number(selectedProgram);
    if (!Number.isFinite(programIdNumber)) {
      toast.error("Invalid program for target update");
      return;
    }

    const { error } = await supabase.from("plo_targets").upsert(
      [
        {
          plo_id: ploId,
          program_id: programIdNumber,
          academic_year: selectedYear,
          target_value: targetValue,
        },
      ],
      { onConflict: "plo_id,program_id,academic_year" }
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    await fetchPLOs();
    if (!silent) {
      toast.success("PLO target saved");
    }
  };

  const deletePLOTarget = async (ploId: string) => {
    const programIdNumber = Number(selectedProgram);
    if (!Number.isFinite(programIdNumber)) {
      toast.error("Invalid program for target delete");
      return;
    }

    const { error } = await supabase
      .from("plo_targets")
      .delete()
      .eq("plo_id", ploId)
      .eq("program_id", programIdNumber)
      .eq("academic_year", selectedYear);

    if (error) {
      toast.error(error.message);
      return;
    }

    await fetchPLOs();
    toast.success("PLO target deleted");
  };

  const upsertCLOTarget = async (cloId: string, targetValue: number, silent = false) => {
    const programIdNumber = Number(selectedProgram);
    if (!Number.isFinite(programIdNumber)) {
      toast.error("Invalid program for target update");
      return;
    }

    const { error } = await supabase.from("clo_targets").upsert(
      [
        {
          clo_id: cloId,
          program_id: programIdNumber,
          academic_year: selectedYear,
          target_value: targetValue,
        },
      ],
      { onConflict: "clo_id,program_id,academic_year" }
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    await fetchCLOs();
    if (!silent) {
      toast.success("CLO target saved");
    }
  };

  const deleteCLOTarget = async (cloId: string) => {
    const programIdNumber = Number(selectedProgram);
    if (!Number.isFinite(programIdNumber)) {
      toast.error("Invalid program for target delete");
      return;
    }

    const { error } = await supabase
      .from("clo_targets")
      .delete()
      .eq("clo_id", cloId)
      .eq("program_id", programIdNumber)
      .eq("academic_year", selectedYear);

    if (error) {
      toast.error(error.message);
      return;
    }

    await fetchCLOs();
    toast.success("CLO target deleted");
  };

  const addAssessment = (assessment: Omit<Assessment, "id">) => {
    const newAssessment: Assessment = {
      id: `assess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...assessment,
    };
    setAssessments([...assessments, newAssessment]);
    setIsAddAssessmentOpen(false);
  };

const deleteCLO = async (id: string) => {
  const { error } = await supabase
    .from("clos")
    .delete()
    .eq("id", id);

  if (error) {
    console.log(error);
  } else {
    fetchCLOs();
  }
};

 const deletePLO = async (id: string) => {
  const { error } = await supabase
    .from("plos")
    .delete()
    .eq("id", id);

  if (error) {
    console.log(error);
  } else {
    fetchPLOs();
  }
};

  const handleImportDirect = (data: any[]) => {
    const newCLOs: CLO[] = [];
    const newPLOs: PLO[] = [];
    const newAssessments: Assessment[] = [];
    const newPrograms: Program[] = [];
    const baseTimestamp = Date.now();

    data.forEach((row, index) => {
      let program = programs.find((p) => p.name === row.program);
      if (!program) {
        const existingNewProgram = newPrograms.find((p) => p.name === row.program);
        if (!existingNewProgram) {
          program = {
            id: `prog-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            name: row.program,
            departmentId: loggedInDepartment || selectedDepartment,
          };
          newPrograms.push(program);
        } else {
          program = existingNewProgram;
        }
      }
let course = courses.find(
  (c) => c.code === row.courseCode || c.name === row.courseCode
);
const ploName = row.plo?.trim();

let plo = plos.find(
  (p) =>
    p.code.toLowerCase() === ploName?.toLowerCase() ||
    p.description.toLowerCase() === ploName?.toLowerCase()
);

if (!plo) {
  let existingNewPLO = newPLOs.find(
    (p) => p.code.toLowerCase() === ploName?.toLowerCase()
  );

  if (!existingNewPLO) {
    plo = {
      id: `plo-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      code: ploName || "PLO",
      description: ploName || "Auto created PLO",
      targetValue: row.mapping || 70,
      programId: selectedProgram,
    };

    newPLOs.push(plo);
  } else {
    plo = existingNewPLO;
  }
}

      let clo = clos.find((c) => c.code === row.cloDescription);
      if (!clo) {
        const existingNewCLO = newCLOs.find((c) => c.code === row.cloDescription);
        if (!existingNewCLO) {
clo = {
  id: `clo-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
  code: row.cloDescription,
  description: row.cloDescription,

  courseId: course?.id || "", 
ploId: plo.id,

  achievement: 0,
  weight: 1,

  targetValue: row.mapping || 100,
};


          newCLOs.push(clo);
        } else {
          clo = existingNewCLO;
        }
      }



      const assessment: Assessment = {
        id: `assess-direct-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        type: "direct",
        name: `${row.courseCode} - Direct`,
        weight: row.weight || 60,
        value: row.achievement || 0,
        academicYear: row.year?.toString() || selectedYear,
        programId: program.id,
        outcomeType: "CLO",
        outcomeId: clo.id,
      };
      newAssessments.push(assessment);
    });

    if (newPrograms.length > 0) {
      setPrograms([...programs, ...newPrograms]);
    }
    if (newCLOs.length > 0) {
      setCLOs([...clos, ...newCLOs]);
    }
    if (newPLOs.length > 0) {
      setPLOs([...plos, ...newPLOs]);
    }
    if (newAssessments.length > 0) {
      setAssessments([...assessments, ...newAssessments]);
    }

    toast.success(`تم إضافة ${newAssessments.length} تقييم مباشر`);
  };

  const handleImportIndirect = (data: any[]) => {
    const newPLOs: PLO[] = [];
    const newAssessments: Assessment[] = [];
    const newPrograms: Program[] = [];
    const baseTimestamp = Date.now();

    data.forEach((row, index) => {
      let program = programs.find((p) => p.name === row.program);
      if (!program) {
        const existingNewProgram = newPrograms.find((p) => p.name === row.program);
        if (!existingNewProgram) {
          program = {
            id: `prog-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            name: row.program,
            departmentId: loggedInDepartment || selectedDepartment,
          };
          newPrograms.push(program);
        } else {
          program = existingNewProgram;
        }
      }

let plo = plos.find(
  (p) => p.code === row.plo || p.description === row.plo
);

      const assessment: Assessment = {
        id: `assess-indirect-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        type: "indirect",
        name: `${row.plo} - Indirect`,
        weight: 40,
        value: row.indirect || 0,
        academicYear: row.year?.toString() || selectedYear,
        programId: program.id,
        outcomeType: "PLO",
       outcomeId: plo?.id || "",
      };
      newAssessments.push(assessment);
    });

    if (newPrograms.length > 0) {
      setPrograms([...programs, ...newPrograms]);
    }
    if (newPLOs.length > 0) {
      setPLOs([...plos, ...newPLOs]);
    }
    if (newAssessments.length > 0) {
      setAssessments([...assessments, ...newAssessments]);
    }

    toast.success(`تم إضافة ${newAssessments.length} تقييم غير مباشر`);
  };

  const handleImportIndirectPLO = async (data: any[]) => {
    const normalize = (value: any) => String(value ?? "").trim();
    const normalizeKey = (value: any) => normalize(value).toLowerCase().replace(/[\s_\-]+/g, "");
    const isUUID = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        normalize(value)
      );
    const parseNumber = (value: any) => {
      const cleaned = normalize(value).replace(/%/g, "").replace(/,/g, ".");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : NaN;
    };
    const getSurveyValues = (row: any) => {
      const faculty = parseNumber(
        getField(row, ["Faculty Survey", "Faculty", "faculty_survey", "faculty survey"])
      );
      const alumni = parseNumber(
        getField(row, ["Alumni Survey", "Alumni", "alumni_survey", "alumni survey"])
      );
      const employers = parseNumber(
        getField(row, ["Employers Survey", "Employer Survey", "employers_survey", "employers survey"])
      );
      const exitInterviews = parseNumber(
        getField(row, ["Exit interviews Survey", "Exit Interview Survey", "exit_interviews_survey", "exit interviews survey"])
      );

      const values = [faculty, alumni, employers, exitInterviews];
      const hasAllValues = values.every((value) => Number.isFinite(value));

      if (hasAllValues) {
        const sum = values.reduce((total, value) => total + value, 0);
        return {
          faculty,
          alumni,
          employers,
          exitInterviews,
          total: sum / values.length,
          hasAllSurveys: true,
        };
      }

      // Backward compatibility with old template that had a single Indirect column.
      const fallbackTotal = parseNumber(
        getField(row, ["Indirect", "Indirect total", "Indirect (%)", "indirect", "Score", "Value", "Result", "indirect_score"])
      );

      return {
        faculty: NaN,
        alumni: NaN,
        employers: NaN,
        exitInterviews: NaN,
        total: fallbackTotal,
        hasAllSurveys: false,
      };
    };
    const normalizeAcademicYear = (value: string) => {
      const clean = normalize(value).replace(/[\s]/g, "");
      const matched = clean.match(/(\d{4})[-\/](\d{4})/);
      if (matched) {
        return `${matched[1]}-${matched[2]}`;
      }
      return clean || selectedYear;
    };
    const getField = (row: any, aliases: string[]) => {
      const keys = Object.keys(row || {});
      for (const alias of aliases) {
        const aliasNormalized = normalizeKey(alias);
        const matchedKey = keys.find((key) => normalizeKey(key) === aliasNormalized);
        if (matchedKey) {
          const value = normalize(row[matchedKey]);
          if (value) return value;
        }
      }
      return "";
    };
    const normalizePLOCode = (raw: string) => {
      const value = normalize(raw).toUpperCase();
      if (!value) return "";
      if (value.startsWith("PLO-")) return value;
      if (value.startsWith("PLO")) {
        const suffix = value.replace(/^PLO/, "").replace(/^[-\s]+/, "");
        return suffix ? `PLO-${suffix}` : "";
      }
      return /^\d/.test(value) ? `PLO-${value}` : value;
    };

    const programIdNumber = Number(selectedProgram);
    if (!Number.isFinite(programIdNumber)) {
      toast.error(`Invalid selected program id: ${selectedProgram}`);
      return;
    }

    const importedYears = new Set<string>();
    const importedAssessments: Assessment[] = [];
    const importedSurveyDetails: IndirectSurveyDetail[] = [];
    let skippedRows = 0;
    let syncedRows = 0;
    let localOnlyRows = 0;
    let firstInsertError: string | null = null;

    for (const row of data) {
      const ploCode = normalizePLOCode(
        getField(row, ["PLO", "PLO Code", "PLO_Code", "PLO ID", "plo", "code", "Code"])
      );
      const surveyValues = getSurveyValues(row);
      const indirectScore = surveyValues.total;
      const year = normalizeAcademicYear(getField(row, ["Year", "Academic Year", "academicYear"]) || selectedYear);

      if (!ploCode || !Number.isFinite(indirectScore)) {
        skippedRows += 1;
        continue;
      }

      let plo = plos.find(
        (p) =>
          String(p.programId) === String(selectedProgram) &&
          normalizePLOIdentifier(p.code) === normalizePLOIdentifier(ploCode) ||
          (String(p.programId) === String(selectedProgram) &&
            normalizePLOIdentifier(p.description) === normalizePLOIdentifier(ploCode))
      );

      if (!plo) {
        const { data: createdPLO, error: createPLOError } = await supabase
          .from("plos")
          .insert([
            {
              code: ploCode,
              description: ploCode,
              target_value: 70,
              program_id: programIdNumber,
            },
          ])
          .select()
          .single();

        if (createPLOError || !createdPLO) {
          skippedRows += 1;
          continue;
        }

        plo = {
          id: String(createdPLO.id),
          code: createdPLO.code,
          description: createdPLO.description,
          targetValue: createdPLO.target_value,
          programId: String(createdPLO.program_id),
        };

        setPLOs((prev) => {
          if (prev.some((p) => p.id === plo!.id)) return prev;
          return [...prev, plo!];
        });
      }

      importedYears.add(year);

      if (surveyValues.hasAllSurveys) {
        importedSurveyDetails.push({
          id: `survey-${plo.id}-${year}-${Math.random().toString(36).slice(2, 8)}`,
          ploId: String(plo.id),
          programId: String(selectedProgram),
          academicYear: year,
          faculty: surveyValues.faculty,
          alumni: surveyValues.alumni,
          employers: surveyValues.employers,
          exitInterviews: surveyValues.exitInterviews,
          indirectTotal: surveyValues.total,
        });
      }

      if (!isUUID(plo.id)) {
        skippedRows += 1;
        if (!firstInsertError) {
          firstInsertError = `Invalid PLO id for ${plo.code}: ${plo.id}`;
        }
        continue;
      }

      const payload = {
        plo_id: plo.id,
        program_id: programIdNumber,
        academic_year: year,
        indirect_value: indirectScore,
      };

      const { data: createdIndirect, error: indirectError } = await supabase
        .from("indirect_plo_assessments")
        .insert([payload])
        .select()
        .single();

      if (!indirectError && createdIndirect) {
        const assessmentItem: Assessment = {
          id: `indirect-${createdIndirect.id}`,
          type: "indirect",
          name: `${plo.code} - Indirect`,
          weight: 40,
          value: Number(createdIndirect.indirect_value),
          academicYear: createdIndirect.academic_year,
          programId: String(createdIndirect.program_id),
          outcomeType: "PLO",
          outcomeId: String(createdIndirect.plo_id),
        };
        importedAssessments.push(assessmentItem);
        syncedRows += 1;
      } else {
        if (!firstInsertError) {
          firstInsertError = indirectError?.message || "Unknown insert error";
        }
        console.error("Failed to insert indirect PLO assessment", {
          payload,
          error: indirectError,
        });
        skippedRows += 1;
      }

    }

    if (importedYears.size > 0) {
      setAcademicYears((prev) => {
        const merged = Array.from(new Set([...prev, ...Array.from(importedYears)]));
        return merged.sort();
      });
    }

    if (importedAssessments.length > 0) {
      setAssessments((prev) => mergeAssessments(prev, importedAssessments));
    }

    if (importedSurveyDetails.length > 0) {
      setIndirectSurveyDetails((prev) => {
        const byKey = new Map<string, IndirectSurveyDetail>();
        [...prev, ...importedSurveyDetails].forEach((item) => {
          const key = `${item.programId}|${item.academicYear}|${item.ploId}`;
          byKey.set(key, item);
        });
        return Array.from(byKey.values());
      });
    }

    if (syncedRows > 0) {
      await Promise.all([fetchPLOs(), fetchAssessments()]);
    } else {
      await fetchPLOs();
    }

    const [firstImportedYear] = Array.from(importedYears);
    if (firstImportedYear) {
      setSelectedYear(firstImportedYear);
    }

    const importedCount = importedAssessments.length;

    if (importedCount > 0) {
      toast.success(`Imported ${importedCount} indirect PLO assessments`);
    } else {
      toast.error("No valid indirect PLO data found in the file");
    }

    if (localOnlyRows > 0) {
      toast.error(`Saved locally only (${localOnlyRows}) بسبب صلاحيات Supabase`);
    }

    if (skippedRows > 0) {
      toast.error(`Skipped ${skippedRows} rows`);
    }

    if (firstInsertError) {
      toast.error(`Import error: ${firstInsertError}`);
    }
  };

  const getYearComparisonData = () => {
    return comparisonYears.map((year, index) => {
      const yearAssessments = assessments.filter(
        (a) => a.programId === selectedProgram && a.academicYear === year
      );

      const avgScore = yearAssessments.length > 0
        ? yearAssessments.reduce((sum, a) => sum + a.value, 0) / yearAssessments.length
        : 0;

      return {
        id: `year-${index}-${year}`,
        year,
        score: Math.round(avgScore),
      };
    });
  };

  const getOutcomeRadarData = () => {
    const cloData = clos.map((clo) => ({
      id: `clo-${clo.id}`,
      outcome: clo.code,
      score: calculateWeightedScore(clo.id, "CLO"),
      target: clo.targetValue,
    }));

    const ploData = plos.map((plo) => ({
      id: `plo-${plo.id}`,
      outcome: plo.code,
      score: calculateWeightedScore(plo.id, "PLO"),
      target: plo.targetValue,
    }));

    return [...cloData, ...ploData];
  };

  const getPLOProgressData = () => {
    let achieved = 0;
    let acceptable = 0;
    let needsImprovement = 0;

    plos.forEach((plo) => {
      const score = calculateWeightedScore(plo.id, "PLO");
      const target = plo.targetValue;

      if (score >= target) {
        achieved++;
      } else if (score >= target - 10) {
        acceptable++;
      } else {
        needsImprovement++;
      }
    });

    return [
      { name: "Achieved", value: achieved, color: "#22c55e" },
      { name: "Acceptable", value: acceptable, color: "#f97316" },
      { name: "Needs Improvement", value: needsImprovement, color: "#ef4444" },
    ];
  };

  const getPLOHeatmapData = () => {
    return plos.map((plo) => {
      // Calculate Direct from weighted CLOs
      const relatedCLOs = clos.filter((clo) => clo.ploId === plo.id);

      let directFromCLOs = 0;
      if (relatedCLOs.length > 0) {
        const totalWeight = relatedCLOs.reduce((sum, clo) => sum + clo.weight, 0);
        const weightedSum = relatedCLOs.reduce((sum, clo) => sum + (clo.achievement * clo.weight), 0);
        directFromCLOs = totalWeight > 0 ? weightedSum / totalWeight : 0;
      }

      // Calculate Indirect from PLO indirect assessments
                      const indirectAssessments = assessments.filter(
                        (a) =>
                          a.type === "indirect" &&
                          a.outcomeType === "PLO" &&
                          a.programId === selectedProgram &&
                          a.academicYear === analyticsSelectedYear &&
                          (a.outcomeId === plo.id || assessmentMatchesPLO(a, plo))
                      );

      const indirectAvg = indirectAssessments.length > 0
        ? indirectAssessments.reduce((sum, a) => sum + a.value, 0) / indirectAssessments.length
        : 0;

      // Final PLO = 60% direct (from weighted CLOs) + 40% indirect PLO
      const total = (directFromCLOs * 0.6) + (indirectAvg * 0.4);

      return {
        id: plo.id,
        code: plo.code,
        direct: directFromCLOs,
        indirect: indirectAvg,
        total: total,
        target: plo.targetValue,
      };
    });
  };

  const getSelectedYearPLOResultsData = () => {
    return visiblePLOs.map((plo) => {
      const relatedCLOs = clos.filter((clo) => clo.ploId === plo.id);

      let directFromCLOs = 0;
      if (relatedCLOs.length > 0) {
        const totalWeight = relatedCLOs.reduce((sum, clo) => sum + clo.weight, 0);
        const weightedSum = relatedCLOs.reduce((sum, clo) => sum + (clo.achievement * clo.weight), 0);
        directFromCLOs = totalWeight > 0 ? weightedSum / totalWeight : 0;
      }

      const indirectAssessments = assessments.filter(
        (a) =>
          a.type === "indirect" &&
          a.outcomeType === "PLO" &&
          a.programId === selectedProgram &&
          a.academicYear === selectedYear &&
          (a.outcomeId === plo.id || assessmentMatchesPLO(a, plo))
      );

      const indirectAvg = indirectAssessments.length > 0
        ? indirectAssessments.reduce((sum, a) => sum + a.value, 0) / indirectAssessments.length
        : 0;

      const total = (directFromCLOs * 0.6) + (indirectAvg * 0.4);

      return {
        id: plo.id,
        code: plo.code,
        direct: directFromCLOs,
        indirect: indirectAvg,
        total,
        target: plo.targetValue,
        achieved: total >= plo.targetValue,
      };
    });
  };

  const getSelectedYearIndirectDetailsData = () => {
    return visiblePLOs.map((plo) => {
      const detail = indirectSurveyDetails.find(
        (item) =>
          item.programId === selectedProgram &&
          item.academicYear === selectedYear &&
          item.ploId === plo.id
      );

      const fallbackIndirectAssessments = assessments.filter(
        (a) =>
          a.type === "indirect" &&
          a.outcomeType === "PLO" &&
          a.programId === selectedProgram &&
          a.academicYear === selectedYear &&
          (a.outcomeId === plo.id || assessmentMatchesPLO(a, plo))
      );

      const fallbackIndirectTotal = fallbackIndirectAssessments.length > 0
        ? fallbackIndirectAssessments.reduce((sum, a) => sum + a.value, 0) / fallbackIndirectAssessments.length
        : 0;

      return {
        id: plo.id,
        code: plo.code,
        faculty: detail ? detail.faculty : null,
        alumni: detail ? detail.alumni : null,
        employers: detail ? detail.employers : null,
        exitInterviews: detail ? detail.exitInterviews : null,
        indirectTotal: detail ? detail.indirectTotal : fallbackIndirectTotal,
      };
    });
  };

  const getIndirectDetailsDataForYear = (year: string) => {
    return visiblePLOs.map((plo) => {
      const detail = indirectSurveyDetails.find(
        (item) =>
          item.programId === selectedProgram &&
          item.academicYear === year &&
          item.ploId === plo.id
      );

      const fallbackIndirectAssessments = assessments.filter(
        (a) =>
          a.type === "indirect" &&
          a.outcomeType === "PLO" &&
          a.programId === selectedProgram &&
          a.academicYear === year &&
          (a.outcomeId === plo.id || assessmentMatchesPLO(a, plo))
      );

      const fallbackIndirectTotal = fallbackIndirectAssessments.length > 0
        ? fallbackIndirectAssessments.reduce((sum, a) => sum + a.value, 0) / fallbackIndirectAssessments.length
        : 0;

      return {
        id: plo.id,
        code: plo.code,
        faculty: detail ? detail.faculty : null,
        alumni: detail ? detail.alumni : null,
        employers: detail ? detail.employers : null,
        exitInterviews: detail ? detail.exitInterviews : null,
        indirectTotal: detail ? detail.indirectTotal : fallbackIndirectTotal,
      };
    });
  };

  const getHeatmapColor = (value: number, target: number) => {
    if (value >= target) return "bg-green-100 text-green-800";
    if (value >= target - 10) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  // Show department login if not logged in
  if (!loggedInDepartment) {
    return (
      <DepartmentLogin
        departments={departments}
        onLogin={handleDepartmentLogin}
        isLoading={departmentAuthLoading || !sessionBootstrapped}
        errorMessage={departmentAuthError}
      />
    );
  }

  const currentDepartment = departments.find((d) => d.id === loggedInDepartment);
const coursesMap = Object.fromEntries(
  courses.map((c) => [String(c.id), c])
);

const plosMap = Object.fromEntries(
  plos.map((p) => [String(p.id), p])
)
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div
          className="relative flex items-center justify-between p-8 rounded-3xl overflow-hidden shadow-2xl mb-8"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1554793000-245d3a3c2a51?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-900/60 via-orange-900/50 to-amber-950/60"></div>
          <div className="relative z-10">
            <h1 className="mb-2 text-white text-4xl font-bold drop-shadow-lg">Learning Outcomes Assessment System</h1>
            <p className="text-amber-100 text-lg drop-shadow-md">College of Architecture and Planning</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/30">
                <p className="text-white font-semibold">{currentDepartment?.name}</p>
              </div>
              <Button
                onClick={handleLogout}
                size="sm"
                className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex gap-3">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="w-[250px] bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                  <SelectValue placeholder="Select Program" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[180px] bg-white/95 backdrop-blur-sm border-white/20 shadow-lg">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 items-center">
              <ReportExport
                departments={departments}
                programs={programs}
                clos={clos}
                plos={plos}
                assessments={assessments}
                indirectSurveyDetails={indirectSurveyDetails}
                selectedProgram={selectedProgram}
                selectedYear={selectedYear}
                calculateWeightedScore={calculateWeightedScore}
              />
              <Button
                onClick={toggleYearLock}
                className={`gap-2 ${
                  isYearLocked
                    ? "bg-white/70 text-red-600 hover:bg-white/80 hover:text-red-700 border-2 border-red-300"
                    : "bg-white/70 text-green-600 hover:bg-white/80 hover:text-green-700 border-2 border-green-300"
                }`}
              >
                {isYearLocked ? (
                  <>
                    <Lock className="h-5 w-5" />
                    Unlock Year
                  </>
                ) : (
                  <>
                    <LockOpen className="h-5 w-5" />
                    Lock Year
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {isYearLocked && (
          <div className="mx-6 mb-6 bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center gap-3 shadow-lg">
            <Lock className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-bold text-red-900">Academic Year {selectedYear} is Locked</p>
              <p className="text-sm text-red-700">All modifications are disabled. Click "Unlock Year" to enable editing.</p>
            </div>
          </div>
        )}

        <div className="px-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="clo">CLOs</TabsTrigger>
            <TabsTrigger value="plo">PLOs</TabsTrigger>
            <TabsTrigger value="assessments">PLO Results</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-t-4 border-t-amber-700">
                <CardContent className="pt-6">
                  <div className="text-sm font-bold text-amber-800 uppercase mb-4">Total PLOs</div>
                  <div className="text-4xl font-bold text-gray-900">{plos.length}</div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-green-600">
                <CardContent className="pt-6">
                  <div className="text-sm font-bold text-green-700 uppercase mb-4">Average Score</div>
                  <div className="text-4xl font-bold text-gray-900">
                    {plos.length > 0
                      ? `${(plos.reduce((sum, plo) => sum + calculateWeightedScore(plo.id, "PLO"), 0) / plos.length).toFixed(1)}%`
                      : "0%"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-green-600">
                <CardContent className="pt-6">
                  <div className="text-sm font-bold text-green-700 uppercase mb-4">Achieved Count</div>
                  <div className="text-4xl font-bold text-gray-900">
                    {plos.filter(plo => calculateWeightedScore(plo.id, "PLO") >= plo.targetValue).length}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-orange-500">
                <CardContent className="pt-6">
                  <div className="text-sm font-bold text-orange-600 uppercase mb-4">Needs Improvement</div>
                  <div className="text-4xl font-bold text-gray-900">
                    {plos.filter(plo => calculateWeightedScore(plo.id, "PLO") < plo.targetValue).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-t-4 border-t-purple-600">
                <CardContent className="pt-6">
                  <div className="text-sm font-bold text-purple-600 uppercase mb-4">Best PLO</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {plos.length > 0
                      ? plos.reduce((best, plo) =>
                          calculateWeightedScore(plo.id, "PLO") > calculateWeightedScore(best.id, "PLO") ? plo : best
                        ).code
                      : "N/A"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-red-600">
                <CardContent className="pt-6">
                  <div className="text-sm font-bold text-red-600 uppercase mb-4">Worst PLO</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {plos.length > 0
                      ? plos.reduce((worst, plo) =>
                          calculateWeightedScore(plo.id, "PLO") < calculateWeightedScore(worst.id, "PLO") ? plo : worst
                        ).code
                      : "N/A"}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>PLO Progress</CardTitle>
                  <CardDescription>Distribution of PLO achievement status</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getPLOProgressData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getPLOProgressData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Year-over-Year Performance</CardTitle>
                  <CardDescription>Average assessment scores by academic year</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getYearComparisonData()}>
                      <CartesianGrid key="grid" strokeDasharray="3 3" />
                      <XAxis key="x-axis" dataKey="year" />
                      <YAxis key="y-axis" domain={[0, 100]} />
                      <Tooltip key="tooltip" />
                      <Legend key="legend" />
                      <Line key="line" type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Learning Outcomes Performance</CardTitle>
                  <CardDescription>Current scores vs. targets</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={getOutcomeRadarData()}>
                      <PolarGrid key="grid" />
                      <PolarAngleAxis key="angle-axis" dataKey="outcome" />
                      <PolarRadiusAxis key="radius-axis" domain={[0, 100]} />
                      <Radar key="current-score" name="Current Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <Radar key="target" name="Target" dataKey="target" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                      <Legend key="legend" />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

<TabsContent value="programs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2>Programs Management</h2>
              <div className="flex gap-3">
                <ManageYearsDialog
                  isOpen={isManageYearsOpen}
                  setIsOpen={setIsManageYearsOpen}
                  academicYears={academicYears}
                  onAddYear={addAcademicYear}
                  onDeleteYear={deleteAcademicYear}
                  lockedYears={lockedYears}
                  selectedYear={selectedYear}
                />
                <AddProgramDialog
                  isOpen={isAddProgramOpen}
                  setIsOpen={setIsAddProgramOpen}
                  onAdd={addProgram}
                  departments={departments}
                  selectedDepartment={loggedInDepartment}
                />
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assessments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrograms.map((program) => {

                      const department = departments.find((d) => d.id === program.departmentId);
                      const programAssessments = assessments.filter((a) => a.programId === program.id);
                      return (
                        <TableRow key={program.id}>
                          <TableCell>{program.name}</TableCell>
                          <TableCell>{department?.name}</TableCell>
                          <TableCell>{programAssessments.length}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingProgram(program);
                                  setIsEditProgramOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${program.name}"? This will also delete all related assessments.`)) {
                                    deleteProgram(program.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <EditProgramDialog
              isOpen={isEditProgramOpen}
              setIsOpen={setIsEditProgramOpen}
              onUpdate={updateProgram}
              departments={departments}
              program={editingProgram}
            />
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2>Courses Management</h2>
              <div className="flex gap-3">
                <ImportCoursesDialog
                  isOpen={isImportCoursesOpen}
                  setIsOpen={setIsImportCoursesOpen}
                  onImport={handleImportCourses}
                />
                <AddCourseDialog
                  isOpen={isAddCourseOpen}
                  setIsOpen={setIsAddCourseOpen}
                  onAdd={addCourse}
                  programs={filteredPrograms}
                  selectedProgram={selectedProgram}
                />
              </div>
            </div>
            <Card>
              
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Code</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses
                      .filter((course) => filteredPrograms.find((p) => p.id === course.programId))
                      .map((course) => {
                        const program = programs.find((p) => p.id === course.programId);

                        return (
                          <TableRow key={course.id}>
                            <TableCell className="font-medium">{course.code}</TableCell>
                            <TableCell>{course.name}</TableCell>
                            <TableCell>{program?.name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingCourse(course);
                                    setIsEditCourseOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete "${course.name}"?`)) {
                                      deleteCourse(course.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <EditCourseDialog
              isOpen={isEditCourseOpen}
              setIsOpen={setIsEditCourseOpen}
              onUpdate={updateCourse}
              programs={filteredPrograms}
              course={editingCourse}
            />
            
          </TabsContent>
          <TabsContent value="clo" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2>Class Learning Outcomes (CLOs)</h2>
              <div className="flex gap-3">
                <ManageCLOTargetsDialog
                  isOpen={isManageCLOTargetsOpen}
                  setIsOpen={setIsManageCLOTargetsOpen}
                  clos={clos.filter((clo: any) => {
                    const course = courses.find((c) => c.id === clo.courseId);
                    return course && String(course.programId) === String(selectedProgram);
                  })}
                  courses={courses}
                  selectedYear={selectedYear}
                  onSaveTarget={upsertCLOTarget}
                  onDeleteTarget={deleteCLOTarget}
                  isDisabled={isYearLocked}
                />
                <ImportCLOsDialog
                  isOpen={isImportCLOsOpen}
                  setIsOpen={setIsImportCLOsOpen}
                  onImport={handleImportCLOs}
                />
                <AddCLODialog
                  isOpen={isAddCLOOpen}
                  setIsOpen={setIsAddCLOOpen}
                  onAdd={addCLO}
               courses={courses.filter((c) =>
  c.programId &&
  selectedProgram &&
  String(c.programId) === String(selectedProgram)
)}               
 plos={plos}
                  isDisabled={isYearLocked}
                />
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>PLO</TableHead>
                      <TableHead>Achieve</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                     <TableBody>
                    
{clos
  .filter((clo: any) => {
    const course = courses.find((c) => c.id === clo.courseId);
    return course && course.programId === selectedProgram;
  })
.map((clo: any) => {
  const course = coursesMap[String(clo.courseId)];
  const plo = plosMap[String(clo.ploId)];

                        const achieved = clo.achievement >= clo.targetValue;
                        return (
                          <TableRow key={clo.id}>
                            <TableCell className="font-medium">{course?.code || "N/A"}</TableCell>
                            <TableCell>{clo.code}</TableCell>
                            <TableCell>{plo?.code || "N/A"}</TableCell>
                            <TableCell>{clo.achievement}%</TableCell>
                            <TableCell>{clo.weight}</TableCell>
                            <TableCell>
                              <Badge
                                className={`w-32 justify-center ${achieved ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-orange-100 text-orange-800 hover:bg-orange-200"}`}
                              >
                                {achieved ? "Achieved" : "Not Achieved"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteCLO(clo.id)}
                                disabled={isYearLocked}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                     
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plo" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2>Program Learning Outcomes (PLOs)</h2>
              <div className="flex gap-3">
                <ManagePLOTargetsDialog
                  isOpen={isManagePLOTargetsOpen}
                  setIsOpen={setIsManagePLOTargetsOpen}
                  plos={visiblePLOs}
                  selectedYear={selectedYear}
                  onSaveTarget={upsertPLOTarget}
                  onDeleteTarget={deletePLOTarget}
                  isDisabled={isYearLocked}
                />
                <ImportIndirectPLODialog
                  isOpen={isImportIndirectPLOOpen}
                  setIsOpen={setIsImportIndirectPLOOpen}
                  onImport={handleImportIndirectPLO}
                  isDisabled={isYearLocked}
                />
                <AddPLODialog isOpen={isAddPLOOpen} setIsOpen={setIsAddPLOOpen} onAdd={addPLO} isDisabled={isYearLocked} />
              </div>
            </div>
            <EditPLODialog isOpen={isEditPLOOpen} setIsOpen={setIsEditPLOOpen} onEdit={editPLO} plo={editingPLO} isDisabled={isYearLocked} />
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Current Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
{visiblePLOs.map((plo) => {

  const score = calculateWeightedScore(plo.id, "PLO");
  const achieved = score >= plo.targetValue;

                      
                      return (
                        <TableRow key={plo.id}>
                          <TableCell>{plo.code}</TableCell>
                          <TableCell>{plo.description}</TableCell>
                          <TableCell>{plo.targetValue}%</TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div>{score}%</div>
                              <Progress value={score} className="h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`w-32 justify-center ${achieved ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-orange-600 text-white hover:bg-orange-700"}`}>
                              {achieved ? "Achieved" : "Not Achieved"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingPLO(plo);
                                  setIsEditPLOOpen(true);
                                }}
                                disabled={isYearLocked}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deletePLO(plo.id)} disabled={isYearLocked}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2>PLO Results</h2>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PLO</TableHead>
                      <TableHead>Direct %</TableHead>
                      <TableHead>Indirect %</TableHead>
                      <TableHead>Total %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                   {getSelectedYearPLOResultsData().map((result) => {
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.code}</TableCell>
                          <TableCell>{result.direct.toFixed(1)}%</TableCell>
                          <TableCell>{result.indirect.toFixed(1)}%</TableCell>
                          <TableCell className="font-semibold">{result.total.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Badge
                              className={`w-32 justify-center ${result.achieved ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-orange-600 text-white hover:bg-orange-700"}`}
                            >
                              {result.achieved ? "Achieved" : "Not Achieved"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indirect Total (Average of 4 Surveys)</CardTitle>
                <CardDescription>Faculty, Alumni, Employers, and Exit Interviews for {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={getSelectedYearPLOResultsData()}>
                    <CartesianGrid key="grid" strokeDasharray="3 3" />
                    <XAxis key="x-axis" dataKey="code" />
                    <YAxis key="y-axis" domain={[0, 100]} />
                    <Tooltip key="tooltip" formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
                    <Legend key="legend" />
                    <Bar key="indirect-bar" dataKey="indirect" name="Indirect Total %" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar key="target-bar" dataKey="target" name="Target %" fill="#64748b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detailed Indirect Surveys Table</CardTitle>
                <CardDescription>Four survey columns and indirect total per PLO ({selectedYear})</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PLO</TableHead>
                        <TableHead>Faculty Survey</TableHead>
                        <TableHead>Alumni Survey</TableHead>
                        <TableHead>Employers Survey</TableHead>
                        <TableHead>Exit interviews Survey</TableHead>
                        <TableHead>Indirect total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSelectedYearIndirectDetailsData().map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.code}</TableCell>
                          <TableCell>{row.faculty === null ? "-" : `${row.faculty.toFixed(1)}%`}</TableCell>
                          <TableCell>{row.alumni === null ? "-" : `${row.alumni.toFixed(1)}%`}</TableCell>
                          <TableCell>{row.employers === null ? "-" : `${row.employers.toFixed(1)}%`}</TableCell>
                          <TableCell>{row.exitInterviews === null ? "-" : `${row.exitInterviews.toFixed(1)}%`}</TableCell>
                          <TableCell className="font-semibold">{row.indirectTotal.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detailed Indirect Surveys Chart</CardTitle>
                <CardDescription>Faculty, Alumni, Employers, Exit interviews, and total by PLO ({selectedYear})</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={getSelectedYearIndirectDetailsData().map((item) => ({
                      ...item,
                      faculty: item.faculty ?? 0,
                      alumni: item.alumni ?? 0,
                      employers: item.employers ?? 0,
                      exitInterviews: item.exitInterviews ?? 0,
                    }))}
                  >
                    <CartesianGrid key="grid" strokeDasharray="3 3" />
                    <XAxis key="x-axis" dataKey="code" />
                    <YAxis key="y-axis" domain={[0, 100]} />
                    <Tooltip key="tooltip" formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
                    <Legend key="legend" />
                    <Bar key="faculty-bar" dataKey="faculty" name="Faculty" fill="#1d4ed8" />
                    <Bar key="alumni-bar" dataKey="alumni" name="Alumni" fill="#0ea5e9" />
                    <Bar key="employers-bar" dataKey="employers" name="Employers" fill="#10b981" />
                    <Bar key="exit-interviews-bar" dataKey="exitInterviews" name="Exit interviews" fill="#f97316" />
                    <Bar key="indirect-total-bar" dataKey="indirectTotal" name="Indirect total" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-3">
                  Rows imported from old template (Indirect only) will show 0 in detailed chart columns.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Assessment Type Distribution</CardTitle>
                      <CardDescription>Comparison of direct vs. indirect assessments</CardDescription>
                    </div>
                    <div className="w-48">
                      <Label className="text-sm font-medium mb-2 block">Select Year</Label>
                      <Select value={analyticsSelectedYear} onValueChange={setAnalyticsSelectedYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYears.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={(() => {
                        const directAssessments = assessments.filter(
                          (a) => a.type === "direct" && a.programId === selectedProgram && a.academicYear === analyticsSelectedYear
                        );
                        const indirectAssessments = assessments.filter(
                          (a) => a.type === "indirect" && a.programId === selectedProgram && a.academicYear === analyticsSelectedYear
                        );

                        const directAvg = directAssessments.length > 0
                          ? directAssessments.reduce((sum, a) => sum + a.value, 0) / directAssessments.length
                          : 0;

                        const indirectAvg = indirectAssessments.length > 0
                          ? indirectAssessments.reduce((sum, a) => sum + a.value, 0) / indirectAssessments.length
                          : 0;

                        const total = (directAvg * 0.6) + (indirectAvg * 0.4);

                        return [
                          {
                            id: "direct",
                            type: "Direct (60%)",
                            score: Math.round(directAvg),
                          },
                          {
                            id: "indirect",
                            type: "Indirect (40%)",
                            score: Math.round(indirectAvg),
                          },
                          {
                            id: "total",
                            type: "Total",
                            score: Math.round(total),
                          },
                        ];
                      })()}
                    >
                      <CartesianGrid key="grid" strokeDasharray="3 3" />
                      <XAxis key="x-axis" dataKey="type" />
                      <YAxis key="y-axis" domain={[0, 100]} />
                      <Tooltip key="tooltip" />
                      <Legend key="legend" />
                      <Bar key="bar" dataKey="score" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Select Years for Comparison</CardTitle>
                  <CardDescription>Choose 2 or more academic years to compare</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {academicYears.map((year) => (
                      <label
                        key={year}
                        className="flex items-center space-x-3 p-2.5 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={comparisonYears.includes(year)}
                          onChange={() => toggleComparisonYear(year)}
                          className="h-4 w-4 text-amber-700 rounded focus:ring-2 focus:ring-amber-600"
                        />
                        <span className="font-medium text-sm">{year}</span>
                      </label>
                    ))}
                  </div>
                  {comparisonYears.length < 2 && (
                    <p className="text-sm text-orange-600">
                      Please select at least 2 years for comparison
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    Selected: {comparisonYears.length} year{comparisonYears.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multi-Year Comparison</CardTitle>
                  <CardDescription>
                    Performance trends for selected years ({comparisonYears.length} year{comparisonYears.length !== 1 ? 's' : ''} selected)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {comparisonYears.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={getYearComparisonData()}>
                        <CartesianGrid key="grid" strokeDasharray="3 3" />
                        <XAxis key="x-axis" dataKey="year" />
                        <YAxis key="y-axis" domain={[0, 100]} />
                        <Tooltip key="tooltip" />
                        <Legend key="legend" />
                        <Bar key="bar" dataKey="score" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-gray-500">
                      Please select at least one year to display the comparison chart
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>PLO Performance Comparison</CardTitle>
                  <CardDescription>Direct, Indirect, Total, and Target for each PLO ({analyticsSelectedYear})</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getPLOHeatmapData()}>
                      <CartesianGrid key="grid" strokeDasharray="3 3" />
                      <XAxis key="x-axis" dataKey="code" />
                      <YAxis key="y-axis" domain={[0, 100]} />
                      <Tooltip key="tooltip" />
                      <Legend key="legend" />
                      <Bar key="direct-bar" dataKey="direct" name="Direct %" fill="#3b82f6" />
                      <Bar key="indirect-bar" dataKey="indirect" name="Indirect %" fill="#f59e0b" />
                      <Bar key="total-bar" dataKey="total" name="Total %" fill="#10b981" />
                      <Bar key="target-bar" dataKey="target" name="Target %" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>PLO Heatmap</CardTitle>
                  <CardDescription>Performance breakdown by assessment type for {analyticsSelectedYear}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold">PLO</TableHead>
                          <TableHead className="font-bold">Direct %</TableHead>
                          <TableHead className="font-bold">Indirect %</TableHead>
                          <TableHead className="font-bold">Total %</TableHead>
                          <TableHead className="font-bold">Target</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPLOHeatmapData().map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium">{row.code}</TableCell>
                            <TableCell className={`${getHeatmapColor(row.direct, row.target)} font-semibold`}>
                              {row.direct.toFixed(1)}%
                            </TableCell>
                            <TableCell className={`${getHeatmapColor(row.indirect, row.target)} font-semibold`}>
                              {row.indirect.toFixed(1)}%
                            </TableCell>
                            <TableCell className={`${getHeatmapColor(row.total, row.target)} font-semibold`}>
                              {row.total.toFixed(1)}%
                            </TableCell>
                            <TableCell className="font-medium">{row.target}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Indirect Surveys Dashboard</CardTitle>
                  <CardDescription>Faculty, Alumni, Employers, Exit interviews, and total by PLO ({analyticsSelectedYear})</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart
                      data={getIndirectDetailsDataForYear(analyticsSelectedYear).map((item) => ({
                        ...item,
                        faculty: item.faculty ?? 0,
                        alumni: item.alumni ?? 0,
                        employers: item.employers ?? 0,
                        exitInterviews: item.exitInterviews ?? 0,
                      }))}
                    >
                      <CartesianGrid key="grid" strokeDasharray="3 3" />
                      <XAxis key="x-axis" dataKey="code" />
                      <YAxis key="y-axis" domain={[0, 100]} />
                      <Tooltip key="tooltip" formatter={(value: number) => `${Number(value).toFixed(1)}%`} />
                      <Legend key="legend" />
                      <Bar key="analytics-faculty-bar" dataKey="faculty" name="Faculty" fill="#1d4ed8" />
                      <Bar key="analytics-alumni-bar" dataKey="alumni" name="Alumni" fill="#0ea5e9" />
                      <Bar key="analytics-employers-bar" dataKey="employers" name="Employers" fill="#10b981" />
                      <Bar key="analytics-exit-interviews-bar" dataKey="exitInterviews" name="Exit interviews" fill="#f97316" />
                      <Bar key="analytics-indirect-total-bar" dataKey="indirectTotal" name="Indirect total" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}

function AddProgramDialog({ isOpen, setIsOpen, onAdd, departments, selectedDepartment }: any) {
  const [name, setName] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState(selectedDepartment);

  const handleSubmit = () => {
    if (name && departmentId) {
      onAdd(name, departmentId);
      setName("");
      setDepartmentId(selectedDepartment);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Program
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Program</DialogTitle>
          <DialogDescription>Create a new program</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">Program Name</Label>
            <Input
              id="program-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Architecture Program"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-department">Department</Label>
            <Input
              id="program-department"
              value={departments?.find((d: any) => d.id === departmentId)?.name || ""}
              disabled
              className="bg-gray-100"
            />
            <p className="text-xs text-muted-foreground">Programs can only be created in your department</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Add Program</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProgramDialog({ isOpen, setIsOpen, onUpdate, departments, program }: any) {
  const [name, setName] = React.useState(program?.name || "");
  const [departmentId, setDepartmentId] = React.useState(program?.departmentId || "");

  React.useEffect(() => {
    if (program) {
      setName(program.name);
      setDepartmentId(program.departmentId);
    }
  }, [program]);

  const handleSubmit = () => {
    if (name && departmentId && program) {
      onUpdate(program.id, name, departmentId);
      setName("");
      setDepartmentId("");
    }
  };

  if (!program) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Program</DialogTitle>
          <DialogDescription>Update program information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-program-name">Program Name</Label>
            <Input
              id="edit-program-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Architecture Program"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-program-department">Department</Label>
            <Input
              id="edit-program-department"
              value={departments?.find((d: any) => d.id === departmentId)?.name || ""}
              disabled
              className="bg-gray-100"
            />
            <p className="text-xs text-muted-foreground">Department cannot be changed</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Update Program</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCLODialog({ isOpen, setIsOpen, onAdd, courses, plos, isDisabled }: any) {
  const [courseId, setCourseId] = React.useState(courses?.[0]?.id || "");
  const [ploId, setPloId] = React.useState(plos?.[0]?.id || "");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [achievement, setAchievement] = React.useState("");
  const [weight, setWeight] = React.useState("");

  const handleSubmit = () => {
    if (!courseId || !ploId) {
  alert("Choose Course and PLO");
  return;
}
    if (courseId && ploId && description && achievement && weight) {
      onAdd(code || description, description, courseId, ploId, parseFloat(achievement), parseFloat(weight));
      setCourseId(courses?.[0]?.id || "");
      setPloId(plos?.[0]?.id || "");
      setCode("");
      setDescription("");
      setAchievement("");
      setWeight("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={isDisabled}>
          <Plus className="mr-2 h-4 w-4" />
          Add CLO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Class Learning Outcome (CLO)</DialogTitle>
          <DialogDescription>Create a new class-level learning outcome</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clo-course">Select Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="clo-course">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course: any) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clo-plo">PLO</Label>
            <Select value={ploId} onValueChange={setPloId}>
              <SelectTrigger id="clo-plo">
                <SelectValue placeholder="Select PLO" />
              </SelectTrigger>
              <SelectContent>
                {plos?.map((plo: any) => (
                  <SelectItem key={plo.id} value={plo.id}>
                    {plo.code}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="clo-description">CLO Description</Label>
            <Input
              id="clo-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="CLO 1.1.1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clo-achievement">Achievement %</Label>
            <Input
              id="clo-achievement"
              type="number"
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              placeholder="88"
              min="0"
              max="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clo-weight">Weight</Label>
            <Input
              id="clo-weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="10"
              min="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Add CLO</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPLODialog({ isOpen, setIsOpen, onAdd, isDisabled }: any) {
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [target, setTarget] = React.useState("70");

  const handleSubmit = () => {
    if (code && description && target) {
      onAdd(code, description, parseInt(target));
      setCode("");
      setDescription("");
      setTarget("70");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={isDisabled}>
          <Plus className="mr-2 h-4 w-4" />
          Add PLO
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Program Learning Outcome</DialogTitle>
          <DialogDescription>Create a new program-level learning outcome</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plo-code">Code</Label>
            <Input id="plo-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="PLO-1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plo-description">Description</Label>
            <Input
              id="plo-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Learning outcome description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plo-target">Target Value (%)</Label>
            <Input
              id="plo-target"
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="70"
              min="0"
              max="100"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Add PLO</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPLODialog({ isOpen, setIsOpen, onEdit, plo, isDisabled }: any) {
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [target, setTarget] = React.useState("70");

  React.useEffect(() => {
    if (plo) {
      setCode(plo.code);
      setDescription(plo.description);
      setTarget(plo.targetValue.toString());
    }
  }, [plo]);

  const handleSubmit = () => {
    if (plo && code && description && target) {
      onEdit(plo.id, code, description, parseInt(target));
      setCode("");
      setDescription("");
      setTarget("70");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Program Learning Outcome</DialogTitle>
          <DialogDescription>Update the program-level learning outcome</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-plo-code">Code</Label>
            <Input id="edit-plo-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="PLO-1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-plo-description">Description</Label>
            <Input
              id="edit-plo-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Learning outcome description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-plo-target">Target Value (%)</Label>
            <Input
              id="edit-plo-target"
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="70"
              min="0"
              max="100"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Update PLO</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageCLOTargetsDialog({
  isOpen,
  setIsOpen,
  clos,
  courses,
  selectedYear,
  onSaveTarget,
  onDeleteTarget,
  isDisabled,
}: any) {
  const [targetInputs, setTargetInputs] = React.useState<Record<string, string>>({});
  const [bulkTarget, setBulkTarget] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, string> = {};
    (clos || []).forEach((clo: any) => {
      initial[String(clo.id)] = String(clo.targetValue ?? "");
    });
    setTargetInputs(initial);
  }, [isOpen, clos]);

  const handleSave = async (cloId: string) => {
    const value = Number(targetInputs[cloId]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error("Target must be a number between 0 and 100");
      return;
    }
    await onSaveTarget(cloId, value);
  };

  const handleDelete = async (cloId: string) => {
    await onDeleteTarget(cloId);
  };

  const applyBulkToAll = () => {
    const value = Number(bulkTarget);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error("Target must be a number between 0 and 100");
      return;
    }

    const next: Record<string, string> = {};
    (clos || []).forEach((clo: any) => {
      next[String(clo.id)] = String(value);
    });
    setTargetInputs(next);
    toast.success("Applied target to all CLO rows");
  };

  const saveAllTargets = async () => {
    for (const clo of clos || []) {
      const cloId = String(clo.id);
      const value = Number(targetInputs[cloId]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        toast.error(`Invalid target for ${clo.code}`);
        return;
      }
    }

    for (const clo of clos || []) {
      const cloId = String(clo.id);
      const value = Number(targetInputs[cloId]);
      await onSaveTarget(cloId, value, true);
    }

    toast.success("Saved all CLO targets");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isDisabled}>
          <Target className="mr-2 h-4 w-4" />
          CLO Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>CLO Targets Management</DialogTitle>
          <DialogDescription>Manage CLO targets for academic year {selectedYear}</DialogDescription>
        </DialogHeader>
        <div className="flex items-end gap-2 border rounded-md p-3 bg-muted/30">
          <div className="space-y-1">
            <Label>Bulk Target (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={bulkTarget}
              onChange={(e) => setBulkTarget(e.target.value)}
              placeholder="70"
              className="w-32"
            />
          </div>
          <Button type="button" variant="outline" onClick={applyBulkToAll}>
            Apply to All
          </Button>
          <Button type="button" onClick={saveAllTargets}>
            Save All
          </Button>
        </div>
        <div className="max-h-[55vh] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>CLO</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clos || []).map((clo: any) => {
                const course = (courses || []).find((c: any) => String(c.id) === String(clo.courseId));
                return (
                  <TableRow key={clo.id}>
                    <TableCell>{course?.code || "N/A"}</TableCell>
                    <TableCell>{clo.code}</TableCell>
                    <TableCell>{clo.targetValue}%</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={targetInputs[String(clo.id)] ?? ""}
                        onChange={(e) =>
                          setTargetInputs((prev) => ({
                            ...prev,
                            [String(clo.id)]: e.target.value,
                          }))
                        }
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleSave(String(clo.id))}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(String(clo.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManagePLOTargetsDialog({
  isOpen,
  setIsOpen,
  plos,
  selectedYear,
  onSaveTarget,
  onDeleteTarget,
  isDisabled,
}: any) {
  const [targetInputs, setTargetInputs] = React.useState<Record<string, string>>({});
  const [bulkTarget, setBulkTarget] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, string> = {};
    (plos || []).forEach((plo: any) => {
      initial[String(plo.id)] = String(plo.targetValue ?? "");
    });
    setTargetInputs(initial);
  }, [isOpen, plos]);

  const handleSave = async (ploId: string) => {
    const value = Number(targetInputs[ploId]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error("Target must be a number between 0 and 100");
      return;
    }
    await onSaveTarget(ploId, value);
  };

  const handleDelete = async (ploId: string) => {
    await onDeleteTarget(ploId);
  };

  const applyBulkToAll = () => {
    const value = Number(bulkTarget);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error("Target must be a number between 0 and 100");
      return;
    }

    const next: Record<string, string> = {};
    (plos || []).forEach((plo: any) => {
      next[String(plo.id)] = String(value);
    });
    setTargetInputs(next);
    toast.success("Applied target to all PLO rows");
  };

  const saveAllTargets = async () => {
    for (const plo of plos || []) {
      const ploId = String(plo.id);
      const value = Number(targetInputs[ploId]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        toast.error(`Invalid target for ${plo.code}`);
        return;
      }
    }

    for (const plo of plos || []) {
      const ploId = String(plo.id);
      const value = Number(targetInputs[ploId]);
      await onSaveTarget(ploId, value, true);
    }

    toast.success("Saved all PLO targets");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isDisabled}>
          <Target className="mr-2 h-4 w-4" />
          PLO Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>PLO Targets Management</DialogTitle>
          <DialogDescription>Manage PLO targets for academic year {selectedYear}</DialogDescription>
        </DialogHeader>
        <div className="flex items-end gap-2 border rounded-md p-3 bg-muted/30">
          <div className="space-y-1">
            <Label>Bulk Target (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={bulkTarget}
              onChange={(e) => setBulkTarget(e.target.value)}
              placeholder="70"
              className="w-32"
            />
          </div>
          <Button type="button" variant="outline" onClick={applyBulkToAll}>
            Apply to All
          </Button>
          <Button type="button" onClick={saveAllTargets}>
            Save All
          </Button>
        </div>
        <div className="max-h-[55vh] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(plos || []).map((plo: any) => (
                <TableRow key={plo.id}>
                  <TableCell>{plo.code}</TableCell>
                  <TableCell>{plo.description}</TableCell>
                  <TableCell>{plo.targetValue}%</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={targetInputs[String(plo.id)] ?? ""}
                      onChange={(e) =>
                        setTargetInputs((prev) => ({
                          ...prev,
                          [String(plo.id)]: e.target.value,
                        }))
                      }
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handleSave(String(plo.id))}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(String(plo.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportIndirectPLODialog({ isOpen, setIsOpen, onImport, isDisabled }: any) {
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        onImport(jsonData);
        setIsOpen(false);

        if (fileRef.current) {
          fileRef.current.value = "";
        }
      } catch (error) {
        toast.error("Error reading file");
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
          Import Indirect PLO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Indirect PLO Assessments</DialogTitle>
          <DialogDescription>
            Upload an Excel file with indirect assessment data for PLOs
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label htmlFor="indirect-plo-file">Excel File</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="w-full"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Choose File
              </Button>
              <input
                ref={fileRef}
                id="indirect-plo-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Required columns: PLO, Faculty Survey, Alumni Survey, Employers Survey, Exit interviews Survey, Year (optional)
            </p>
            <p className="text-xs text-muted-foreground">
              Example: PLO: PLO-1, Faculty: 85, Alumni: 82, Employers: 80, Exit interviews: 84, Year: 2024-2025
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAssessmentDialog({ isOpen, setIsOpen, onAdd, programs, clos, plos, academicYears, isDisabled }: any) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"direct" | "indirect">("direct");
  const [weight, setWeight] = React.useState("50");
  const [value, setValue] = React.useState("75");
  const [year, setYear] = React.useState(academicYears?.[academicYears.length - 1] || "2024-2025");
  const [programId, setProgramId] = React.useState(programs?.[0]?.id || "");
  const [outcomeType, setOutcomeType] = React.useState<"CLO" | "PLO">("CLO");
  const [outcomeId, setOutcomeId] = React.useState(clos?.[0]?.id || "");

  const handleSubmit = () => {
    if (name && weight && value && year && programId && outcomeId) {
      onAdd({
        name,
        type,
        weight: parseInt(weight),
        value: parseInt(value),
        academicYear: year,
        programId,
        outcomeType,
        outcomeId,
      });
      setName("");
      setWeight("50");
      setValue("75");
    }
  };

  const outcomes = outcomeType === "CLO" ? clos : plos;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={isDisabled}>
          <Plus className="mr-2 h-4 w-4" />
          Add Assessment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Assessment</DialogTitle>
          <DialogDescription>Create a new learning outcome assessment</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assessment-name">Assessment Name</Label>
            <Input
              id="assessment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Final Project"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assessment-type">Type</Label>
            <Select value={type} onValueChange={(v: "direct" | "indirect") => setType(v)}>
              <SelectTrigger id="assessment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="indirect">Indirect</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="outcome-type">Outcome Type</Label>
            <Select
              value={outcomeType}
              onValueChange={(v: "CLO" | "PLO") => {
                setOutcomeType(v);
                setOutcomeId(v === "CLO" ? clos?.[0]?.id || "" : plos?.[0]?.id || "");
              }}
            >
              <SelectTrigger id="outcome-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLO">Course Learning Outcome</SelectItem>
                <SelectItem value="PLO">Program Learning Outcome</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="outcome">Outcome</Label>
            <Select value={outcomeId} onValueChange={setOutcomeId}>
              <SelectTrigger id="outcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {outcomes?.map((outcome: any) => (
                  <SelectItem key={outcome.id} value={outcome.id}>
                    {outcome.code} - {outcome.description}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (%)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="50"
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Score (%)</Label>
              <Input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="75"
                min="0"
                max="100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Academic Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {academicYears?.map((y: string) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Add Assessment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageYearsDialog({ isOpen, setIsOpen, academicYears, onAddYear, onDeleteYear, lockedYears, selectedYear }: any) {
  const [newYear, setNewYear] = React.useState("");
  const [startYear, setStartYear] = React.useState("");
  const [endYear, setEndYear] = React.useState("");

  const handleAddYear = () => {
    if (startYear && endYear) {
      const start = parseInt(startYear);
      const end = parseInt(endYear);
      if (end !== start + 1) {
        alert("End year must be exactly one year after start year");
        return;
      }
      const yearString = `${start}-${end}`;
      onAddYear(yearString);
      setStartYear("");
      setEndYear("");
      setNewYear("");
    }
  };

  React.useEffect(() => {
    if (startYear && startYear.length === 4) {
      const start = parseInt(startYear);
      if (!isNaN(start)) {
        setEndYear((start + 1).toString());
      }
    }
  }, [startYear]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BookOpen className="mr-2 h-4 w-4" />
          Manage Academic Years
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Academic Years</DialogTitle>
          <DialogDescription>
            Add or remove academic years from the system
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Add New Academic Year</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-year">Start Year</Label>
                <Input
                  id="start-year"
                  type="number"
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  placeholder="2025"
                  min="2000"
                  max="2100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-year">End Year</Label>
                <Input
                  id="end-year"
                  type="number"
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  placeholder="2026"
                  min="2000"
                  max="2100"
                />
              </div>
            </div>
            <Button onClick={handleAddYear} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Year {startYear && endYear ? `(${startYear}-${endYear})` : ""}
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Existing Academic Years</h3>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {academicYears.map((year: string) => {
                const isLocked = lockedYears.includes(year);
                const isCurrent = selectedYear === year;
                const hasAssessments = true; // You might want to pass this as a prop

                return (
                  <div
                    key={year}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isCurrent ? "border-amber-600 bg-amber-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{year}</span>
                      {isCurrent && (
                        <Badge variant="default">Current</Badge>
                      )}
                      {isLocked && (
                        <Badge variant="destructive">
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteYear(year)}
                      disabled={isLocked || isCurrent}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Note: You cannot delete locked years or the currently selected year
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCourseDialog({ isOpen, setIsOpen, onAdd, programs, selectedProgram }: any) {
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [programId, setProgramId] = React.useState(selectedProgram);

  React.useEffect(() => {
    if (selectedProgram) {
      setProgramId(selectedProgram);
    }
  }, [selectedProgram]);

  const handleSubmit = () => {
    if (code && name && programId) {
      onAdd(code, name, programId);
      setCode("");
      setName("");
      setProgramId(selectedProgram);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Course</DialogTitle>
          <DialogDescription>Create a new course</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-code">Course Code</Label>
            <Input
              id="course-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ARCH101"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-name">Course Name</Label>
            <Input
              id="course-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Introduction to Architecture"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-program">Program</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger id="course-program">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {programs?.map((program: any) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Add Course</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCourseDialog({ isOpen, setIsOpen, onUpdate, programs, course }: any) {
  const [code, setCode] = React.useState(course?.code || "");
  const [name, setName] = React.useState(course?.name || "");
  const [programId, setProgramId] = React.useState(course?.programId || "");

  React.useEffect(() => {
    if (course) {
      setCode(course.code);
      setName(course.name);
      setProgramId(course.programId);
    }
  }, [course]);

  const handleSubmit = () => {
    if (code && name && programId && course) {
      onUpdate(course.id, code, name, programId);
      setCode("");
      setName("");
      setProgramId("");
    }
  };

  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>Update course information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-course-code">Course Code</Label>
            <Input
              id="edit-course-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ARCH101"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-course-name">Course Name</Label>
            <Input
              id="edit-course-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Introduction to Architecture"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-course-program">Program</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger id="edit-course-program">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {programs?.map((program: any) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Update Course</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportCoursesDialog({ isOpen, setIsOpen, onImport }: any) {
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        onImport(jsonData);
        setIsOpen(false);

        if (fileRef.current) {
          fileRef.current.value = "";
        }
      } catch (error) {
        toast.error("Error reading file");
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Courses from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file with course information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label htmlFor="courses-file">Excel File</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="w-full"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Choose File
              </Button>
              <input
                ref={fileRef}
                id="courses-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Required columns: Code, Name, Program (or ProgramId)
            </p>
            <p className="text-xs text-muted-foreground">
              Example: Code: ARCH101, Name: Introduction to Architecture, Program: Architecture Program
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportCLOsDialog({ isOpen, setIsOpen, onImport }: any) {
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
  header: 1,   // ✅ مهم جدًا
  defval: "",
});
console.log("RAW DATA:", jsonData);
console.log("✅ CLO IMPORT TRIGGERED:", jsonData.length, jsonData);
        const headers = jsonData[0] as string[];
const rows = jsonData.slice(1) as any[];

const formatted = rows.map((row: any) => {
  const obj: any = {};

  headers.forEach((h: string, i: number) => {
    obj[h.trim()] = row[i];
  });

  return obj;
});

onImport(formatted);
        setIsOpen(false);

        if (fileRef.current) {
          fileRef.current.value = "";
        }
      } catch (error) {
        toast.error("Error reading CLO file");
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  

return (

    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import CLOs from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file with Class Learning Outcomes data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
<Button
  type="button"
  variant="outline"
  className="w-full"
  onClick={() => document.getElementById("clos-file")?.click()}
>
  Choose File
</Button>

<input
  id="clos-file"
  type="file"
  accept=".xlsx,.xls"
  onChange={handleFile}
  style={{ display: "none" }}
/>
``
            <p className="text-sm text-muted-foreground">
              Required columns: Course Code or Course Name, PLO Code, CLO Description, Achievement (%), Weight
            </p>
            <p className="text-sm text-muted-foreground">
              Optional columns: Target (defaults to 75%)
            </p>
            <p className="text-xs text-muted-foreground">
              Missing rows are skipped. Non-existing Courses and PLOs are created automatically.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
