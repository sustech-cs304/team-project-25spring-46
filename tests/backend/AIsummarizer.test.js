"use strict";
// tests/backend/AIsummarizer.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Mock external modules before any imports to prevent side-effects
 */
jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'parsed text' }));
jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: { choices: [{ message: { content: '   answer ' } }] } }),
}));
// Mock database module to avoid real connection and side-effects
jest.mock('../../src/database', () => ({
    __esModule: true,
    default: { query: jest.fn() }
}));
// Mock fs to override readFileSync
jest.mock('fs', () => {
    const actualFs = jest.requireActual('fs');
    return {
        ...actualFs,
        readFileSync: jest.fn().mockReturnValue(Buffer.from('PDF')),
        promises: actualFs.promises
    };
});
// No need to spy on path.join: use actual implementation
const database_1 = __importDefault(require("../../src/database"));
const AIsummarizer_1 = require("../../src/AIsummarizer");
const axios_1 = __importDefault(require("axios"));
const pdfMock = require('pdf-parse');
const axiosMock = axios_1.default;
describe('AIsummarizer', () => {
    beforeEach(() => {
        // Reset mocks
        database_1.default.query.mockResolvedValue({ rows: [{ folder_path: '/base' }] });
        pdfMock.mockClear();
        axiosMock.post.mockClear();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('generateAISummary returns trimmed content', async () => {
        const result = await (0, AIsummarizer_1.generateAISummary)('course/sub/file.pdf');
        expect(pdfMock).toHaveBeenCalled();
        expect(axiosMock.post).toHaveBeenCalled();
        expect(result).toBe('answer');
    });
    it('generateAIQuiz returns parsed JSON array', async () => {
        // Adjust axios mock for quiz scenario
        axiosMock.post.mockResolvedValue({ data: { choices: [{ message: { content: '[1,2,3]' } }] } });
        const quiz = await (0, AIsummarizer_1.generateAIQuiz)('course/sub/file.pdf');
        expect(pdfMock).toHaveBeenCalled();
        expect(Array.isArray(quiz)).toBe(true);
        expect(quiz).toEqual([1, 2, 3]);
    });
});
//# sourceMappingURL=AIsummarizer.test.js.map