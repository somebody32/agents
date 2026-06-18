import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const BAD_LINE =
	"- When working on pi topics, read the docs and examples, and follow .md cross-references before implementing";
const FIXED_LINE =
	"- When working on pi topics, read the docs and examples, and follow relevant linked docs before implementing";
const PI_DOCS_BLOCK = /\n\nPi documentation[\s\S]*?(?=\nCurrent date:)/;
const COMPACT_PI_DOCS =
	"\n\nPi documentation: when the user asks about pi itself, read the relevant docs under the installed pi package before implementing.";

export default function (pi: ExtensionAPI) {
	pi.on("before_agent_start", async (event, ctx) => {
		if (ctx.model?.provider !== "anthropic") {
			return;
		}

		const systemPrompt = event.systemPrompt
			.replace(BAD_LINE, FIXED_LINE)
			.replace(PI_DOCS_BLOCK, COMPACT_PI_DOCS);

		if (systemPrompt === event.systemPrompt) {
			return;
		}

		return { systemPrompt };
	});
}
