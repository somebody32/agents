/**
 * Skill Recall Extension
 *
 * After context compaction, skills that were previously read (via the read tool)
 * are lost from the conversation. This extension tracks which skills were read
 * and injects a nudge message after compaction, asking the agent to re-read
 * any that are still relevant to the current task.
 *
 * Install:
 *   pi install ~/Developer/agents/pi-extensions/skill-recall
 *
 * Quick test:
 *   pi -e ~/Developer/agents/pi-extensions/skill-recall/index.ts
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";
import { buildNudgeMessage, extractReadSkillsFromEntries, isSkillPath, parseSkillsFromSystemPrompt, type KnownSkill, type TrackedSkill } from "./skill-recall.js";

export default function (pi: ExtensionAPI) {
	/** Skills that were read during this session, keyed by SKILL.md path. */
	let readSkills = new Map<string, TrackedSkill>();

	/** True after compaction — cleared after the nudge is injected. */
	let pendingReload = false;

	/** Known skills from pi's discovery, populated at session start. */
	let knownSkills: KnownSkill[] = [];

	// --- Reconstruct state on session start/restore ---

	pi.on("session_start", async (_event, ctx) => {
		// Get known skills from the system prompt's <available_skills> listing.
		// We extract skill info from branch entries' tool calls.
		// The knownSkills list is built from the session manager's branch.
		knownSkills = getKnownSkillsFromContext(ctx);
		readSkills = extractReadSkillsFromEntries(
			ctx.sessionManager.getBranch() as any[],
			knownSkills,
		);
		pendingReload = false;
	});

	// --- Track skill reads in real-time ---

	pi.on("tool_call", async (event) => {
		if (!isToolCallEventType("read", event)) return;

		const path = event.input.path;
		if (typeof path !== "string") return;

		const match = isSkillPath(path, knownSkills);
		if (match) {
			readSkills.set(match.path, match);
		}
	});

	// --- Flag after compaction ---

	pi.on("session_compact", async () => {
		if (readSkills.size > 0) {
			pendingReload = true;
		}
	});

	// --- Inject nudge on next turn after compaction ---

	pi.on("before_agent_start", async () => {
		if (!pendingReload) return;
		pendingReload = false;

		const nudge = buildNudgeMessage(readSkills);
		if (!nudge) return;

		return {
			message: {
				customType: "skill-recall-nudge",
				content: nudge,
				display: true,
			},
		};
	});
}

/**
 * Extract known skills from the extension context.
 * Parses the system prompt's <available_skills> XML block.
 */
function getKnownSkillsFromContext(ctx: any): KnownSkill[] {
	try {
		const systemPrompt: string = ctx.getSystemPrompt?.() ?? "";
		return parseSkillsFromSystemPrompt(systemPrompt);
	} catch {
		return [];
	}
}
