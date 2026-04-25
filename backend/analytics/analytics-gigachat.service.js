"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsGigachatService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const https_1 = require("https");
const crypto_1 = require("crypto");
let AnalyticsGigachatService = class AnalyticsGigachatService {
    cachedToken = null;
    cachedTokenExpiresAt = 0;
    isEnabled() {
        return !this.isDisabled() && Boolean(process.env.GIGACHAT_AUTH_KEY);
    }
    async generateReport(context) {
        const accessToken = await this.getAccessToken();
        const completion = await this.requestJson({
            url: this.joinUrl(this.apiBaseUrl(), '/chat/completions'),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                model: this.modelName(),
                messages: [
                    {
                        role: 'system',
                        content: [
                            'Ты готовишь официальную аналитическую справку по демографической ситуации для органов государственного и муниципального управления.',
                            'Опирайся только на переданные данные.',
                            'Не выдумывай показатели, годы, факторы и управленческие выводы.',
                            'Если данные ограничены, формулируй осторожно и прямо отмечай это.',
                            'Верни только валидный JSON без markdown, комментариев и пояснений.',
                            'Структура JSON: {"title":string,"executiveSummary":string,"demographicTrends":string[],"forecastAssessment":string,"policyRecommendations":string[],"planningRecommendations":string[]}.',
                        ].join(' '),
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({
                            task: 'Сформируй аналитическую справку на русском языке.',
                            style: {
                                tone: 'деловой, аналитический, без канцелярской перегруженности',
                                executiveSummary: '1-2 абзаца',
                                demographicTrends: '3-5 пунктов',
                                forecastAssessment: '1-2 абзаца',
                                policyRecommendations: '4-6 пунктов',
                                planningRecommendations: '3-5 пунктов',
                            },
                            context,
                        }, null, 2),
                    },
                ],
                n: 1,
                stream: false,
                max_tokens: 2200,
                repetition_penalty: 1,
            }),
        });
        const content = completion.choices?.[0]?.message?.content?.trim();
        if (!content) {
            throw new Error('GigaChat returned an empty report payload');
        }
        return {
            provider: 'gigachat',
            model: completion.model ?? this.modelName(),
            report: this.parseReport(content),
        };
    }
    async getAccessToken() {
        if (this.cachedToken &&
            this.cachedTokenExpiresAt - 60_000 > Date.now() &&
            this.cachedToken.length > 0) {
            return this.cachedToken;
        }
        const response = await this.requestJson({
            url: this.authUrl(),
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
                RqUID: (0, crypto_1.randomUUID)(),
                Authorization: this.authorizationHeader(),
            },
            body: new URLSearchParams({ scope: this.scope() }).toString(),
        });
        this.cachedToken = response.access_token;
        this.cachedTokenExpiresAt = response.expires_at * 1000;
        return response.access_token;
    }
    parseReport(raw) {
        const sanitized = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
        const start = sanitized.indexOf('{');
        const end = sanitized.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('GigaChat response does not contain a JSON object');
        }
        const payload = JSON.parse(sanitized.slice(start, end + 1));
        const report = {
            title: this.requireString(payload.title, 'title'),
            executiveSummary: this.requireString(payload.executiveSummary, 'executiveSummary'),
            demographicTrends: this.requireStringArray(payload.demographicTrends, 'demographicTrends'),
            forecastAssessment: this.requireString(payload.forecastAssessment, 'forecastAssessment'),
            policyRecommendations: this.requireStringArray(payload.policyRecommendations, 'policyRecommendations'),
            planningRecommendations: this.requireStringArray(payload.planningRecommendations, 'planningRecommendations'),
        };
        if (report.demographicTrends.length === 0 ||
            report.policyRecommendations.length === 0 ||
            report.planningRecommendations.length === 0) {
            throw new Error('GigaChat report JSON is missing required list content');
        }
        return report;
    }
    requireString(value, field) {
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(`GigaChat report field "${field}" is invalid`);
        }
        return value.trim();
    }
    requireStringArray(value, field) {
        if (!Array.isArray(value)) {
            throw new Error(`GigaChat report field "${field}" is not an array`);
        }
        return value
            .filter((item) => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }
    async requestJson(options) {
        const url = new URL(options.url);
        const ca = this.caCertificate();
        const requestOptions = {
            method: options.method,
            hostname: url.hostname,
            port: url.port.length > 0 ? Number(url.port) : undefined,
            path: `${url.pathname}${url.search}`,
            headers: options.headers,
            rejectUnauthorized: !this.ignoreTlsErrors(),
            ca,
        };
        return new Promise((resolve, reject) => {
            const req = (0, https_1.request)(requestOptions, (response) => {
                let raw = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    raw += chunk;
                });
                response.on('end', () => {
                    const statusCode = response.statusCode ?? 500;
                    if (statusCode < 200 || statusCode >= 300) {
                        reject(new Error(this.errorMessage(statusCode, raw)));
                        return;
                    }
                    try {
                        resolve(JSON.parse(raw));
                    }
                    catch (error) {
                        reject(error instanceof Error
                            ? error
                            : new Error('Failed to parse GigaChat response payload'));
                    }
                });
            });
            req.on('error', (error) => reject(error));
            if (options.body) {
                req.write(options.body);
            }
            req.end();
        });
    }
    errorMessage(statusCode, raw) {
        if (raw.trim().length === 0) {
            return `GigaChat request failed with status ${statusCode}`;
        }
        try {
            const payload = JSON.parse(raw);
            return payload.message ?? payload.error ?? `GigaChat request failed with status ${statusCode}`;
        }
        catch {
            return raw;
        }
    }
    authorizationHeader() {
        const raw = process.env.GIGACHAT_AUTH_KEY ?? '';
        if (raw.startsWith('Basic ')) {
            return raw;
        }
        return `Basic ${raw}`;
    }
    scope() {
        return process.env.GIGACHAT_SCOPE ?? 'GIGACHAT_API_PERS';
    }
    modelName() {
        return process.env.GIGACHAT_MODEL ?? 'GigaChat-2-Pro';
    }
    apiBaseUrl() {
        return (process.env.GIGACHAT_API_BASE_URL ?? 'https://gigachat.devices.sberbank.ru/api/v1')
            .replace(/\/$/, '');
    }
    authUrl() {
        return process.env.GIGACHAT_AUTH_URL ?? 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    }
    isDisabled() {
        return (process.env.GIGACHAT_DISABLED ?? '').toLowerCase() === 'true';
    }
    ignoreTlsErrors() {
        return (process.env.GIGACHAT_IGNORE_TLS_ERRORS ?? '').toLowerCase() === 'true';
    }
    caCertificate() {
        const caPath = process.env.GIGACHAT_CA_CERT_PATH;
        if (!caPath) {
            return undefined;
        }
        if (!(0, fs_1.existsSync)(caPath)) {
            throw new Error(`GIGACHAT_CA_CERT_PATH points to a missing file: ${caPath}`);
        }
        return (0, fs_1.readFileSync)(caPath);
    }
    joinUrl(base, path) {
        return `${base}${path.startsWith('/') ? path : `/${path}`}`;
    }
};
exports.AnalyticsGigachatService = AnalyticsGigachatService;
exports.AnalyticsGigachatService = AnalyticsGigachatService = __decorate([
    (0, common_1.Injectable)()
], AnalyticsGigachatService);
//# sourceMappingURL=analytics-gigachat.service.js.map