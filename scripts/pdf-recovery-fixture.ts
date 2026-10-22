/** Isolated synthetic annual table; all monetary amounts are fictitious. */
import type {PdfText} from '../data/multi-sector/research/intelligence/pdf-tables';
export function annualLayout(pages=126):PdfText{
 const layout:PdfText={version:'6.4.299',pages:Array.from({length:pages},(_,i)=>({number:i+1,rows:[]}))};
 const row=(y:number,text:string,x=50)=>({y,cells:[{x,text}]});
 for(const [page,instant,labels] of [[66,true,['Cash and cash equivalents','Bank indebtedness']],[67,false,['Natural gas and liquids sales']],[69,false,['Cash provided by operating activities']]] as const){
  if(page>pages)continue;
  const rows=layout.pages[page-1].rows;
  rows.push(row(770,'Consolidated Statements'),row(750,'All amounts expressed in thousands of Canadian dollars.'),row(730,instant?'December 31':'Years ended December 31'),{y:710,cells:[{x:50,text:'($000, Canadian dollars)'},{x:380,text:'2025'},{x:500,text:'2024'}]});
  labels.forEach((label,i)=>rows.push({y:690-20*i,cells:[{x:50,text:label},{x:380,text:String(101+page+i)},{x:500,text:String(202+page+i)}]}));
 }
 return layout;
}
export function layoutPdf(layout:PdfText){
 const objects:string[]=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 const kids:number[]=[];
 for(const page of layout.pages){
  const n=objects.length+1;kids.push(n);
  const stream=page.rows.flatMap(r=>r.cells.map(c=>`BT /F1 ${c.text.length>500?'0.01':'9'} Tf 1 0 0 1 ${c.x} ${r.y} Tm (${c.text.replace(/[\\()]/g,'\\$&')}) Tj ET`)).join('\n');
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 700 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${n+1} 0 R >>`,`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
 }
 objects[1]=`<< /Type /Pages /Count ${kids.length} /Kids [${kids.map(n=>n+' 0 R').join(' ')}] >>`;
 let text='%PDF-1.4\n';const offsets:number[]=[];
 objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${o}\nendobj\n`;});
 const xref=Buffer.byteLength(text);text+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return Buffer.from(text);
}
