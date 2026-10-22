/** Synthetic, ASCII PDF generated in memory. No issuer values or portfolio files. */
export function fixturePdf(changed=false,scan=false){
 const lines:{x:number;y:number;text:string}[]=[];
 const add=(y:number,text:string,x=50)=>lines.push({x,y,text});
 if(!scan){
 add(770,'Consolidated Financial Statement Highlights');add(750,'Three months ended',320);add(750,'Six months ended',480);add(730,'June 30',340);add(730,'June 30',500);
 add(710,'($000, Canadian dollars)');[2026,2025,2026,2025].forEach((n,i)=>add(710,String(n),320+i*80));
 for(const [row,label,values] of [[690,'Natural gas and liquids sales',[changed?'111,999':'111,222','222,333','333,444','444,555']],[670,'Cash provided by operating activities',['12,345','23,456','34,567','45,678']],[650,'Cash and cash equivalents, end of period',['6,789','7,890','6,789','7,890']]] as const){add(row,label);values.forEach((v,i)=>add(row,v,320+i*80));}
 add(610,'All amounts expressed in thousands of Canadian dollars.');
 }
 const stream=lines.map(l=>`BT /F1 9 Tf 1 0 0 1 ${l.x} ${l.y} Tm (${l.text.replace(/[\\()]/g,'\\$&')}) Tj ET`).join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 700 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let text='%PDF-1.4\n';const offsets=[0];for(const [i,o] of objects.entries()){offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${o}\nendobj\n`;}
 const xref=Buffer.byteLength(text);text+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return Buffer.from(text);
}
