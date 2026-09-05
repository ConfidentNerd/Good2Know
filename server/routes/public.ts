import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { categoriesDB, mediaDB } from "../src/dbConnection";
import { csrf } from "hono/csrf";
import * as v from "valibot";
import { readFile } from "node:fs/promises";

// who CORS and CSRF will trust. render sets RENDER_EXTERNAL_URL for us so a
// normal deploy needs no config, ALLOWED_ORIGINS is for a custom domain.
const parseOrigins = (raw: string | undefined) =>
	(raw ?? "")
		.split(",")
		.map((origin) => origin.trim().replace(/\/$/, ""))
		.filter(Boolean);

// 5173 is vite dev and 4173 is preview, so we don't need a .env just to run it.
// skipped in production, no reason for a live site to trust my laptop.
const devOrigins = process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173", "http://localhost:4173"];

export const allowedOrigins = [...new Set([...parseOrigins(process.env.ALLOWED_ORIGINS), ...parseOrigins(process.env.RENDER_EXTERNAL_URL), ...devOrigins])];

if (allowedOrigins.length === 0) {
	console.warn("No allowed origins configured. Set ALLOWED_ORIGINS to your public URL, or non-GET requests will be rejected.");
}

const publicRoutes = new Hono();

publicRoutes.use(csrf({ origin: allowedOrigins }));

publicRoutes.get("/categories", async (c) => {
	try {
		const categories = await categoriesDB.find().toArray();

		return c.json(categories, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't get categories from the DB: " + error);
		return c.json({ message: "Failed to get categories from database" }, 500);
	}
});

// serve articles when arriving to the correct page (usually via sidebar)
publicRoutes.get("/content/:articleId", async (c) => {
	try {
		const artIdString: string = c.req.param("articleId");

		// validate articleId parameter
		const validation = v.safeParse(v.pipe(v.string(), v.regex(/^[0-9a-f]{24}$/i, "Invalid MongoDB ObjectId format")), artIdString);
		if (!validation.success) {
			return c.json({ error: validation.issues[0].message }, 400);
		}

		const artObjectId = new ObjectId(validation.output);

		const foundCategory = await categoriesDB.findOne({ "articles._id": artObjectId });

		const foundArticle = foundCategory?.articles.find((article) => {
			return article._id?.equals(artObjectId);
		});

		if (!foundCategory || !foundArticle) {
			return c.json({ error: "Article not found" }, 404);
		}

		return c.json({ content: foundArticle.content, label: foundArticle.label, isFullWidth: foundArticle.isFullWidth }, 200);
	} catch (error) {
		console.error("Something went wrong: " + error);
		return c.json({ error: "Something went wrong, couldn't find the article" }, 500);
	}
});

publicRoutes.get("/homepage", async (c) => {
	try {
		const foundCategory = await categoriesDB.findOne({ "articles.isHomepage": true });

		const foundArticle = foundCategory?.articles.find((article) => article.isHomepage);

		if (!foundCategory || !foundArticle) {
			return c.json({ error: "Homepage not configured" }, 404);
		}

		return c.json({ articleId: foundArticle._id?.toString(), content: foundArticle.content || "", label: foundArticle.label, isFullWidth: foundArticle.isFullWidth }, 200);
	} catch (error) {
		console.error("Something went wrong: " + error);
		return c.json({ error: "Something went wrong, couldn't find the homepage" }, 500);
	}
});

// serve uploaded images when arriving to the correct page
publicRoutes.get("/uploads/:id", async (c) => {
	try {
		const id = c.req.param("id");

		// ids come from crypto.randomUUID()
		const validation = v.safeParse(v.pipe(v.string(), v.uuid("Invalid media id")), id);
		if (!validation.success) {
			return c.notFound();
		}

		const media = await mediaDB.findOne({ _id: validation.output });

		if (!media) {
			return c.notFound();
		}

		// has to be Uint8Array<ArrayBuffer> or ts won't accept it as a Response
		// body. Binary.buffer and readFile both give ArrayBufferLike back.
		let bytes: Uint8Array<ArrayBuffer>;
		let contentType: string;

		if (media.data) {
			// normal case, it's in the DB
			bytes = Uint8Array.from(media.data.buffer);
			contentType = media.contentType ?? "application/octet-stream";
		} else if (media.filePath) {
			// old document pointing at a file on disk
			const file = Bun.file(media.filePath);

			if (!(await file.exists())) {
				return c.notFound();
			}

			bytes = Uint8Array.from(await readFile(media.filePath));
			contentType = media.contentType ?? file.type ?? "application/octet-stream";
		} else {
			return c.notFound();
		}

		return new Response(bytes, {
			headers: {
				// strip quotes/newlines so a crafted filename can't inject header stuff
				"Content-Disposition": `inline; filename="${media.label.replace(/["\\\r\n]/g, "")}"`,
				"Content-Type": contentType,
				"Content-Length": String(bytes.byteLength),
				"Cache-Control": "public, max-age=31536000, immutable",
				// anyone can upload an svg and svgs can hold script. same origin as the
				// site now, so sandbox it in case someone opens the url directly.
				"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		console.error("Something went wrong, couldn't serve the image: " + error);
		return c.json({ message: "bad request" }, 404);
	}
});


export default publicRoutes;
