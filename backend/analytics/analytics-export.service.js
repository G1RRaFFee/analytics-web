"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsExportService = void 0;
const common_1 = require("@nestjs/common");
const fontkit_1 = __importDefault(require("@pdf-lib/fontkit"));
const docx_1 = require("docx");
const fs_1 = require("fs");
const pdf_lib_1 = require("pdf-lib");
const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN = 50;
const PDF_BODY_SIZE = 11;
const PDF_LINE_HEIGHT = 16;
let AnalyticsExportService = class AnalyticsExportService {
    async export(report, format) {
        if (format === 'docx') {
            return {
                buffer: await this.buildDocx(report),
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                fileName: `${this.fileNameBase(report)}.docx`,
            };
        }
        return {
            buffer: await this.buildPdf(report),
            contentType: 'application/pdf',
            fileName: `${this.fileNameBase(report)}.pdf`,
        };
    }
    async buildDocx(report) {
        const metadataLine = this.metadataLine(report);
        const document = new docx_1.Document({
            sections: [
                {
                    children: [
                        new docx_1.Paragraph({
                            heading: docx_1.HeadingLevel.TITLE,
                            alignment: docx_1.AlignmentType.CENTER,
                            children: [new docx_1.TextRun({ text: report.report.title, bold: true, size: 32 })],
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            spacing: { after: 280 },
                            children: [new docx_1.TextRun({ text: metadataLine, italics: true, size: 20 })],
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
        return Buffer.from(await docx_1.Packer.toBuffer(document));
    }
    async buildPdf(report) {
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        pdfDoc.registerFontkit(fontkit_1.default);
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
        const drawWrapped = (text, x, fontSize, font, color = (0, pdf_lib_1.rgb)(0.08, 0.12, 0.2)) => {
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
        const heading = (text, level = 1) => {
            cursorY -= level === 1 ? 6 : 4;
            drawWrapped(text, PDF_MARGIN, level === 1 ? 15 : 12, bold, (0, pdf_lib_1.rgb)(0.03, 0.16, 0.35));
            cursorY -= 4;
        };
        const paragraph = (text) => {
            drawWrapped(text, PDF_MARGIN, PDF_BODY_SIZE, regular);
            cursorY -= 4;
        };
        const bullet = (text) => {
            ensurePage();
            page.drawText('•', {
                x: PDF_MARGIN,
                y: cursorY,
                size: PDF_BODY_SIZE,
                font: bold,
                color: (0, pdf_lib_1.rgb)(0.08, 0.12, 0.2),
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
    heading(text) {
        return new docx_1.Paragraph({
            heading: docx_1.HeadingLevel.HEADING_1,
            spacing: { before: 220, after: 80 },
            children: [new docx_1.TextRun({ text, bold: true })],
        });
    }
    body(text) {
        return new docx_1.Paragraph({
            spacing: { after: 120 },
            children: [new docx_1.TextRun(text)],
        });
    }
    bullet(text) {
        return new docx_1.Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [new docx_1.TextRun(text)],
        });
    }
    metadataLine(report) {
        return [
            `Территория: ${report.entity.name}`,
            `Период анализа: ${report.period.periodFromYear}-${report.period.periodToYear}`,
            `Горизонт прогноза: ${report.period.horizonYears} лет`,
            `Режим генерации: ${report.generation.provider}${report.generation.model ? ` (${report.generation.model})` : ''}`,
            `Дата формирования: ${new Date(report.generatedAt).toLocaleString('ru-RU')}`,
        ].join(' | ');
    }
    fileNameBase(report) {
        const base = `${report.entity.level}-${report.entity.id}-${report.generatedAt.slice(0, 10)}`;
        return `analytics-report-${base.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase()}`;
    }
    loadPdfFont(isBold) {
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
        ].filter((value) => Boolean(value));
        const foundPath = candidates.find((candidate) => (0, fs_1.existsSync)(candidate));
        if (!foundPath) {
            throw new Error(`No PDF font found for ${isBold ? 'bold' : 'regular'} text. Tried: ${candidates.join(', ')}`);
        }
        return (0, fs_1.readFileSync)(foundPath);
    }
};
exports.AnalyticsExportService = AnalyticsExportService;
exports.AnalyticsExportService = AnalyticsExportService = __decorate([
    (0, common_1.Injectable)()
], AnalyticsExportService);
//# sourceMappingURL=analytics-export.service.js.map