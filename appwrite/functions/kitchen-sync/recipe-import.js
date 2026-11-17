import {load,loadBuffer} from 'cheerio';
import {safeFetch,websiteURL,importError} from './safe-fetch.js';
function text(value,max=12000) {
  if(typeof value!=='string'&&typeof value!=='number')return '';
  const $=load(String(value),null,false);$('script,style,iframe').remove();$('br').replaceWith('\n');$('p,li,div').append('\n');
  return $.text().replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim().slice(0,max);
}
const array=value=>value==null?[]:Array.isArray(value)?value:[value];
function minutes(value) {const m=String(value||'').match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);if(!m)return null;const n=Number(m[1]||0)*1440+Number(m[2]||0)*60+Number(m[3]||0)+Number(m[4]||0)/60;return n>0&&n<=10080?Math.ceil(n):null;}
function steps(value,depth=0) {
  if(depth>12)return [];
  return array(value).flatMap(item=>typeof item==='string'?text(item).split(/\n+/).filter(Boolean):item&&typeof item==='object'?(item.itemListElement?steps(item.itemListElement,depth+1):item.item?steps(item.item,depth+1):steps(item.text||item.name,depth+1)):[]).slice(0,150);
}
function imageURL(value,base) {
  for(const item of array(value)) {const candidate=typeof item==='string'?item:item?.url||item?.contentUrl;if(candidate)try{return websiteURL(new URL(candidate,base).href).href;}catch{}}
  return '';
}
export function extractRecipe(bytes,sourceUrl,encoding) {
  const $=loadBuffer(Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes),{encoding:{defaultEncoding:'utf-8',transportLayerEncodingLabel:encoding}});const candidates=[];
  function visit(value,depth=0){if(depth>25||!value||typeof value!=='object')return;if(array(value['@type']).some(t=>/(^|\/)Recipe$/i.test(t)))candidates.push(value);for(const child of Object.values(value))if(child&&typeof child==='object')array(child).forEach(v=>visit(v,depth+1));}
  $('script[type="application/ld+json"]').each((_,el)=>{try{visit(JSON.parse($(el).text().replace(/^\s*<!--|-->\s*$/g,'')));}catch{}});
  let recipe=candidates.find(r=>r.name&&r.recipeIngredient&&r.recipeInstructions)||candidates[0];
  // Older recipe websites may use standard Recipe microdata instead of JSON-LD.
  if(!recipe){const scope=$('[itemscope][itemtype]').filter((_,el)=>/(^|\/)Recipe\/?$/.test($(el).attr('itemtype'))).first();if(scope.length){const values=property=>scope.find(`[itemprop~="${property}"]`).map((_,el)=>$(el).attr('content')||$(el).attr('datetime')||$(el).attr('src')||$(el).text()).get();recipe={name:values('name')[0],recipeIngredient:values('recipeIngredient'),recipeInstructions:values('recipeInstructions'),totalTime:values('totalTime')[0],prepTime:values('prepTime')[0],cookTime:values('cookTime')[0],recipeYield:values('recipeYield')[0],description:values('description')[0],image:values('image')[0]};}}
  if(!recipe)throw importError('No readable recipe was found. Try the recipe’s own website rather than a search, video or social-media link. You can still add a recipe manually.');
  const warnings=[];
  const ingredients=array(recipe.recipeIngredient).flatMap(v=>text(typeof v==='object'?v.text||v.name:v).split(/\n+/)).filter(Boolean).slice(0,200);
  const method=steps(recipe.recipeInstructions);
  const rawYield=text(array(recipe.recipeYield)[0]?.value??array(recipe.recipeYield)[0],120);
  const yieldMatch=rawYield.match(/^(?:serves?|servings?[: ]*)?\s*(\d+)\s*(?:servings?|people|persons?)?\.?$/i);
  const servings=yieldMatch&&Number(yieldMatch[1])>=1&&Number(yieldMatch[1])<=48?Number(yieldMatch[1]):null;
  const prepTime=minutes(recipe.prepTime),cookTime=minutes(recipe.cookTime),time=minutes(recipe.totalTime);
  const author=array(recipe.author).map(a=>text(typeof a==='string'?a:a?.name,180)).filter(Boolean).join(', ').slice(0,300);
  const title=text(recipe.name,180);
  if(!title)warnings.push('Add a recipe name before saving.');
  if(!ingredients.length)warnings.push('Ingredients were missing. Add them before saving.');
  if(!method.length)warnings.push('The method was missing. Add it before saving.');
  if(!time)warnings.push('Total time was not recorded. Add the total minutes before saving.');
  if(!servings)warnings.push(rawYield?`Yield recorded as “${rawYield}”. Check the servings before scaling.`:'Serving count was not recorded; scaling will stay off until you add it.');
  if(recipe.nutrition)warnings.push('Nutrition was left blank because its serving basis has not been checked.');
  if(candidates.length>1)warnings.push('This page contains several recipes. Check that this is the one you wanted.');
  const sourceName=text($('meta[property="og:site_name"]').attr('content')||new URL(sourceUrl).hostname,180);
  const categoryText=text(array(recipe.recipeCategory).join(' '),120).toLowerCase();
  const category=/breakfast/.test(categoryText)?'breakfast':/dessert|cake|cookie|sweet/.test(categoryText)?'sweet':/snack/.test(categoryText)?'snack':/side/.test(categoryText)?'side':/lunch/.test(categoryText)?'lunch':'main';
  return {recipe:{title,description:text(recipe.description,2000),ingredients,steps:method,servings,time,prepTime,cookTime,category,tags:[],sourceUrl,sourceAuthor:author,sourceName,note:[author?`Recipe by ${author}.`:'',`Source: ${sourceName}\n${sourceUrl}`,rawYield&&!servings?`Original yield: ${rawYield}`:''].filter(Boolean).join('\n')},imageUrl:imageURL(recipe.image,sourceUrl),warnings};
}
export async function importRecipe(url,{fetchPage=safeFetch}={}) {
  const signal=AbortSignal.timeout(22000);
  const page=await fetchPage(url,{signal});const draft=extractRecipe(page.bytes,page.url,page.encoding);
  if(draft.imageUrl) {
    try {
      const image=await fetchPage(draft.imageUrl,{accept:'image/jpeg,image/png,image/webp',limit:512*1024,signal});
      const b=image.bytes;const valid=image.type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:image.type==='image/png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):image.type==='image/webp'&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
      if(!valid)throw new Error('Invalid image');
      draft.image={base64:b.toString('base64'),type:image.type};
    }catch{draft.warnings.push('The photo could not be downloaded. You can add your own photo in the editor.');}
  }
  delete draft.imageUrl;return draft;
}
