import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const BAD_LINE =
	"- When working on pi topics, read the docs and examples, and follow .md cross-references before implementing";
const FIXED_LINE =
	"- When working on pi topics, read the docs and examples, and follow relevant linked docs before implementing";

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event, ctx) => {
		if (ctx.model?.provider !== "anthropic") {
			return;
		}

		if (!event.systemPrompt.includes(BAD_LINE)) {
			return;
		}

		return {
			systemPrompt: event.systemPrompt.replace(BAD_LINE, FIXED_LINE),
		};
	});
}
