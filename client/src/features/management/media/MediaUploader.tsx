import { type ImageItem } from "./MediaManager"
import { useId, useState } from 'react';
import useHttp from "../../../customHooks/useHttp";
import { toast } from "sonner";

type UploaderProps = {
    onSuccess: (newImage: ImageItem) => void;
}

export default function MediaUploader({ onSuccess }: UploaderProps) {

    // state of selected file to upload
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputId = useId();

    const { makeRequest } = useHttp();
    const rtl = (text: string) => `\u200F${text}\u200F`;

    const handleUploadClick = async () => {
        if (!selectedFile) return;

        const formData = new FormData();

        formData.append("image", selectedFile);

        try {
            const response = await makeRequest({
                url: "/management/uploadImage",
                method: "POST",
                data: formData
            })


            if (response) {

                const data = await response.json();

                onSuccess({
                    id: data.mediaId,
                    name: selectedFile.name,
                    url: data.url,
                });

                // reset selected file so admin could upload another one
                setSelectedFile(null);
            }

        } catch (error) {
            console.error("Upload failed", error);
            toast.error(rtl("העלאת התמונה נכשלה. נסה שוב."));
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        // if file list exists and not empty
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    }

    return (
        <div className="flex flex-col gap-4 p-5 border rounded-xl bg-accent/10 shadow-sm">
            <h3 className="font-semibold text-lg">העלה תמונה חדשה</h3>
            <p className="font-light text-sm">גודל התמונה המרבי הוא 5MB.</p>

            <input
                id={fileInputId}
                type="file"
                accept="image/png, image/jpeg, image/gif, image/svg+xml"
                onChange={handleFileChange}
                className="sr-only"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border rounded-md bg-background px-3 py-2 text-sm">
                <span className="text-muted-foreground truncate min-w-0">
                    {selectedFile ? selectedFile.name : "לא נבחר קובץ"}
                </span>
                <label
                    htmlFor={fileInputId}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer transition-colors"
                >
                    בחר קובץ
                </label>
            </div>

            {selectedFile && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-2 pt-3 border-t">
                    <span className="text-sm font-medium text-muted-foreground truncate max-w-full sm:max-w-[60%]">
                        מוכן: {selectedFile.name}
                    </span>

                    <button
                        onClick={handleUploadClick}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                    >
                        העלה לשרת
                    </button>
                </div>
            )}
        </div>
    );
}