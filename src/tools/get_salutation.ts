import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetSalutation(server: McpServer): void {
  server.registerTool(
    "get_salutation",
    {
      title: "Get Salutation (genesisWorld)",
      description:
        "Compute the correct letter salutation for an address from its " +
        "fields or name parts. Read-only despite using POST. Maps to " +
        "POST /v7.0/type/address/salutation.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        fields: z
          .record(z.any())
          .optional()
          .describe("Address field values to derive the salutation from."),
        term: z
          .string()
          .optional()
          .describe("Free-form term (e.g. a typed name) to guess from."),
        guessFromTermOnly: z
          .boolean()
          .optional()
          .describe("Only use 'term' for guessing, ignore fields."),
        name: z.string().optional().describe("Last name."),
        christianName: z.string().optional().describe("First name."),
        title: z.string().optional().describe("Academic title."),
        letter: z.boolean().optional().describe("Return the letter salutation."),
        preferredLanguage: z
          .string()
          .optional()
          .describe("Language for the salutation, e.g. 'de' or 'en'."),
        gender: z.number().optional().describe("Gender code (see /type/address/gender)."),
        namePrefix: z.string().optional().describe("Name prefix, e.g. 'von'."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend("POST", "/v7.0/type/address/salutation", {}, {
          fields: args.fields,
          term: args.term,
          guessFromTermOnly: args.guessFromTermOnly,
          name: args.name,
          christianName: args.christianName,
          title: args.title,
          letter: args.letter,
          preferredLanguage: args.preferredLanguage,
          gender: args.gender,
          namePrefix: args.namePrefix,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "get_salutation",
  mode: "read",
  kind: "atomic",
  ops: ["POST /v7.0/type/address/salutation"],
  register: registerGetSalutation,
};
