// ----------  demo reset  ----------
// /management has no login on purpose so people can try the editor. which means
// whatever one visitor does is still sitting there for the next one. so on every
// boot we wipe the content collections and put ../seed back.
//
// the host sleeps after ~15 min idle, so in practice everyone gets a fresh site.
//
// note this also throws away anything I write on the live site. real content is
// edited locally, then `bun run seed:export`, commit server/seed, push.

import { Binary, BSON } from "mongodb";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { categoriesDB, mediaDB } from "./dbConnection";
import { logTime } from "../utils/logTime";

// read every time, not once at import, or we grab it before the env is ready
function seedDir(): string {
	return process.env.SEED_DIR ?? join(import.meta.dir, "..", "seed");
}

type MediaManifestEntry = {
	_id: string;
	label: string;
	contentType: string;
	size: number;
	uploadDate: string;
	file: string;
};

// on unless someone turns it off, so a fresh deploy behaves
export function isDemoResetEnabled(): boolean {
	return (process.env.DEMO_RESET ?? "true").toLowerCase() !== "false";
}

// never throws. a bad seed shouldn't take the site down, stale content beats
// no content.
export async function restoreSeed(): Promise<void> {
	const SEED_DIR = seedDir();
	const categoriesPath = join(SEED_DIR, "categories.json");
	const mediaPath = join(SEED_DIR, "media.json");

	if (!existsSync(categoriesPath)) {
		console.warn(logTime(), `Demo reset is on but no seed was found at ${SEED_DIR} - leaving the database untouched.`);
		console.warn(logTime(), "Run `bun run seed:export` against your content database, then commit server/seed/.");
		return;
	}

	try {
		const categories = BSON.EJSON.parse(await readFile(categoriesPath, "utf8")) as unknown[];

		const media: MediaManifestEntry[] = existsSync(mediaPath) ? JSON.parse(await readFile(mediaPath, "utf8")) : [];

		// read all the images first. if one is missing we bail before deleting
		// anything, instead of leaving the DB half wiped.
		const mediaDocs = [];
		for (const entry of media) {
			const filePath = join(SEED_DIR, "media", entry.file);

			if (!existsSync(filePath)) {
				console.warn(logTime(), `Seed image missing, skipping: ${entry.file}`);
				continue;
			}

			mediaDocs.push({
				_id: entry._id,
				label: entry.label,
				contentType: entry.contentType,
				size: entry.size,
				uploadDate: new Date(entry.uploadDate),
				data: new Binary(await readFile(filePath)),
			});
		}

		// deleteMany and not drop(), so the text index survives. rebuilding it on
		// every boot would just make the cold start slower.
		await categoriesDB.deleteMany({});
		await mediaDB.deleteMany({});

		if (categories.length) await categoriesDB.insertMany(categories as never[], { ordered: false });
		if (mediaDocs.length) await mediaDB.insertMany(mediaDocs as never[], { ordered: false });

		console.info(logTime(), `Demo reset: restored ${categories.length} categories and ${mediaDocs.length} images from the seed.`);
	} catch (error) {
		console.error(logTime(), "Demo reset failed, continuing with whatever is in the database:", (error as Error).message);
	}
}
