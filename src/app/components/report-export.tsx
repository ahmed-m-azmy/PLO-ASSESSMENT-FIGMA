import * as React from "react";
import { Button } from "./ui/button";
import { FileDown, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, ImageRun, PageBreak, BorderStyle, ShadingType, VerticalAlign, Header, Footer } from "docx";
import { saveAs } from "file-saver";

interface ReportExportProps {
  departments: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; departmentId: string }>;
  clos: Array<{ id: string; code: string; description: string; targetValue: number; ploId?: string; achievement?: number; weight?: number }>;
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
    faculty: number;
    alumni: number;
    employers: number;
    exitInterviews: number;
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

const buildUniversityLogoSvg = () => `
  <svg xmlns="http://www.w3.org/2000/svg" width="360" height="420" viewBox="0 0 360 420">
    <rect x="30" y="20" width="300" height="360" rx="88" fill="#ffffff" stroke="#0F88BF" stroke-width="18" />
    <circle cx="180" cy="112" r="38" fill="#0F88BF" />
    <rect x="171" y="112" width="18" height="88" fill="#0F88BF" />
    <path d="M108 102 C135 76, 168 76, 180 106 C192 76, 225 76, 252 102 C222 96, 198 106, 180 132 C162 106, 138 96, 108 102 Z" fill="#0F88BF" />
    <path d="M118 236 C160 210, 200 210, 242 236 C212 234, 193 242, 180 256 C167 242, 148 234, 118 236 Z" fill="#0F88BF" />
    <path d="M122 276 L170 244 L180 254 L138 288 Z" fill="#0F88BF" />
    <path d="M238 276 L190 244 L180 254 L222 288 Z" fill="#0F88BF" />
    <path d="M88 302 Q180 264 272 302 L248 356 Q180 334 112 356 Z" fill="#0F88BF" />
    <text x="180" y="332" font-size="40" font-weight="700" text-anchor="middle" fill="#ffffff">1957</text>
  </svg>
`;
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
      const pdf = new jsPDF("p", "mm", "a4") as any;
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header with gradient effect
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 45, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("Learning Outcomes Assessment Report", pageWidth / 2, 18, { align: "center" });
      pdf.setFontSize(14);
      pdf.text("College of Architecture and Planning", pageWidth / 2, 28, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 36, { align: "center" });

      yPosition = 55;
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

      // CLOs Section Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(37, 99, 235);
      pdf.text("Course Learning Outcomes (CLOs)", 10, yPosition);
      yPosition += 8;

      // CLOs Table
      const cloData = clos.map((clo) => {
        const score = calculateWeightedScore(clo.id, "CLO");
        const status = score >= clo.targetValue ? "Achieved" : "Not Achieved";
        return [clo.code, clo.description, `${clo.targetValue}%`, `${score}%`, status];
      });

      autoTable(pdf, {
        startY: yPosition,
        head: [["Code", "Description", "Target", "Current", "Status"]],
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

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // PLOs Table
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

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

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
          detail ? `${detail.faculty.toFixed(1)}%` : "-",
          detail ? `${detail.alumni.toFixed(1)}%` : "-",
          detail ? `${detail.employers.toFixed(1)}%` : "-",
          detail ? `${detail.exitInterviews.toFixed(1)}%` : "-",
          `${(detail ? detail.indirectTotal : fallbackTotal).toFixed(1)}%`,
        ];
      });

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

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Assessments Table
      const programAssessments = assessments.filter((a) => a.programId === selectedProgram && a.academicYear === selectedYear);
      const assessmentData = programAssessments.map((assessment) => {
        const outcome = assessment.outcomeType === "CLO"
          ? clos.find((c) => c.id === assessment.outcomeId)
          : plos.find((p) => p.id === assessment.outcomeId);
        return [
          assessment.name,
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
        const totalWeight = relatedClos.reduce((sum, clo) => sum + Number(clo.weight ?? 0), 0);
        const weightedSum = relatedClos.reduce(
          (sum, clo) => sum + Number(clo.achievement ?? 0) * Number(clo.weight ?? 0),
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
          ? indirectAssessments.reduce((sum, assessment) => sum + assessment.value, 0) / indirectAssessments.length
          : 0;
        const total = calculateWeightedScore(plo.id, "PLO");
        return {
          code: plo.code,
          description: plo.description,
          direct,
          indirect,
          total,
          target: plo.targetValue,
          achieved: total >= plo.targetValue,
        };
      });

      const cloRows = clos.map((clo) => {
        const score = calculateWeightedScore(clo.id, "CLO");
        return [
          clo.code,
          clo.description,
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
          assessment.name,
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
          ? fallbackIndirect.reduce((sum, a) => sum + a.value, 0) / fallbackIndirect.length
          : 0;

        return {
          code: plo.code,
          faculty: detail ? detail.faculty : null,
          alumni: detail ? detail.alumni : null,
          employers: detail ? detail.employers : null,
          exitInterviews: detail ? detail.exitInterviews : null,
          total: detail ? detail.indirectTotal : fallbackTotal,
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
      const directAverage = directAssessments.length > 0
        ? directAssessments.reduce((sum, assessment) => sum + assessment.value, 0) / directAssessments.length
        : 0;
      const indirectAverage = indirectAssessments.length > 0
        ? indirectAssessments.reduce((sum, assessment) => sum + assessment.value, 0) / indirectAssessments.length
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

      const universityLogoPng = await svgToPngBytes(
        buildUniversityLogoSvg(),
        360,
        420
      );

      const introText = `The purpose of this report is to evaluate the extent to which the ${selectedProgramData?.name || "selected"} program has achieved its Program Intended Learning Outcomes (PILOs) during the academic year ${selectedYear}. The analysis draws upon direct and indirect evidence, integrates weighted course-level performance, and supports evidence-based enhancement decisions aligned with internal quality assurance expectations.`;

      const findingsText = `The program achieved ${achievedCount} out of ${ploResults.length} PILOs at or above their specified benchmark. ${belowTarget.length > 0 ? `The following PILOs remained below target in the current cycle: ${belowTarget.map((item) => item.code).join(", ")}.` : "All assessed PILOs met or exceeded their target benchmark in the current cycle."}`;

      const docChildren = [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 60 },
          children: [new ImageRun({ type: "png", data: universityLogoPng, transformation: { width: 110, height: 128 } })],
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
        createTextTable(["Code", "Description", "Target", "Current", "Status"], cloRows),
        createParagraph("Program Intended Learning Outcomes (PILOs) Summary", { bold: true, spacingBefore: 180 }),
        createTextTable(["Code", "Description", "Direct", "Indirect", "Total", "Target", "Status"], ploRows),
        createParagraph("Assessment Evidence Register", { bold: true, spacingBefore: 180 }),
        createTextTable(["Assessment", "Type", "Outcome", "Level", "Weight", "Score"], assessmentRows),
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
        createHeading("4.1 Assessment Charts", HeadingLevel.HEADING_2),
        createParagraph("The following charts summarize the current distribution of assessment evidence, year-on-year performance movement, comparative PILO attainment, and the detailed indirect survey structure by PLO."),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: assessmentDistributionPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 1. Assessment Type Distribution"),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: multiYearPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 2. Multi-Year Comparison"),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: performanceComparisonPng, transformation: { width: 580, height: 290 } })],
        }),
        createCaption("Figure 3. PLO Performance Comparison"),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: ploProgressPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 4. PLO Progress"),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: yearOverYearPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 5. Year-over-Year Performance"),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: learningOutcomesRadarPng, transformation: { width: 580, height: 265 } })],
        }),
        createCaption("Figure 6. Learning Outcomes Performance"),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: "png", data: detailedIndirectPng, transformation: { width: 580, height: 290 } })],
        }),
        createCaption("Figure 7. Detailed Indirect Surveys by PLO"),
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
        createParagraph(
          belowTarget.length > 0
            ? `A total of ${belowTarget.length} PILOs fell below their target benchmark and therefore require focused follow-up in the next assessment cycle.`
            : "All PILOs met or exceeded their target benchmark, indicating strong program-level attainment for the current cycle.",
          { spacingBefore: 120 }
        ),
        createParagraph("PLO Heatmap", { bold: true, spacingBefore: 120 }),
        createTextTable(["PLO", "Direct %", "Indirect %", "Total %", "Target %"], ploResults.map((row) => [
          row.code,
          row.direct.toFixed(1),
          row.indirect.toFixed(1),
          row.total.toFixed(1),
          row.target.toFixed(1),
        ])),
        createHeading("4.3 Conclusion", HeadingLevel.HEADING_2),
        createParagraph(`The ${selectedProgramData?.name || "program"} demonstrates a coherent and measurable assessment framework for PILOs. Performance across the assessed outcomes indicates ${achievedCount === ploResults.length ? "consistently strong attainment" : "solid attainment overall with identifiable areas for enhancement"}. The analysis also shows that ${directAverage >= indirectAverage ? "direct assessment evidence exceeds indirect evidence, suggesting stronger demonstrated performance than stakeholder perception" : "indirect evidence is comparable to or stronger than direct evidence, indicating positive stakeholder confirmation of attainment"}.`),
        createHeading("4.4 Recommendations", HeadingLevel.HEADING_2),
        createBulletParagraph("Maintain explicit alignment between PILOs, course assessments, and evidence collection plans across core courses."),
        createBulletParagraph("Strengthen lower-performing outcomes through targeted instructional interventions and rubric calibration."),
        createBulletParagraph("Expand stakeholder participation in indirect assessment to improve the explanatory value of perception-based measures."),
        createBulletParagraph("Continue annual benchmarking and close the loop by linking findings to curriculum and assessment improvements."),
        createHeading("4.5 Improvement Plans", HeadingLevel.HEADING_2),
        belowTarget.length > 0
          ? createTextTable(
              ["PILO", "Priority Issue", "Improvement Plan"],
              belowTarget.map((item) => [
                item.code,
                `${item.code} is currently below its target benchmark by ${(item.target - item.total).toFixed(1)} percentage points.`,
                getImprovementActions(item.code),
              ])
            )
          : createParagraph("All PILOs achieved the desired benchmark. Improvement plans should therefore focus on continuous enhancement, evidence triangulation, and sustaining attainment in the next cycle."),
        createParagraph("End of Report", { alignment: AlignmentType.CENTER, bold: true, spacingBefore: 240 }),
      ];

      const doc = new Document({
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
