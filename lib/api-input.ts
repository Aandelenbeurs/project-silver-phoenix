export class ApiInputError extends Error { constructor(message:string,public status=400){super(message);} }
/** Bound bytes while streaming; Content-Length alone is not trusted. */
export async function readJsonObject(request: Request, limit=64*1024): Promise<Record<string, unknown>> {
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json') throw new ApiInputError('JSON-aanvraag vereist.',415);
  const size=request.headers.get('content-length');
  if(size && (!/^\d+$/.test(size)||Number(size)>limit)) throw new ApiInputError('Aanvraag te groot of ongeldige lengte.',413);
  const reader=request.body?.getReader(); if(!reader) throw new ApiInputError('Lege aanvraag.');
  let bytes=0;const chunks:Uint8Array[]=[];
  try {
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
      if(bytes>limit){await reader.cancel();throw new ApiInputError('Aanvraag te groot.',413);}chunks.push(value);}
  } finally {reader.releaseLock();}
  const all=new Uint8Array(bytes);let offset=0;for(const part of chunks){all.set(part,offset);offset+=part.length;}
  let value:unknown;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));}catch{throw new ApiInputError('Ongeldige JSON.');}
  if(value===null||typeof value!=='object'||Array.isArray(value)) throw new ApiInputError('Een JSON-object is vereist.');
  return value as Record<string,unknown>;
}
