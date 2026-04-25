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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsExportRequestDto = exports.AnalyticsContextRequestDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const api_contracts_1 = require("../../contracts/api-contracts");
class AnalyticsContextRequestDto {
    entityLevel;
    entityId;
    year;
    periodFromYear;
    periodToYear;
    horizonYears;
    confidenceLevel;
}
exports.AnalyticsContextRequestDto = AnalyticsContextRequestDto;
__decorate([
    (0, class_validator_1.IsIn)(api_contracts_1.ENTITY_LEVELS),
    __metadata("design:type", String)
], AnalyticsContextRequestDto.prototype, "entityLevel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyticsContextRequestDto.prototype, "entityId", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1900),
    __metadata("design:type", Number)
], AnalyticsContextRequestDto.prototype, "year", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1900),
    __metadata("design:type", Number)
], AnalyticsContextRequestDto.prototype, "periodFromYear", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1900),
    __metadata("design:type", Number)
], AnalyticsContextRequestDto.prototype, "periodToYear", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(5),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], AnalyticsContextRequestDto.prototype, "horizonYears", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsIn)(api_contracts_1.CONFIDENCE_LEVELS),
    __metadata("design:type", Number)
], AnalyticsContextRequestDto.prototype, "confidenceLevel", void 0);
class AnalyticsExportRequestDto extends AnalyticsContextRequestDto {
    format;
}
exports.AnalyticsExportRequestDto = AnalyticsExportRequestDto;
__decorate([
    (0, class_validator_1.IsIn)(api_contracts_1.REPORT_FORMATS),
    __metadata("design:type", String)
], AnalyticsExportRequestDto.prototype, "format", void 0);
//# sourceMappingURL=analytics.dto.js.map