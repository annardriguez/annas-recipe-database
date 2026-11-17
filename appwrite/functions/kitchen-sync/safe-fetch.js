// Only public websites; pin the validated DNS result to the outgoing connection.
import https from 'node:https';
import http from 'node:http';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {createGunzip,createInflate,createBrotliDecompress} from 'node:zlib';
import ipaddr from 'ipaddr.js';
export const importError = (message,code=400) => Object.assign(new Error(message),{safe:true,code});
export function publicAddress(address) {
  try {let parsed=ipaddr.parse(address);if(parsed.kind()==='ipv6'&&parsed.isIPv4MappedAddress())parsed=parsed.toIPv4Address();return parsed.range()==='unicast';}catch{return false;}
}
export function websiteURL(input) {
  let url;try{url=new URL(input);}catch{throw importError('Paste a complete recipe website link, starting with https://.');}
  const hostname=url.hostname.replace(/^\[|\]$/g,'');
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||!hostname.includes('.')||/\.(localhost|local|internal|test|invalid)$/i.test(hostname)||(isIP(hostname)&&!publicAddress(hostname)))throw importError('Use a public recipe website link without a password or custom port.');
  url.hash='';return url;
}
export async function safeFetch(input,{limit=2*1024*1024,accept='text/html,application/xhtml+xml',signal=AbortSignal.timeout(18000),resolve=lookup,transport}={}) {
  let url=websiteURL(input);
  for(let redirects=0;redirects<=4;redirects++) {
    const host=url.hostname.replace(/^\[|\]$/g,'');
    const addresses=await Promise.race([resolve(host,{all:true,verbatim:true}),new Promise((_,reject)=>{
      if(signal.aborted){reject(importError('This website took too long to respond. Try again.'));return;}
      signal.addEventListener('abort',()=>reject(importError('This website took too long to respond. Try again.')),{once:true});
    })]);
    if(!addresses.length||addresses.some(({address})=>!publicAddress(address)))throw importError('This link does not lead to a public recipe website.');
    const address=addresses.find(item=>item.family===4)||addresses[0];
    const response=await new Promise((resolveRequest,reject)=>{
      const request=(transport || (url.protocol==='https:'?https:http).request)(url,{
        method:'GET',agent:false,signal,headers:{'user-agent':'AnnaKitchenRecipeImporter/1.0','accept':accept,'accept-encoding':'gzip, deflate, br'},
        lookup:(_hostname,options,callback)=>{if(typeof options==='function'){callback=options;options={};}callback(null,options?.all?[address]:address.address,address.family);}
      },resolveRequest);
      request.on('error',()=>reject(importError('Could not read this website. Check the link or try another recipe.')));request.end();
    });
    if([301,302,303,307,308].includes(response.statusCode)) {
      response.destroy();
      if(!response.headers.location||redirects===4)throw importError('This website redirected too many times. Use the recipe’s final link.');
      const next=websiteURL(new URL(response.headers.location,url).href);
      if(url.protocol==='https:'&&next.protocol!=='https:')throw importError('Use the secure https:// link for this recipe.');
      url=next;continue;
    }
    if(response.statusCode!==200){response.resume();throw importError('This website could not be read automatically. It may require a login or block recipe imports.');}
    const type=(response.headers['content-type']||'').split(';')[0].trim().toLowerCase();
    const image=accept.startsWith('image/');
    if(image?!['image/jpeg','image/png','image/webp'].includes(type):!['text/html','application/xhtml+xml'].includes(type)) {response.resume();throw importError(image?'The recipe photo could not be downloaded.':'That link is not a recipe web page.');}
    if(Number(response.headers['content-length'])>limit){response.destroy();throw importError('This page or photo is too large to import.');}
    const decompress={'gzip':createGunzip,'deflate':createInflate,'br':createBrotliDecompress}[response.headers['content-encoding']];
    const stream=decompress?response.pipe(decompress()):response;
    if(decompress)response.on('error',error=>stream.destroy(error));
    let length=0;const chunks=[];
    try {for await(const chunk of stream){length+=chunk.length;if(length>limit){response.destroy();stream.destroy();throw importError('This page or photo is too large to import.');}chunks.push(chunk);}}
    catch(error){if(error.safe)throw error;throw importError('This website stopped responding. Try the link again.');}
    return {url:url.href,bytes:Buffer.concat(chunks),type,encoding:(response.headers['content-type']||'').match(/charset=["']?([^;"' ]+)/i)?.[1]};
  }
}
