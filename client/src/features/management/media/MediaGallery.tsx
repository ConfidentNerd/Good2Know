import { type ImageItem } from './MediaManager';
import { toast } from "sonner";

type GalleryProps = {
    items: ImageItem[];
    onRequestDelete: (item: ImageItem) => void;
};

export default function MediaGallery({ items, onRequestDelete }: GalleryProps) {
    const rtl = (text: string) => `\u200F${text}\u200F`;

    const copyUrl = async (url: string) => {
        // window.location.origin is the scheme + host + port of current page
        // so this is equal to a URL like http://localhost:5173/uploads/<id>
        const fullUrl = `${window.location.origin}/api/public${url}`;
        // ctrl + c basically
        await navigator.clipboard.writeText(fullUrl);
        toast.success(rtl("הקישור הועתק!"));
    };

    if (items.length === 0) {
        return (
            <p className="text-sm text-muted-foreground p-8 text-center border-2 border-dashed rounded-lg">
                עדיין לא הועלו תמונות.
            </p>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 border rounded-lg p-3 bg-background hover:shadow-md transition-shadow">
                    <img
                        loading='lazy'
                        decoding="async"
                        src={`/api/public${item.url}`}
                        alt={item.name}
                        className="w-full h-24 object-contain rounded-md bg-muted/30 p-1"
                    />
                    

                    <div className="flex flex-col gap-2 mt-auto">
                        <span className="text-xs truncate font-medium text-center" title={item.name}>
                            {item.name}
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => copyUrl(item.url)}
                                className="text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded px-2 py-1.5 transition-colors w-full"
                            >
                                העתק קישור
                            </button>
                            <button
                                onClick={() => onRequestDelete(item)}
                                className="text-[11px] border border-red-200 text-red-600 hover:bg-red-50 rounded px-2 py-1.5 transition-colors w-full"
                            >
                                מחיקה
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}