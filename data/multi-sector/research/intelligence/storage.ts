import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {digest} from './extraction';
import {assertState,emptyIntelligenceState,IntelligenceError} from './workflow';
import type {IntelligenceState} from './contracts';
/** path.relative follows the platform's path semantics (case-insensitive on Windows).
 * A string prefix check misses differently cased aliases of the same project.
 */
export function isProjectStoragePath(project:string,dir:string,paths:Pick<typeof path,'relative'|'isAbsolute'|'sep'>=path){
 const relative=paths.relative(project,dir);
 return relative===''||relative!=='..'&&!relative.startsWith('..'+paths.sep)&&!paths.isAbsolute(relative);
}
/** Deliberately outside repository/workspaces. Environment override is server-owned, never a request field. */
export async function intelligenceDirectory(){
 const project=await fs.realpath(process.cwd());
 const override=process.env.PHOENIX_INTELLIGENCE_DATA_DIR;
 const dir=override?path.resolve(override):path.join(os.homedir(),'.phoenix-financial-intelligence',digest(project).slice(0,20));
 if(override&&!path.isAbsolute(override))throw new IntelligenceError('Onderzoeksopslagconfiguratie ongeldig.',503);
 if(isProjectStoragePath(project,dir))throw new IntelligenceError('Intelligence-opslag moet buiten de repository liggen.',503);
 // Reject any existing symlink component, not only the final folder.
 let part=path.parse(dir).root;for(const name of dir.slice(part.length).split(path.sep)){part=path.join(part,name);try{if((await fs.lstat(part)).isSymbolicLink())throw new IntelligenceError('Onderzoeksopslag bevat een symlink.',503);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
 // Check the closest existing physical ancestor too (case/short-name aliases).
 // Do not create a directory merely to validate the configured destination.
 let ancestor=dir;
 for(;;){try{
  if(isProjectStoragePath(project,await fs.realpath(ancestor)))throw new IntelligenceError('Intelligence-opslag moet buiten de repository liggen.',503);
  break;
 }catch(error){
  if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
  const parent=path.dirname(ancestor);if(parent===ancestor)throw error;ancestor=parent;
 }}
 return dir;
}
async function readAt(dir:string):Promise<IntelligenceState>{
 const f=path.join(dir,'intelligence-v1.json');
 try{const stat=await fs.lstat(f);if(stat.isSymbolicLink()||!stat.isFile()||stat.size>3*1024*1024)throw new IntelligenceError('Onderzoeksopslag ongeldig.',409);
  const s=JSON.parse(await fs.readFile(f,'utf8')) as IntelligenceState;assertState(s);return s;
 }catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return emptyIntelligenceState();if(e instanceof IntelligenceError)throw e;throw new IntelligenceError('Onderzoeksopslag niet leesbaar; niets gewijzigd.',409);}
}
export async function readIntelligence(){return readAt(await intelligenceDirectory());}
export async function mutateIntelligence(expectedRevision:number,change:(s:IntelligenceState)=>IntelligenceState|Promise<IntelligenceState>){
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new IntelligenceError('Opslagversie ontbreekt.',409);
 const dir=await intelligenceDirectory();await fs.mkdir(dir,{recursive:true,mode:0o700});
 const lock=path.join(dir,'write.lock');try{await fs.mkdir(lock);}catch{throw new IntelligenceError('Onderzoeksopslag is bezig of vergrendeld; probeer later opnieuw.',409);}
 let tmp:string|undefined;
 try{
  const before=await readAt(dir);if(before.revision!==expectedRevision)throw new IntelligenceError('Een andere wijziging is opgeslagen. Herlaad eerst.',409);
  const after=await change(before);assertState(after);if(after===before)return after;
  const body=JSON.stringify(after,null,2);if(Buffer.byteLength(body)>3*1024*1024)throw new IntelligenceError('Onderzoeksopslag te groot.',413);
  const destination=path.join(dir,'intelligence-v1.json');
  // Keep the previous valid state before replacement, including decisions/audit history.
  try{const st=await fs.lstat(destination);if(st.isSymbolicLink())throw new IntelligenceError('Opslagbestand is een symlink.',409);await fs.copyFile(destination,path.join(dir,'backup-'+randomUUID()+'.json'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  tmp=path.join(dir,'pending-'+randomUUID()+'.tmp');await fs.writeFile(tmp,body,{flag:'wx',mode:0o600});await fs.rename(tmp,destination);return after;
 }finally{if(tmp)await fs.unlink(tmp).catch(()=>{});await fs.rmdir(lock);}
}
