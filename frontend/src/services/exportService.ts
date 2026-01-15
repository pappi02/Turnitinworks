import { jsPDF } from "jspdf";

export interface ReportData {
  id: string;
  title: string;
  student: string;
  uploadDate: string;
  similarity: number;
  status: string;
  totalWords?: number;
  matchedWords?: number;
  sources?: Array<{
    title: string;
    percentage: number;
    matches?: number;
  }>;
}

/**
 * Export reports as PDF
 */
export const exportReportsPDF = async (
  reports: ReportData[],
  fileName: string = "plagiarism-reports.pdf"
): Promise<void> => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont("", "bold");
  doc.text("Plagiarism Reports", margin, yPosition);
  yPosition += 10;

  // Metadata
  doc.setFontSize(10);
  doc.setFont("", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Total Reports: ${reports.length}`, margin, yPosition);
  yPosition += 10;

  // Reports
  reports.forEach((report, index) => {
    // Check if new page is needed
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    // Report header
    doc.setFontSize(12);
    doc.setFont("", "bold");
    doc.text(`${index + 1}. ${report.title}`, margin, yPosition);
    yPosition += 8;

    // Report details
    doc.setFontSize(10);
    doc.setFont("", "normal");
    const details = [
      [`Student: ${report.student}`],
      [`Date: ${report.uploadDate}`],
      [`Status: ${report.status}`],
      [`Similarity: ${report.similarity}%`],
    ];

    details.forEach(([text]) => {
      doc.text(text, margin + 5, yPosition);
      yPosition += 6;
    });

    // Additional details if available
    if (report.totalWords && report.matchedWords) {
      doc.text(
        `Total Words: ${report.totalWords} | Matched: ${report.matchedWords}`,
        margin + 5,
        yPosition
      );
      yPosition += 6;
    }

    // Sources
    if (report.sources && report.sources.length > 0) {
      yPosition += 4;
      doc.setFont("", "bold");
      doc.text("Sources:", margin + 5, yPosition);
      yPosition += 6;

      report.sources.slice(0, 3).forEach((source) => {
        doc.setFont("", "normal");
        doc.text(
          `• ${source.title} (${source.percentage}%)`,
          margin + 10,
          yPosition
        );
        yPosition += 5;
      });

      if (report.sources.length > 3) {
        doc.text(
          `...and ${report.sources.length - 3} more sources`,
          margin + 10,
          yPosition
        );
        yPosition += 5;
      }
    }

    yPosition += 5;
    doc.setDrawColor(200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("", "normal");
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, {
      align: "center",
    });
  }

  // Download
  doc.save(fileName);
};

/**
 * Helper function to escape CSV values and handle special characters
 */
const escapeCSVValue = (value: string | number): string => {
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * Export reports as CSV
 */
export const exportReportsCSV = async (
  reports: ReportData[],
  fileName: string = "plagiarism-reports.csv"
): Promise<void> => {
  // Prepare data
  const headers = [
    "Title",
    "Student",
    "Upload Date",
    "Status",
    "Similarity %",
    "Total Words",
    "Matched Words",
    "Top Source",
    "Top Source %",
  ];

  const rows = reports.map((report) => [
    report.title,
    report.student,
    report.uploadDate,
    report.status,
    String(report.similarity),
    String(report.totalWords || "-"),
    String(report.matchedWords || "-"),
    report.sources?.[0]?.title || "-",
    String(report.sources?.[0]?.percentage || "-"),
  ]);

  // Build CSV content
  const headerRow = headers.map(escapeCSVValue).join(",");
  const dataRows = rows
    .map((row) => row.map(escapeCSVValue).join(","))
    .join("\n");
  const csvContent = `${headerRow}\n${dataRows}`;

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export detailed report as PDF (individual report)
 */
export const exportDetailedReportPDF = async (
  report: ReportData & {
    sources: Array<{
      id: string;
      title: string;
      url: string;
      percentage: number;
      matches: number;
    }>;
    flaggedSections?: Array<{
      id: string;
      text: string;
      source: string;
      percentage: number;
    }>;
  },
  fileName: string = "detailed-report.pdf"
): Promise<void> => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("", "bold");
  doc.text("Plagiarism Detection Report", margin, yPosition);
  yPosition += 15;

  // Document info
  doc.setFontSize(11);
  doc.setFont("", "bold");
  doc.text("Document Information", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont("", "normal");
  const docInfo = [
    `Title: ${report.title}`,
    `Student: ${report.student}`,
    `Upload Date: ${report.uploadDate}`,
    `Status: ${report.status}`,
  ];

  docInfo.forEach((text) => {
    doc.text(text, margin + 5, yPosition);
    yPosition += 6;
  });

  yPosition += 5;

  // Similarity section
  doc.setFontSize(11);
  doc.setFont("", "bold");
  doc.text("Similarity Score", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(28);
  doc.setFont("", "bold");
  doc.setTextColor(
    report.similarity > 30 ? 220 : report.similarity > 15 ? 200 : 50
  );
  doc.text(`${report.similarity}%`, margin + 5, yPosition);
  doc.setTextColor(0);
  yPosition += 15;

  yPosition += 5;

  // Sources section
  if (report.sources && report.sources.length > 0) {
    doc.setFontSize(11);
    doc.setFont("", "bold");
    doc.text("Matched Sources", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    report.sources.forEach((source, idx) => {
      if (idx > 5) return; // Limit to top 5

      doc.setFont("", "bold");
      doc.text(`${idx + 1}. ${source.title}`, margin + 5, yPosition);
      yPosition += 6;

      doc.setFont("", "normal");
      doc.text(
        `Similarity: ${source.percentage}% | Matches: ${source.matches}`,
        margin + 10,
        yPosition
      );
      yPosition += 6;
    });

    if (report.sources.length > 5) {
      yPosition -= 6;
      doc.text(
        `...and ${report.sources.length - 5} more sources`,
        margin + 5,
        yPosition
      );
      yPosition += 6;
    }

    yPosition += 5;
  }

  // Flagged sections
  if (report.flaggedSections && report.flaggedSections.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(11);
    doc.setFont("", "bold");
    doc.text("Flagged Sections", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    report.flaggedSections.slice(0, 3).forEach((section, idx) => {
      doc.setFont("", "bold");
      doc.text(`${idx + 1}. Flagged Section`, margin + 5, yPosition);
      yPosition += 5;

      doc.setFont("", "normal");
      const splitText = doc.splitTextToSize(`"${section.text}"`, 160);
      doc.text(splitText, margin + 5, yPosition);
      yPosition += splitText.length * 4 + 2;

      doc.text(
        `Source: ${section.source} | Similarity: ${section.percentage}%`,
        margin + 5,
        yPosition
      );
      yPosition += 6;

      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("", "normal");
    doc.text(
      `Page ${i} of ${totalPages} | Generated: ${new Date().toLocaleString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save(fileName);
};

/**
 * Export as JSON for archival
 */
export const exportReportsJSON = async (
  reports: ReportData[],
  fileName: string = "plagiarism-reports.json"
): Promise<void> => {
  const dataStr = JSON.stringify(reports, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Batch export with progress callback
 */
export const batchExportReports = async (
  reports: ReportData[],
  format: "pdf" | "csv" | "json",
  onProgress?: (progress: number) => void
): Promise<void> => {
  if (format === "pdf") {
    await exportReportsPDF(reports, `bulk-reports-${Date.now()}.pdf`);
  } else if (format === "csv") {
    await exportReportsCSV(reports, `bulk-reports-${Date.now()}.csv`);
  } else if (format === "json") {
    await exportReportsJSON(reports, `bulk-reports-${Date.now()}.json`);
  }

  onProgress?.(100);
};
