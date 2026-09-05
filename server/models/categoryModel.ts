import { ObjectId } from 'mongodb';
import { type ArticleMeta } from './articleModel';

export interface CategoryMeta {
    _id?: ObjectId;
    label: string;
    sortIndex: number;
    articles: ArticleMeta[];
}