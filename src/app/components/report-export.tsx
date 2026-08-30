import * as React from "react";
import { Button } from "./ui/button";
import { FileDown, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, ImageRun, PageBreak, BorderStyle, ShadingType, VerticalAlign, Header, Footer } from "docx";
import { saveAs } from "file-saver";
import universityLogoUrl from "../../public/university-logo.png";

interface ReportExportProps {
  departments: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; departmentId: string }>;
  courses: Array<{ id: string; code: string; name: string; programId: string }>;
  clos: Array<{ id: string; code: string; description: string; courseId: string; targetValue: number; ploId?: string; achievement?: number; weight?: number }>;
  plos: Array<{ id: string; code: string; description: string; targetValue: number }>;
  assessments: Array<{
    id: string;
    type: "direct" | "indirect";
    name: string;
    weight: number;
    value: number;
    academicYear: string;
    programId: string;
    outcomeType: "CLO" | "PLO";
    outcomeId: string;
  }>;
  indirectSurveyDetails: Array<{
    id: string;
    ploId: string;
    programId: string;
    academicYear: string;
    faculty: number | null;
    alumni: number | null;
    employers: number | null;
    exitInterviews: number | null;
    indirectTotal: number;
  }>;
  selectedProgram: string;
  selectedYear: string;
  calculateWeightedScore: (outcomeId: string, outcomeType: "CLO" | "PLO") => number;
}

type PloResultRow = {
  code: string;
  description: string;
  direct: number;
  indirect: number;
  total: number;
  target: number;
  achieved: boolean;
};

const CHART_WIDTH = 920;
const CHART_HEIGHT = 420;
const REPORT_BACKGROUND_RGB = [255, 253, 245] as const;
const REPORT_BACKGROUND_HEX = "fffdf5";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const createParagraph = (text: string, options?: { bold?: boolean; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; spacingAfter?: number; spacingBefore?: number }) =>
  new Paragraph({
    alignment: options?.alignment,
    spacing: { after: options?.spacingAfter ?? 120, before: options?.spacingBefore ?? 0 },
    children: [new TextRun({ text, bold: options?.bold ?? false, size: 22, color: "1f2937" })],
  });

const createHeading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
  new Paragraph({
    heading: level,
    spacing: { before: 260, after: 140 },
    border: {
      bottom: {
        color: "d97706",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        color: level === HeadingLevel.HEADING_1 ? "92400e" : "b45309",
        size: level === HeadingLevel.HEADING_1 ? 30 : 26,
      }),
    ],
  });

const createBulletParagraph = (text: string) =>
  new Paragraph({
    spacing: { after: 80 },
    indent: { left: 280, hanging: 120 },
    children: [new TextRun({ text: `- ${text}`, size: 21, color: "374151" })],
  });

const createCaption = (text: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 180, before: 40 },
    children: [new TextRun({ text, italics: true, size: 20, color: "6b7280" })],
  });

const createTableCell = (text: string, bold = false) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold })],
      }),
    ],
  });

const createTextTable = (headers: string[], rows: string[][]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              shading: { type: ShadingType.CLEAR, fill: "b45309", color: "auto" },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 2, color: "92400e" },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: "92400e" },
                left: { style: BorderStyle.SINGLE, size: 2, color: "92400e" },
                right: { style: BorderStyle.SINGLE, size: 2, color: "92400e" },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: header, bold: true, color: "ffffff", size: 21 })],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (row, rowIndex) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  shading: rowIndex % 2 === 0
                    ? { type: ShadingType.CLEAR, fill: "fff7ed", color: "auto" }
                    : undefined,
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "d6d3d1" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "d6d3d1" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "d6d3d1" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "d6d3d1" },
                  },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: cell, size: 20, color: "1f2937" })],
                    }),
                  ],
                })
            ),
          })
      ),
    ],
  });

const normalizeToChartHeight = (value: number, maxValue: number, chartHeight: number) => {
  if (maxValue <= 0) return 0;
  return Math.max(0, Math.min(chartHeight, (value / maxValue) * chartHeight));
};

const toFiniteNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const buildBarChartSvg = (title: string, labels: string[], values: number[], color: string) => {
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const marginLeft = 70;
  const marginRight = 20;
  const marginTop = 50;
  const marginBottom = 70;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const maxValue = Math.max(100, ...values);
  const slotWidth = plotWidth / Math.max(labels.length, 1);
  const barWidth = Math.min(56, slotWidth * 0.6);
  const ticks = [0, 25, 50, 75, 100];

  const bars = labels
    .map((label, index) => {
      const value = values[index] ?? 0;
      const barHeight = normalizeToChartHeight(value, maxValue, plotHeight);
      const x = marginLeft + index * slotWidth + (slotWidth - barWidth) / 2;
      const y = marginTop + plotHeight - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="${color}" />
        <text x="${x + barWidth / 2}" y="${y - 8}" font-size="12" text-anchor="middle" fill="#1f2937">${value.toFixed(0)}%</text>
        <text x="${x + barWidth / 2}" y="${marginTop + plotHeight + 20}" font-size="12" text-anchor="middle" fill="#374151">${escapeXml(label)}</text>
      `;
    })
    .join("");

  const grid = ticks
    .map((tick) => {
      const y = marginTop + plotHeight - normalizeToChartHeight(tick, maxValue, plotHeight);
      return `
        <line x1="${marginLeft}" y1="${y}" x2="${width - marginRight}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />
        <text x="${marginLeft - 12}" y="${y + 4}" font-size="11" text-anchor="end" fill="#6b7280">${tick}</text>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="${width / 2}" y="28" font-size="22" font-weight="700" text-anchor="middle" fill="#111827">${escapeXml(title)}</text>
      ${grid}
      <line x1="${marginLeft}" y1="${marginTop + plotHeight}" x2="${width - marginRight}" y2="${marginTop + plotHeight}" stroke="#9ca3af" stroke-width="1.5" />
      ${bars}
    </svg>
  `;
};

const buildGroupedBarChartSvg = (title: string, labels: string[], series: Array<{ name: string; color: string; values: number[] }>) => {
  const width = CHART_WIDTH;
  const height = 460;
  const marginLeft = 70;
  const marginRight = 20;
  const marginTop = 60;
  const marginBottom = 90;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const maxValue = Math.max(100, ...series.flatMap((item) => item.values));
  const slotWidth = plotWidth / Math.max(labels.length, 1);
  const groupWidth = slotWidth * 0.8;
  const barWidth = Math.max(10, Math.min(22, groupWidth / Math.max(series.length, 1)));
  const ticks = [0, 25, 50, 75, 100];

  const bars = labels
    .map((label, index) => {
      const groupX = marginLeft + index * slotWidth + (slotWidth - groupWidth) / 2;
      const labelSvg = `<text x="${groupX + groupWidth / 2}" y="${marginTop + plotHeight + 20}" font-size="11" text-anchor="middle" fill="#374151">${escapeXml(label)}</text>`;
      const seriesSvg = series
        .map((item, seriesIndex) => {
          const value = item.values[index] ?? 0;
          const barHeight = normalizeToChartHeight(value, maxValue, plotHeight);
          const x = groupX + seriesIndex * barWidth;
          const y = marginTop + plotHeight - barHeight;
          return `
            <rect x="${x}" y="${y}" width="${barWidth - 2}" height="${barHeight}" rx="4" fill="${item.color}" />
          `;
        })
        .join("");
      return `${seriesSvg}${labelSvg}`;
    })
    .join("");

  const legend = series
    .map((item, index) => {
      const x = 90 + index * 180;
      return `
        <rect x="${x}" y="34" width="14" height="14" rx="2" fill="${item.color}" />
        <text x="${x + 22}" y="46" font-size="12" fill="#374151">${escapeXml(item.name)}</text>
      `;
    })
    .join("");

  const grid = ticks
    .map((tick) => {
      const y = marginTop + plotHeight - normalizeToChartHeight(tick, maxValue, plotHeight);
      return `
        <line x1="${marginLeft}" y1="${y}" x2="${width - marginRight}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />
        <text x="${marginLeft - 12}" y="${y + 4}" font-size="11" text-anchor="end" fill="#6b7280">${tick}</text>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="${width / 2}" y="28" font-size="22" font-weight="700" text-anchor="middle" fill="#111827">${escapeXml(title)}</text>
      ${legend}
      ${grid}
      <line x1="${marginLeft}" y1="${marginTop + plotHeight}" x2="${width - marginRight}" y2="${marginTop + plotHeight}" stroke="#9ca3af" stroke-width="1.5" />
      ${bars}
    </svg>
  `;
};

const buildLineChartSvg = (title: string, labels: string[], values: number[], color: string) => {
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const marginLeft = 70;
  const marginRight = 30;
  const marginTop = 50;
  const marginBottom = 70;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const maxValue = Math.max(100, ...values);
  const ticks = [0, 25, 50, 75, 100];

  const points = values
    .map((value, index) => {
      const x = marginLeft + (plotWidth * index) / Math.max(values.length - 1, 1);
      const y = marginTop + plotHeight - normalizeToChartHeight(value, maxValue, plotHeight);
      return `${x},${y}`;
    })
    .join(" ");

  const pointsSvg = values
    .map((value, index) => {
      const x = marginLeft + (plotWidth * index) / Math.max(values.length - 1, 1);
      const y = marginTop + plotHeight - normalizeToChartHeight(value, maxValue, plotHeight);
      return `
        <circle cx="${x}" cy="${y}" r="4" fill="${color}" />
        <text x="${x}" y="${y - 10}" font-size="11" text-anchor="middle" fill="#1f2937">${value.toFixed(0)}%</text>
      `;
    })
    .join("");

  const xLabels = labels
    .map((label, index) => {
      const x = marginLeft + (plotWidth * index) / Math.max(labels.length - 1, 1);
      return `<text x="${x}" y="${marginTop + plotHeight + 22}" font-size="12" text-anchor="middle" fill="#374151">${escapeXml(label)}</text>`;
    })
    .join("");

  const grid = ticks
    .map((tick) => {
      const y = marginTop + plotHeight - normalizeToChartHeight(tick, maxValue, plotHeight);
      return `
        <line x1="${marginLeft}" y1="${y}" x2="${width - marginRight}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />
        <text x="${marginLeft - 12}" y="${y + 4}" font-size="11" text-anchor="end" fill="#6b7280">${tick}</text>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="${width / 2}" y="28" font-size="22" font-weight="700" text-anchor="middle" fill="#111827">${escapeXml(title)}</text>
      ${grid}
      <polyline fill="none" stroke="${color}" stroke-width="3" points="${points}" />
      ${pointsSvg}
      <line x1="${marginLeft}" y1="${marginTop + plotHeight}" x2="${width - marginRight}" y2="${marginTop + plotHeight}" stroke="#9ca3af" stroke-width="1.5" />
      ${xLabels}
    </svg>
  `;
};

const buildPieChartSvg = (title: string, slices: Array<{ label: string; value: number; color: string }>) => {
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const cx = 260;
  const cy = 210;
  const radius = 110;
  const total = Math.max(1, slices.reduce((sum, slice) => sum + slice.value, 0));

  let cumulative = 0;
  const arcs = slices
    .map((slice) => {
      const startAngle = (cumulative / total) * Math.PI * 2;
      cumulative += slice.value;
      const endAngle = (cumulative / total) * Math.PI * 2;

      const x1 = cx + radius * Math.cos(startAngle - Math.PI / 2);
      const y1 = cy + radius * Math.sin(startAngle - Math.PI / 2);
      const x2 = cx + radius * Math.cos(endAngle - Math.PI / 2);
      const y2 = cy + radius * Math.sin(endAngle - Math.PI / 2);
      const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

      if (slice.value === 0) {
        return "";
      }

      return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" fill="${slice.color}" />`;
    })
    .join("");

  const legend = slices
    .map((slice, index) => {
      const x = 560;
      const y = 140 + index * 30;
      return `
        <rect x="${x}" y="${y}" width="14" height="14" rx="2" fill="${slice.color}" />
        <text x="${x + 22}" y="${y + 11}" font-size="13" fill="#374151">${escapeXml(slice.label)}: ${slice.value}</text>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="${width / 2}" y="28" font-size="22" font-weight="700" text-anchor="middle" fill="#111827">${escapeXml(title)}</text>
      ${arcs}
      ${legend}
    </svg>
  `;
};

const buildRadarChartSvg = (
  title: string,
  labels: string[],
  currentValues: number[],
  targetValues: number[],
  currentColor: string,
  targetColor: string
) => {
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const cx = 420;
  const cy = 215;
  const radius = 140;
  const levels = [20, 40, 60, 80, 100];
  const pointsCount = Math.max(labels.length, 3);

  const pointAt = (value: number, index: number) => {
    const angle = (Math.PI * 2 * index) / pointsCount - Math.PI / 2;
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    return {
      x: cx + Math.cos(angle) * radius * normalized,
      y: cy + Math.sin(angle) * radius * normalized,
    };
  };

  const buildPolygonPoints = (values: number[]) =>
    labels
      .map((_, index) => {
        const point = pointAt(values[index] ?? 0, index);
        return `${point.x},${point.y}`;
      })
      .join(" ");

  const gridPolygons = levels
    .map((level) => {
      const points = labels
        .map((_, index) => {
          const angle = (Math.PI * 2 * index) / pointsCount - Math.PI / 2;
          const scaled = level / 100;
          const x = cx + Math.cos(angle) * radius * scaled;
          const y = cy + Math.sin(angle) * radius * scaled;
          return `${x},${y}`;
        })
        .join(" ");
      return `<polygon points="${points}" fill="none" stroke="#e5e7eb" stroke-width="1" />`;
    })
    .join("");

  const axisLines = labels
    .map((_, index) => {
      const angle = (Math.PI * 2 * index) / pointsCount - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#d1d5db" stroke-width="1" />`;
    })
    .join("");

  const axisLabels = labels
    .map((label, index) => {
      const angle = (Math.PI * 2 * index) / pointsCount - Math.PI / 2;
      const x = cx + Math.cos(angle) * (radius + 24);
      const y = cy + Math.sin(angle) * (radius + 24);
      return `<text x="${x}" y="${y}" font-size="10" text-anchor="middle" fill="#374151">${escapeXml(label)}</text>`;
    })
    .join("");

  const legend = `
    <rect x="690" y="155" width="14" height="14" rx="2" fill="${currentColor}" />
    <text x="712" y="166" font-size="12" fill="#374151">Current Score</text>
    <rect x="690" y="185" width="14" height="14" rx="2" fill="${targetColor}" />
    <text x="712" y="196" font-size="12" fill="#374151">Target</text>
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="${width / 2}" y="28" font-size="22" font-weight="700" text-anchor="middle" fill="#111827">${escapeXml(title)}</text>
      ${gridPolygons}
      ${axisLines}
      <polygon points="${buildPolygonPoints(targetValues)}" fill="${targetColor}" fill-opacity="0.18" stroke="${targetColor}" stroke-width="2" />
      <polygon points="${buildPolygonPoints(currentValues)}" fill="${currentColor}" fill-opacity="0.28" stroke="${currentColor}" stroke-width="2" />
      ${axisLabels}
      ${legend}
    </svg>
  `;
};

const svgToPngBytes = async (svg: string, width: number, height: number) => {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to render SVG chart."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to create chart canvas context.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("Unable to encode chart image."));
      }, "image/png");
    });
    const arrayBuffer = await pngBlob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const loadImageData = async (imageUrl: string) => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Unable to load the university logo.");
  }
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read the university logo."));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, bytes: new Uint8Array(await blob.arrayBuffer()) };
};

const getPloDomainLabel = (code: string) => {
  const match = code.match(/(\d+)/);
  const domain = match ? Number(match[1]) : 0;
  if (domain === 1) return "Knowledge";
  if (domain === 2) return "Skills";
  if (domain === 3) return "Values";
  return "Integrated";
};

const getImprovementActions = (code: string) => {
  const domain = getPloDomainLabel(code);
  if (domain === "Knowledge") {
    return "Targeted case-based discussions; expanded contextual reading tasks; scaffolded design briefs with explicit evidence requirements.";
  }
  if (domain === "Skills") {
    return "Structured studio critiques; analytical workshops; rubric-guided peer review; increased performance feedback loops across core courses.";
  }
  if (domain === "Values") {
    return "Reflective assignments; collaborative practice simulations; professional ethics scenarios; stakeholder-focused design communication tasks.";
  }
  return "Focused curriculum mapping review; targeted assessment redesign; iterative follow-up in the next academic cycle.";
};

export function ReportExport({
  departments,
  programs,
  courses,
  clos,
  plos,
  assessments,
  indirectSurveyDetails,
  selectedProgram,
  selectedYear,
  calculateWeightedScore,
}: ReportExportProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const selectedProgramData = programs.find((p) => p.id === selectedProgram);
  const selectedDepartment = departments.find((d) => d.id === selectedProgramData?.departmentId);

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const { dataUrl: universityLogoDataUrl } = await loadImageData(universityLogoUrl);
      const pdf = new jsPDF("p", "mm", "a4") as any;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      pdf.setFillColor(...REPORT_BACKGROUND_RGB);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.addImage(universityLogoDataUrl, "PNG", 15, 4, 36, 36 * (721 / 1878));

      // Header with gradient effect
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 21, pageWidth, 45, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("Learning Outcomes Assessment Report", pageWidth / 2, 39, { align: "center" });
      pdf.setFontSize(14);
      pdf.text("College of Architecture and Planning", pageWidth / 2, 49, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 57, { align: "center" });

      yPosition = 76;
      pdf.setTextColor(0, 0, 0);

      // Program Information Box
      pdf.setFillColor(240, 240, 255);
      pdf.rect(10, yPosition, pageWidth - 20, 25, "F");
      pdf.setDrawColor(37, 99, 235);
      pdf.setLineWidth(0.5);
      pdf.rect(10, yPosition, pageWidth - 20, 25);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Department: `, 15, yPosition + 8);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${selectedDepartment?.name || "N/A"}`, 42, yPosition + 8);

      pdf.setFont("helvetica", "bold");
      pdf.text(`Program: `, 15, yPosition + 15);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${selectedProgramData?.name || "N/A"}`, 42, yPosition + 15);

      pdf.setFont("helvetica", "bold");
      pdf.text(`Academic Year: `, 15, yPosition + 22);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${selectedYear}`, 48, yPosition + 22);

      yPosition += 35;

      const addTableAnalysis = (text: string, currentY: number) => {
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(75, 85, 99);
        const lines = pdf.splitTextToSize(text, pageWidth - 20);
        if (currentY + lines.length * 4.2 > pageHeight - 15) {
          pdf.addPage();
          currentY = 20;
        }
        pdf.text(lines, 10, currentY);
        return currentY + lines.length * 4.2 + 8;
      };

      // CLOs Section Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("Course Learning Outcomes (CLOs)", 10, yPosition);
      yPosition += 8;

      // CLOs Table
      const totalClos = clos.length;
      const achievedClosCount = clos.filter((c) => (c.achievement ?? 0) >= c.targetValue).length;
      const belowTargetClos = clos.filter((c) => (c.achievement ?? 0) < c.targetValue);
      const avgCloScore = totalClos > 0 ? clos.reduce((s, c) => s + (c.achievement ?? 0), 0) / totalClos : 0;
      const avgCloTarget = totalClos > 0 ? clos.reduce((s, c) => s + c.targetValue, 0) / totalClos : 0;
      const distinctCoursesCount = new Set(clos.map((c) => c.courseId)).size;
      const cloTableAnalysis = `Analysis of CLOs: A total of ${totalClos} Course Learning Outcomes (CLOs) across ${distinctCoursesCount} courses were evaluated. Overall, ${achievedClosCount} of ${totalClos} CLOs (${((achievedClosCount / (totalClos || 1)) * 100).toFixed(1)}%) achieved their benchmark targets, with an aggregate average score of ${avgCloScore.toFixed(1)}% against an average target of ${avgCloTarget.toFixed(1)}%. ${belowTargetClos.length > 0 ? `Outcomes requiring instructional focus include: ${belowTargetClos.map((c) => c.code).join(", ")}.` : "All assessed CLOs successfully met or exceeded performance criteria across contributing courses."}`;

      const cloData = clos.map((clo) => {
        const score = clo.achievement ?? 0;
        const status = score >= clo.targetValue ? "Achieved" : "Not Achieved";
        const course = courses.find((item) => String(item.id) === String(clo.courseId));
        const plo = plos.find((item) => String(item.id) === String(clo.ploId));
        return [course ? `${course.code} - ${course.name}` : "N/A", clo.code, plo?.code || "N/A", `${toFiniteNumber(clo.weight).toFixed(0)}%`, `${clo.targetValue}%`, `${score.toFixed(0)}%`, status];
      });

      autoTable(pdf, {
        startY: yPosition,
        head: [["Course", "CLO", "PLO", "Relative Weight", "Target", "Current", "Status"]],
        body: cloData,
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => {
          // Add page numbers
          const pageCount = (pdf as any).internal.getNumberOfPages();
          pdf.setFontSize(8);
          pdf.setTextColor(128);
          pdf.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - 20, pdf.internal.pageSize.getHeight() - 10);
        },
      });

      yPosition = addTableAnalysis(cloTableAnalysis, (pdf as any).lastAutoTable.finalY + 5);

      // PLOs Table
      const ploScores = plos.map((plo) => ({
        plo,
        score: calculateWeightedScore(plo.id, "PLO"),
      }));
      const achievedPloCount = ploScores.filter((item) => item.score >= item.plo.targetValue).length;
      const avgPloScore = ploScores.length > 0 ? ploScores.reduce((sum, item) => sum + item.score, 0) / ploScores.length : 0;
      const avgPloTarget = plos.length > 0 ? plos.reduce((sum, item) => sum + item.targetValue, 0) / plos.length : 0;
      const ploTableAnalysis = `Analysis of PILOs: Overall PILO attainment rate is ${((achievedPloCount / (plos.length || 1)) * 100).toFixed(1)}% (${achievedPloCount} of ${plos.length} outcomes achieved). The aggregate average score reached ${avgPloScore.toFixed(1)}% against a target benchmark of ${avgPloTarget.toFixed(1)}%, integrating direct weighted course evidence and indirect stakeholder surveys.`;

      const ploData = plos.map((plo) => {
        const score = calculateWeightedScore(plo.id, "PLO");
        const status = score >= plo.targetValue ? "Achieved" : "Not Achieved";
        return [plo.code, plo.description, `${plo.targetValue}%`, `${score}%`, status];
      });

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("Program Learning Outcomes (PLOs)", 10, yPosition);
      yPosition += 8;

      autoTable(pdf, {
        startY: yPosition,
        head: [["Code", "Description", "Target", "Current", "Status"]],
        body: ploData,
        theme: "grid",
        headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 245, 255] },
        margin: { left: 10, right: 10 },
      });

      yPosition = addTableAnalysis(ploTableAnalysis, (pdf as any).lastAutoTable.finalY + 5);

      const detailedIndirectRows = plos.map((plo) => {
        const detail = indirectSurveyDetails.find(
          (item) =>
            String(item.programId) === String(selectedProgram) &&
            item.academicYear === selectedYear &&
            String(item.ploId) === String(plo.id)
        );

        const fallbackIndirect = assessments.filter(
          (a) =>
            a.type === "indirect" &&
            a.programId === selectedProgram &&
            a.academicYear === selectedYear &&
            a.outcomeType === "PLO" &&
            String(a.outcomeId) === String(plo.id)
        );

        const fallbackTotal = fallbackIndirect.length > 0
          ? fallbackIndirect.reduce((sum, a) => sum + a.value, 0) / fallbackIndirect.length
          : 0;

        return [
          plo.code,
          detail?.faculty != null ? `${detail.faculty.toFixed(1)}%` : "-",
          detail?.alumni != null ? `${detail.alumni.toFixed(1)}%` : "-",
          detail?.employers != null ? `${detail.employers.toFixed(1)}%` : "-",
          detail?.exitInterviews != null ? `${detail.exitInterviews.toFixed(1)}%` : "-",
          `${(detail ? detail.indirectTotal : fallbackTotal).toFixed(1)}%`,
        ];
      });

      const indirectSurveyTableAnalysis = `Analysis of Indirect Surveys: Stakeholder perception indicators provide valuable feedback from faculty, alumni, employers, and exit interviews. The survey register captures multi-stakeholder evaluations to corroborate direct coursework assessments and guide academic continuous improvement.`;

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("Detailed Indirect Surveys", 10, yPosition);
      yPosition += 8;

      autoTable(pdf, {
        startY: yPosition,
        head: [["PLO", "Faculty", "Alumni", "Employers", "Exit interviews", "Indirect total"]],
        body: detailedIndirectRows,
        theme: "grid",
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [255, 251, 235] },
        margin: { left: 10, right: 10 },
      });

      yPosition = addTableAnalysis(indirectSurveyTableAnalysis, (pdf as any).lastAutoTable.finalY + 5);

      // Assessments Table
      const programAssessments = assessments.filter((a) => a.programId === selectedProgram && a.academicYear === selectedYear);
      const directCount = programAssessments.filter((a) => a.type === "direct").length;
      const indirectCount = programAssessments.filter((a) => a.type === "indirect").length;
      const assessmentTableAnalysis = `Analysis of Assessment Register: A total of ${programAssessments.length} assessment evidence records are cataloged for this reporting period (${directCount} direct assessment instruments and ${indirectCount} indirect survey records), ensuring comprehensive evidence triangulation across all outcome categories.`;

      const assessmentData = programAssessments.map((assessment) => {
        const outcome = assessment.outcomeType === "CLO"
          ? clos.find((c) => c.id === assessment.outcomeId)
          : plos.find((p) => p.id === assessment.outcomeId);
        return [
          assessment.type === "indirect" ? `${outcome?.code || "PLO"} - Indirect` : assessment.name,
          assessment.type,
          outcome?.code || "N/A",
          `${assessment.weight}%`,
          `${assessment.value}%`,
        ];
      });

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("Assessments", 10, yPosition);
      yPosition += 8;

      autoTable(pdf, {
        startY: yPosition,
        head: [["Name", "Type", "Outcome", "Weight", "Score"]],
        body: assessmentData,
        theme: "grid",
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        margin: { left: 10, right: 10 },
      });

      addTableAnalysis(assessmentTableAnalysis, (pdf as any).lastAutoTable.finalY + 5);

      pdf.save(`Learning_Outcomes_Report_${selectedYear}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToWord = async () => {
    setIsExporting(true);
    try {
      const programAssessments = assessments.filter((a) => a.programId === selectedProgram && a.academicYear === selectedYear);

      const ploResults: PloResultRow[] = plos.map((plo) => {
        const relatedClos = clos.filter((clo) => String(clo.ploId ?? "") === String(plo.id));
        const totalWeight = relatedClos.reduce((sum, clo) => sum + toFiniteNumber(clo.weight), 0);
        const weightedSum = relatedClos.reduce(
          (sum, clo) => sum + toFiniteNumber(clo.achievement) * toFiniteNumber(clo.weight),
          0
        );
        const direct = totalWeight > 0 ? weightedSum / totalWeight : 0;
        const indirectAssessments = programAssessments.filter(
          (assessment) =>
            assessment.type === "indirect" &&
            assessment.outcomeType === "PLO" &&
            String(assessment.outcomeId) === String(plo.id)
        );
        const indirect = indirectAssessments.length > 0
          ? indirectAssessments.reduce((sum, assessment) => sum + toFiniteNumber(assessment.value), 0) / indirectAssessments.length
          : 0;
        const total = toFiniteNumber(calculateWeightedScore(plo.id, "PLO"));
        return {
          code: plo.code,
          description: plo.description,
          direct,
          indirect,
          total,
          target: toFiniteNumber(plo.targetValue),
          achieved: total >= toFiniteNumber(plo.targetValue),
        };
      });

      const cloRows = clos.map((clo) => {
        const score = clo.achievement ?? 0;
        const course = courses.find((item) => String(item.id) === String(clo.courseId));
        const plo = plos.find((item) => String(item.id) === String(clo.ploId));
        return [
          course ? `${course.code} - ${course.name}` : "N/A",
          clo.code,
          plo?.code || "N/A",
          `${toFiniteNumber(clo.weight).toFixed(0)}%`,
          `${clo.targetValue.toFixed(0)}%`,
          `${score.toFixed(0)}%`,
          score >= clo.targetValue ? "Achieved" : "Not Achieved",
        ];
      });

      const ploRows = ploResults.map((plo) => [
        plo.code,
        plo.description,
        `${plo.direct.toFixed(1)}%`,
        `${plo.indirect.toFixed(1)}%`,
        `${plo.total.toFixed(1)}%`,
        `${plo.target.toFixed(0)}%`,
        plo.achieved ? "Achieved" : "Not Achieved",
      ]);

      const assessmentRows = programAssessments.map((assessment) => {
        const outcome = assessment.outcomeType === "CLO"
          ? clos.find((clo) => clo.id === assessment.outcomeId)
          : plos.find((plo) => plo.id === assessment.outcomeId);
        return [
          assessment.type === "indirect" ? `${outcome?.code || "PLO"} - Indirect` : assessment.name,
          assessment.type === "direct" ? "Direct" : "Indirect",
          outcome?.code || "N/A",
          assessment.outcomeType,
          `${assessment.weight.toFixed(0)}%`,
          `${assessment.value.toFixed(1)}%`,
        ];
      });

      const detailedIndirectRows = plos.map((plo) => {
        const detail = indirectSurveyDetails.find(
          (item) =>
            String(item.programId) === String(selectedProgram) &&
            item.academicYear === selectedYear &&
            String(item.ploId) === String(plo.id)
        );

        const fallbackIndirect = programAssessments.filter(
          (a) =>
            a.type === "indirect" &&
            a.outcomeType === "PLO" &&
            String(a.outcomeId) === String(plo.id)
        );

        const fallbackTotal = fallbackIndirect.length > 0
          ? fallbackIndirect.reduce((sum, a) => sum + toFiniteNumber(a.value), 0) / fallbackIndirect.length
          : 0;

        return {
          code: plo.code,
          faculty: detail ? detail.faculty : null,
          alumni: detail ? detail.alumni : null,
          employers: detail ? detail.employers : null,
          exitInterviews: detail ? detail.exitInterviews : null,
          total: detail ? toFiniteNumber(detail.indirectTotal) : fallbackTotal,
        };
      });

      const achievedCount = ploResults.filter((item) => item.achieved).length;
      const acceptableCount = ploResults.filter((item) => !item.achieved && item.total >= item.target - 10).length;
      const needsImprovementCount = ploResults.filter((item) => item.total < item.target - 10).length;
      const belowTarget = ploResults.filter((item) => !item.achieved);
      const averageActual = ploResults.length > 0
        ? ploResults.reduce((sum, item) => sum + item.total, 0) / ploResults.length
        : 0;
      const targetBenchmark = ploResults.length > 0
        ? ploResults.reduce((sum, item) => sum + item.target, 0) / ploResults.length
        : 0;
      const internalBenchmark = cloRows.length > 0
        ? clos.reduce((sum, clo) => sum + clo.targetValue, 0) / clos.length
        : 0;

      const directAssessments = programAssessments.filter((assessment) => assessment.type === "direct");
      const indirectAssessments = programAssessments.filter((assessment) => assessment.type === "indirect");
      const directAverage = ploResults.length > 0
        ? ploResults.reduce((sum, plo) => sum + plo.direct, 0) / ploResults.length
        : 0;
      const indirectAverage = indirectAssessments.length > 0
        ? indirectAssessments.reduce((sum, assessment) => sum + toFiniteNumber(assessment.value), 0) / indirectAssessments.length
        : 0;

      const multiYearYears = Array.from(new Set(assessments.filter((a) => a.programId === selectedProgram).map((a) => a.academicYear))).sort();
      const multiYearScores = multiYearYears.map((year) => {
        const yearAssessments = assessments.filter((a) => a.programId === selectedProgram && a.academicYear === year);
        return yearAssessments.length > 0
          ? yearAssessments.reduce((sum, assessment) => sum + assessment.value, 0) / yearAssessments.length
          : 0;
      });

      const assessmentDistributionSvg = buildBarChartSvg(
        "Assessment Type Distribution",
        ["Direct (60%)", "Indirect (40%)", "Total"],
        [directAverage, indirectAverage, averageActual],
        "#b45309"
      );
      const multiYearSvg = buildBarChartSvg(
        "Multi-Year Comparison",
        multiYearYears,
        multiYearScores,
        "#2563eb"
      );
      const performanceComparisonSvg = buildGroupedBarChartSvg(
        "PLO Performance Comparison",
        ploResults.map((item) => item.code),
        [
          { name: "Direct %", color: "#2563eb", values: ploResults.map((item) => item.direct) },
          { name: "Indirect %", color: "#f59e0b", values: ploResults.map((item) => item.indirect) },
          { name: "Total %", color: "#10b981", values: ploResults.map((item) => item.total) },
          { name: "Target %", color: "#ef4444", values: ploResults.map((item) => item.target) },
        ]
      );
      const detailedIndirectSvg = buildGroupedBarChartSvg(
        "Detailed Indirect Surveys",
        detailedIndirectRows.map((item) => item.code),
        [
          { name: "Faculty", color: "#1d4ed8", values: detailedIndirectRows.map((item) => item.faculty ?? 0) },
          { name: "Alumni", color: "#0ea5e9", values: detailedIndirectRows.map((item) => item.alumni ?? 0) },
          { name: "Employers", color: "#10b981", values: detailedIndirectRows.map((item) => item.employers ?? 0) },
          { name: "Exit interviews", color: "#f97316", values: detailedIndirectRows.map((item) => item.exitInterviews ?? 0) },
          { name: "Indirect total", color: "#f59e0b", values: detailedIndirectRows.map((item) => item.total) },
        ]
      );
      const ploProgressSvg = buildPieChartSvg("PLO Progress", [
        { label: "Achieved", value: achievedCount, color: "#22c55e" },
        { label: "Acceptable", value: acceptableCount, color: "#f97316" },
        { label: "Needs Improvement", value: needsImprovementCount, color: "#ef4444" },
      ]);
      const yearOverYearSvg = buildLineChartSvg(
        "Year-over-Year Performance",
        multiYearYears,
        multiYearScores,
        "#6366f1"
      );
      const learningOutcomesRadarSvg = buildRadarChartSvg(
        "Learning Outcomes Performance",
        ploResults.map((item) => item.code),
        ploResults.map((item) => item.total),
        ploResults.map((item) => item.target),
        "#6366f1",
        "#86efac"
      );

      const [assessmentDistributionPng, multiYearPng, performanceComparisonPng, detailedIndirectPng, ploProgressPng, yearOverYearPng, learningOutcomesRadarPng] = await Promise.all([
        svgToPngBytes(assessmentDistributionSvg, CHART_WIDTH, CHART_HEIGHT),
        svgToPngBytes(multiYearSvg, CHART_WIDTH, CHART_HEIGHT),
        svgToPngBytes(performanceComparisonSvg, CHART_WIDTH, 460),
        svgToPngBytes(detailedIndirectSvg, CHART_WIDTH, 460),
        svgToPngBytes(ploProgressSvg, CHART_WIDTH, CHART_HEIGHT),
        svgToPngBytes(yearOverYearSvg, CHART_WIDTH, CHART_HEIGHT),
        svgToPngBytes(learningOutcomesRadarSvg, CHART_WIDTH, CHART_HEIGHT),
      ]);
      const { bytes: universityLogoBytes } = await loadImageData(universityLogoUrl);

      const introText = `The purpose of this report is to evaluate the extent to which the ${selectedProgramData?.name || "selected"} program has achieved its Program Intended Learning Outcomes (PILOs) during the academic year ${selectedYear}. The analysis draws upon direct and indirect evidence, integrates weighted course-level performance, and supports evidence-based enhancement decisions aligned with internal quality assurance expectations.`;

      const findingsText = `The program achieved ${achievedCount} out of ${ploResults.length} PILOs at or above their specified benchmark. ${belowTarget.length > 0 ? `The following PILOs remained below target in the current cycle: ${belowTarget.map((item) => item.code).join(", ")}.` : "All assessed PILOs met or exceeded their target benchmark in the current cycle."}`;

      // ── Descriptions and Analyses under Tables ──────────────────────────────
      const totalClosWord = clos.length;
      const achievedClosCountWord = clos.filter((c) => (c.achievement ?? 0) >= c.targetValue).length;
      const belowTargetClosWord = clos.filter((c) => (c.achievement ?? 0) < c.targetValue);
      const avgCloScoreWord = totalClosWord > 0 ? clos.reduce((s, c) => s + (c.achievement ?? 0), 0) / totalClosWord : 0;
      const avgCloTargetWord = totalClosWord > 0 ? clos.reduce((s, c) => s + c.targetValue, 0) / totalClosWord : 0;
      const distinctCoursesCountWord = new Set(clos.map((c) => c.courseId)).size;

      const cloTableAnalysisWord = `Table Analysis (CLOs): A total of ${totalClosWord} Course Learning Outcomes (CLOs) were evaluated across ${distinctCoursesCountWord} contributing courses. Overall, ${achievedClosCountWord} of ${totalClosWord} CLOs (${((achievedClosCountWord / (totalClosWord || 1)) * 100).toFixed(1)}%) attained or exceeded their established target, achieving an aggregate average score of ${avgCloScoreWord.toFixed(1)}% against an average target benchmark of ${avgCloTargetWord.toFixed(1)}%. ${belowTargetClosWord.length > 0 ? `The specific outcomes requiring instructional reinforcement include: ${belowTargetClosWord.map((c) => c.code).join(", ")}.` : "All individual CLOs met their required performance criteria, demonstrating robust instructional delivery across all contributing courses."}`;

      const ploTableAnalysisWord = `Table Analysis (PILOs): The PILO summary demonstrates that ${achievedCount} out of ${ploResults.length} outcomes (${((achievedCount / (ploResults.length || 1)) * 100).toFixed(1)}%) met or exceeded their designated target threshold. The average composite attainment across all PILOs stands at ${averageActual.toFixed(1)}% (comprising a direct assessment average of ${directAverage.toFixed(1)}% and an indirect assessment average of ${indirectAverage.toFixed(1)}%) compared to an average target benchmark of ${targetBenchmark.toFixed(1)}%. ${belowTarget.length > 0 ? `Outcomes falling below target include ${belowTarget.map((p) => p.code).join(", ")}, which have been prioritized for action in the continuous improvement plan.` : "All assessed PILOs satisfied the required quality assurance benchmarks for this cycle."}`;

      const directAssessmentsCountWord = programAssessments.filter((a) => a.type === "direct").length;
      const indirectAssessmentsCountWord = programAssessments.filter((a) => a.type === "indirect").length;
      const minAssessmentScoreWord = programAssessments.length > 0 ? Math.min(...programAssessments.map((a) => a.value)) : 0;
      const maxAssessmentScoreWord = programAssessments.length > 0 ? Math.max(...programAssessments.map((a) => a.value)) : 0;

      const assessmentTableAnalysisWord = `Table Analysis (Assessment Register): The assessment evidence register details ${programAssessments.length} evidence records utilized in this assessment cycle (${directAssessmentsCountWord} direct course assessment instruments and ${indirectAssessmentsCountWord} indirect survey components). Scores ranged from ${minAssessmentScoreWord.toFixed(1)}% to ${maxAssessmentScoreWord.toFixed(1)}%, providing comprehensive multi-source triangulation between student course performance and stakeholder feedback.`;

      const surveyWithDataWord = detailedIndirectRows.filter((r) => r.faculty !== null);
      const avgFacultyWord = surveyWithDataWord.length > 0 ? surveyWithDataWord.reduce((s, r) => s + (r.faculty ?? 0), 0) / surveyWithDataWord.length : 0;
      const avgAlumniWord = surveyWithDataWord.length > 0 ? surveyWithDataWord.reduce((s, r) => s + (r.alumni ?? 0), 0) / surveyWithDataWord.length : 0;
      const avgEmployersWord = surveyWithDataWord.length > 0 ? surveyWithDataWord.reduce((s, r) => s + (r.employers ?? 0), 0) / surveyWithDataWord.length : 0;
      const avgExitWord = surveyWithDataWord.length > 0 ? surveyWithDataWord.reduce((s, r) => s + (r.exitInterviews ?? 0), 0) / surveyWithDataWord.length : 0;

      const indirectSurveyTableAnalysisWord = `Table Analysis (Detailed Indirect Surveys): Stakeholder perception scores across instruments recorded averages of: Faculty Surveys (${avgFacultyWord.toFixed(1)}%), Alumni Surveys (${avgAlumniWord.toFixed(1)}%), Employer Surveys (${avgEmployersWord.toFixed(1)}%), and Exit Interviews (${avgExitWord.toFixed(1)}%). This disaggregation highlights key areas of stakeholder alignment and provides valuable diagnostic insight into external perceptions of program quality.`;

      const benchmarkingTableAnalysisWord = `Table Analysis (Benchmarking): The benchmarking analysis indicates an overall actual achievement of ${averageActual.toFixed(1)}% against a target benchmark of ${targetBenchmark.toFixed(1)}% (variance of ${(averageActual - targetBenchmark >= 0 ? "+" : "") + (averageActual - targetBenchmark).toFixed(1)} percentage points) and an internal benchmark of ${internalBenchmark.toFixed(1)}%. ${belowTarget.length > 0 ? `While ${ploResults.length - belowTarget.length} outcomes satisfied benchmark standards, ${belowTarget.length} PILO${belowTarget.length > 1 ? "s" : ""} require structured pedagogical interventions to close the identified performance gap.` : "The program has successfully met all established institutional and program-level benchmarks for this reporting cycle."}`;

      const heatmapTableAnalysisWord = `Table Analysis (PLO Performance Matrix): The PLO matrix illustrates the comparative direct (60% weight) and indirect (40% weight) attainment across every program outcome. ${directAverage >= indirectAverage ? `Direct assessment evidence (${directAverage.toFixed(1)}%) is higher than stakeholder perception ratings (${indirectAverage.toFixed(1)}%), indicating strong demonstrated student competence.` : `Indirect stakeholder ratings (${indirectAverage.toFixed(1)}%) exceed direct assessments (${directAverage.toFixed(1)}%), reflecting positive external confidence in student learning outcomes.`}`;

      // ── Build Improvement Plans ──────────────────────────────────────────────
      const improvementPlanItems: Paragraph[] = [];

      if (belowTarget.length === 0) {
        improvementPlanItems.push(
          createParagraph("All PILOs achieved the desired benchmark. Improvement plans should therefore focus on continuous enhancement, evidence triangulation, and sustaining attainment in the next cycle.")
        );
      } else {
        improvementPlanItems.push(
          createParagraph(
            `The following ${belowTarget.length} PILO${belowTarget.length > 1 ? "s" : ""} did not meet their target benchmarks and require structured improvement actions. For each outcome, the contributing course-level factors are identified and targeted remediation measures are proposed.`,
            { spacingAfter: 120 }
          )
        );

        for (const ploItem of belowTarget) {
          const matchedPlo = plos.find((p) => p.code === ploItem.code);
          const relatedClos = matchedPlo
            ? clos.filter((clo) => String(clo.ploId ?? "") === String(matchedPlo.id))
            : [];
          const underperformingClos = relatedClos.filter(
            (clo) => (clo.achievement ?? 0) < clo.targetValue
          );
          const gap = ploItem.target - ploItem.total;

          // PLO header
          improvementPlanItems.push(
            createParagraph(`${ploItem.code}: ${ploItem.description}`, {
              bold: true,
              spacingBefore: 200,
              spacingAfter: 60,
            })
          );

          // Performance summary
          improvementPlanItems.push(
            createParagraph(
              `Current Score: ${ploItem.total.toFixed(1)}%  |  Target: ${ploItem.target.toFixed(0)}%  |  Gap: −${gap.toFixed(1)} pp  |  Direct: ${ploItem.direct.toFixed(1)}%  |  Indirect: ${ploItem.indirect.toFixed(1)}%`,
              { spacingAfter: 80 }
            )
          );

          // Root cause – underperforming CLOs
          if (relatedClos.length === 0) {
            improvementPlanItems.push(
              createParagraph(
                "No course learning outcomes (CLOs) are currently mapped to this PILO. Establishing clear CLO-to-PILO mapping is a prerequisite for root cause analysis.",
                { spacingAfter: 60 }
              )
            );
          } else if (underperformingClos.length === 0) {
            improvementPlanItems.push(
              createParagraph(
                `All ${relatedClos.length} mapped CLO${relatedClos.length > 1 ? "s" : ""} met their individual targets. The PILO gap may be attributed to indirect assessment performance or inter-CLO weighting distribution.`,
                { spacingAfter: 60 }
              )
            );
          } else {
            improvementPlanItems.push(
              createParagraph("Root Cause – Underperforming Course Learning Outcomes:", {
                bold: true,
                spacingAfter: 40,
              })
            );
            for (const clo of underperformingClos) {
              const cloGap = clo.targetValue - (clo.achievement ?? 0);
              improvementPlanItems.push(
                createBulletParagraph(
                  `${clo.code}: ${clo.description}` +
                  `  —  Achievement: ${(clo.achievement ?? 0).toFixed(0)}%  |  Target: ${clo.targetValue.toFixed(0)}%  |  Gap: −${cloGap.toFixed(0)} pp  |  Weight: ${(clo.weight ?? 0).toFixed(0)}%`
                )
              );
            }
          }

          // Indirect gap note
          if (ploItem.indirect < ploItem.target) {
            improvementPlanItems.push(
              createParagraph(
                `Indirect Assessment Note: Stakeholder feedback average (${ploItem.indirect.toFixed(1)}%) is also below the PILO target, suggesting a perception gap that reinforces the need for broader stakeholder engagement.`,
                { spacingAfter: 60 }
              )
            );
          }

          // Recommended actions
          improvementPlanItems.push(
            createParagraph("Recommended Improvement Actions:", {
              bold: true,
              spacingBefore: 80,
              spacingAfter: 40,
            })
          );

          if (underperformingClos.length > 0) {
            const cloList = underperformingClos.map((c) => c.code).join(", ");
            improvementPlanItems.push(
              createBulletParagraph(
                `Conduct a targeted curriculum and assessment review for ${cloList} to identify gaps in instructional delivery, rubric clarity, and alignment with the PILO descriptor.`
              )
            );
            const heavyClos = underperformingClos.filter((c) => (c.weight ?? 0) >= 15);
            if (heavyClos.length > 0) {
              improvementPlanItems.push(
                createBulletParagraph(
                  `High-weight CLO${heavyClos.length > 1 ? "s" : ""} (${heavyClos.map((c) => c.code).join(", ")}) contribute disproportionately to the overall gap. Prioritise these for instructional redesign, increased formative assessment frequency, and structured student feedback loops.`
                )
              );
            }
            improvementPlanItems.push(
              createBulletParagraph(
                "Establish peer-review sessions among course instructors to calibrate assessment standards and share effective pedagogical practices for the identified outcome domain."
              )
            );
          }

          if (ploItem.direct < ploItem.target) {
            improvementPlanItems.push(
              createBulletParagraph(
                `Strengthen direct evidence collection by introducing additional structured assessment tasks aligned to ${ploItem.code} and increasing the number of assessed performance opportunities in relevant courses.`
              )
            );
          }

          if (ploItem.indirect < ploItem.target - 5) {
            improvementPlanItems.push(
              createBulletParagraph(
                `Enhance stakeholder engagement to improve indirect survey coverage and response quality. Consider organising structured focus groups with alumni and employers to investigate the root cause of the perception gap relative to direct assessment outcomes.`
              )
            );
          }

          improvementPlanItems.push(
            createBulletParagraph(getImprovementActions(ploItem.code))
          );

          improvementPlanItems.push(
            createBulletParagraph(
              `Assign a faculty coordinator responsible for tracking the improvement status of ${ploItem.code} across the next academic cycle, with a documented mid-cycle progress review and a formal close-out report at year end.`
            )
          );
        }
      }

      const docChildren = [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: universityLogoBytes, transformation: { width: 125, height: 48 } })],
        }),
        createParagraph("Program Intended Learning Outcomes (PILOs) Assessment Report", {
          bold: true,
          alignment: AlignmentType.CENTER,
          spacingBefore: 120,
          spacingAfter: 160,
        }),
        createParagraph(`${selectedProgramData?.name || "Selected Program"}`, {
          bold: true,
          alignment: AlignmentType.CENTER,
          spacingAfter: 80,
        }),
        createParagraph(`Academic Year ${selectedYear}`, {
          alignment: AlignmentType.CENTER,
          spacingAfter: 80,
        }),
        createParagraph(`${selectedDepartment?.name || "Department"} - College of Architecture and Planning - King Saud University`, {
          alignment: AlignmentType.CENTER,
          spacingAfter: 240,
        }),
        createParagraph(`Generated on ${new Date().toLocaleDateString()}`, {
          alignment: AlignmentType.CENTER,
          spacingAfter: 320,
        }),
        createHeading("Table of Contents", HeadingLevel.HEADING_1),
        createParagraph("Introduction", { spacingAfter: 60 }),
        createParagraph("Process of Assessing Program Intended Learning Outcomes (PILOs)", { spacingAfter: 60 }),
        createParagraph("PILOs Calculation Steps", { spacingAfter: 60 }),
        createParagraph("PILOs Assessment Results", { spacingAfter: 60 }),
        createParagraph("4.1 Assessment Charts", { spacingAfter: 60 }),
        createParagraph("4.1.1 Detailed Indirect Surveys", { spacingAfter: 60 }),
        createParagraph("4.2 Benchmarking", { spacingAfter: 60 }),
        createParagraph("4.3 Conclusion", { spacingAfter: 60 }),
        createParagraph("4.4 Recommendations", { spacingAfter: 60 }),
        createParagraph("4.5 Improvement Plans", { spacingAfter: 240 }),
        new Paragraph({ children: [new PageBreak()] }),
        createHeading("1. Introduction", HeadingLevel.HEADING_1),
        createParagraph(introText),
        createHeading("2. Process of Assessing Program Intended Learning Outcomes (PILOs)", HeadingLevel.HEADING_1),
        createParagraph("The assessment process follows a structured quality assurance cycle to ensure that PILO judgments are evidence-based, transparent, and improvement-oriented."),
        createParagraph("Stage 1: Alignment of CILOs with PILOs", { bold: true }),
        createBulletParagraph("Review of the PILOs/CILOs mapping matrix to confirm curricular alignment."),
        createBulletParagraph("Verification of course and program specifications before the assessment cycle."),
        createBulletParagraph("Approval of required amendments through the relevant departmental governance process."),
        createParagraph("Stage 2: Verification of CILO Assessment Methods", { bold: true }),
        createBulletParagraph("Confirmation that assessment tools measure the intended outcome domain with sufficient validity."),
        createBulletParagraph("Preparation of assessment schedules and scoring criteria before implementation."),
        createParagraph("Stage 3: Measurement of CILOs", { bold: true }),
        createBulletParagraph("Direct assessment evidence includes tests, design projects, performance rubrics, and structured assignments."),
        createBulletParagraph("Indirect assessment evidence includes surveys, evaluations, and stakeholder feedback instruments where applicable."),
        createBulletParagraph("Course instructors prepare section-level evidence, which is consolidated at course and program levels for review."),
        createParagraph("Stage 4: Measurement of PILOs", { bold: true }),
        createBulletParagraph("Weighted CILO evidence from relevant courses is aggregated for each PILO."),
        createBulletParagraph("Direct evidence is integrated with indirect evidence using the program's adopted weighting model."),
        createParagraph("Stage 5: Implementation of Improvement Decisions", { bold: true }),
        createBulletParagraph("Results are reviewed by the department and translated into actionable enhancement priorities."),
        createBulletParagraph("Approved improvements are incorporated into the following academic cycle and tracked for closure."),
        createHeading("3. PILOs Calculation Steps", HeadingLevel.HEADING_1),
        createParagraph("Step 1: Direct & Indirect Assessment of Core Courses", { bold: true }),
        createParagraph("Weighted CILO results are aggregated for each PILO based on course contribution and assessment significance."),
        createParagraph("Step 2: Indirect Assessment", { bold: true }),
        createParagraph("Indirect performance is derived from the available survey and feedback instruments recorded in the system and averaged to provide a representative perception-based indicator."),
        createParagraph("Step 3: Final Assessment Calculation", { bold: true }),
        createParagraph("Final PILO score = 60% Direct Assessment + 40% Indirect Assessment"),
        createHeading("4. PILOs Assessment Results", HeadingLevel.HEADING_1),
        createParagraph("Overall Findings", { bold: true }),
        createParagraph(findingsText),
        createParagraph("Course Learning Outcomes (CLOs) Summary", { bold: true, spacingBefore: 120 }),
        createTextTable(["Course", "CLO", "PLO", "Relative Weight", "Target", "Current", "Status"], cloRows),
        createParagraph(cloTableAnalysisWord, { spacingBefore: 80, spacingAfter: 160 }),
        createParagraph("Program Intended Learning Outcomes (PILOs) Summary", { bold: true, spacingBefore: 180 }),
        createTextTable(["Code", "Description", "Direct", "Indirect", "Total", "Target", "Status"], ploRows),
        createParagraph(ploTableAnalysisWord, { spacingBefore: 80, spacingAfter: 160 }),
        createParagraph("Assessment Evidence Register", { bold: true, spacingBefore: 180 }),
        createTextTable(["Assessment", "Type", "Outcome", "Level", "Weight", "Score"], assessmentRows),
        createParagraph(assessmentTableAnalysisWord, { spacingBefore: 80, spacingAfter: 160 }),
        createParagraph("Detailed Indirect Surveys Register", { bold: true, spacingBefore: 180 }),
        createTextTable(
          ["PLO", "Faculty", "Alumni", "Employers", "Exit interviews", "Indirect total"],
          detailedIndirectRows.map((row) => [
            row.code,
            row.faculty === null ? "-" : `${row.faculty.toFixed(1)}%`,
            row.alumni === null ? "-" : `${row.alumni.toFixed(1)}%`,
            row.employers === null ? "-" : `${row.employers.toFixed(1)}%`,
            row.exitInterviews === null ? "-" : `${row.exitInterviews.toFixed(1)}%`,
            `${row.total.toFixed(1)}%`,
          ])
        ),
        createParagraph(indirectSurveyTableAnalysisWord, { spacingBefore: 80, spacingAfter: 160 }),
        createHeading("4.1 Assessment Charts", HeadingLevel.HEADING_2),
        createParagraph("The following charts summarize the current distribution of assessment evidence, year-on-year performance movement, comparative PILO attainment, and the detailed indirect survey structure by PLO."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: assessmentDistributionPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 1. Assessment Type Distribution"),
        createParagraph(`Figure 1 illustrates the breakdown of assessment performance by type for the academic year ${selectedYear}. Direct assessment evidence yielded an average score of ${directAverage.toFixed(1)}%, reflecting the aggregated weighted performance of course-level learning outcomes. Indirect assessment evidence, derived from stakeholder feedback instruments, recorded an average of ${indirectAverage.toFixed(1)}%. The combined total PILO performance stands at ${averageActual.toFixed(1)}%, calculated using the program's adopted weighting model of 60% direct and 40% indirect. ${directAverage >= indirectAverage ? "The direct evidence exceeds the indirect evidence, suggesting that demonstrated student performance is stronger than stakeholder perception indicators." : "The indirect evidence is comparable to or exceeds direct evidence, suggesting that stakeholder perception aligns well with or surpasses demonstrated student performance."}`, { spacingAfter: 180 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: multiYearPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 2. Multi-Year Comparison"),
        createParagraph(`Figure 2 presents a longitudinal view of overall program performance across ${multiYearYears.length} academic ${multiYearYears.length === 1 ? "year" : "years"} on record (${multiYearYears.join(", ")}). ${multiYearYears.length === 1 ? `Only the current year ${selectedYear} is available for comparison, with an average score of ${multiYearScores[0]?.toFixed(1) ?? "N/A"}%.` : (() => { const maxIdx = multiYearScores.indexOf(Math.max(...multiYearScores)); const minIdx = multiYearScores.indexOf(Math.min(...multiYearScores)); const trend = multiYearScores[multiYearScores.length - 1] >= multiYearScores[0] ? "upward" : "downward"; return `The highest performance was recorded in ${multiYearYears[maxIdx]} at ${multiYearScores[maxIdx].toFixed(1)}%, while the lowest was in ${multiYearYears[minIdx]} at ${multiYearScores[minIdx].toFixed(1)}%. The overall trend appears ${trend}, indicating ${trend === "upward" ? "continuous improvement in program outcomes over time." : "a need to investigate contributing factors and implement targeted enhancement measures."}`; })()}`, { spacingAfter: 180 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: performanceComparisonPng, transformation: { width: 580, height: 290 } })],
        }),
        createCaption("Figure 3. PLO Performance Comparison"),
        createParagraph(`Figure 3 provides a comparative view of direct, indirect, and total performance against the target benchmark for each PILO. Of the ${ploResults.length} assessed PILOs, ${achievedCount} met or exceeded their target, ${acceptableCount} were within an acceptable range (within 10 percentage points below target), and ${needsImprovementCount} require focused improvement. ${belowTarget.length > 0 ? `PILOs falling below their target thresholds include: ${belowTarget.map((p) => `${p.code} (${p.total.toFixed(1)}% vs. target ${p.target.toFixed(0)}%)`).join(", ")}. These outcomes should be prioritised for curriculum review and targeted intervention in the next assessment cycle.` : "All PILOs successfully met their respective targets, reflecting a well-aligned and effective assessment framework."}`, { spacingAfter: 180 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: ploProgressPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 4. PLO Progress"),
        createParagraph(`Figure 4 summarises the overall attainment status of all ${ploResults.length} PILOs in the form of a proportional distribution chart. ${achievedCount} PILO${achievedCount !== 1 ? "s" : ""} (${((achievedCount / ploResults.length) * 100).toFixed(0)}%) are classified as Achieved, ${acceptableCount} PILO${acceptableCount !== 1 ? "s" : ""} (${((acceptableCount / ploResults.length) * 100).toFixed(0)}%) as Acceptable, and ${needsImprovementCount} PILO${needsImprovementCount !== 1 ? "s" : ""} (${((needsImprovementCount / ploResults.length) * 100).toFixed(0)}%) as Needs Improvement. ${achievedCount === ploResults.length ? "The program demonstrates full attainment across all outcomes, reflecting a strong quality assurance cycle." : achievedCount / ploResults.length >= 0.7 ? "The majority of outcomes have been achieved, indicating an effective program delivery model with limited areas requiring attention." : "A significant proportion of outcomes require enhancement, and a comprehensive review of assessment strategies is recommended."}`, { spacingAfter: 180 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: yearOverYearPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 5. Year-over-Year Performance"),
        createParagraph(`Figure 5 depicts the trajectory of overall program performance over successive academic years using a trend line. ${multiYearYears.length === 1 ? `With data available only for ${selectedYear}, this chart reflects the baseline performance of ${multiYearScores[0]?.toFixed(1) ?? "N/A"}% against which future academic years will be benchmarked.` : (() => { const first = multiYearScores[0]; const last = multiYearScores[multiYearScores.length - 1]; const diff = last - first; return `Performance moved from ${first.toFixed(1)}% in ${multiYearYears[0]} to ${last.toFixed(1)}% in ${multiYearYears[multiYearYears.length - 1]}, representing a ${diff >= 0 ? "gain" : "decline"} of ${Math.abs(diff).toFixed(1)} percentage points. ${diff >= 0 ? "This positive trajectory reflects consistent quality improvement efforts." : "This decline warrants a structured review of assessment practices and resource allocation."}`; })()}`, { spacingAfter: 180 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: learningOutcomesRadarPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 6. Learning Outcomes Performance"),
        createParagraph(`Figure 6 presents a radar chart mapping current PILO scores against their respective target benchmarks across all ${ploResults.length} outcomes. The shaded area represents the actual performance envelope, while the outer boundary indicates the target profile. ${ploResults.every((p) => p.total >= p.target) ? "The current performance polygon closely matches or exceeds the target profile across all axes, indicating consistent and balanced attainment." : `Gaps between the actual and target profiles are most pronounced for ${belowTarget.slice(0, 3).map((p) => p.code).join(", ")}, highlighting the specific domains that require prioritised attention in the forthcoming improvement cycle.`}`, { spacingAfter: 180 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: detailedIndirectPng, transformation: { width: 580, height: 290 } })],
        }),
        createCaption("Figure 7. Detailed Indirect Surveys by PLO"),
        createParagraph(`Figure 7 disaggregates the indirect assessment scores by survey instrument for each PILO, covering Faculty Assessment, Alumni Survey, Employers Survey, and Exit Interviews. ${detailedIndirectRows.some((r) => r.faculty !== null) ? (() => { const withData = detailedIndirectRows.filter((r) => r.faculty !== null); const avgFaculty = withData.reduce((s, r) => s + (r.faculty ?? 0), 0) / withData.length; const avgAlumni = withData.reduce((s, r) => s + (r.alumni ?? 0), 0) / withData.length; const avgEmployers = withData.reduce((s, r) => s + (r.employers ?? 0), 0) / withData.length; const avgExit = withData.reduce((s, r) => s + (r.exitInterviews ?? 0), 0) / withData.length; const highest = Math.max(avgFaculty, avgAlumni, avgEmployers, avgExit); const highestName = highest === avgFaculty ? "Faculty Assessment" : highest === avgAlumni ? "Alumni Survey" : highest === avgEmployers ? "Employers Survey" : "Exit Interviews"; const lowest = Math.min(avgFaculty, avgAlumni, avgEmployers, avgExit); const lowestName = lowest === avgFaculty ? "Faculty Assessment" : lowest === avgAlumni ? "Alumni Survey" : lowest === avgEmployers ? "Employers Survey" : "Exit Interviews"; return `Across all PILOs, the average scores were: Faculty Assessment ${avgFaculty.toFixed(1)}%, Alumni Survey ${avgAlumni.toFixed(1)}%, Employers Survey ${avgEmployers.toFixed(1)}%, and Exit Interviews ${avgExit.toFixed(1)}%. The highest-rated instrument was ${highestName}, while ${lowestName} recorded the lowest average score, suggesting it as a priority focus for stakeholder engagement and feedback quality improvement.`; })() : "Survey data is not yet available for all PILOs in this cycle. Completing the indirect survey instruments will enable a more comprehensive analysis of stakeholder perceptions across all program outcomes."}`, { spacingAfter: 180 }),
        createHeading("4.2 Benchmarking", HeadingLevel.HEADING_2),
        createTextTable(
          ["Benchmark Type", "Value"],
          [
            ["Internal Benchmark", `${internalBenchmark.toFixed(1)}%`],
            ["Target Benchmark", `${targetBenchmark.toFixed(1)}%`],
            ["Actual Benchmark", `${averageActual.toFixed(1)}%`],
            ["PILOs Below Target", `${belowTarget.length}`],
          ]
        ),
        createParagraph(benchmarkingTableAnalysisWord, { spacingBefore: 80, spacingAfter: 160 }),
        createParagraph("PLO Heatmap", { bold: true, spacingBefore: 120 }),
        createTextTable(["PLO", "Direct %", "Indirect %", "Total %", "Target %"], ploResults.map((row) => [
          row.code,
          row.direct.toFixed(1),
          row.indirect.toFixed(1),
          row.total.toFixed(1),
          row.target.toFixed(1),
        ])),
        createParagraph(heatmapTableAnalysisWord, { spacingBefore: 80, spacingAfter: 160 }),
        createHeading("4.3 Conclusion", HeadingLevel.HEADING_2),
        createParagraph(`The ${selectedProgramData?.name || "program"} demonstrates a coherent and measurable assessment framework for PILOs. Performance across the assessed outcomes indicates ${achievedCount === ploResults.length ? "consistently strong attainment" : "solid attainment overall with identifiable areas for enhancement"}. The analysis also shows that ${directAverage >= indirectAverage ? "direct assessment evidence exceeds indirect evidence, suggesting stronger demonstrated performance than stakeholder perception" : "indirect evidence is comparable to or stronger than direct evidence, indicating positive stakeholder confirmation of attainment"}.`),
        createHeading("4.4 Recommendations", HeadingLevel.HEADING_2),
        createBulletParagraph("Maintain explicit alignment between PILOs, course assessments, and evidence collection plans across core courses."),
        createBulletParagraph("Strengthen lower-performing outcomes through targeted instructional interventions and rubric calibration."),
        createBulletParagraph("Expand stakeholder participation in indirect assessment to improve the explanatory value of perception-based measures."),
        createBulletParagraph("Continue annual benchmarking and close the loop by linking findings to curriculum and assessment improvements."),
        createHeading("4.5 Improvement Plans", HeadingLevel.HEADING_2),
        ...improvementPlanItems,
        createParagraph("End of Report", { alignment: AlignmentType.CENTER, bold: true, spacingBefore: 240 }),
      ];

      const doc = new Document({
        background: { color: REPORT_BACKGROUND_HEX },
        sections: [
          {
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 },
                    children: [
                      new TextRun({
                        text: `King Saud University | College of Architecture and Planning | ${selectedProgramData?.name || "Selected Program"}`,
                        bold: true,
                        color: "0F88BF",
                        size: 18,
                      }),
                    ],
                  }),
                ],
              }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 80 },
                    children: [
                      new TextRun({
                        text: `Program Intended Learning Outcomes (PILOs) Assessment Report | ${selectedYear}`,
                        color: "6b7280",
                        size: 16,
                      }),
                    ],
                  }),
                ],
              }),
            },
            children: docChildren,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Program_Intended_Learning_Outcomes_(PILOs)_Assessment_Report_${selectedYear}.docx`);
    } catch (error) {
      console.error("Error exporting Word:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-3">
      <Button
        onClick={exportToPDF}
        disabled={isExporting}
        className="gap-2 bg-white/70 text-red-600 hover:bg-white/80 hover:text-red-700 border-2 border-white/40"
      >
        <FileText className="h-5 w-5" />
        {isExporting ? "Exporting..." : "Export PDF"}
      </Button>
      <Button
        onClick={exportToWord}
        disabled={isExporting}
        className="gap-2 bg-white/70 text-amber-700 hover:bg-white/80 hover:text-amber-800 border-2 border-white/40"
      >
        <FileDown className="h-5 w-5" />
        {isExporting ? "Exporting..." : "Export Word"}
      </Button>
    </div>
  );
}
