import { Injectable } from '@nestjs/common';
import fontkit from '@pdf-lib/fontkit';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { existsSync, readFileSync } from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
import type {
  AnalyticsReportResponse,
  ReportFormat,
} from '../contracts/api-contracts';

const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN = 50;
const PDF_BODY_SIZE = 11;
const PDF_LINE_HEIGHT = 16;

@Injectable()
export class AnalyticsExportService {
  async export(
    report: AnalyticsReportResponse,
    format: ReportFormat,
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    if (format === 'docx') {
      return {
        buffer: await this.buildDocx(report),
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${this.fileNameBase(report)}.docx`,
      };
    }

    return {
      buffer: await this.buildPdf(report),
      contentType: 'application/pdf',
      fileName: `${this.fileNameBase(report)}.pdf`,
    };
  }

  private async buildDocx(report: AnalyticsReportResponse): Promise<Buffer> {
    const metadataLine = this.metadataLine(report);
    const document = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: report.report.title, bold: true, size: 32 })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 280 },
              children: [new TextRun({ text: metadataLine, italics: true, size: 20 })],
            }),
            this.heading('1. Краткое резюме'),
            this.body(report.report.executiveSummary),
            this.heading('2. Демографические тенденции и факторы влияния'),
            ...report.report.demographicTrends.map((item) => this.bullet(item)),
            this.heading('3. Прогнозная оценка'),
            this.body(report.report.forecastAssessment),
            this.heading('4. Рекомендации по социальной политике'),
            ...report.report.policyRecommendations.map((item) => this.bullet(item)),
            this.heading('5. Рекомендации по территориальному планированию'),
            ...report.report.planningRecommendations.map((item) => this.bullet(item)),
          ],
        },
      ],
    });

    return Buffer.from(await Packer.toBuffer(document));
  }

  private async buildPdf(report: AnalyticsReportResponse): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const regular = await pdfDoc.embedFont(this.loadPdfFont(false), { subset: true });
    const bold = await pdfDoc.embedFont(this.loadPdfFont(true), { subset: true });
    let page = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
    let cursorY = PDF_PAGE_HEIGHT - PDF_MARGIN;

    const ensurePage = (requiredHeight = PDF_LINE_HEIGHT) => {
      if (cursorY <= PDF_MARGIN + requiredHeight) {
        page = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
        cursorY = PDF_PAGE_HEIGHT - PDF_MARGIN;
      }
    };

    const drawWrapped = (
      text: string,
      x: number,
      fontSize: number,
      font: typeof regular,
      color = rgb(0.08, 0.12, 0.2),
    ) => {
      const maxWidth = PDF_PAGE_WIDTH - PDF_MARGIN * 2 - (x - PDF_MARGIN);
      const words = text.replace(/\s+/g, ' ').trim().split(' ');
      let line = '';

      for (const word of words) {
        const candidate = line.length === 0 ? word : `${line} ${word}`;
        const width = font.widthOfTextAtSize(candidate, fontSize);
        if (width <= maxWidth) {
          line = candidate;
          continue;
        }

        ensurePage();
        page.drawText(line, { x, y: cursorY, size: fontSize, font, color });
        cursorY -= PDF_LINE_HEIGHT;
        line = word;
      }

      if (line.length > 0) {
        ensurePage();
        page.drawText(line, { x, y: cursorY, size: fontSize, font, color });
        cursorY -= PDF_LINE_HEIGHT;
      }
    };

    const heading = (text: string, level: 1 | 2 = 1) => {
      cursorY -= level === 1 ? 6 : 4;
      drawWrapped(text, PDF_MARGIN, level === 1 ? 15 : 12, bold, rgb(0.03, 0.16, 0.35));
      cursorY -= 4;
    };

    const paragraph = (text: string) => {
      drawWrapped(text, PDF_MARGIN, PDF_BODY_SIZE, regular);
      cursorY -= 4;
    };

    const bullet = (text: string) => {
      ensurePage();
      page.drawText('•', {
        x: PDF_MARGIN,
        y: cursorY,
        size: PDF_BODY_SIZE,
        font: bold,
        color: rgb(0.08, 0.12, 0.2),
      });
      drawWrapped(text, PDF_MARGIN + 14, PDF_BODY_SIZE, regular);
      cursorY -= 2;
    };

    heading(report.report.title);
    paragraph(this.metadataLine(report));
    heading('1. Краткое резюме');
    paragraph(report.report.executiveSummary);
    heading('2. Демографические тенденции и факторы влияния');
    report.report.demographicTrends.forEach((item) => bullet(item));
    heading('3. Прогнозная оценка');
    paragraph(report.report.forecastAssessment);
    heading('4. Рекомендации по социальной политике');
    report.report.policyRecommendations.forEach((item) => bullet(item));
    heading('5. Рекомендации по территориальному планированию');
    report.report.planningRecommendations.forEach((item) => bullet(item));

    return Buffer.from(await pdfDoc.save());
  }

  private heading(text: string): Paragraph {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 220, after: 80 },
      children: [new TextRun({ text, bold: true })],
    });
  }

  private body(text: string): Paragraph {
    return new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun(text)],
    });
  }

  private bullet(text: string): Paragraph {
    return new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 60 },
      children: [new TextRun(text)],
    });
  }

  private metadataLine(report: AnalyticsReportResponse): string {
    return [
      `Территория: ${report.entity.name}`,
      `Период анализа: ${report.period.periodFromYear}-${report.period.periodToYear}`,
      `Горизонт прогноза: ${report.period.horizonYears} лет`,
      `Режим генерации: ${report.generation.provider}${report.generation.model ? ` (${report.generation.model})` : ''}`,
      `Дата формирования: ${new Date(report.generatedAt).toLocaleString('ru-RU')}`,
    ].join(' | ');
  }

  private fileNameBase(report: AnalyticsReportResponse): string {
    const base = `${report.entity.level}-${report.entity.id}-${report.generatedAt.slice(0, 10)}`;
    return `analytics-report-${base.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase()}`;
  }

  private loadPdfFont(isBold: boolean): Buffer {
    const envPath = isBold
      ? process.env.PDF_FONT_BOLD_PATH
      : process.env.PDF_FONT_REGULAR_PATH;
    const candidates = [
      envPath,
      ...(isBold
        ? [
            'C:\\Windows\\Fonts\\arialbd.ttf',
            'C:\\Windows\\Fonts\\segoeuib.ttf',
            '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
            'C:\\Windows\\Fonts\\arial.ttf',
            'C:\\Windows\\Fonts\\segoeui.ttf',
            '/usr/share/fonts/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/TTF/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
          ]
        : [
            'C:\\Windows\\Fonts\\arial.ttf',
            'C:\\Windows\\Fonts\\segoeui.ttf',
            '/usr/share/fonts/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/TTF/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
          ]),
    ].filter((value): value is string => Boolean(value));

    const foundPath = candidates.find((candidate) => existsSync(candidate));
    if (!foundPath) {
      throw new Error(
        `No PDF font found for ${isBold ? 'bold' : 'regular'} text. Tried: ${candidates.join(', ')}`,
      );
    }

    return readFileSync(foundPath);
  }
}
