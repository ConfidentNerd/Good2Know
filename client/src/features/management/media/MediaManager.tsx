import { useEffect, useState } from 'react';
import MediaUploader from './MediaUploader';
import MediaGallery from './MediaGallery';
import useHttp from '../../../customHooks/useHttp';
import { toast } from "sonner";

export type ImageItem = {
    id: string;
    name: string;
    url: string;
};

export default function MediaManager() {
    // states
    const [images, setImages] = useState<ImageItem[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel: string;
        action: { type: "deleteImage"; imageId: string; imageName: string } | null;
    }>({
        isOpen: false,
        title: "",
        message: "",
        confirmLabel: "",
        action: null,
    });
    const [isDeleting, setIsDeleting] = useState(false);
    const { makeRequest } = useHttp();
    const rtl = (text: string) => `\u200F${text}\u200F`;

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const response = await makeRequest({
                    url: "/management/images",
                    method: "GET"
                });

                if (response) {
                    const data = await response.json(); // This is the raw array from your mediaDB.find().toArray()

                    const formattedImages = data.map((img: {_id:string;label:string}) => ({
                        id: img._id,
                        name: img.label || "Untitled",
                        // build the url string based on the document _id
                        url: `/uploads/${img._id}`
                    }));

                    setImages(formattedImages);
                }
            } catch (error) {
                console.error("Failed to load gallery images:", error);
            }
        };

        fetchImages();
    }, []);

    // update shown images upon successful upload
    const handleUploadSuccess = (newImage: ImageItem) => {
        setImages((prevImages) => [newImage, ...prevImages]);
    };

    const requestDeleteImage = (image: ImageItem) => {
        setConfirmDialog({
            isOpen: true,
            title: rtl("מחיקת תמונה"),
            message: rtl(`האם למחוק מהשרת את ${image.name} לצמיתות?`),
            confirmLabel: rtl("מחיקה"),
            action: { type: "deleteImage", imageId: image.id, imageName: image.name },
        });
    };

    const closeConfirmDialog = () => {
        if (isDeleting) return;
        setConfirmDialog((prev) => ({
            ...prev,
            isOpen: false,
            action: null,
        }));
    };

    const deleteImage = async (imageId: string, imageName: string) => {
        try {
            setIsDeleting(true);
            await makeRequest({
                url: `/management/images/${imageId}`,
                method: "DELETE",
            });

            setImages((prevImages) => prevImages.filter((image) => image.id !== imageId));
            toast.success(rtl(`התמונה ${imageName} נמחקה.`));
        } catch (error) {
            console.error("Delete image failed", error);
            toast.error(rtl("מחיקת התמונה נכשלה. נסה שוב."));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmDialog.action || isDeleting) return;

        if (confirmDialog.action.type === "deleteImage") {
            await deleteImage(confirmDialog.action.imageId, confirmDialog.action.imageName);
        }

        setConfirmDialog((prev) => ({
            ...prev,
            isOpen: false,
            action: null,
        }));
    };

return (
        <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold">ניהול מדיה</h2>

            <MediaUploader onSuccess={handleUploadSuccess} />

            <div className="flex flex-col gap-4 p-5 border rounded-xl bg-card shadow-sm">
                <h3 className="font-semibold text-lg border-b pb-3">גלריית הקבצים שהועלו</h3>
                <MediaGallery items={images} onRequestDelete={requestDeleteImage} />
            </div>

            {confirmDialog.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">{confirmDialog.title}</h3>
                        </div>
                        <div className="px-6 py-5 text-slate-600">{confirmDialog.message}</div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={closeConfirmDialog}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium disabled:opacity-60"
                            >
                                {rtl("ביטול")}
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold disabled:opacity-60"
                            >
                                {isDeleting ? rtl("מוחק...") : confirmDialog.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}