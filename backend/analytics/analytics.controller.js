"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_dto_1 = require("./dto/analytics.dto");
const analytics_service_1 = require("./analytics.service");
let AnalyticsController = class AnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    getContext(request, body) {
        return this.analyticsService.getContext(request.requestId ?? 'unknown', body);
    }
    async getReport(request, body) {
        return this.analyticsService.generateReport(request.requestId ?? 'unknown', body);
    }
    async exportReport(request, response, body) {
        const exported = await this.analyticsService.exportReport(request.requestId ?? 'unknown', body);
        response.setHeader('Content-Type', exported.contentType);
        response.setHeader('Content-Disposition', `attachment; filename="${exported.fileName}"`);
        return new common_1.StreamableFile(exported.buffer);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)('context'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof RequestWithId !== "undefined" && RequestWithId) === "function" ? _a : Object, analytics_dto_1.AnalyticsContextRequestDto]),
    __metadata("design:returntype", Object)
], AnalyticsController.prototype, "getContext", null);
__decorate([
    (0, common_1.Post)('report'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof RequestWithId !== "undefined" && RequestWithId) === "function" ? _b : Object, analytics_dto_1.AnalyticsContextRequestDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getReport", null);
__decorate([
    (0, common_1.Post)('report/export'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof RequestWithId !== "undefined" && RequestWithId) === "function" ? _c : Object, Object, analytics_dto_1.AnalyticsExportRequestDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "exportReport", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('api/v1/analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map