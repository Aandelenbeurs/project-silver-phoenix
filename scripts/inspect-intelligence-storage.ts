import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {readIntelligence,mutateIntelligence,intelligenceDirectory,isProjectStoragePath} from '../data/multi-sector/research/intelligence/storage';
import {importDocument,emptyIntelligenceState} from '../data/multi-sector/research/intelligence/workflow';
import {INTELLIGENCE_DEMOS} from '../data/multi-sector/research/intelligence/demonstration';

type LinkType='dir'|'file'|'junction';
type LinkCreator=(target:string,link:string,type:LinkType)=>Promise<void>;
/** Catch only fixture creation, never an assertion or an application rejection.
 * On POSIX even EPERM is a failure: Linux/macOS must execute the link checks.
 */
async function createLinkFixture(target:string,link:string,type:LinkType,platform:NodeJS.Platform=process.platform,create:LinkCreator=fs.symlink){
 try{await create(target,link,type);return true;}
 catch(error){const code=(error as NodeJS.ErrnoException).code;
  if(platform==='win32'&&(code==='EPERM'||code==='EACCES'))return false;
  throw error;
 }
}
const directoryLinkType=(platform:NodeJS.Platform):LinkType=>platform==='win32'?'junction':'dir';
async function main(){
 let passed=0,failed=0,skipped=0;
 const check=async(name:string,run:()=>Promise<void|false>)=>{try{if(await run()===false)return;passed++;console.log('PASS: '+name);}catch(error){failed++;console.error('FAIL: '+name);console.error(error);}};
 const skip=(name:string)=>{skipped++;console.log('SKIP: '+name+' — Windows weigert uitsluitend het aanmaken van deze linkfixture (EPERM/EACCES). Aanval niet uitgevoerd.');};
 // Canonicalize the test root: macOS temp paths may themselves traverse /var -> /private/var.
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'phoenix-intelligence-fixture-')));
 const saved=process.env.PHOENIX_INTELLIGENCE_DATA_DIR,store=path.join(dir,'store');
 const outside=path.join(dir,'outside'),externalState=path.join(outside,'intelligence-v1.json');
 process.env.PHOENIX_INTELLIGENCE_DATA_DIR=store;
 try{
  await fs.mkdir(outside);const externalBefore=JSON.stringify(emptyIntelligenceState());
  await fs.writeFile(externalState,externalBefore);await fs.writeFile(path.join(outside,'sentinel.txt'),'DO NOT OVERWRITE');
  await check('alleen-lezen initialiseert geen opslag',async()=>{assert.equal((await readIntelligence()).revision,0);await assert.rejects(fs.lstat(store),{code:'ENOENT'});});
  await check('geldige opslag en import',async()=>{await mutateIntelligence(0,s=>importDocument(s,INTELLIGENCE_DEMOS[0].document,'2026-10-21T18:00:00Z').state);assert.equal((await readIntelligence()).documents.length,1);});
  const file=path.join(store,'intelligence-v1.json');
  await check('revisieconflict behoudt de opgeslagen staat',async()=>{const before=await fs.readFile(file,'utf8');await assert.rejects(mutateIntelligence(0,s=>s));assert.equal(await fs.readFile(file,'utf8'),before);});
  await check('filesystemlock weigert mutatie',async()=>{const lock=path.join(store,'write.lock');await fs.mkdir(lock);try{await assert.rejects(mutateIntelligence(1,s=>s));}finally{await fs.rmdir(lock);}});
  await check('mislukte mutatie behoudt gegevens en laat lock vrij',async()=>{const before=await fs.readFile(file,'utf8');await assert.rejects(mutateIntelligence(1,()=>{throw Error('synthetic failure');}));assert.equal(await fs.readFile(file,'utf8'),before);await assert.rejects(fs.lstat(path.join(store,'write.lock')),{code:'ENOENT'});});
  await check('corrupte staat wordt geweigerd en niet gereset',async()=>{const before=await fs.readFile(file);try{await fs.writeFile(file,'corrupt');await assert.rejects(readIntelligence());assert.equal(await fs.readFile(file,'utf8'),'corrupt');}finally{await fs.writeFile(file,before);}});
  await check('relatieve configuratie wordt geweigerd',async()=>{process.env.PHOENIX_INTELLIGENCE_DATA_DIR='../outside';try{await assert.rejects(intelligenceDirectory(),{status:503});}finally{process.env.PHOENIX_INTELLIGENCE_DATA_DIR=store;}});
  await check('repositorypad en genormaliseerde traversal naar repository worden geweigerd',async()=>{try{for(const target of [path.join(process.cwd(),'data/forbidden'),path.join(process.cwd(),'data','..','forbidden')]){process.env.PHOENIX_INTELLIGENCE_DATA_DIR=target;await assert.rejects(intelligenceDirectory(),{status:503});}}finally{process.env.PHOENIX_INTELLIGENCE_DATA_DIR=store;}});
  await check('padgrens volgt Windows-case, drives en POSIX-semantiek',async()=>{
   const root='C:\\Users\\mike6\\Projects\\Phoenix';
   for(const target of ['c:\\users\\MIKE6\\projects\\PHOENIX','C:\\USERS\\MIKE6\\PROJECTS\\PHOENIX\\data','C:\\Users\\mike6\\Projects\\Phoenix\\data\\..\\other'])assert.equal(isProjectStoragePath(root,target,path.win32),true);
   for(const target of ['C:\\Users\\mike6\\Projects\\Phoenix-other','C:\\Users\\mike6\\Projects','D:\\research'])assert.equal(isProjectStoragePath(root,target,path.win32),false);
   assert.equal(isProjectStoragePath('/repo','/repo/..name',path.posix),true);assert.equal(isProjectStoragePath('/repo','/repo-other',path.posix),false);assert.equal(isProjectStoragePath('/repo','/REPO',path.posix),false);
  });
  await check('alleen specifieke Windows-rechtenfouten bij fixturecreatie zijn SKIP-geschikt',async()=>{
   assert.equal(directoryLinkType('win32'),'junction');assert.equal(directoryLinkType('linux'),'dir');assert.equal(directoryLinkType('darwin'),'dir');
   for(const code of ['EPERM','EACCES']){
    const deny:LinkCreator=async()=>{throw Object.assign(Error('fixture denied'),{code});};
    assert.equal(await createLinkFixture('target','link','junction','win32',deny),false);
    await assert.rejects(createLinkFixture('target','link','dir','linux',deny),{code});await assert.rejects(createLinkFixture('target','link','dir','darwin',deny),{code});
   }
   for(const code of ['ENOENT','EEXIST','EINVAL','ENOTSUP','EIO'])await assert.rejects(createLinkFixture('target','link','junction','win32',async()=>{throw Object.assign(Error('fixture failure'),{code});}),{code});
  });
  await check('ongeldige revisie schrijft niets',async()=>{const before=await fs.readFile(file,'utf8');await assert.rejects(mutateIntelligence(NaN,s=>s));assert.equal(await fs.readFile(file,'utf8'),before);});
  // Directory junctions normally need no Windows symlink privilege. Verify the
  // real lstat guard, not a mocked application check. Failure to reject is FAIL.
  const link=path.join(dir,'directory-link');let directoryCreated=false,directoryUnavailable=false;
  await check('directory-linkfixture voorbereiden',async()=>{directoryCreated=await createLinkFixture(outside,link,directoryLinkType(process.platform));if(!directoryCreated){directoryUnavailable=true;return false;}});
  if(directoryCreated){
   await check('directory-link/junction wordt geweigerd zonder externe writes',async()=>{
    assert.equal((await fs.lstat(link)).isSymbolicLink(),true);process.env.PHOENIX_INTELLIGENCE_DATA_DIR=link;
    try{await assert.rejects(intelligenceDirectory(),{status:503});await assert.rejects(readIntelligence(),{status:503});await assert.rejects(mutateIntelligence(0,s=>importDocument(s,INTELLIGENCE_DEMOS[0].document,'2026-10-21T18:00:00Z').state),{status:503});assert.equal(await fs.readFile(externalState,'utf8'),externalBefore);}finally{process.env.PHOENIX_INTELLIGENCE_DATA_DIR=store;}
   });
   await check('link in bovenliggende padcomponent wordt geweigerd',async()=>{process.env.PHOENIX_INTELLIGENCE_DATA_DIR=path.join(link,'nested');try{await assert.rejects(intelligenceDirectory(),{status:503});await assert.rejects(mutateIntelligence(0,s=>s),{status:503});await assert.rejects(fs.lstat(path.join(outside,'nested')),{code:'ENOENT'});}finally{process.env.PHOENIX_INTELLIGENCE_DATA_DIR=store;}});
  }else if(directoryUnavailable){skip('directory-link/junctionaanval');skip('linkaanval via bovenliggende padcomponent');}
  // File symlinks have no junction equivalent. If Windows lacks that privilege,
  // this distinct attack must remain an explicit SKIP, even if junctions passed.
  await check('bestandslinkaanval voorbereiden en controleren',async()=>{
   const savedFile=path.join(dir,'saved-fixture-state.json');await fs.rename(file,savedFile);let created=false;
   try{
    created=await createLinkFixture(externalState,file,'file');
    if(!created){skip('symlinkaanval op intelligence-v1.json');return false;}
    assert.equal((await fs.lstat(file)).isSymbolicLink(),true);await assert.rejects(readIntelligence(),{status:409});await assert.rejects(mutateIntelligence(0,s=>s),{status:409});assert.equal(await fs.readFile(externalState,'utf8'),externalBefore);
   }finally{if(created)await fs.unlink(file);await fs.rename(savedFile,file);}
  });
  await check('alle writes blijven in de expliciete testopslag',async()=>{assert.equal(await fs.readFile(externalState,'utf8'),externalBefore);assert.equal(await fs.readFile(path.join(outside,'sentinel.txt'),'utf8'),'DO NOT OVERWRITE');assert.deepEqual((await fs.readdir(outside)).sort(),['intelligence-v1.json','sentinel.txt']);assert.deepEqual((await fs.readdir(store)).sort(),['intelligence-v1.json']);});
 }catch(error){failed++;console.error('FAIL: opslagfixture initialiseren of onverwachte testfout');console.error(error);
 }finally{
  if(saved===undefined)delete process.env.PHOENIX_INTELLIGENCE_DATA_DIR;else process.env.PHOENIX_INTELLIGENCE_DATA_DIR=saved;
  try{await fs.rm(dir,{recursive:true,force:true});}catch(error){failed++;console.error('FAIL: tijdelijke fixture opruimen');console.error(error);}
  console.log(`STORAGE_RESULT ${JSON.stringify({passed,failed,skipped,platform:process.platform})}`);
  console.log(`Storage: ${passed} PASS, ${failed} FAIL, ${skipped} SKIP.`);
  if(skipped)console.log('Niet alle linkaanvallen zijn uitgevoerd; SKIP is geen geslaagde beveiligingscontrole.');
  if(failed)process.exitCode=1;
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
