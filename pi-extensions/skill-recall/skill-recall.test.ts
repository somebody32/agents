import { describe, it, expect } from "vitest";
import { buildNudgeMessage, isSkillPath, extractReadSkillsFromEntries, parseSkillsFromSystemPrompt, type TrackedSkill, type KnownSkill, type BranchEntry } from "./skill-recall.js";

describe("buildNudgeMessage", () => {
	it("returns empty string when no skills were read", () => {
		const result = buildNudgeMessage(new Map());
		expect(result).toBe("");
	});

	it("lists a single skill with name, path, and description", () => {
		const skills = new Map([
			[
				"/path/to/tdd/SKILL.md",
				{
					name: "tdd",
					description: "Use when implementing features or fixing bugs.",
					path: "/path/to/tdd/SKILL.md",
				},
			],
		]);

		const result = buildNudgeMessage(skills);

		expect(result).toContain("tdd");
		expect(result).toContain("/path/to/tdd/SKILL.md");
		expect(result).toContain("Use when implementing features or fixing bugs.");
	});

	it("lists multiple skills", () => {
		const skills = new Map([
			[
				"/path/to/tdd/SKILL.md",
				{
					name: "tdd",
					description: "TDD workflow.",
					path: "/path/to/tdd/SKILL.md",
				},
			],
			[
				"/path/to/debugging/SKILL.md",
				{
					name: "systematic-debugging",
					description: "Debug systematically.",
					path: "/path/to/debugging/SKILL.md",
				},
			],
		]);

		const result = buildNudgeMessage(skills);

		expect(result).toContain("tdd");
		expect(result).toContain("systematic-debugging");
	});

	it("contains a forceful re-read instruction", () => {
		const skills = new Map([
			[
				"/path/to/tdd/SKILL.md",
				{
					name: "tdd",
					description: "TDD workflow.",
					path: "/path/to/tdd/SKILL.md",
				},
			],
		]);

		const result = buildNudgeMessage(skills);

		// Must contain strong directive language
		expect(result).toMatch(/MUST|REQUIRED/i);
		// Must tell agent to use the read tool
		expect(result).toMatch(/re-?read|read tool/i);
	});
});

describe("isSkillPath", () => {
	const knownSkills: KnownSkill[] = [
		{ name: "tdd", description: "TDD workflow.", filePath: "/home/user/.agents/skills/tdd/SKILL.md" },
		{ name: "systematic-debugging", description: "Debug systematically.", filePath: "/home/user/.agents/skills/systematic-debugging/SKILL.md" },
	];

	it("returns matching skill when path is an exact skill file", () => {
		const result = isSkillPath("/home/user/.agents/skills/tdd/SKILL.md", knownSkills);
		expect(result).toEqual({
			name: "tdd",
			description: "TDD workflow.",
			path: "/home/user/.agents/skills/tdd/SKILL.md",
		});
	});

	it("returns undefined for a non-skill path", () => {
		const result = isSkillPath("/home/user/project/src/index.ts", knownSkills);
		expect(result).toBeUndefined();
	});

	it("returns undefined for empty skills list", () => {
		const result = isSkillPath("/some/path.md", []);
		expect(result).toBeUndefined();
	});

	it("matches a reference file within a skill directory", () => {
		const result = isSkillPath("/home/user/.agents/skills/tdd/mocking.md", knownSkills);
		expect(result).toEqual({
			name: "tdd",
			description: "TDD workflow.",
			path: "/home/user/.agents/skills/tdd/SKILL.md",
		});
	});

	it("does not match a file in a parent directory of skills", () => {
		const result = isSkillPath("/home/user/.agents/skills/README.md", knownSkills);
		expect(result).toBeUndefined();
	});
});

describe("extractReadSkillsFromEntries", () => {
	const knownSkills: KnownSkill[] = [
		{ name: "tdd", description: "TDD workflow.", filePath: "/home/user/.agents/skills/tdd/SKILL.md" },
		{ name: "systematic-debugging", description: "Debug systematically.", filePath: "/home/user/.agents/skills/systematic-debugging/SKILL.md" },
	];

	it("returns empty map when there are no entries", () => {
		const result = extractReadSkillsFromEntries([], knownSkills);
		expect(result.size).toBe(0);
	});

	it("finds a skill read from an assistant tool call", () => {
		const entries: BranchEntry[] = [
			{
				type: "message",
				message: {
					role: "assistant",
					content: [
						{ type: "toolCall", name: "read", arguments: { path: "/home/user/.agents/skills/tdd/SKILL.md" } },
					],
				},
			},
		];

		const result = extractReadSkillsFromEntries(entries, knownSkills);

		expect(result.size).toBe(1);
		expect(result.get("/home/user/.agents/skills/tdd/SKILL.md")).toEqual({
			name: "tdd",
			description: "TDD workflow.",
			path: "/home/user/.agents/skills/tdd/SKILL.md",
		});
	});

	it("finds multiple skills across entries", () => {
		const entries: BranchEntry[] = [
			{
				type: "message",
				message: {
					role: "assistant",
					content: [
						{ type: "toolCall", name: "read", arguments: { path: "/home/user/.agents/skills/tdd/SKILL.md" } },
					],
				},
			},
			{
				type: "message",
				message: {
					role: "assistant",
					content: [
						{ type: "toolCall", name: "read", arguments: { path: "/home/user/.agents/skills/systematic-debugging/SKILL.md" } },
					],
				},
			},
		];

		const result = extractReadSkillsFromEntries(entries, knownSkills);

		expect(result.size).toBe(2);
		expect(result.has("/home/user/.agents/skills/tdd/SKILL.md")).toBe(true);
		expect(result.has("/home/user/.agents/skills/systematic-debugging/SKILL.md")).toBe(true);
	});

	it("ignores non-read tool calls", () => {
		const entries: BranchEntry[] = [
			{
				type: "message",
				message: {
					role: "assistant",
					content: [
						{ type: "toolCall", name: "bash", arguments: { command: "ls" } },
					],
				},
			},
		];

		const result = extractReadSkillsFromEntries(entries, knownSkills);
		expect(result.size).toBe(0);
	});

	it("ignores read calls for non-skill files", () => {
		const entries: BranchEntry[] = [
			{
				type: "message",
				message: {
					role: "assistant",
					content: [
						{ type: "toolCall", name: "read", arguments: { path: "/home/user/project/src/index.ts" } },
					],
				},
			},
		];

		const result = extractReadSkillsFromEntries(entries, knownSkills);
		expect(result.size).toBe(0);
	});

	it("ignores non-message entries", () => {
		const entries: BranchEntry[] = [
			{ type: "compaction" } as any,
			{ type: "model_change" } as any,
		];

		const result = extractReadSkillsFromEntries(entries, knownSkills);
		expect(result.size).toBe(0);
	});

	it("deduplicates when same skill is read multiple times", () => {
		const entries: BranchEntry[] = [
			{
				type: "message",
				message: {
					role: "assistant",
					content: [
						{ type: "toolCall", name: "read", arguments: { path: "/home/user/.agents/skills/tdd/SKILL.md" } },
					],
				},
			},
			{
				type: "message",
				message: {
					role: "assistant",
					content: [
						{ type: "toolCall", name: "read", arguments: { path: "/home/user/.agents/skills/tdd/mocking.md" } },
					],
				},
			},
		];

		const result = extractReadSkillsFromEntries(entries, knownSkills);

		// Both paths belong to tdd skill — should deduplicate by skill SKILL.md path
		expect(result.size).toBe(1);
		expect(result.has("/home/user/.agents/skills/tdd/SKILL.md")).toBe(true);
	});
});

describe("parseSkillsFromSystemPrompt", () => {
	it("returns empty array for prompt without skills", () => {
		const result = parseSkillsFromSystemPrompt("You are an assistant.");
		expect(result).toEqual([]);
	});

	it("parses a single skill from the system prompt", () => {
		const prompt = `Some preamble text.

<available_skills>
  <skill>
    <name>tdd</name>
    <description>Use when implementing features.</description>
    <location>/home/user/.agents/skills/tdd/SKILL.md</location>
  </skill>
</available_skills>

More text.`;

		const result = parseSkillsFromSystemPrompt(prompt);

		expect(result).toEqual([
			{
				name: "tdd",
				description: "Use when implementing features.",
				filePath: "/home/user/.agents/skills/tdd/SKILL.md",
			},
		]);
	});

	it("parses multiple skills", () => {
		const prompt = `<available_skills>
  <skill>
    <name>tdd</name>
    <description>TDD workflow.</description>
    <location>/path/tdd/SKILL.md</location>
  </skill>
  <skill>
    <name>debugging</name>
    <description>Debug stuff.</description>
    <location>/path/debugging/SKILL.md</location>
  </skill>
</available_skills>`;

		const result = parseSkillsFromSystemPrompt(prompt);

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("tdd");
		expect(result[1].name).toBe("debugging");
	});

	it("handles XML-escaped characters in description", () => {
		const prompt = `<available_skills>
  <skill>
    <name>test</name>
    <description>Use for &lt;special&gt; &amp; cases.</description>
    <location>/path/test/SKILL.md</location>
  </skill>
</available_skills>`;

		const result = parseSkillsFromSystemPrompt(prompt);

		expect(result[0].description).toBe("Use for &lt;special&gt; &amp; cases.");
	});
});
