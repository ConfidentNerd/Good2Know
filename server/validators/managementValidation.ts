import * as v from "valibot";

// mongoDB ObjectId string validation
const mongoIdString = v.pipe(
  v.string(),
  v.regex(/^[0-9a-f]{24}$/i, "Invalid MongoDB ObjectId format")
);

// category schemas
export const addCategorySchema = v.object({
  label: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Category name is required"),
  ),
});

export const renameCategorySchema = v.object({
  id: mongoIdString,
  newLabel: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "New category name is required"),
  ),
});

export const moveCategorySchema = v.object({
  currentCategoryId: mongoIdString,
  adjacentCategoryId: mongoIdString,
});

// article schemas
export const addArticleSchema = v.object({
  categoryId: mongoIdString,
  label: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Article name is required"),
  ),
});

export const renameArticleSchema = v.object({
  categoryId: mongoIdString,
  articleId: mongoIdString,
  newLabel: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "New article name is required"),
  ),
});
export const redirectUrlSchema = v.object({
  categoryId: mongoIdString,
  articleId: mongoIdString,
  newLabel: v.pipe(
    v.string(),
    v.trim(),
  ),
});

export const moveArticleSchema = v.object({
  targetCategoryId: mongoIdString,
  currentArticleId: mongoIdString,
  adjacentArticleId: mongoIdString,
});

export const updateContentSchema = v.object({
  categoryId: mongoIdString,
  articleId: mongoIdString,
  content: v.string(),
  isFullWidth: v.boolean(),
  isHomepage: v.boolean(),
  hiddenFromSidebar: v.boolean(),
});

// delete schemas
export const deleteCategorySchema = v.object({
  id: mongoIdString,
});

export const deleteArticleSchema = v.object({
  categoryId: mongoIdString,
  articleId: mongoIdString,
});

export const deleteImageSchema = v.object({
  id: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "Image id is required"),
  ),
});