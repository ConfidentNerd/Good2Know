import { ObjectId } from 'mongodb';

export interface ArticleMeta {
    _id?: ObjectId;
    label: string;
    href: string;
    content?: string;
    isFullWidth: boolean;
    isHomepage: boolean;
    redirectUrl: string;
    hiddenFromSidebar: boolean;
}