export interface SideBarArticle {
    id: string;
    label: string;
    href: string;
    content?: string;
    isFullWidth: boolean;
    isHomepage: boolean;
    redirectUrl: string;
    hiddenFromSidebar: boolean;
}

export interface SideBarCategory {
    id: string;
    label: string;
    sortIndex: number;
    articles: SideBarArticle[];
}