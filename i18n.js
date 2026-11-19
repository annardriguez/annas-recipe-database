/* Presentation-only translations. Record IDs, stored recipes and form values stay unchanged. */
(() => {
  const key='annaKitchenLanguage',allowed=new Set(['en','es']),sources=new WeakMap(),attributes=new WeakMap();
  const normalize=value=>String(value).replace(/\s+/g,' ').trim();
  let language='en';
  try{const query=new URLSearchParams(location.search).get('lang');language=allowed.has(query)?query:localStorage.getItem(key)||'en';if(!allowed.has(language))language='en';if(allowed.has(query))localStorage.setItem(key,language);}catch{}
  document.documentElement.lang=language;
  const catalog=new Map(Object.entries(window.ANNA_ES_UI||{})),recipeStrings=new Map();
  const patterns=[];
  patterns.push(
    [/^Yield recorded as “(.*)”\. Check the servings before scaling\.$/,(_,yieldText)=>`Rendimiento indicado: «${yieldText}». Comprueba las raciones antes de ajustar las cantidades.`],
    [/^(\d+) of (\d+) recipes?$/,(_,a,b)=>`${a} de ${b} recetas`],
    [/^(\d+) minutes( ↗)?$/,(_,n,arrow)=>`${n} minutos${arrow||''}`],
    [/^(\d+) MINUTES$/,(_,n)=>`${n} MINUTOS`],
    [/^(\d+) SERVINGS$/,(_,n)=>`${n} RACIONES`],
    [/^(Breakfast|Lunch|Dinner|Snack) on (.*?): (.*)$/,(_,slot,date,action)=>`${translate(slot)} el ${date}: ${translate(action)}`],
    [/^(.*?) · (\d+) meals$/,(_,date,n)=>`${date} · ${n} comidas`],
    [/^(\d+) MINUTES · (.+)$/,(_,n,label)=>`${n} MINUTOS · ${translate(label)}`],
    [/^(\d+(?:\.\d+)?) serving(s)?$/,(_,n)=>`${n} ${n==='1'?'ración':'raciones'}`],
    [/^For (\d+) servings?\. Tick off as you go\.(.*)$/,(_,n,extra)=>`Para ${n} ${n==='1'?'ración':'raciones'}. Marca los ingredientes mientras cocinas.${extra?' Cantidades ajustadas a partir de la receta original; sazona al gusto.':''}`],
    [/^STEP (\d+) OF (\d+)$/,(_,a,b)=>`PASO ${a} DE ${b}`],
    [/^Ingredients · (\d+) servings$/,(_,n)=>`Ingredientes · ${n} raciones`],
    [/^(\d+) meals planned$/,(_,n)=>`${n} comidas planificadas`],
    [/^Showing (\d+) saved recipes?\.$/,(_,n)=>`Mostrando ${n} recetas guardadas.`],
    [/^(\d+) results? for “(.*)”(.*)\.$/,(_,n,q,extra)=>`${n} resultados para «${q}»${extra?' en '+translate(extra.replace(/^ in /,'')):''}.`],
    [/^(\d+) recipes match your filters\.$/,(_,n)=>`${n} recetas coinciden con tus filtros.`],
    [/^(\d+) recipes? in (.+)\.$/,(_,n,f)=>`${n} recetas en ${translate(f)}.`],
    [/^(View|Save|Remove|Add|Open) (.+)$/,(_,verb,text)=>`${({View:'Ver',Save:'Guardar',Remove:'Quitar',Add:'Añadir',Open:'Abrir'})[verb]} ${translate(text)}`],
    [/^(THE RECIPE BOX \/ )(.+)$/,(_,prefix,category)=>`EL RECETARIO / ${translate(category)}`],
    [/^Community · Shared by (.+)$/,(_,person)=>`Comunidad · Compartida por ${person}`],
    [/^Shared cookbook · Added by (.+)$/,(_,person)=>`Recetario compartido · Añadida por ${person}`],
    [/^Added by (.+)$/,(_,person)=>`Añadida por ${person}`],
    [/^(.+) invited you to this cookbook\.$/,(_,person)=>`${person} te ha invitado a este recetario.`],
    [/^(.+) is inviting you to cook together\.$/,(_,person)=>`${person} te invita a cocinar en compañía.`],
    [/^(\d+) members · (.+)$/,(_,n,rest)=>`${n} miembros · ${translate(rest)}`],
    [/^(.+) · (\d+) members?$/,(_,label,n)=>`${translate(label)} · ${n} ${n==='1'?'miembro':'miembros'}`],
    [/^(.+) · (owner|member|pending)$/,(_,name,role)=>`${name} · ${role==='pending'?'pendiente':translate(role)}`],
    [/^(.+) · invited members$/,(_,name)=>`${name} · miembros invitados`],
    [/^In: (.*)$/,(_,names)=>`En: ${translate(names)}`],
    [/^Added to (.+)$/,(_,name)=>`Añadida a ${name}`],
    [/^Last cooked (.+)$/,(_,date)=>`Última preparación: ${date}`],
    [/^(\d+) ingredients · (\d+) method steps(.*)$/,(_,a,b,source)=>`${a} ingredientes · ${b} pasos${source.replace('Original author:','Autor original:')}`],
    [/^(Not saved: |Could not import this backup: |Unable to restore session: )(.*)$/,(_,prefix,message)=>`${({ 'Not saved: ':'No se ha guardado: ','Could not import this backup: ':'No se pudo importar esta copia: ','Unable to restore session: ':'No se pudo restaurar la sesión: '})[prefix]}${translate(message)}`],
    [/^(\d+(?:\.\d+)?) g protein$/,(_,n)=>`${n} g de proteínas`],
    [/^(.+?)\. Change recipe$/,(_,name)=>`${translate(name)}. Cambiar receta`],
    [/^(Breakfast|Lunch|Dinner|Snack) · (.*)$/,(_,slot,rest)=>`${translate(slot)} · ${translate(rest)}`]
  );
  function translate(value){
    if(language!=='es')return String(value??'');
    const original=String(value??''),text=normalize(original);let result=catalog.get(text)??recipeStrings.get(text);
    if(result===undefined)for(const [pattern,replace]of patterns){if(pattern.test(text)){result=text.replace(pattern,replace);break;}}
    return result===undefined?original:(original.match(/^\s*/)[0]+result+original.match(/\s*$/)[0]);
  }
  catalog.set('Shared only with invited members','Compartido solo con miembros invitados');
  catalog.set('Downloaded copy · reconnect to check for changes','Copia descargada · conéctate para comprobar los cambios');
  const skip=el=>el.closest('script,style,textarea,input,code,pre,[translate="no"],[data-language-control]');
  function textNode(node){
    if(!node.parentElement||skip(node.parentElement))return;
    const prior=sources.get(node),raw=prior&&node.data===prior.output?prior.raw:node.data,output=node.parentElement.closest('[data-original-ingredient]')?window.AnnaI18n.ingredient(raw):translate(raw);
    const display=language==='es'&&node.previousSibling?.nodeName==='BR'&&!/^\s/.test(output)?' '+output:output;
    sources.set(node,{raw,output:display});if(node.data!==display)node.data=display;
  }
  function element(el){
    if(skip(el))return;
    // Options without explicit values otherwise save their translated labels as account data.
    if(el.tagName==='OPTION'&&!el.hasAttribute('value'))el.setAttribute('value',el.value);
    const tracked=attributes.get(el)||{};
    for(const attr of ['aria-label','placeholder','title','alt',...(el.matches('meta[name="description"]')?['content']:[])])if(el.hasAttribute(attr)){
      const value=el.getAttribute(attr),prior=tracked[attr],raw=prior&&value===prior.output?prior.raw:value,output=translate(raw);
      tracked[attr]={raw,output};if(value!==output)el.setAttribute(attr,output);
    }
    attributes.set(el,tracked);
  }
  let observer;
  function apply(root=document.documentElement){
    if(!root)return;observer?.disconnect();
    if(root.nodeType===3)textNode(root);
    else {if(root.nodeType===1)element(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(n.nodeType===3)textNode(n);else element(n);}}
    observer?.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title','alt','content']});
  }
  function setLanguage(next){
    if(!allowed.has(next)||next===language)return;language=next;document.documentElement.lang=next;
    try{localStorage.setItem(key,next);}catch{}
    const url=new URL(location.href);if(url.searchParams.has('lang')){url.searchParams.set('lang',next);history.replaceState(null,'',url);}
    document.querySelectorAll('[data-language-control] select').forEach(s=>s.value=next);
    apply();window.dispatchEvent(new Event('anna:language'));
  }
  function initialize(){
    const actions=document.querySelector('.header-actions');
    if(actions){const label=document.createElement('label');label.className='language-control';label.dataset.languageControl='';label.innerHTML='<span class="visually-hidden">Idioma / Language</span><select aria-label="Idioma / Language"><option value="en" lang="en">EN</option><option value="es" lang="es">ES</option></select>';label.querySelector('select').value=language;label.querySelector('select').onchange=e=>setLanguage(e.target.value);actions.prepend(label);}
    observer=new MutationObserver(changes=>{const roots=new Set();for(const change of changes){if(change.type==='childList')for(const n of change.addedNodes)roots.add(n);else roots.add(change.target);}for(const node of roots)if(node.isConnected)apply(node);});apply();
  }
  window.AnnaI18n={t:translate,apply,setLanguage,get language(){return language;},get locale(){return language==='es'?'es-ES':'en-GB';},patterns,
    registerRecipes(originals,translations,ingredient){for(let i=0;i<originals.length;i++){const r=originals[i],es=translations[i];if(!es||es[2].length!==r.steps.length)throw new Error('Incomplete recipe translation: '+r.id);for(const [a,b]of [[r.title,es[0]],[r.description,es[1]],...r.steps.map((step,j)=>[step,es[2][j]])])recipeStrings.set(normalize(a),b);for(const line of r.ingredients)recipeStrings.set(normalize(line),ingredient(line));}apply();},
    add:entries=>{for(const [a,b]of Object.entries(entries))catalog.set(normalize(a),b);apply();},
    ingredient:line=>line,
    search:recipe=>normalize([recipe.title,recipe.description,...recipe.ingredients,...recipe.tags,...recipe.equipment].map(translate).join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),
    tag:value=>({'vegetariano':'vegetarian','vegetariana':'vegetarian','vegano':'vegan','vegana':'vegan','rico en proteinas':'high protein','alta en proteinas':'high protein','preparacion anticipada':'meal prep','freidora de aire':'air fryer'}[normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()]||String(value).toLowerCase()),
    normalize:value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  };
  // Native browser dialogs share the same catalog; user-entered defaults are never translated.
  for(const method of ['confirm','alert','prompt']){const original=window[method].bind(window);window[method]=(message,...args)=>original(translate(message),...args);}
  window.addEventListener('storage',e=>{if(e.key===key&&allowed.has(e.newValue))setLanguage(e.newValue);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
