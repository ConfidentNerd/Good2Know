// dumps the current DB into ../seed, which is what the server puts back on
// every boot. run it against whichever mongo has the content I want live:
//
//   cd server
//   bun run seed:export
//
// then commit server/seed and push.

import { MongoClient, Binary, BSON } from "mongodb";
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { join, dirname, extname } from "node:path";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/";
const dbName = process.env.MONGODB_DB ?? "good2know";

// overridable so this and the restore can be pointed at the same temp folder
const SEED_DIR = process.env.SEED_DIR ?? join(import.meta.dir, "..", "seed");
const MEDIA_DIR = join(SEED_DIR, "media");

// used for the filename only. the real type is kept in media.json so the
// restore never has to guess it from the extension (.jpg isn't "image/jpg")
const EXT_FOR_TYPE: Record<string, string> = {
	"image/png": ".png",
	"image/jpeg": ".jpg",
	"image/gif": ".gif",
	"image/webp": ".webp",
	"image/svg+xml": ".svg",
};

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

try {
	await client.connect();
	console.info(`Connected to ${dbName}`);

	const db = client.db(dbName);
	const categories = await db.collection("categories").find().toArray();
	const media = await db.collection("media").find().toArray();

	// wipe it first, otherwise an image I deleted in the admin panel stays in the
	// seed and comes back on the next restore
	await rm(SEED_DIR, { recursive: true, force: true });
	await mkdir(MEDIA_DIR, { recursive: true });

	// EJSON so the ObjectIds survive. article ids are in the urls and in the
	// content html itself, they have to come back identical.
	await writeFile(join(SEED_DIR, "categories.json"), BSON.EJSON.stringify(categories, undefined, 2), "utf8");

	const manifest: Array<Record<string, unknown>> = [];
	let missing = 0;

	for (const doc of media) {
		const contentType = (doc.contentType as string) ?? "application/octet-stream";
		const ext = EXT_FOR_TYPE[contentType] ?? extname(String(doc.label ?? "")) ?? "";
		const fileName = `${doc._id}${ext}`;

		let bytes: Buffer | null = null;

		if (doc.data instanceof Binary) {
			bytes = Buffer.from(doc.data.buffer);
		} else if (doc.filePath) {
			// old document, image is still a file
			const file = Bun.file(String(doc.filePath));
			if (await file.exists()) {
				bytes = Buffer.from(await file.arrayBuffer());
			}
		}

		if (!bytes) {
			console.warn(`  SKIPPED ${doc._id} (${doc.label}) - no bytes in the database and no readable file`);
			missing++;
			continue;
		}

		await writeFile(join(MEDIA_DIR, fileName), bytes);

		manifest.push({
			_id: doc._id,
			label: doc.label,
			contentType,
			size: bytes.byteLength,
			uploadDate: doc.uploadDate instanceof Date ? doc.uploadDate.toISOString() : new Date().toISOString(),
			file: fileName,
		});
	}

	await writeFile(join(SEED_DIR, "media.json"), JSON.stringify(manifest, null, 2), "utf8");

	const totalBytes = manifest.reduce((sum, m) => sum + (m.size as number), 0);
	console.info(`\nSeed written to ${SEED_DIR}`);
	console.info(`  categories: ${categories.length}`);
	console.info(`  articles:   ${categories.reduce((n: number, c: any) => n + (c.articles?.length ?? 0), 0)}`);
	console.info(`  images:     ${manifest.length} (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
	if (missing) console.warn(`  ${missing} image(s) skipped - see above`);
	console.info(`\nCommit server/seed/ and push to deploy this snapshot.`);
} catch (error) {
	console.error("Export failed:", (error as Error).message);
	process.exitCode = 1;
} finally {
	await client.close();
}
