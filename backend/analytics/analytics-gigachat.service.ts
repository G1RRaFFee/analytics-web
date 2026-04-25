import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { request, type RequestOptions } from 'https';
import { randomUUID } from 'crypto';
import type { AnalyticsGenerationResult, AnalyticsContextPayload } from './analytics.types';

interface GigaChatTokenResponse {
  access_token: string;
  expires_at: number;
}

interface GigaChatCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class AnalyticsGigachatService {
  private cachedToken: string | null = null;
  private cachedTokenExpiresAt = 0;

  isEnabled(): boolean {
    return !this.isDisabled() && Boolean(process.env.GIGACHAT_AUTH_KEY);
  }

  async generateReport(context: AnalyticsContextPayload): Promise<AnalyticsGenerationResult> {
    const accessToken = await this.getAccessToken();
    const completion = await this.requestJson<GigaChatCompletionResponse>({
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
            content: JSON.stringify(
              {
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
              },
              null,
              2,
            ),
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

  private async getAccessToken(): Promise<string> {
    if (
      this.cachedToken &&
      this.cachedTokenExpiresAt - 60_000 > Date.now() &&
      this.cachedToken.length > 0
    ) {
      return this.cachedToken;
    }

    const response = await this.requestJson<GigaChatTokenResponse>({
      url: this.authUrl(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        RqUID: randomUUID(),
        Authorization: this.authorizationHeader(),
      },
      body: new URLSearchParams({ scope: this.scope() }).toString(),
    });

    this.cachedToken = response.access_token;
    this.cachedTokenExpiresAt = response.expires_at * 1000;
    return response.access_token;
  }

  private parseReport(
    raw: string,
  ): AnalyticsGenerationResult['report'] {
    const sanitized = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
    const start = sanitized.indexOf('{');
    const end = sanitized.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('GigaChat response does not contain a JSON object');
    }

    const payload = JSON.parse(sanitized.slice(start, end + 1)) as Record<string, unknown>;
    const report = {
      title: this.requireString(payload.title, 'title'),
      executiveSummary: this.requireString(payload.executiveSummary, 'executiveSummary'),
      demographicTrends: this.requireStringArray(payload.demographicTrends, 'demographicTrends'),
      forecastAssessment: this.requireString(payload.forecastAssessment, 'forecastAssessment'),
      policyRecommendations: this.requireStringArray(
        payload.policyRecommendations,
        'policyRecommendations',
      ),
      planningRecommendations: this.requireStringArray(
        payload.planningRecommendations,
        'planningRecommendations',
      ),
    };

    if (
      report.demographicTrends.length === 0 ||
      report.policyRecommendations.length === 0 ||
      report.planningRecommendations.length === 0
    ) {
      throw new Error('GigaChat report JSON is missing required list content');
    }

    return report;
  }

  private requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`GigaChat report field "${field}" is invalid`);
    }
    return value.trim();
  }

  private requireStringArray(value: unknown, field: string): string[] {
    if (!Array.isArray(value)) {
      throw new Error(`GigaChat report field "${field}" is not an array`);
    }
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private async requestJson<T>(options: {
    url: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: string;
  }): Promise<T> {
    const url = new URL(options.url);
    const ca = this.caCertificate();
    const requestOptions: RequestOptions = {
      method: options.method,
      hostname: url.hostname,
      port: url.port.length > 0 ? Number(url.port) : undefined,
      path: `${url.pathname}${url.search}`,
      headers: options.headers,
      rejectUnauthorized: !this.ignoreTlsErrors(),
      ca,
    };

    return new Promise<T>((resolve, reject) => {
      const req = request(requestOptions, (response) => {
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
            resolve(JSON.parse(raw) as T);
          } catch (error) {
            reject(
              error instanceof Error
                ? error
                : new Error('Failed to parse GigaChat response payload'),
            );
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

  private errorMessage(statusCode: number, raw: string): string {
    if (raw.trim().length === 0) {
      return `GigaChat request failed with status ${statusCode}`;
    }

    try {
      const payload = JSON.parse(raw) as { message?: string; error?: string };
      return payload.message ?? payload.error ?? `GigaChat request failed with status ${statusCode}`;
    } catch {
      return raw;
    }
  }

  private authorizationHeader(): string {
    const raw = process.env.GIGACHAT_AUTH_KEY ?? '';
    if (raw.startsWith('Basic ')) {
      return raw;
    }
    return `Basic ${raw}`;
  }

  private scope(): string {
    return process.env.GIGACHAT_SCOPE ?? 'GIGACHAT_API_PERS';
  }

  private modelName(): string {
    return process.env.GIGACHAT_MODEL ?? 'GigaChat-2-Pro';
  }

  private apiBaseUrl(): string {
    return (process.env.GIGACHAT_API_BASE_URL ?? 'https://gigachat.devices.sberbank.ru/api/v1')
      .replace(/\/$/, '');
  }

  private authUrl(): string {
    return process.env.GIGACHAT_AUTH_URL ?? 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
  }

  private isDisabled(): boolean {
    return (process.env.GIGACHAT_DISABLED ?? '').toLowerCase() === 'true';
  }

  private ignoreTlsErrors(): boolean {
    return (process.env.GIGACHAT_IGNORE_TLS_ERRORS ?? '').toLowerCase() === 'true';
  }

  private caCertificate(): Buffer | undefined {
    const caPath = process.env.GIGACHAT_CA_CERT_PATH;
    if (!caPath) {
      return undefined;
    }

    if (!existsSync(caPath)) {
      throw new Error(`GIGACHAT_CA_CERT_PATH points to a missing file: ${caPath}`);
    }

    return readFileSync(caPath);
  }

  private joinUrl(base: string, path: string): string {
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
