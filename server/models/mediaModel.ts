import { Binary } from "mongodb";

export interface MediaMeta {
	_id: string;
	label: string;
	uploadDate: Date;

	// the image itself. lives in the DB because the host has no persistent disk,
	// anything we write to it is gone on the next deploy.
	data?: Binary;
	contentType?: string;
	size?: number;

	// old documents from when images were saved to public/uploads instead.
	// still served if the file is actually there, so local dev data keeps working.
	filePath?: string;
};
