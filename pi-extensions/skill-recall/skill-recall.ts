/** Info about a skill that was read during the session. */
export interface TrackedSkill {
	name: string;
	description: string;
	path: string;
}

/** Minimal skill info as known from pi's skill discovery (matches pi's Skill type). */
export interface KnownSkill {
	name: string;
	description: string;
	filePath: string;
}

/**
 * Check if a file path belongs to a known skill.
 * Matches the exact SKILL.md file or any file within that skill's directory.
 *
 * Returns a TrackedSkill if matched, undefined otherwise.
 */
export function isSkillPath(path: string, knownSkills: KnownSkill[]): TrackedSkill | undefined {
	for (const skill of knownSkills) {
		// Exact match on the SKILL.md file itself
		if (path === skill.filePath) {
			return { name: skill.name, description: skill.description, path: skill.filePath };
		}

		// Match any file within the skill's directory (e.g. references, sub-docs)
		const skillDir = skill.filePath.replace(/\/[^/]+$/, "");
		if (path.startsWith(skillDir + "/") && path !== skillDir) {
			return { name: skill.name, description: skill.description, path: skill.filePath };
		}
	}

	return undefined;
}

/** Minimal shape of a branch entry for scanning tool calls. */
export interface BranchEntry {
	type: string;
	message?: {
		role: string;
		content?: Array<{
			type: string;
			name?: string;
			arguments?: Record<string, any>;
		}>;
	};
}

/**
 * Scan session branch entries for read tool calls that targeted skill files.
 * Used to reconstruct the tracked skills set on session restore.
 */
export function extractReadSkillsFromEntries(
	entries: BranchEntry[],
	knownSkills: KnownSkill[],
): Map<string, TrackedSkill> {
	const result = new Map<string, TrackedSkill>();

	for (const entry of entries) {
		if (entry.type !== "message") continue;
		if (entry.message?.role !== "assistant") continue;

		for (const block of entry.message.content ?? []) {
			if (block.type !== "toolCall" || block.name !== "read") continue;

			const path = block.arguments?.path;
			if (typeof path !== "string") continue;

			const match = isSkillPath(path, knownSkills);
			if (match) {
				result.set(match.path, match);
			}
		}
	}

	return result;
}

/**
 * Build a nudge message listing previously-read skills,
 * instructing the agent to re-read any still relevant to the current task.
 *
 * Returns empty string if no skills were tracked.
 */
export function buildNudgeMessage(skills: Map<string, TrackedSkill>): string {
	if (skills.size === 0) return "";

	const lines: string[] = [
		"[System] Context was compacted. You previously loaded and followed these skills during this session:",
		"",
	];

	for (const skill of skills.values()) {
		lines.push(`- ${skill.name} (${skill.path})`);
		lines.push(`  "${skill.description}"`);
	}

	lines.push("");
	lines.push(
		"REQUIRED: Before responding to the user's message, you MUST re-read any skills listed above that are still relevant to your current task using the read tool. If a skill is no longer relevant, skip it.",
	);

	return lines.join("\n");
}

/**
 * Parse <available_skills> XML from the system prompt to get known skill metadata.
 */
export function parseSkillsFromSystemPrompt(systemPrompt: string): KnownSkill[] {
	const skills: KnownSkill[] = [];

	const skillBlockRegex = /<skill>([\s\S]*?)<\/skill>/g;
	let match;
	while ((match = skillBlockRegex.exec(systemPrompt)) !== null) {
		const block = match[1];
		const name = block.match(/<name>(.*?)<\/name>/)?.[1] ?? "";
		const description = block.match(/<description>(.*?)<\/description>/)?.[1] ?? "";
		const filePath = block.match(/<location>(.*?)<\/location>/)?.[1] ?? "";

		if (name && filePath) {
			skills.push({ name, description, filePath });
		}
	}

	return skills;
}
