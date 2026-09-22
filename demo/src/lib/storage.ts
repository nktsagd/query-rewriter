import { openDB } from 'idb';
import { z } from 'zod';
export const settingsSchema = z.object({topK:z.union([z.literal(5),z.literal(10),z.literal(20)]),feedbackDocs:z.number().int().min(1).max(10),feedbackTerms:z.number().int().min(0).max(20),expansionWeight:z.number().min(0).max(1)});
export const workspaceSchema = z.object({schemaVersion:z.literal(1),datasetVersion:z.string().optional(),docs:z.array(z.object({id:z.string(),title:z.string().max(100000),text:z.string().max(100000)})).max(1000),turns:z.array(z.object({id:z.string(),text:z.string().max(8000),humanQuery:z.string().max(8000)})).max(200),selectedTurnId:z.string(),settings:settingsSchema,corpusRevision:z.number(),conversationRevision:z.number(),wasIndexed:z.boolean(),lastRun:z.unknown().optional()});
export type Settings = z.infer<typeof settingsSchema>;
export type SavedWorkspace = z.infer<typeof workspaceSchema>;
export const defaultSettings:Settings = {topK:5,feedbackDocs:3,feedbackTerms:5,expansionWeight:0.5};
async function database(){return openDB('context-lab',1,{upgrade(db){db.createObjectStore('workspace')}})}
export async function loadWorkspace(){const value=await (await database()).get('workspace','current');if(!value)return null;return workspaceSchema.parse(value)}
export async function saveWorkspace(value:SavedWorkspace){await (await database()).put('workspace',workspaceSchema.parse(value),'current')}
