import { Hono } from "hono";
import { categoriesDB, mediaDB } from "../src/dbConnection";
import { CategoryMeta } from "../models/categoryModel";
import { ArticleMeta } from "../models/articleModel";
import { MediaMeta } from "../models/mediaModel";
import { unlink } from "node:fs/promises";
import { Binary, ObjectId } from "mongodb";
import sanitizeHtml from "sanitize-html";
import { vValidator } from "@hono/valibot-validator";
import * as v from "valibot";
import {
	addCategorySchema,
	renameCategorySchema,
	moveCategorySchema,
	addArticleSchema,
	renameArticleSchema,
	moveArticleSchema,
	updateContentSchema,
	deleteCategorySchema,
	deleteArticleSchema,
	deleteImageSchema,
	redirectUrlSchema,
} from "../validators/managementValidation";
import { logTime } from "../utils/logTime";
import { csrf } from "hono/csrf";
import { allowedOrigins } from "./public";

const management = new Hono();

/*** upload limits ***/
// same 5MB the uploader tells the admin about. also keeps us well under mongo's
// 16MB document limit now that the image itself is in the document.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

management.use(csrf({ origin: allowedOrigins }));
/*** sanitization setup ***/
const sanitizeOptions = {
	allowedTags: [
		"p",
		"span",
		"strong",
		"b",
		"em",
		"i",
		"u",
		"s",
		"strike",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"ul",
		"ol",
		"li",
		"a",
		"img",
		"video",
		"audio",
		"iframe",
		"table",
		"thead",
		"tbody",
		"tfoot",
		"tr",
		"th",
		"td",
		"br",
		"hr",
		"blockquote",
		"pre",
		"code",
		"div",
		"details",
		"summary",
		"figure",
		"figcaption",
	],
	allowedAttributes: {
		"*": ["style", "class", "id", "dir"],
		a: ["href", "target", "rel"],
		img: ["src", "alt", "title", "width", "height"],
		iframe: ["src", "width", "height", "controls", "frameborder", "allowfullscreen"],
		video: ["src", "width", "height", "controls"],
		audio: ["src", "controls"],
	},
	// I think these are enough but we can add more domains if needed
	allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],

	// strip url() from style
	transformTags: {
		"*": (tagName: string, attribs: Record<string, string>) => {
			if (attribs.style && attribs.style.toLowerCase().includes("url(")) {
				// regex replace url(whatever goes here) with an empty string
				attribs.style = attribs.style.replace(/url\([^)]*\)/gi, "");
			}
			return {
				tagName: tagName,
				attribs: attribs,
			};
		},
	},
};

/*** content management routes ***/

management.get("/categories", async (c) => {
	try {
		const categories = await categoriesDB.find().toArray();

		return c.json(categories, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't get categories from the DB: " + error);
		return c.json({ message: "Failed to get categories from database" }, 500);
	}
});

management.post("/addCategory", vValidator("json", addCategorySchema), async (c) => {
	try {
		const body = c.req.valid("json");

		const existingCat = await categoriesDB.findOne({ label: body.label });

		if (existingCat) {
			return c.json({ message: "Category with this name already exists" }, 400);
		}

		const count = await categoriesDB.countDocuments();

		const newCategory: CategoryMeta = {
			label: body.label,
			articles: [],
			sortIndex: count,
		};

		const result = await categoriesDB.insertOne({ ...newCategory });

		return c.json(
			{
				_id: result.insertedId,
				sortIndex: newCategory.sortIndex,
				message: "Success",
			},
			200,
		);
	} catch (error) {
		console.error("Something went wrong, couldn't insert new category into the DB: " + error);
		return c.json({ message: "Failed to add category to database" }, 500);
	}
});

management.patch("/renameCategory", vValidator("json", renameCategorySchema), async (c) => {
	try {
		const body = c.req.valid("json");

		const result = await categoriesDB.updateOne({ _id: new ObjectId(body.id) }, { $set: { label: body.newLabel } });

		if (result.matchedCount === 0) {
			console.error("Couldn't find a category with the passed ID in the DB.");
			return c.json(
				{
					message: "couldn't rename the category, " + "Couldn't find a category with the passed ID in the DB.",
				},
				404,
			);
		}

		return c.json({ message: "category in DB renamed successfully" }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't rename the category: " + error);
		return c.json({ message: "couldn't rename the category" }, 500);
	}
});

management.patch("/moveCategory", vValidator("json", moveCategorySchema), async (c) => {
	try {
		const body = c.req.valid("json");

		// convert to mongo format
		const currentCategoryId = new ObjectId(body.currentCategoryId);
		const adjacentCategoryId = new ObjectId(body.adjacentCategoryId);

		// find both targets
		const targetCategories = await categoriesDB
			.find({
				_id: { $in: [currentCategoryId, adjacentCategoryId] },
			})
			.toArray();

		// extract from array
		const currentCategory = targetCategories.find((cat) => {
			return cat._id.equals(currentCategoryId);
		});

		const adjacentCategory = targetCategories.find((cat) => {
			return cat._id.equals(adjacentCategoryId);
		});

		// update DB
		await categoriesDB.bulkWrite([
			{
				updateOne: {
					filter: { _id: currentCategoryId },
					update: { $set: { sortIndex: adjacentCategory?.sortIndex } },
				},
			},
			{
				updateOne: {
					filter: { _id: adjacentCategoryId },
					update: { $set: { sortIndex: currentCategory?.sortIndex } },
				},
			},
		]);

		return c.json({ message: "Categories moved successfully" }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't move the category: " + error);
		return c.json({ message: "couldn't move the category" }, 500);
	}
});

management.patch("/moveArticle", vValidator("json", moveArticleSchema), async (c) => {
	try {
		const body = c.req.valid("json");

		// convert to mongo format
		const targetCategoryId = new ObjectId(body.targetCategoryId);
		const currentArticleId = new ObjectId(body.currentArticleId);
		const adjacentArticleId = new ObjectId(body.adjacentArticleId);

		// find category
		const targetCategory = await categoriesDB.findOne({ _id: targetCategoryId });

		if (!targetCategory) {
			console.error("Target category not found");
			return c.json({ message: "Target category not found" }, 404);
		}

		// find both targets
		const currentArticleIndex = targetCategory.articles.findIndex((art) => {
			return art._id?.equals(currentArticleId);
		});

		const adjacentArticleIndex = targetCategory.articles.findIndex((art) => {
			return art._id?.equals(adjacentArticleId);
		});

		// create new articles array
		const updatedArticles = targetCategory.articles;

		// swap order
		const temp = updatedArticles[currentArticleIndex];
		updatedArticles[currentArticleIndex] = updatedArticles[adjacentArticleIndex];
		updatedArticles[adjacentArticleIndex] = temp;

		// update DB
		await categoriesDB.updateOne({ _id: targetCategoryId }, { $set: { articles: updatedArticles } });

		return c.json({ message: "Article moved successfully" }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't move the article: " + error);
		return c.json({ message: "couldn't move the article" }, 500);
	}
});

management.patch("/renameArticle", vValidator("json", renameArticleSchema), async (c) => {
	try {
		const body = c.req.valid("json");
		const categoryId = new ObjectId(body.categoryId);
		const articleId = new ObjectId(body.articleId);
		const newLabel = body.newLabel;

		const result = await categoriesDB.updateOne({ _id: categoryId, "articles._id": articleId }, { $set: { "articles.$.label": newLabel } });

		if (result.matchedCount === 0) {
			console.error("Couldn't find an article with the passed ID in the DB.");
			return c.json(
				{
					message: "couldn't rename the article, " + "Couldn't find an article with the passed ID in the DB.",
				},
				404,
			);
		}

		return c.json({ message: "article in DB renamed successfully" }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't rename the article: " + error);
		return c.json({ message: "couldn't rename the article" }, 500);
	}
});

management.patch("/handleRedirectUrl", vValidator("json", redirectUrlSchema), async (c) => {
	try {
		const body = c.req.valid("json");
		const categoryId = new ObjectId(body.categoryId);
		const articleId = new ObjectId(body.articleId);
		const newLabel = body.newLabel;

		const result = await categoriesDB.updateOne({ _id: categoryId, "articles._id": articleId }, { $set: { "articles.$.redirectUrl": newLabel } });

		if (result.matchedCount === 0) {
			console.error("Couldn't find an article with the passed ID in the DB.");
			return c.json(
				{
					message: "couldn't rename the article, " + "Couldn't find an article with the passed ID in the DB.",
				},
				404,
			);
		}

		return c.json({ message: "article in DB renamed successfully" }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't rename the article: " + error);
		return c.json({ message: "couldn't rename the article" }, 500);
	}
});

management.post("/addArticle", vValidator("json", addArticleSchema), async (c) => {
	try {
		const body = c.req.valid("json");

		// appearantly MongoDB doesn't accept strings as id, it needs to be converted.
		const categoryId = new ObjectId(body.categoryId);

		const existingArticle = await categoriesDB.findOne({ _id: categoryId, "articles.label": body.label });

		if (existingArticle) {
			return c.json({ message: "Article with this name already exists" }, 400);
		}

		const newArticleId = new ObjectId();

		const newArticle: ArticleMeta = {
			_id: newArticleId,
			label: body.label,
			href: "",
			isFullWidth: false,
			isHomepage: false,
			hiddenFromSidebar: false,
			redirectUrl: "",
		};

		const result = await categoriesDB.updateOne({ _id: categoryId }, { $push: { articles: newArticle } });
		return c.json({ _id: newArticleId, message: "Success" }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't insert new category into the DB: " + error);
		return c.json({ message: "Failed to add article to database" }, 500);
	}
});

management.delete("/category/:id", async (c) => {
	const catIdString: string = c.req.param("id");

	// validate id parameter
	const validation = v.safeParse(deleteCategorySchema, { id: catIdString });
	if (!validation.success) {
		return c.json({ error: validation.issues[0].message }, 400);
	}

	// find in DB
	try {
		const idToDelete = new ObjectId(validation.output.id);
		const foundCategory = await categoriesDB.findOne({ _id: idToDelete });

		if (!foundCategory) {
			console.error("Couldn't find a category with the passed ID in the DB.");
			return c.json(
				{
					message: "couldn't delete the category, " + "Couldn't find a category with the passed ID in the DB.",
				},
				404,
			);
		}

		// delete metadaba from DB
		const response = await categoriesDB.deleteOne({ _id: idToDelete });

		if (response.deletedCount < 1) {
			console.error("Couldn't find a category with the passed ID in the DB, it appears it's already gone.");
		}

		// success
		return c.json({ message: "category deleted successfully from DB" }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't delete the category: " + error);
		return c.json({ message: "couldn't delete the category" }, 500);
	}
});

management.delete("/category/:categoryId/article/:articleId", async (c) => {
	try {
		const catIdString: string = c.req.param("categoryId");
		const artIdString: string = c.req.param("articleId");

		// validate id parameters
		const validation = v.safeParse(deleteArticleSchema, { categoryId: catIdString, articleId: artIdString });
		if (!validation.success) {
			return c.json({ error: validation.issues[0].message }, 400);
		}

		const catIdToDelete = new ObjectId(validation.output.categoryId);
		const artIdToDelete = new ObjectId(validation.output.articleId);

		// find targets
		const foundCategory = await categoriesDB.findOne({ _id: catIdToDelete });
		const foundArticle = foundCategory?.articles.find((article) => article._id?.toString() === artIdString);

		if (!foundCategory || !foundArticle) {
			console.error("Couldn't find a category or article with the passed ID in the DB.");
			return c.json({ error: "Category or Article not found" }, 404);
		}

		// remove article metadata from the DB
		const response = await categoriesDB.updateOne({ _id: catIdToDelete }, { $pull: { articles: { _id: artIdToDelete } } });

		if (response.modifiedCount === 0) {
			return c.json({ message: "Nothing to delete" }, 200);
		}

		return c.json({ success: true }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't delete the article: " + error);
		return c.json({ error: "couldn't delete the article" }, 500);
	}
});

management.patch(
	"/updateContent",
	 vValidator("json", updateContentSchema),
	  async (c) => {
	try {
		const body = c.req.valid("json");
		// const body = await c.req.json()

		const { categoryId, articleId, content, isFullWidth, isHomepage, hiddenFromSidebar } = body;

		const cleanContent = sanitizeHtml(content, sanitizeOptions);
		const fieldsToSet: Record<string, string | boolean> = {
			"articles.$.content": cleanContent,
			"articles.$.isFullWidth": isFullWidth,
			"articles.$.isHomepage": isHomepage,
			"articles.$.hiddenFromSidebar": hiddenFromSidebar,
		};

		if (isHomepage) {
			await categoriesDB.updateMany({ "articles.isHomepage": true }, { $set: { "articles.$[article].isHomepage": false } }, { arrayFilters: [{ "article.isHomepage": true }] });
		}

		const result = await categoriesDB.updateOne({ _id: new ObjectId(categoryId), "articles._id": new ObjectId(articleId) }, { $set: fieldsToSet });

		if (result.matchedCount === 0) {
			return c.json(
				{
					error: "Category or article not found",
				},
				404,
			);
		}

		return c.json({ message: "Article content updated successfully" }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't update the article content: " + error);
		return c.json({ error: "couldn't update the article content" }, 500);
	}
});

/*** management dashboard routes ***/
management.post("/uploadImage", async (c) => {
	try {
		const body = await c.req.formData();

		const fileObject = body.get("image");

		// validate file object
		if (!fileObject || !(fileObject instanceof File)) {
			return c.json({ error: "No file provided" }, 400);
		}

		if (!ALLOWED_IMAGE_TYPES.includes(fileObject.type)) {
			return c.json({ error: "Invalid file type. Only images are allowed." }, 400);
		}

		if (fileObject.size === 0) {
			return c.json({ error: "File is empty" }, 400);
		}

		if (fileObject.size > MAX_IMAGE_BYTES) {
			return c.json({ error: "File is too large. Maximum size is 5MB." }, 413);
		}

		const bytes = Buffer.from(await fileObject.arrayBuffer());

		const randomId = crypto.randomUUID();

		// straight into mongo, no file written. see mediaModel for why.
		const mediaMeta: MediaMeta = {
			_id: randomId,
			label: fileObject.name,
			data: new Binary(bytes),
			contentType: fileObject.type,
			size: bytes.byteLength,
			uploadDate: new Date(),
		};

		await mediaDB.insertOne(mediaMeta);

		return c.json(
			{
				message: "Image uploaded successfully",
				mediaId: randomId,
				url: `/uploads/${randomId}`,
			},
			200,
		);
	} catch (error) {
		console.error("Something went wrong, couldn't upload the image: " + error);
		return c.json({ error: "couldn't upload the image" }, 500);
	}
});


management.get("/images", async (c) => {
	try {
		// drop data, otherwise every image gets base64'd into this one response.
		// the gallery only needs the id and the label anyway.
		const images = await mediaDB
			.find({}, { projection: { data: 0, filePath: 0 } })
			.sort({ uploadDate: -1, _id: -1 })
			.toArray();

		return c.json(images, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't get images from the DB: " + error);
		return c.json({ message: "Failed to get images from database" }, 500);
	}
});

management.delete("/images/:id", async (c) => {
	const imageId = c.req.param("id");

	const validation = v.safeParse(deleteImageSchema, { id: imageId });
	if (!validation.success) {
		return c.json({ error: validation.issues[0].message }, 400);
	}

	try {
		const foundImage = await mediaDB.findOne({ _id: validation.output.id });

		if (!foundImage) {
			return c.json({ error: "Image not found" }, 404);
		}

		const response = await mediaDB.deleteOne({ _id: validation.output.id });

		if (response.deletedCount < 1) {
			return c.json({ error: "Image not found" }, 404);
		}

		// only old documents have a file to unlink, new ones are already gone
		// with the deleteOne above.
		if (foundImage.filePath) {
			try {
				await unlink(foundImage.filePath);
			} catch (error) {
				const unlinkError = error as NodeJS.ErrnoException;
				if (unlinkError.code !== "ENOENT") {
					console.error("Failed deleting image file after DB deletion:", unlinkError);
				}
			}
		}

		return c.json({ success: true }, 200);
	} catch (error) {
		console.error("Something went wrong, couldn't delete the image: " + error);
		return c.json({ error: "couldn't delete the image" }, 500);
	}
});

export default management;
