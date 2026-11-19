const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('all original recipes have Spanish titles, descriptions, complete methods and unchanged numeric cooking instructions/ingredient amounts',()=>{
 const context={window:{ANNA_ES_UI:{},AnnaI18n:{add:()=>{},registerRecipes:(originals,translations,ingredient)=>{
  assert.equal(originals.length,72);assert.equal(translations.length,originals.length);
  const digits=text=>text.match(/\d+(?:\.\d+)?/g)||[];
  originals.forEach((r,i)=>{const [title,description,steps]=translations[i];assert.ok(title&&description,r.id);assert.equal(steps.length,r.steps.length,r.id);
   steps.forEach((step,j)=>assert.deepEqual(digits(step),digits(r.steps[j]),r.id+' step '+j));
   r.ingredients.forEach(line=>assert.deepEqual(digits(ingredient(line)),digits(line),r.id+' '+line));
  });
 }}}};vm.createContext(context);vm.runInContext(fs.readFileSync('recipes.js','utf8')+fs.readFileSync('recipes-es.js','utf8'),context);
});
