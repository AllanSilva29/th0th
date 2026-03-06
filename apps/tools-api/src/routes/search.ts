/**
 * Search Routes
 *
 * POST /api/v1/search/project - Busca em projeto indexado
 * POST /api/v1/search/code    - Busca semântica de código
 */

import { Elysia, t } from "elysia";
import { SearchProjectTool, SearchCodeTool } from "@th0th-ai/core";

const searchProjectTool = new SearchProjectTool();
const searchCodeTool = new SearchCodeTool();

export const searchRoutes = new Elysia({ prefix: "/api/v1/search" })
  .post(
    "/project",
    async ({ body }) => {
      return await searchProjectTool.handle(body);
    },
    {
      transform({ body }: any) {
        // Normalize string arrays before validation
        // Handles cases where arrays are sent as:
        // 1. JSON strings: '["item1", "item2"]'
        // 2. Python-style strings: "['item1', 'item2']"
        // 3. Single values: "item1"
        
        const normalizeArrayParam = (value: any): any => {
          if (typeof value !== 'string') return value;
          
          // Try parsing as JSON first
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            // Not valid JSON, try Python-style array
            // Convert Python list syntax to JSON: ['item'] -> ["item"]
            const pythonArrayMatch = value.match(/^\[(.+)\]$/);
            if (pythonArrayMatch) {
              try {
                // Replace single quotes with double quotes for JSON parsing
                const jsonStr = '[' + pythonArrayMatch[1].replace(/'/g, '"') + ']';
                const parsed = JSON.parse(jsonStr);
                if (Array.isArray(parsed)) return parsed;
              } catch {
                // Fall through to single value
              }
            }
          }
          
          // Treat as single pattern
          return [value];
        };
        
        if (body.include !== undefined) {
          body.include = normalizeArrayParam(body.include);
        }
        
        if (body.exclude !== undefined) {
          body.exclude = normalizeArrayParam(body.exclude);
        }
      },
      body: t.Object({
        query: t.String({
          description: "Search query (natural language or keywords)",
        }),
        projectId: t.String({ description: "Project ID to search in" }),
        projectPath: t.Optional(
          t.String({ description: "Project path for auto-reindex" }),
        ),
        maxResults: t.Optional(
          t.Number({ default: 10, description: "Max results to return" }),
        ),
        minScore: t.Optional(
          t.Number({
            default: 0.3,
            description: "Minimum relevance score (0-1)",
          }),
        ),
        responseMode: t.Optional(
          t.Union([t.Literal("summary"), t.Literal("full")], {
            default: "summary",
          }),
        ),
        autoReindex: t.Optional(t.Boolean({ default: true })),
        include: t.Optional(
          t.Array(t.String(), { description: "Glob patterns to include" }),
        ),
        exclude: t.Optional(
          t.Array(t.String(), { description: "Glob patterns to exclude" }),
        ),
        explainScores: t.Optional(t.Boolean({ default: false })),
      }),
      detail: {
        tags: ["search"],
        summary: "Search indexed project",
        description:
          "Contextual search using hybrid vector + keyword search with RRF ranking",
      },
    },
  )
  .post(
    "/code",
    async ({ body }) => {
      return await searchCodeTool.handle(body);
    },
    {
      body: t.Object({
        query: t.String({ description: "Code search query" }),
        projectId: t.String({ description: "Project ID to search in" }),
        limit: t.Optional(t.Number({ default: 10 })),
      }),
      detail: {
        tags: ["search"],
        summary: "Semantic code search",
        description:
          "Search for code using semantic and keyword search (alias for search_project)",
      },
    },
  );
