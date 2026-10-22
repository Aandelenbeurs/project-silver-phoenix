// One-shot untrusted-PDF parser. Receives bytes on stdin; emits bounded JSON only.
// No PDF path, URL, scripts, actions, attachments, rendering, OCR or viewer are used.
const {pathToFileURL}=require('node:url');
const limits=require('./pdf-resource-limits.cjs');let total=0;const chunks=[];
process.stdin.on('data',b=>{total+=b.length;if(total>limits.maxBytes){process.stdout.write(JSON.stringify({error:'PDF_SIZE'}));process.exit(2);}chunks.push(b);});
process.stdin.on('end',async()=>{
 let task;
 try{
  const bytes=Buffer.concat(chunks);if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('PDF_FORMAT');
  const pdf=await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);
  task=pdf.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:false,disableFontFace:true,useWorkerFetch:false,isOffscreenCanvasSupported:false,isImageDecoderSupported:false,enableXfa:false,stopAtErrors:true,verbosity:0});
  const doc=await task.promise;if(doc.numPages>limits.maxPages)throw Object.assign(Error('PDF_PAGE_LIMIT'),{pages:doc.numPages,limit:limits.maxPages});
  const pages=[];let chars=0,items=0;
  for(let number=1;number<=doc.numPages;number++){
   const page=await doc.getPage(number),content=await page.getTextContent();const rows=[];
   for(const item of content.items){if(!('str' in item)||!item.str.trim())continue;chars+=item.str.length;items++;if(chars>limits.maxChars)throw Error('PDF_TEXT_LIMIT');if(items>limits.maxItems)throw Error('PDF_ITEM_LIMIT');if(item.str.length>limits.maxItemChars)throw Error('PDF_ITEM_SIZE_LIMIT');
    const x=Math.round(item.transform[4]*10)/10,y=Math.round(item.transform[5]*10)/10;
    let row=rows.find(r=>Math.abs(r.y-y)<2);if(!row){row={y,cells:[]};rows.push(row);}row.cells.push({x,text:item.str});
   }
   rows.sort((a,b)=>b.y-a.y);for(const row of rows)row.cells.sort((a,b)=>a.x-b.x);
   pages.push({number,rows});page.cleanup();
  }
  const result=JSON.stringify({version:pdf.version,pages});if(Buffer.byteLength(result)>limits.maxOutputBytes)throw Error('PDF_OUTPUT_LIMIT');
  await task.destroy();process.stdout.write(result);
 }catch(error){if(task)await task.destroy().catch(()=>{});const known=['PDF_FORMAT','PDF_PAGE_LIMIT','PDF_TEXT_LIMIT','PDF_ITEM_LIMIT','PDF_ITEM_SIZE_LIMIT','PDF_OUTPUT_LIMIT'];process.stdout.write(JSON.stringify({error:known.includes(error.message)?error.message:'PDF_UNREADABLE',...(Number.isInteger(error.pages)?{pages:error.pages,limit:error.limit}:{})}));process.exitCode=2;}
});
