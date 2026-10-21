import path from 'node:path';
import { lstatSync } from 'node:fs';
export function assertWorkspaceId(id:unknown): asserts id is string {
  if(typeof id!=='string'||!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)) throw new Error('Ongeldig workspace-id.');
}
/** Fixed filenames + validated single path segment; reject filesystem links. */
export function workspacePath(root:string,id:string,file?:string):string {
  assertWorkspaceId(id);
  if(file && !['workspace.json','holdings.json','settings.json','snapshots.json','transactions.json'].includes(file)) throw new Error('Ongeldig workspace-bestand.');
  const target=path.join(root,id,...(file?[file]:[]));
  for(const candidate of [root,path.join(root,id),...(file?[target]:[])]) {
    try {if(lstatSync(candidate).isSymbolicLink()) throw new Error('Workspace-links zijn niet toegestaan.');}
    catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  }
  return target;
}
