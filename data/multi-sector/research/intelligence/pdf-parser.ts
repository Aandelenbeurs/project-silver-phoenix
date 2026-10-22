import {spawn} from 'node:child_process';
import path from 'node:path';
import type {PdfText} from './pdf-tables';
export const PDF_PARSER='pdfjs-6.4.299/aav-layout-v1';
export const PDF_LIMITS=require('../../../../scripts/pdf-resource-limits.cjs') as {maxPages:number;maxBytes:number;maxChars:number;maxItems:number;maxItemChars:number;maxOutputBytes:number;heapMb:number;timeoutMs:number};
export class PdfParseError extends Error {constructor(public code:string,public pages?:number,public limit?:number){super(code);}}
export async function readPdf(bytes:Buffer,timeout=PDF_LIMITS.timeoutMs):Promise<PdfText>{
 if(bytes.length>PDF_LIMITS.maxBytes)throw new PdfParseError('PDF_SIZE');
 if(bytes.subarray(0,5).toString()!=='%PDF-')throw new PdfParseError('PDF_FORMAT');
 if(!bytes.subarray(-1024).toString('latin1').includes('%%EOF'))throw new PdfParseError('PDF_EOF');
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[`--max-old-space-size=${PDF_LIMITS.heapMb}`,'--disallow-code-generation-from-strings',path.join(process.cwd(),'scripts','pdf-intelligence-worker.cjs')],{stdio:['pipe','pipe','pipe'],windowsHide:true,env:{...process.env,NODE_OPTIONS:''}});
  let size=0,done=false;const chunks:Buffer[]=[];
  const finish=(error?:Error,value?:PdfText)=>{if(done)return;done=true;clearTimeout(timer);if(error){child.kill();reject(error);}else resolve(value!);};
  const timer=setTimeout(()=>finish(new PdfParseError('PDF_TIMEOUT')),Math.min(timeout,PDF_LIMITS.timeoutMs));
  child.stdout.on('data',(b:Buffer)=>{size+=b.length;if(size>PDF_LIMITS.maxOutputBytes)finish(new PdfParseError('PDF_OUTPUT_LIMIT'));else chunks.push(b);});
  child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});
  child.on('error',()=>finish(new PdfParseError('PDF_WORKER_UNAVAILABLE')));
  child.on('close',code=>{try{const output=Buffer.concat(chunks).toString();if(!output&&code!==0)return finish(new PdfParseError('PDF_WORKER_EXIT'));const data=JSON.parse(output);const known=['PDF_SIZE','PDF_FORMAT','PDF_PAGE_LIMIT','PDF_TEXT_LIMIT','PDF_ITEM_LIMIT','PDF_ITEM_SIZE_LIMIT','PDF_OUTPUT_LIMIT','PDF_UNREADABLE'];if(known.includes(data.error))return finish(new PdfParseError(data.error,Number.isInteger(data.pages)?data.pages:undefined,Number.isInteger(data.limit)?data.limit:undefined));if(code!==0||data.version!=='6.4.299'||!Array.isArray(data.pages)||!data.pages.length||data.pages.length>PDF_LIMITS.maxPages)throw Error();finish(undefined,data);}catch{finish(new PdfParseError('PDF_WORKER_PROTOCOL'));}});
  child.stdin.end(bytes);
 });
}
