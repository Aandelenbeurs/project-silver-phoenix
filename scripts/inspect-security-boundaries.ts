import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assessRequest} from '../lib/request-security';
import {readJsonObject,ApiInputError} from '../lib/api-input';
import {workspacePath} from '../lib/workspace-path';
const req=(url:string,method='GET',headers:Record<string,string>={})=>new Request(url,{method,headers});
assert.equal(assessRequest(req('http://localhost:3000/api/workspaces')),null);
assert.equal(assessRequest(req('http://127.0.0.1:3000/')),null);
assert.equal(assessRequest(req('http://evil.test/'))?.status,403);
assert.equal(assessRequest(req('http://localhost:3000/', 'POST',{origin:'https://evil.test'}))?.status,403);
assert.equal(assessRequest(req('http://localhost:3000/', 'POST',{'sec-fetch-site':'cross-site'}))?.status,403);
assert.equal(assessRequest(req('http://localhost:3000/', 'PATCH',{origin:'http://localhost:3000','sec-fetch-site':'same-origin'})),null);
assert.equal(assessRequest(req('http://localhost/', 'GET',{host:'evil.test'}))?.status,403);
assert.equal(assessRequest(req('http://localhost/'),{user:'user'})?.status,503);
assert.equal(assessRequest(req('http://localhost/'),{user:'user',password:'test'})?.status,401);
assert.equal(assessRequest(req('https://phoenix.test/','GET',{authorization:'Basic '+btoa('user:test')}),{user:'user',password:'test'}),null);
const temp=mkdtempSync(path.join(os.tmpdir(),'phoenix-path-'));
try{
 const root=path.join(temp,'workspaces');mkdirSync(root);mkdirSync(path.join(root,'test'));
 assert.equal(workspacePath(root,'test','holdings.json'),path.join(root,'test','holdings.json'));
 for(const bad of ['../live','..','/etc','a/b','a\\b','%2e%2e','CON:', '', 'a'.repeat(81)]) assert.throws(()=>workspacePath(root,bad));
 assert.throws(()=>workspacePath(root,'test','../../companies.ts'));
 const outside=path.join(temp,'outside');mkdirSync(outside);symlinkSync(outside,path.join(root,'linked'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>workspacePath(root,'linked','holdings.json'));
 writeFileSync(path.join(temp,'secret'),'x');
 try {
  symlinkSync(path.join(temp,'secret'),path.join(root,'test','holdings.json'),'file');
  assert.throws(()=>workspacePath(root,'test','holdings.json'));
 } catch(error) {
  if(process.platform!=='win32'||(error as NodeJS.ErrnoException).code!=='EPERM')throw error;
  console.log('SKIP: file symlink test requires Windows developer mode; directory junction tested.');
 }
}finally{rmSync(temp,{recursive:true,force:true});}
(async()=>{
 const json=(text:string,headers:Record<string,string>={})=>new Request('http://localhost/',{method:'POST',headers:{'content-type':'application/json',...headers},body:text});
 assert.deepEqual(await readJsonObject(json('{"quantity":2}')),{quantity:2});
 for(const text of ['{','null','[]','1']) await assert.rejects(readJsonObject(json(text)),ApiInputError);
 await assert.rejects(readJsonObject(json('{"x":"'+'a'.repeat(65536)+'"}')),e=>e instanceof ApiInputError&&e.status===413);
 await assert.rejects(readJsonObject(json('{}',{'content-type':'text/plain'})),e=>e instanceof ApiInputError&&e.status===415);
 await assert.rejects(readJsonObject(json('{}',{'content-length':'999999'})),e=>e instanceof ApiInputError&&e.status===413);
 console.log('PASS: host/auth/origin boundaries, bounded JSON stream, path traversal and symlink rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
