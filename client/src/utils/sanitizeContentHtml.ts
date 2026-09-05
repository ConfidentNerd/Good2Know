import DOMPurify from "dompurify";

const purifyConfig = {
    ALLOWED_TAGS: [
        "p", "span", "strong", "b", "em", "i", "u", "s", "strike",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li",
        "a", "img", "video", "audio", "iframe",
        "table", "thead", "tbody", "tfoot", "tr", "th", "td",
        "br", "hr", "blockquote", "pre", "code", "div",
        "details", "summary", "figure", "figcaption", "mark",
    ],
    ALLOWED_ATTR: [
        "href", "target", "rel",
        "src", "alt", "title", "width", "height",
        "controls", "frameborder", "allowfullscreen",
        "style", "class", "id", "dir",
    ],
};

let isHookRegistered = false;

const registerPurifyHooks = () => {
    if (isHookRegistered) {
        return;
    }

    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
        if (node.hasAttribute("style")) {
            const style = node.getAttribute("style") || "";
            node.setAttribute("style", style.replace(/url\([^)]*\)/gi, ""));
        }

        if (node.hasAttribute("class")) {
            const classValue = node.getAttribute("class") || "";
            const safeClass = classValue.replace(/[#[\]]/g, "").trim();

            if (safeClass) {
                node.setAttribute("class", safeClass);
            } else {
                node.removeAttribute("class");
            }
        }
    });

    isHookRegistered = true;
};

export const sanitizeContentHtml = (html: string): string => {
    registerPurifyHooks();
    return DOMPurify.sanitize(html, purifyConfig);
};
