/* Hand-written Spanish versions of Anna's original recipes, in source order.
   Translation is for display/search only; edits, sync and recipe IDs use the originals. */
(() => {
const spanish=[
['Arroz frito con ternera al estilo coreano','Arroz frito con ternera al gochujang, huevo, zanahoria y cebolleta, con mayonesa picante opcional.',[
'Calienta la porción de aceite de oliva de la ternera en una sartén grande a fuego medio-alto. Añade la carne picada y cocina 5–6 minutos, desmenuzándola, hasta que se dore. Añade el ajo y el jengibre y cocina otro minuto.',
'Mezcla la salsa de soja de la ternera, el gochujang, el azúcar moreno, el vinagre de arroz, el aceite de sésamo y la pimienta negra. Incorpora a la carne y deja reducir 2–3 minutos. Reserva.',
'En otra sartén grande o wok, calienta el aceite de oliva del arroz a fuego medio. Cocina la cebolla en dados y la zanahoria rallada 2–3 minutos, hasta que se ablanden.',
'Aparta las verduras a un lado. Añade los huevos batidos en el hueco y remueve hasta que cuajen, después mézclalos con las verduras.',
'Añade el arroz cocido y frío, la salsa de soja del arroz y el aceite de sésamo. Saltea 3–4 minutos, hasta que todo esté bien mezclado y caliente.',
'Añade la ternera cocinada y mezcla. Incorpora la cebolleta picada y retira del fuego.',
'Si usas la salsa opcional, mezcla la mayonesa ligera, la sriracha, el vinagre de arroz y el ajo en polvo. Añade el agua si hace falta para aligerarla.',
'Reparte entre cuatro cuencos o recipientes. Termina con la salsa opcional, las semillas de sésamo y la cebolleta en rodajas.']],
['Tofu crujiente con miel y guindilla','Tofu extrafirme crujiente con una salsa de miel, gochujang y guindilla.',[
'Prensa o seca el tofu y córtalo o desgárralo en trozos de bocado. Rebózalo con la maicena.',
'Cocina en la freidora de aire a 190°C durante 15–20 minutos, agitando a mitad de cocción, hasta que esté crujiente. No se añade aceite de aguacate.',
'Preparación sugerida de la salsa: mezcla la salsa de soja clara, el vinagre de arroz, la miel, el gochujang, la sriracha y la salsa de soja oscura.',
'Calienta los 5 g de aceite de sésamo en una sartén y saltea brevemente el ajo y la cebolleta. Añade la salsa y deja que burbujee un momento.',
'Mezcla el tofu crujiente con la salsa y reparte en dos raciones. Sírvelo sin arroz o añade arroz aparte si lo deseas.']],
['Orzo cremoso con tomate y calabacín','Orzo con tomate, calabacín, queso cottage triturado, parmesano y albahaca.',[
'Preparación sugerida: pica la cebolla y el ajo y corta los tomates cherry por la mitad. Cuece el orzo en caldo de verduras según el paquete y reserva un poco del líquido antes de escurrir.',
'Ablanda la cebolla y el calabacín en una sartén antiadherente con un poco de caldo; añade más si hace falta para que no se peguen. Incorpora el ajo y cocina brevemente.',
'Añade el concentrado de tomate y el pimentón ahumado, después los tomates cherry, los tomates secos picados y el vinagre balsámico. Cocina hasta que los tomates se ablanden.',
'Tritura el queso cottage hasta que quede liso. Mezcla el orzo cocido con las verduras y un poco del líquido reservado. Retira del fuego e incorpora el queso cottage, la crème fraîche y el parmesano.',
'Añade albahaca al gusto y más líquido de cocción si hace falta. Reparte en dos raciones.']],
['Sopa de lasaña con alubias','Alubias grandes y láminas de lasaña en una sopa cremosa de tomate con espinacas, queso cottage y cheddar.',[
'Preparación sugerida: pica la cebolla, el ajo y los tomates secos. Ablanda la cebolla en una olla antiadherente con un poco de caldo de verduras y añade el ajo, los tomates secos y el concentrado de tomate.',
'Incorpora las alubias escurridas, el pimentón, las hierbas y la cayena al gusto. Añade 700 ml de caldo de verduras y lleva a un hervor suave.',
'Rompe las láminas de lasaña y añádelas a la olla. Cuece a fuego suave, removiendo a menudo, hasta que la pasta esté tierna. Añade más caldo si hace falta: entre 700–900 ml en total para una textura de sopa.',
'Tritura el queso cottage hasta que quede liso. Añade las espinacas a la sopa y deja que se ablanden; retira del fuego e incorpora el queso cottage y la crème fraîche.',
'Reparte en tres raciones y termina con el cheddar ligero rallado.']],
['Barritas de avellana, caramelo de dátiles y chocolate','Barritas de avellana y avena con caramelo de dátiles, chocolate negro y avellanas picadas. Salen 12.',[
'Preparación sugerida: forra un molde pequeño. Mezcla las avellanas molidas, la harina de avena, la crema de avellanas de la base, el sirope de arce, la vainilla y la sal. Añade poco a poco los 15–25 ml de leche o agua hasta que la mezcla se compacte al presionarla.',
'Presiona bien la base en el molde y refrigera.',
'Si hace falta, ablanda los dátiles en agua templada y escúrrelos bien. Tritúralos con la crema de avellanas del caramelo, sal, vainilla y 30–45 ml de leche, añadiéndola poco a poco hasta obtener una crema untable.',
'Extiende el caramelo sobre la base. Funde suavemente los 55 g de chocolate negro, repártelo por encima y añade los 10 g de avellanas picadas.',
'Enfría hasta que esté firme y corta en 12 barritas.']],
['Barritas de cacahuete y caramelo de dátiles','Base de almendra y avena con caramelo de dátiles y cacahuete, chocolate negro y sal en escamas opcional. Salen 12.',[
'Preparación sugerida: forra un molde pequeño. Mezcla la harina de avena, la almendra molida, la crema de cacahuete de la base, el sirope de arce, la canela y la sal. Añade poco a poco los 20–30 ml de leche hasta que la mezcla se compacte al presionarla.',
'Presiona bien en el molde y refrigera.',
'Si hace falta, ablanda los dátiles en agua templada y escúrrelos bien. Tritúralos con la crema de cacahuete del caramelo, el cacahuete en polvo, sal y 30–45 ml de leche, añadiéndola poco a poco hasta obtener una crema untable.',
'Extiende el caramelo de cacahuete sobre la base. Funde suavemente los 60 g de chocolate negro y extiéndelo por encima. Añade sal en escamas si lo deseas.',
'Enfría hasta que esté firme y corta en 12 barritas.']],
['Pasta cremosa de guisantes con trufa','Pasta de guisantes con calabacín, parmesano y trufa.',[
'Hierve agua con sal y cuece la pasta de guisantes hasta que esté tierna; reserva al menos 100 ml del agua antes de escurrir.',
'Mezcla el calabacín con aceite de oliva, sal y pimienta y cocina en la freidora de aire a 195°C durante 8–10 minutos, agitando una vez.',
'Mezcla el skyr, parmesano, trufa, ajo en polvo y 40 ml de agua caliente de la pasta hasta que quede una salsa lisa.',
'Retira la sartén del fuego. Añade la pasta, el calabacín y la salsa, mezclando rápido para que el yogur no se corte.',
'Añade más agua de cocción, una cucharada cada vez, hasta que quede cremosa. Prueba y termina con pimienta negra.']],
['Tofu agridulce','Tofu crujiente, boniato y verduras con una salsa agridulce.',[
'Precalienta la freidora de aire a 195°C. Mezcla el boniato con la mitad del aceite y cocina 10 minutos.',
'Mezcla el tofu con la maicena, el resto del aceite y una pizca de sal. Añádelo a la cesta con las verduras y cocina otros 10–12 minutos, agitando dos veces.',
'Salsa: añade kétchup, soja, vinagre, miel, jengibre, ajo y agua; cocina 4 min/100°C/velocidad 2, sin cubilete.',
'Mezcla el tofu y las verduras con la salsa caliente justo antes de servir para que el tofu siga crujiente.']],
['Cuenco de arroz con halloumi al estilo taco','Arroz, edamame, halloumi y acompañamientos crujientes para tacos.',[
'Cuece el arroz según el paquete y añade el edamame en los últimos 2 minutos para calentarlo.',
'Cocina el halloumi a 190°C durante 6–8 minutos, dándole la vuelta una vez.',
'Mezcla el yogur, el zumo de lima y el sazonador para tacos.',
'Coloca el arroz, el edamame, las verduras y el maíz o las alubias en un cuenco. Añade el halloumi, la salsa de yogur y lima y los totopos troceados.']],
['Cuenco de pollo al limón, edamame y quinoa','Pollo al limón con quinoa, edamame y una salsa fresca de yogur.',[
'Enjuaga la quinoa y cuécela en unos 120 ml de agua durante 12–15 minutos; deja reposar tapada 5 minutos.',
'Sazona el pollo con sal, pimienta y ralladura de limón. Cocina en la freidora de aire a 190°C durante 10–12 minutos o en una sartén con aceite a fuego medio hasta que esté completamente hecho.',
'Hierve el edamame 3–4 minutos y escurre.',
'Mezcla el yogur con zumo de limón, ajo y hierbas.',
'Corta el pollo y sírvelo con la quinoa, el edamame y las verduras. Añade la salsa.']],
['Cuenco de arroz con pollo y mango','Mango dulce, pollo, arroz y verduras crujientes.',[
'Cuece el arroz y el edamame.',
'Sazona el pollo con ajo en polvo y pimienta. Cocina en la freidora de aire a 190°C durante 10–12 minutos o dóralo en la sartén hasta que esté hecho.',
'Mezcla el yogur con zumo de lima. Aparte, mezcla la salsa de soja con miel y unas gotas de lima.',
'Coloca el arroz, el pepino, el mango y el edamame. Añade el pollo en tiras y termina con ambas salsas.']],
['Cuenco de garbanzos y berenjena al pesto','Berenjena y garbanzos asados con pesto, feta y yogur al limón.',[
'Precalienta la freidora de aire a 195°C. Mezcla la berenjena con aceite, pimentón, ajo, sal y pimienta y cocina 10 minutos.',
'Añade los garbanzos y el calabacín, agita bien y cocina otros 8–10 minutos, hasta que se doren.',
'Mezcla el yogur con zumo de limón y una pizca de sal.',
'Mezcla las verduras y los garbanzos calientes con el pesto. Sirve y termina con feta y yogur al limón.']],
['Berenjena y tofu crujientes','Tofu y berenjena en la freidora de aire con una salsa cremosa, dulce y salada.',[
'Precalienta la freidora de aire a 200°C. Corta el tofu y la berenjena en dados.',
'Mezcla el tofu con salsa de soja y la mitad de las especias; mezcla la berenjena y los garbanzos con aceite y el resto de las especias.',
'Cocina todo en la freidora de aire durante 14–16 minutos, agitando cada 5 minutos, hasta que el tofu esté crujiente y la berenjena dorada.',
'Mezcla el yogur con miel y sriracha opcional. Añádelo sobre las verduras calientes.']],
['Pollo y patatas glaseados con sésamo','Patatas crujientes y pollo con un glaseado de soja y miel.',[
'Precalienta la freidora de aire a 195°C. Mezcla las patatas con 5 g de aceite y sal y cocina 14 minutos.',
'Añade el pollo mezclado con el resto del aceite y las verduras. Cocina otros 10–12 minutos, agitando dos veces, hasta que el pollo esté hecho y las patatas crujientes.',
'Glaseado en Thermomix: añade soja, miel, jengibre, ajo y 20 ml de agua; cocina 4 min/100°C/velocidad 2. En sartén: deja reducir 3–4 minutos.',
'Mezcla el pollo con el glaseado y sirve con las patatas y las verduras. Espolvorea semillas de sésamo.']],
['Cuenco de pollo y garbanzos crujientes con tahini','Pollo, garbanzos y verduras asadas con una salsa cremosa de tahini.',[
'Cuece el arroz.',
'Precalienta la freidora de aire a 195°C. Mezcla las verduras y los garbanzos con la mitad del aceite y sazona; cocina 8 minutos.',
'Añade el pollo con el resto del aceite y los condimentos. Cocina otros 10–12 minutos, hasta que esté hecho.',
'Bate el tahini, el yogur, la miel, la salsa de soja y el limón con 1–2 cucharadas de agua.',
'Monta el cuenco con arroz, verduras y garbanzos crujientes y pollo; añade la salsa.']],
['Pasta de lentejas con cacahuete','Pasta de lentejas con una salsa cremosa de cacahuete y soja y verduras crujientes.',[
'Cuece la pasta de lentejas hasta que esté tierna; reserva 100 ml de agua de cocción.',
'Bate la crema de cacahuete, la salsa de soja, la lima o vinagre, el jengibre y 40 ml del agua de cocción hasta obtener una salsa lisa.',
'Escurre la pasta y mézclala con la salsa y el edamame.',
'Incorpora el pepino y la zanahoria para darle un toque crujiente; añade más agua de cocción si hace falta.']],
['Pasta cremosa con gyros, champiñones y calabacín','Pasta cremosa con tiras estilo gyros, champiñones y calabacín.',[
'Cuece la pasta en agua con sal y reserva agua de cocción.',
'Calienta aceite en una sartén grande y dora las tiras de gyros 3–4 minutos.',
'Añade los champiñones y el calabacín y cocina hasta que se doren y reduzcan.',
'Baja el fuego. Incorpora el skyr o queso crema ligero, el parmesano y 50 ml de agua de cocción.',
'Añade la pasta y mezcla hasta que quede cremosa. Añade más agua de cocción si hace falta y sazona.']],
['Barquitas de calabacín','Calabacín relleno de carne vegetal y queso cremoso.',[
'Corta el calabacín por la mitad a lo largo, vacía un poco el centro y pica la pulpa retirada.',
'Mezcla la pulpa con la carne vegetal picada, queso cottage, Dijon, ajo en polvo y hierbas italianas.',
'Rellena las mitades y espolvorea parmesano por encima.',
'Cocina en la freidora de aire a 190°C durante 12–15 minutos, hasta que el calabacín esté tierno y la superficie dorada.']],
['Láminas de tofu ahumado con hoisin y miso','Láminas de tofu para preparar con antelación y añadir a tostadas y bocadillos.',[
'Corta el tofu en láminas finas de 5–7 mm.',
'Marinada en Thermomix: añade hoisin, miso, soja, vinagre, ajo y agua; mezcla 15 s/velocidad 4. En un cuenco: bate hasta que quede liso.',
'Cubre el tofu con la marinada y deja reposar al menos 10 minutos.',
'Cocina en la freidora de aire a 190°C durante 10–12 minutos, dando la vuelta a mitad de cocción, hasta que se oscurezcan los bordes.',
'Deja enfriar por completo antes de guardar. Reparte en 4 raciones.']],
['Láminas de tempeh con miso y hoisin','Láminas de tempeh sabrosas para desayunos y bocadillos.',[
'Cuece el tempeh al vapor durante 8 minutos para suavizar el amargor y deja enfriar lo suficiente para manipularlo.',
'Corta en tiras finas.',
'Marinada en Thermomix: mezcla los demás ingredientes 15 s/velocidad 4. Cubre el tempeh y deja reposar 10 minutos.',
'Cocina en la freidora de aire a 190°C durante 10–12 minutos, dando la vuelta una vez, hasta que se dore.',
'Deja enfriar y reparte en 4 raciones.']],
['Avena horneada estilo tarta de zanahoria','Avena esponjosa de zanahoria con proteínas y una cobertura cremosa.',[
'En Thermomix: pica la zanahoria 4 s/velocidad 5. Añade la avena y tritura 10 s/velocidad 8 si quieres una textura de bizcocho.',
'Mezcla la avena, la zanahoria, el huevo, la proteína en polvo, 40 g de skyr, la leche, la levadura química y las especias.',
'Vierte en un recipiente resistente al calor engrasado. Cocina en la freidora de aire a 170°C durante 13–16 minutos, hasta que el centro esté justo cuajado.',
'Deja reposar 3 minutos. Añade el resto del skyr y las nueces opcionales.']],
['Helado proteico de plátano y frutos rojos','Helado cremoso de plátano y frutos rojos congelados con proteínas.',[
'Thermomix: pica la fruta congelada 10 s/velocidad 8 y baja los restos de las paredes.',
'Añade la proteína en polvo y la leche; tritura 40 s/velocidad 6, ayudándote con la espátula por la tapa si hace falta.',
'Añade el skyr y mezcla 15 s/velocidad 5.',
'Sirve enseguida para una textura cremosa o congela 20–30 minutos para un helado más firme.']],
['Cuenco proteico estilo brownie','Crema espesa de chocolate y proteínas con textura de masa de brownie.',[
'Mezcla el skyr, la proteína en polvo, el cacao y la sal hasta obtener una crema muy espesa.',
'Añade leche poco a poco, 1 cdta. cada vez, hasta que quede brillante y se pueda comer con cuchara.',
'Endulza al gusto e incorpora la crema de cacahuete formando remolinos.',
'Deja reposar 3–5 minutos para que la proteína en polvo se hidrate y espese la mezcla.']],
['Magdalenas proteicas de plátano','Magdalenas suaves de plátano y avena para preparar con antelación.',[
'Thermomix: mezcla plátano, huevos, yogur y leche 15 s/velocidad 5. Añade los ingredientes secos y mezcla 12 s/velocidad 4. También puedes batir a mano.',
'Reparte la masa entre 6 moldes para magdalenas.',
'Horno: 180°C durante 18–22 minutos. Freidora de aire: 160°C durante 12–15 minutos en moldes de silicona resistentes al calor.',
'Deja enfriar al menos 10 minutos antes de desmoldar.']],
['Barritas proteicas de plátano y anacardos estilo cheesecake','Barritas de avena, dátiles y anacardos con cobertura proteica de yogur.',[
'Tritura la avena en Thermomix 10 s/velocidad 9.',
'Añade 45 g de proteína en polvo, dátiles, plátano, crema de anacardos y sal; tritura 20 s/velocidad 6, baja los restos y tritura otros 10 s/velocidad 6.',
'Presiona bien la mezcla en un recipiente pequeño forrado.',
'Mezcla el yogur, el resto de la proteína en polvo y la vainilla 15 s/velocidad 4 y extiende sobre la base.',
'Enfría al menos 2 horas y corta en 8 barritas.']],
['Mousse proteica de caqui','Mousse espesa de caqui y vainilla con proteínas.',[
'Retira el tallo del caqui y las semillas que tenga.',
'Thermomix: tritura todos los ingredientes 30 s/velocidad 8, baja los restos y tritura otros 15 s/velocidad 8. En batidora: tritura hasta que quede completamente liso.',
'Enfría 20–30 minutos si prefieres una mousse más firme.']],
['Cuenco de yogur HiPro estilo cheesecake','Yogur proteico muy espeso con sabor a tarta de queso.',[
'Mezcla el yogur, la proteína en polvo, la vainilla, el edulcorante y la sal hasta que quede liso.',
'Añade la chía y deja reposar 5 minutos para que espese.',
'Termina con frutos rojos y galletas trituradas o avena.']],
['Pudin caliente de chía en cinco minutos','Pudin rápido de chía al microondas con yogur y fruta.',[
'Mezcla la chía y el agua en un cuenco grande apto para microondas.',
'Calienta 45 segundos, remueve bien y deja reposar 1 minuto.',
'Calienta otros 30–45 segundos y remueve de nuevo. Deja reposar 2 minutos para que espese.',
'Después de calentarlo, incorpora el yogur y termina con fruta, edulcorante y especias.']],
['Sopa de calabaza y cacahuete de inspiración tailandesa','Sopa cremosa de calabaza con cacahuete, jengibre y lima.',[
'Thermomix: pica el ajo y el jengibre 5 s/velocidad 7. Añade la calabaza, la zanahoria, las lentejas y el caldo.',
'Cocina 20 min/100°C/velocidad 1.',
'Añade la crema de cacahuete, la leche y la salsa de soja; tritura 1 min aumentando poco a poco la velocidad de 5–9.',
'Añade el zumo de lima y mezcla 10 s/velocidad 4. Ajusta el espesor con agua caliente.',
'En fogones: cuece a fuego suave la calabaza, la zanahoria y las lentejas 20–25 minutos; tritura e incorpora los demás ingredientes.']],
['Pasta cremosa de calabaza','Pasta cremosa de calabaza y parmesano con queso cottage.',[
'Cuece la pasta y reserva 100 ml de agua de cocción.',
'Thermomix: añade calabaza, queso cottage, caldo o leche, parmesano, ajo y nuez moscada; tritura 45 s/velocidad 8.',
'Calienta 4 min/90°C/velocidad 2.',
'Mezcla la salsa con la pasta y añade el agua de cocción necesaria para que quede cremosa. Sazona y añade salvia si la usas.']],
['Guiso de lentejas con chorizo','Lentejas reconfortantes al estilo español, con el toque de Anna.',[
'Thermomix: pica cebolla, zanahoria, pimiento y ajo 5 s/velocidad 5. Añade el aceite y sofríe 5 min/120°C/giro inverso/velocidad cuchara.',
'Añade tomate, caldo, pimentón y chorizo; cocina 10 min/100°C/giro inverso/velocidad cuchara.',
'Añade las lentejas y las tiras Vivera spekjes; cocina 7 min/100°C/giro inverso/velocidad cuchara, sin cubilete.',
'En fogones: sofríe las verduras en aceite, añade tomate, caldo y chorizo y cuece 10 minutos; incorpora las lentejas y las tiras spekjes y cocina 7–8 minutos.',
'Ajusta el espesor con agua y sazona.']],
['Macarrones con queso y trufa en una olla','Macarrones cremosos con trufa, carne vegetal picada, Dijon y queso de cabra.',[
'Dora Vivera y las verduras en una olla antiadherente 5–6 minutos.',
'Añade los macarrones y 300 ml de agua o caldo. Cuece sin tapar, removiendo a menudo, hasta que la pasta esté tierna; añade más agua si hace falta.',
'Baja el fuego e incorpora Dijon, queso de cabra y parmesano hasta que quede cremoso.',
'Retira del fuego e incorpora la mayonesa de trufa. Añade pimienta negra y un poco de agua si queda muy espeso.']],
['Tortitas proteicas de plátano y avena','Tortitas esponjosas de plátano y avena con proteína en polvo y chía.',[
'Thermomix: tritura la avena 10 s/velocidad 9. Añade los demás ingredientes y mezcla 20 s/velocidad 5.',
'Deja reposar la masa 5 minutos; la proteína de guisante y la chía la espesarán. Añade 1–2 cucharadas de agua si queda demasiado espesa.',
'Calienta una sartén antiadherente a fuego medio-bajo. Forma 4–5 tortitas pequeñas.',
'Cocina 2–3 minutos, hasta que salgan burbujas y los bordes cuajen; da la vuelta y cocina 1–2 minutos más.']],
['Cuenco de patatas, halloumi y shawarma','Patatas crujientes con halloumi, shawarma vegetal y salsa de yogur con parmesano.',[
'Precalienta la freidora de aire a 195°C. Mezcla las patatas con aceite y condimentos y cocina 12 minutos.',
'Añade las verduras y cocina 5 minutos.',
'Añade Vivera y halloumi y cocina otros 6–8 minutos, agitando a mitad de cocción.',
'Mezcla el yogur, el parmesano, el limón y el ajo en polvo.',
'Monta el cuenco y añade la salsa.']],
['Pasta con kimchi y queso','Pasta cremosa con kimchi y carne picada rica en proteínas.',[
'Cuece la pasta y reserva agua de cocción.',
'Dora la carne picada en aceite 4–5 minutos. Añade las verduras y cocina hasta que se ablanden.',
'Añade el kimchi y cocina 1 minuto.',
'Baja el fuego y añade la pasta, mozzarella, parmesano y 50 ml de agua de cocción. Mezcla hasta que quede brillante y cremosa.',
'Añade más agua de cocción si hace falta y sirve enseguida.']],
['Ensalada de lentejas y shawarma Vivera','Ensalada templada de lentejas y shawarma con aliño de yogur y tahini.',[
'Cocina Vivera en la freidora de aire a 190°C durante 6–8 minutos o dóralo en una sartén.',
'Calienta brevemente las lentejas o déjalas frías.',
'Bate el quark, el tahini, el limón, la sal y 1–2 cucharadas de agua para hacer el aliño.',
'Mezcla las lentejas y las verduras y añade el shawarma y el aliño.']],
['Gyozas al horno con verduras y salsa cremosa','Gyozas con verduras al horno en una salsa cremosa.',[
'Calienta el horno a 200°C. Para la freidora de aire, usa una fuente resistente al calor a 180°C.',
'Coloca las gyozas y las verduras en una fuente pequeña.',
'Bate la nata, la salsa de soja, el miso y el agua y vierte por encima.',
'Cubre con queso. Hornea 20–25 minutos o cocina 15–18 minutos en la freidora de aire, hasta que burbujee y las gyozas estén hechas.',
'Termina con cebolleta.']],
['Magdalenas proteicas de yogur y vainilla','Magdalenas suaves con yogur de vainilla, harina integral y proteína en polvo.',[
'Thermomix: mezcla los ingredientes húmedos 15 s/velocidad 4. Añade los secos y mezcla 12 s/velocidad 4. También puedes batir a mano.',
'Reparte en 6 moldes para magdalenas.',
'Hornea a 180°C durante 18–20 minutos o cocina en la freidora de aire a 160°C durante 12–14 minutos.',
'Deja enfriar antes de guardar.']],
['Avena proteica rápida para antes del gimnasio','Avena al microondas con chía y proteína en polvo.',[
'Mezcla la avena, la chía, la sal y el líquido en un cuenco grande apto para microondas.',
'Calienta 90 segundos, remueve y calienta otros 30–60 segundos.',
'Deja reposar 1 minuto.',
'Incorpora la proteína en polvo y añade un poco más de líquido hasta que quede cremoso. Añade el coco si lo usas.']],
['Ensalada crujiente de pepino y atún','Ensalada fría de atún, pepino, edamame, sésamo y tahini.',[
'Corta el pepino y el aguacate en dados y la cebolleta en rodajas.',
'Bate el tahini, la salsa de soja, el vinagre o lima y el agua hasta obtener un aliño cremoso.',
'Mezcla el pepino, el edamame y el arroz o quinoa.',
'Añade el atún desmenuzado, el aguacate, el aliño, el sésamo y la cebolleta.']],
['Burrata con tomate, pesto y atún','Tomates con burrata cremosa, atún, pesto y pan tostado.',[
'Tuesta el pan o cocínalo en la freidora de aire a 180°C durante 4–5 minutos, hasta que esté crujiente.',
'Corta los tomates y colócalos con la rúcula o albahaca.',
'Desmenuza el atún sobre los tomates y añade la burrata en trozos.',
'Añade pesto, vinagre balsámico y pimienta negra. Sirve con el pan tostado.']],
['Sopa de abadejo y patata','Sopa ligera y cremosa de abadejo con patata, puerro, guisantes y eneldo.',[
'Thermomix: pica el puerro y la zanahoria 5 s/velocidad 5. Añade el aceite y sofríe 4 min/120°C/giro inverso/velocidad cuchara.',
'Añade la patata y el caldo; cocina 14 min/100°C/giro inverso/velocidad cuchara.',
'Añade los guisantes y el pescado; cocina 6 min/90°C/giro inverso/velocidad cuchara.',
'Añade la leche, el eneldo, el limón y la pimienta; calienta 2 min/80°C/giro inverso/velocidad cuchara.',
'En fogones: sigue el mismo orden y cocina a fuego suave para que el pescado no se deshaga.']],
['Sopa de fideos con miso y tofu','Fideos en caldo de miso con tofu, edamame, champiñones y verduras de hoja.',[
'Thermomix: pica el jengibre 5 s/velocidad 7. Añade el caldo y los champiñones; cocina 7 min/100°C/giro inverso/velocidad cuchara.',
'Añade los fideos, el tofu y el edamame; cocina el tiempo indicado en el paquete de fideos a 100°C/giro inverso/velocidad cuchara.',
'Añade las verduras de hoja en los últimos 1–2 minutos.',
'Deja enfriar hasta unos 80–90°C. Disuelve el miso con un poco de caldo en una taza e incorpóralo de nuevo junto con la salsa de soja y el aceite de sésamo.',
'Termina con cebolleta. En fogones: sigue el mismo orden en un cazo.']],
['Berenjena rellena','Berenjena asada rellena de carne vegetal Vivera, tomate, feta y parmesano.',[
'Corta la berenjena por la mitad y marca la pulpa. Pincela con aceite y cocina en la freidora de aire a 190°C durante 12 minutos, con el corte hacia arriba.',
'Retira parte de la pulpa, dejando una pared de 1 cm, y pícala.',
'Cocina Vivera, cebolla y calabacín en una sartén 5–6 minutos. Añade la pulpa de berenjena, la salsa de tomate y las hierbas; cocina 3 minutos.',
'Rellena las berenjenas y añade feta desmenuzado y parmesano.',
'Cocina en la freidora de aire a 190°C durante 7–9 minutos, hasta que se doren.']],
['Cuenco de arroz y verduras con salsa satay','Arroz, verduras y proteína con salsa satay de cacahuete y lima.',[
'Cuece el arroz.',
'En la freidora de aire: mezcla el tofu o pollo y las verduras con aceite y condimentos y cocina a 195°C durante 10–14 minutos; comprueba que el pollo esté completamente hecho.',
'Salsa en Thermomix: añade crema de cacahuete, soja, lima, miel, ajo, jengibre y agua; mezcla 20 s/velocidad 5 y calienta 2 min/70°C/velocidad 2. También puedes batir a mano.',
'Sirve el arroz con las verduras y la proteína y añade la salsa satay.']],
['Rollitos frescos con salsa de cacahuete','Rollitos de papel de arroz con fideos finos, verduras y proteína.',[
'Cuece los fideos según el paquete, aclara con agua fría y escurre bien.',
'Cocina los langostinos o el tofu y deja templar.',
'Corta las verduras en tiras finas.',
'Bate la crema de cacahuete, la salsa de soja, la lima y el agua para hacer la salsa.',
'Sumerge una oblea de arroz en agua templada 5–10 segundos. Rellena con fideos, proteína, verduras y hierbas, dobla los laterales hacia dentro y enrolla bien.',
'Repite y sirve enseguida con la salsa de cacahuete.']],
['Hamburguesa clásica con queso','Hamburguesa con queso, pepinillos, salsa y patatas gajo crujientes.',[
'Precalienta la freidora de aire a 195°C. Mezcla las patatas gajo con aceite y sal y cocina 15–18 minutos, agitando dos veces.',
'Sazona la hamburguesa y cocina en una sartén caliente 3–4 minutos por lado o hasta el punto deseado. Añade el queso durante el último minuto.',
'Mezcla la mayonesa, el kétchup y la mostaza.',
'Tuesta el pan en la sartén durante 1 minuto, con la parte cortada hacia abajo.',
'Monta la hamburguesa con pan, salsa, lechuga, tomate, carne, pepinillos y cebolla. Sirve con las patatas gajo.']],
['Lasaña rica en proteínas','Lasaña de ragú, pasta, bechamel y queso para preparar con antelación.',[
'Thermomix: pica cebolla, zanahoria y calabacín 5 s/velocidad 5. Sofríe con aceite 5 min/120°C/giro inverso/velocidad cuchara. Añade la carne picada y cocina 7 min/120°C/giro inverso/velocidad cuchara. Añade passata y hierbas y cocina 12 min/100°C/giro inverso/velocidad cuchara. También puedes hacer el ragú en una sartén.',
'Bechamel en Thermomix: añade leche, harina, mantequilla, sal y pimienta; cocina 7 min/90°C/velocidad 4.',
'Calienta el horno a 190°C.',
'Alterna capas de ragú, láminas de lasaña y bechamel en una fuente mediana hasta acabar los ingredientes.',
'Termina con mozzarella y parmesano. Hornea 35–40 minutos, hasta que burbujee y se dore.',
'Deja reposar 10 minutos y corta en 4 raciones.']],
['Barritas proteicas estilo Snickers','Barritas de cacahuete y caramelo con proteínas, chocolate y sal en escamas.',[
'Base en Thermomix: mezcla harina de avena, 70 g de proteína en polvo, vainilla y 45 ml de leche 20 s/velocidad 4. Presiona en un molde alargado forrado.',
'Añade dátiles, crema de cacahuete y 25 ml de leche; tritura 25 s/velocidad 7, baja los restos y tritura otros 10 s/velocidad 7. Extiende sobre la base.',
'Presiona los cacahuetes picados sobre el caramelo.',
'Funde el chocolate en el microondas en tandas de 20 segundos o en Thermomix 3 min/50°C/velocidad 2. Extiende una capa fina por encima y añade sal en escamas.',
'Enfría 1–2 horas y corta en 6 barritas.']],
['Pita rellena rica en proteínas','Pita caliente con proteína, ensalada crujiente, feta y salsa de yogur y tahini.',[
'Cocina el pollo o Vivera en la freidora de aire a 190°C hasta que se dore y esté hecho; el pollo suele necesitar 10–12 minutos y Vivera 6–8.',
'Mezcla el yogur, tahini, ajo rallado, limón y un poco de agua.',
'Calienta la pita en la freidora de aire a 160°C durante 2 minutos.',
'Rellena con ensalada, proteína, feta y salsa.']],
['Salmón con coles de Bruselas y patatas','Salmón asado con coles de Bruselas crujientes, patatas y yogur de limón y Dijon.',[
'Precalienta la freidora de aire a 195°C. Mezcla patatas y coles de Bruselas con aceite y condimentos y cocina 12 minutos, agitando una vez.',
'Aparta las verduras y añade el salmón sazonado. Cocina otros 8–10 minutos, según su grosor.',
'Mezcla el yogur, Dijon, zumo de limón y una pizca de ajo en polvo.',
'Sirve el salmón con las verduras crujientes y la salsa.']],
['Judías verdes con tomate','Judías verdes guisadas con tomate, cebolla y ajo al estilo español.',[
'Thermomix: pica cebolla y ajo 5 s/velocidad 5. Añade aceite y sofríe 5 min/120°C/velocidad 1.',
'Añade tomate, pimentón, sal y pimienta; cocina 8 min/100°C/velocidad 1.',
'Añade las judías verdes y el agua; cocina 20–25 min/100°C/giro inverso/velocidad cuchara. Si queda demasiado líquido, retira el cubilete en los últimos 8 minutos.',
'En fogones: sofríe cebolla y ajo, añade el tomate y cocina 8 minutos; incorpora las judías y el agua, tapa y cuece a fuego suave hasta que estén tiernas.',
'Reparte en 4 raciones.']],
['Ñoquis cremosos con salmón','Ñoquis y salmón con una salsa cremosa de limón y parmesano.',[
'Hierve los ñoquis hasta que floten; reserva 80 ml de agua de cocción y escurre.',
'Cocina el salmón en una sartén a fuego medio hasta que esté justo hecho, retira y separa en trozos grandes.',
'En la misma sartén, cocina el ajo 30 segundos y añade los guisantes y las espinacas hasta que estas se ablanden.',
'Baja el fuego e incorpora nata, parmesano, ralladura de limón y 30 ml de agua de cocción.',
'Añade los ñoquis y el salmón, mezcla suavemente 1–2 minutos y aligera con más agua si hace falta.',
'Termina con zumo de limón, eneldo y pimienta negra.']],
['Ramen de miso con tofu y huevo','Ramen reconfortante de miso con tofu, huevo, champiñones y verduras de hoja.',[
'Saltea los champiñones, el ajo y el jengibre hasta que desprendan su aroma.',
'Añade caldo, miso y salsa de soja y lleva a un hervor suave.',
'Añade tofu, pak choi y fideos y cocina hasta que estén tiernos.',
'Incorpora la crema de cacahuete al caldo hasta que quede cremoso.',
'Termina con un huevo pasado por agua.']],
['Risotto de kimchi y edamame','Risotto cremoso con kimchi y parmesano.',[
'Sofríe la cebolla y el ajo hasta que estén blandos.',
'Añade el arroz y tuesta 1–2 minutos.',
'Incorpora poco a poco el caldo caliente mientras remueves.',
'Añade el kimchi y el edamame durante los últimos 5 minutos.',
'Termina con parmesano, aceite de sésamo y salsa de soja.']],
['Ensalada de garbanzos con feta y atún','Ensalada fresca de garbanzos al limón con atún, feta y verduras crujientes.',[
'Pica las verduras y ponlas en un cuenco.',
'Añade los garbanzos, el atún y el feta desmenuzado.',
'Aliña con aceite de oliva, limón, perejil, sal y pimienta.',
'Mezcla todo y sirve.']],
['Albóndigas con arroz y tomate','Albóndigas jugosas con arroz y una salsa de tomate con ajo.',[
'Cuece el arroz según las instrucciones del paquete.',
'Cocina las albóndigas hasta que se doren y estén completamente hechas.',
'Sofríe cebolla, ajo y calabacín en aceite de oliva.',
'Añade passata y hierbas y cocina a fuego suave 10 minutos.',
'Añade las albóndigas a la salsa y sirve con arroz.']],
['Carbonara de trufa con spekjes','Carbonara de trufa con tiras de beicon ahumado, huevo y parmesano.',[
'Cuece la pasta al dente y reserva abundante agua de cocción.',
'Dora las tiras spekjes en una sartén hasta que estén crujientes.',
'Bate el huevo, el parmesano, la pasta de trufa y la pimienta negra.',
'Retira la sartén del fuego y añade la pasta.',
'Incorpora la mezcla de huevo y añade agua de cocción poco a poco hasta que quede brillante y cremosa.',
'Termina con las tiras spekjes crujientes y más pimienta negra.']],
['Berenjena con garbanzos y tomate','Berenjena tierna, garbanzos y carne picada rica en proteínas en salsa de tomate ahumado.',[
'Corta la berenjena en dados y cocina hasta que esté dorada y tierna.',
'Añade cebolla y ajo y sofríe.',
'Añade la carne vegetal picada y cocina unos minutos.',
'Incorpora garbanzos, passata y especias.',
'Cuece a fuego suave 10–15 minutos, hasta que la salsa esté concentrada y espesa.']],
['Pimientos rellenos','Pimientos asados rellenos de arroz, carne picada rica en proteínas y mozzarella fundida.',[
'Corta los pimientos por la mitad y retira las semillas.',
'Cuece el arroz hasta que esté tierno.',
'Sofríe la cebolla y el ajo y añade la carne picada.',
'Incorpora passata, arroz y condimentos.',
'Rellena los pimientos y cubre con mozzarella.',
'Hornea a 200°C durante 20–25 minutos.']],
['Risotto cremoso de champiñones','Risotto de champiñones y parmesano con edamame para añadir proteínas.',[
'Dora los champiñones y reserva.',
'Sofríe la cebolla y el ajo en aceite de oliva.',
'Añade el arroz y tuesta brevemente.',
'Incorpora poco a poco el caldo mientras remueves.',
'Añade el edamame y los champiñones hacia el final.',
'Termina con parmesano, tomillo y pimienta negra.']],
['Pasta con tahini, garbanzos y gambas','Pasta cremosa de limón y tahini con garbanzos, calabacín y gambas.',[
'Cuece la pasta y reserva un poco de agua de cocción.',
'Cocina las gambas y el calabacín con ajo.',
'Bate tahini, zumo de limón y agua de cocción hasta que quede cremoso.',
'Añade los garbanzos y la pasta a la sartén.',
'Incorpora la salsa de tahini y termina con las gambas.']],
['Cuenco de tofu y garbanzos con miel picante','Tofu y garbanzos crujientes con arroz, verduras y salsa de miel picante.',[
'Cuece el arroz según las instrucciones del paquete.',
'Sazona el tofu y los garbanzos y cocina en la freidora de aire hasta que estén crujientes.',
'Cocina las verduras hasta que estén justo tiernas.',
'Mezcla la miel picante, el aceite de sésamo y la salsa de soja.',
'Monta el cuenco y añade la salsa.']],
['Sándwich de pesto y queso cottage','Pan integral tostado con pesto, queso cottage y mozzarella fundida.',[
'Unta el pesto sobre el pan integral.',
'Añade queso cottage, mozzarella y espinacas.',
'Sazona con pimienta negra.',
'Cierra el sándwich y tuesta hasta que se dore y la mozzarella se funda.']],
['Tortilla de espinacas y feta','Tortilla esponjosa de espinacas y feta con tostadas integrales.',[
'Cocina las espinacas en una sartén hasta que se ablanden.',
'Bate los huevos y las claras con sal y pimienta.',
'Vierte en la sartén y cocina a fuego suave.',
'Añade el feta y dobla la tortilla.',
'Sirve con tostadas integrales.']],
['Mafaldine a la trufa','Mafaldine con trufa, champiñones dorados y parmesano.',[
'Cuece los mafaldine al dente y reserva agua de cocción.',
'Dora los champiñones con aceite de oliva y ajo.',
'Tritura queso cottage, parmesano, pasta de trufa y agua de cocción hasta obtener una salsa lisa.',
'Mezcla los mafaldine con los champiñones y la salsa a fuego bajo.',
'Termina con pimienta negra y más trufa si lo deseas.']],
['Tostadas francesas','Tostadas francesas integrales con canela, yogur cremoso, frutos rojos y crema de cacahuete.',[
'Bate el huevo, las claras, la leche, la canela y la vainilla.',
'Empapa el pan integral en la mezcla.',
'Cocina en una sartén antiadherente hasta que se dore por ambos lados.',
'Añade yogur, frutos rojos y crema de cacahuete.',
'Añade sirope de arce o edulcorante si lo deseas.']],
['Cuenco estilo hamburguesa','Patatas crujientes, carne picada rica en proteínas, aguacate, queso fundido y salsa de hamburguesa.',[
'Corta las patatas en dados, sazona y cocina en la freidora de aire hasta que estén crujientes.',
'Cocina la carne picada con ajo en polvo, sal y pimienta.',
'Funde el queso sobre la carne caliente.',
'Añade lechuga, pepinillos, cebolla y aguacate a un cuenco.',
'Termina con patatas crujientes, carne con queso y salsa de hamburguesa.']],
['Brownies de boniato y tahini','Brownies jugosos de chocolate y boniato con tahini.',[
'Precalienta el horno a 180°C.',
'Tritura el boniato, el tahini, el huevo y la leche hasta que quede liso.',
'Incorpora harina de avena, proteína en polvo, cacao, levadura química y edulcorante.',
'Añade el chocolate negro picado.',
'Hornea durante 20–25 minutos.',
'Deja enfriar por completo antes de cortar en 4 porciones.']],
['Cuenco de batido de mango y frutos rojos','Batido espeso de mango y frutos rojos con avena, chía y crema de cacahuete.',[
'Tritura mango, frutos rojos, yogur y proteína en polvo.',
'Añade solo el líquido necesario para triturar manteniendo una textura espesa.',
'Pasa a un cuenco.',
'Termina con avena, chía y crema de cacahuete.']],
['Tacos ricos en proteínas','Tacos con tortillas proteicas, carne picada sazonada, aguacate, maíz y salsa cremosa de lima.',[
'Cocina la carne picada con pimentón, comino y ajo en polvo.',
'Calienta las tortillas en una sartén sin aceite.',
'Mezcla el yogur con zumo de lima y sal.',
'Rellena las tortillas con lechuga, carne picada, maíz, aguacate y queso.',
'Añade la salsa de yogur y lima.']],
['Tortilla de patatas','Tortilla española clásica con patatas tiernas, cebolla y abundante huevo.',[
'Corta las patatas y la cebolla en rodajas finas.',
'Cuece las patatas en el microondas hasta que estén casi tiernas.',
'Cocina la cebolla y las patatas a fuego suave en aceite de oliva hasta que estén tiernas y ligeramente doradas.',
'Bate los huevos y las claras con sal.',
'Mezcla con las patatas.',
'Cocina a fuego medio-bajo hasta que esté casi cuajada.',
'Da la vuelta con cuidado y cocina el otro lado hasta que se dore.']]
];
const words={
'Korean beef':'Ternera coreana','Fried rice':'Arroz frito','Optional spicy drizzle':'Salsa picante opcional','Garnish':'Para terminar','Peanut caramel':'Caramelo de cacahuete','Caramel':'Caramelo','Topping':'Cobertura',
'extra-lean beef mince':'carne picada de ternera extramagra','93% lean or leaner':'93% magra o más','low-sodium soy sauce':'salsa de soja baja en sal','light soy sauce':'salsa de soja clara','dark soy sauce':'salsa de soja oscura','soy sauce':'salsa de soja','fresh grated ginger':'jengibre fresco rallado','grated ginger':'jengibre rallado','garlic cloves, minced':'dientes de ajo picados','garlic cloves':'dientes de ajo','small garlic clove':'diente de ajo pequeño','garlic clove':'diente de ajo','garlic powder':'ajo en polvo','black pepper':'pimienta negra','olive oil':'aceite de oliva','sesame or olive oil':'aceite de sésamo o de oliva','sesame oil or olive oil':'aceite de sésamo o de oliva','sesame oil':'aceite de sésamo','rice vinegar or lime juice':'vinagre de arroz o zumo de lima','rice vinegar':'vinagre de arroz','brown sugar':'azúcar moreno','cooked jasmine or basmati rice':'arroz jazmín o basmati cocido','preferably chilled overnight':'preferiblemente enfriado toda la noche','small onion, finely diced':'cebolla pequeña en dados finos','shredded carrots':'zanahoria rallada','chopped spring onions':'cebolletas picadas','spring onions, thinly sliced':'cebolletas en rodajas finas','spring onion':'cebolleta','lightly beaten':'ligeramente batidos','light mayonnaise':'mayonesa ligera','water, if needed to thin':'agua, si hace falta para aligerar','toasted sesame seeds':'semillas de sésamo tostadas','sesame seeds':'semillas de sésamo','extra-firm tofu':'tofu extrafirme','cornstarch (cornflour)':'maicena','cornstarch':'maicena','light grated cheddar':'cheddar ligero rallado','low-fat cottage cheese, blended':'queso cottage bajo en grasa, triturado','low-fat cottage cheese':'queso cottage bajo en grasa','cottage cheese':'queso cottage','light cream cheese':'queso crema ligero','half-fat crème fraîche':'crème fraîche semidesnatada','sun-dried tomatoes, drained':'tomates secos escurridos','sun-dried tomatoes':'tomates secos','cherry tomatoes':'tomates cherry','red onion':'cebolla morada','tomato purée':'concentrado de tomate','balsamic vinegar':'vinagre balsámico','vegetable stock':'caldo de verduras','butter beans, drained':'alubias grandes escurridas','dry lasagne sheets':'láminas de lasaña secas','dry lasagna sheets':'láminas de lasaña secas','roasted hazelnuts, ground':'avellanas tostadas molidas','chopped hazelnuts':'avellanas picadas','hazelnut butter':'crema de avellanas','oat flour':'harina de avena','maple syrup or sweetener to taste':'sirope de arce o edulcorante al gusto','maple syrup':'sirope de arce','pitted dates':'dátiles sin hueso','powdered peanut butter':'cacahuete en polvo','peanut butter':'crema de cacahuete','ground almonds':'almendra molida','dark chocolate':'chocolate negro','flaky salt':'sal en escamas','dry pea pasta':'pasta de guisantes seca','dry lentil pasta':'pasta de lentejas seca','dry whole-grain rice':'arroz integral seco','dry quinoa':'quinoa seca','dry rice':'arroz seco','dry orzo':'orzo seco','dry pasta':'pasta seca','dry macaroni':'macarrones secos','skyr or thick high-protein yogurt':'skyr o yogur espeso rico en proteínas','skyr or high-protein yogurt':'skyr o yogur rico en proteínas','skyr or thick yogurt':'skyr o yogur espeso','skyr or yogurt':'skyr o yogur','Greek yogurt or skyr':'yogur griego o skyr','soy yogurt or skyr':'yogur de soja o skyr','skyr or soy yogurt':'skyr o yogur de soja','HiPro or high-protein yogurt':'HiPro o yogur rico en proteínas','high-protein yogurt':'yogur rico en proteínas','magere kwark/skyr':'quark desnatado/skyr','Alpro vanilla yogurt':'yogur Alpro de vainilla','vanilla protein powder':'proteína en polvo de vainilla','chocolate protein powder':'proteína en polvo de chocolate','protein powder for frosting':'proteína en polvo para la cobertura','protein powder':'proteína en polvo','truffle paste':'pasta de trufa','truffle oil':'aceite de trufa','truffle mayo':'mayonesa de trufa','parmesan, finely grated':'parmesano rallado fino','parmesan':'parmesano','pasta water':'agua de cocción de la pasta','firm tofu, pressed and cubed':'tofu firme prensado y en dados','firm tofu, cubed':'tofu firme en dados','firm tofu':'tofu firme','smoked or firm tofu':'tofu ahumado o firme','sweet potato, 2 cm cubes':'boniato en dados de 2 cm','cooked sweet potato':'boniato cocido','sweet potato':'boniato','bell pepper':'pimiento','shelled edamame':'edamame desgranado','halloumi, sliced':'halloumi en lonchas','corn or black beans':'maíz o alubias negras','shredded lettuce/cabbage and tomato':'lechuga o col rallada y tomate','taco seasoning':'sazonador para tacos','crushed tortilla chips':'totopos troceados','chicken breast or equivalent plant-based protein':'pechuga de pollo o equivalente de proteína vegetal','chicken breast, cubed':'pechuga de pollo en dados','chicken breast':'pechuga de pollo','lemon, zest and juice':'limón, ralladura y zumo','leafy greens':'verduras de hoja','chickpeas, drained':'garbanzos escurridos','chickpeas':'garbanzos','smoked paprika':'pimentón ahumado','sweet or smoked paprika':'pimentón dulce o ahumado','Italian herbs':'hierbas italianas','broccoli or mixed vegetables':'brócoli o verduras variadas','mixed vegetables':'verduras variadas','Vivera gyros/shawarma or lean gyros meat':'gyros/shawarma Vivera o carne magra estilo gyros','Vivera mince or spekjes':'carne vegetal picada Vivera o tiras spekjes','lean beef or plant mince':'carne picada de ternera magra o vegetal','lean beef mince or Vivera mince':'carne picada de ternera magra o Vivera','plant mince':'carne vegetal picada','vegan mince':'carne vegetal picada','Vivera mince':'carne vegetal picada Vivera','gyros seasoning':'sazonador para gyros','large zucchini, about 300 g':'calabacín grande, unos 300 g','medium aubergine, about 300 g':'berenjena mediana, unos 300 g','Dijon mustard':'mostaza de Dijon','white miso':'miso blanco','finely grated carrot':'zanahoria rallada fina','baking powder':'levadura química','walnuts or 15g nut butter for topping':'nueces o 15g de crema de frutos secos para decorar','frozen banana':'plátano congelado','frozen berries':'frutos rojos congelados','frozen mango':'mango congelado','cold water, as needed for blending':'agua fría, la necesaria para triturar','skyr optional for extra creaminess and post-gym protein boost':'skyr opcional para más cremosidad y proteínas después del gimnasio','cocoa powder':'cacao en polvo','ripe banana':'plátano maduro','cashew butter':'crema de anacardos','very ripe persimmon, about 180 g flesh':'caqui muy maduro, unos 180 g de pulpa','chia seeds':'semillas de chía','crushed biscuits or oats':'galletas trituradas o avena','red lentils, rinsed':'lentejas rojas enjuagadas','cooked lentils':'lentejas cocidas','canned lentils, drained':'lentejas en conserva escurridas','light coconut milk or soy milk':'leche de coco ligera o leche de soja','cooked pumpkin':'calabaza cocida','chorizo, diced':'chorizo en dados','chopped tomatoes':'tomate troceado','goat cheese':'queso de cabra','semi-skimmed milk':'leche semidesnatada','vegetable or chicken gyoza, about 200 g':'gyozas de verduras o pollo, unos 200 g','light cooking cream or soy cuisine':'nata ligera para cocinar o crema de soja','grated cheese':'queso rallado','whole-wheat flour':'harina integral de trigo','banana or applesauce':'plátano o compota de manzana','coconut flakes':'coco rallado','tuna, drained':'atún escurrido','cooked rice or quinoa':'arroz o quinoa cocidos','sourdough or crusty bread':'pan de masa madre o de corteza crujiente','koolvis/pollock, cubed':'abadejo en dados','potato, 2 cm cubes':'patata en dados de 2 cm','fish or vegetable stock':'caldo de pescado o verduras','dry noodles':'fideos secos','pak choi/spinach':'pak choi/espinacas','tomato sauce':'salsa de tomate','tofu or 120 g chicken':'tofu o 120 g de pollo','hot water':'agua caliente','rice-paper sheets':'obleas de papel de arroz','dry rice vermicelli':'fideos finos de arroz secos','prawns or tofu':'langostinos o tofu','fresh mint/coriander':'menta o cilantro frescos','burger bun, about 70 g':'pan de hamburguesa, unos 70 g','lean beef patty':'hamburguesa de ternera magra','lean meatballs':'albóndigas magras','cheese slice':'loncha de queso','potatoes, cut into wedges':'patatas cortadas en gajos','light mayo':'mayonesa ligera','soft dates':'dátiles blandos','roasted peanuts, chopped':'cacahuetes tostados picados','milk, divided':'leche, repartida','pita, about 65 g':'pita, unos 65 g','chicken or Vivera shawarma':'pollo o shawarma Vivera','salmon fillet':'filete de salmón','Brussels sprouts, halved':'coles de Bruselas por la mitad','hoisin sauce':'salsa hoisin','green beans, trimmed':'judías verdes limpias','crushed tomatoes/passata':'tomate triturado/passata','fresh gnocchi':'ñoquis frescos','cooking cream':'nata para cocinar','ramen noodles':'fideos ramen','miso paste':'pasta de miso','risotto rice':'arroz para risotto','roasted pepper':'pimiento asado','Juice of':'Zumo de','Reserved pasta water':'Agua de cocción de la pasta reservada','light mozzarella':'mozzarella ligera','large slices whole-wheat bread':'rebanadas grandes de pan integral','slices whole-wheat bread':'rebanadas de pan integral','whole-wheat bread':'pan integral','handful of spinach':'puñado de espinacas','egg whites':'claras de huevo','light cheese':'queso ligero','burger sauce':'salsa de hamburguesa','hot honey':'miel picante','high-protein wraps':'tortillas ricas en proteínas',
'courgette':'calabacín','zucchini':'calabacín','aubergine':'berenjena','mushrooms':'champiñones','spinach':'espinacas','carrots':'zanahorias','carrot':'zanahoria','potatoes':'patatas','potato':'patata','tomatoes':'tomates','tomato':'tomate','onion':'cebolla','cucumber':'pepino','avocado':'aguacate','lettuce':'lechuga','pickles':'pepinillos','pumpkin':'calabaza','peas':'guisantes','leek':'puerro','shrimp':'gambas','salmon':'salmón','tuna':'atún','chicken':'pollo','corn':'maíz','garlic':'ajo','ginger':'jengibre','lemon juice':'zumo de limón','lime juice':'zumo de lima','lemon':'limón','lime':'lima','parsley':'perejil','dill':'eneldo','basil':'albahaca','thyme':'tomillo','rocket':'rúcula','sage':'salvia','nutmeg':'nuez moscada','cinnamon':'canela','cumin':'comino','paprika':'pimentón','vanilla':'vainilla','sweetener':'edulcorante','salt':'sal','pepper':'pimienta','herbs':'hierbas','cayenne':'cayena','oats':'avena','dates':'dátiles','banana':'plátano','berries':'frutos rojos','honey':'miel','butter':'mantequilla','flour':'harina','milk':'leche','water':'agua','stock':'caldo','yogurt':'yogur','oil':'aceite','eggs':'huevos','egg':'huevo','cheese':'queso','mustard':'mostaza','ketchup':'kétchup','to taste':'al gusto','a pinch of':'una pizca de','pinch of':'pizca de','pinch':'pizca de','optional':'opcional','cubed':'en dados','diced':'en dados','drained':'escurrido','light stock':'caldo ligero','and':'y','or':'o','cups':'tazas','cup':'taza','tbsp':'cda.','tsp':'cdta.'
};
const escaped=Object.keys(words).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
const ingredientPattern=new RegExp('\\b('+escaped.join('|')+')\\b','gi');
const byLower=new Map(Object.entries(words).map(([a,b])=>[a.toLowerCase(),b]));
function ingredient(line){return line.replace(ingredientPattern,match=>byLower.get(match.toLowerCase()));}
window.AnnaI18n.ingredient=line=>window.AnnaI18n.language==='es'?ingredient(line):line;
window.AnnaI18n.registerRecipes(recipes,spanish,ingredient);
// Notes preserve the original source, uncertainty and nutrition qualifications.
const notes={
'Approximate macros per serving.':'Macronutrientes aproximados por ración.',
'Approximate macros per bowl.':'Macronutrientes aproximados por cuenco.',
'Approximate macros per muffin.':'Macronutrientes aproximados por magdalena.',
'Approximate macros per bar.':'Macronutrientes aproximados por barrita.',
'Macros are per 1/4 batch.':'Macronutrientes por 1/4 de la receta.',
'Approximate macros per 1/4 batch.':'Macronutrientes aproximados por 1/4 de la receta.',
'Approximate macros per 1/4 tray.':'Macronutrientes aproximados por 1/4 de la fuente.',
'Approximate macros per serving; makes 2.':'Macronutrientes aproximados por ración; salen 2.',
'Approximate macros per serving; change pasta for lentil pasta for higher protein.':'Macronutrientes aproximados por ración; cambia la pasta por pasta de lentejas para añadir más proteínas.',
'Approximate macros per serving. Add sweetener to taste if desired.':'Macronutrientes aproximados por ración. Añade edulcorante al gusto si lo deseas.',
'Approximate macros per serving. Add tuna for more protein (approx. 20 g per 100 g).':'Macronutrientes aproximados por ración. Añade atún para más proteínas (aprox. 20 g por 100 g).',
'Approximate macros depend on gyoza brand.':'Los macronutrientes aproximados dependen de la marca de gyozas.',
'Approximate macros with water and coconut omitted; milk/toppings increase them.':'Macronutrientes aproximados usando agua y sin coco; la leche y los acompañamientos los aumentan.',
'Approximate macros per serving; tofu/chicken will shift them slightly.':'Macronutrientes aproximados por ración; varían ligeramente si usas tofu o pollo.',
'Approximate macros per serving. Add cheese or nuts  for extra fat':'Macronutrientes aproximados por ración. Añade queso o frutos secos para aumentar las grasas.',
'Lower fat - perfect for post-workout meals. Approximate macros per serving.':'Bajo en grasas, ideal para después de entrenar. Macronutrientes aproximados por ración.',
'Chicken is 43g of protein per serving; plant-based protein may be lower. Approximate macros per serving.':'Con pollo: 43g de proteínas por ración; la alternativa vegetal puede aportar menos. Macronutrientes aproximados por ración.',
'Makes a small serving - pair with extra vegetables for a larger meal. Approximate macros per serving.':'Sale una ración pequeña; acompaña con más verduras para una comida más abundante. Macronutrientes aproximados por ración.',
'Replace for 40-50g of sugar free satésauce for lower calories.':'Sustituye por 40-50g de salsa satay sin azúcar para reducir las calorías.',
'Adjust pasta according to hunger! Perfect for post-workout meals, since it is lower in fat. Add more parmesan to increase the fat content.':'Ajusta la pasta según tu hambre. Ideal para después de entrenar por su menor contenido en grasas. Añade más parmesano si quieres aumentar las grasas.',
'Approximate macros without skyr. Adding 100 g skyr adds approximately 60 kcal (for 345 kcal) and 11 g protein (for 34g protein).':'Macronutrientes aproximados sin skyr. Añadir 100 g de skyr aporta unas 60 kcal (345 kcal en total) y 11 g de proteínas (34g en total).'
};
const firstNotes=[
'Fuente: captura de Success Mealprep. Salen 4 raciones; las cantidades son para la receta completa. Los valores nutricionales por ración son los indicados en la captura, sin cálculo independiente; no está claro si incluyen la salsa opcional. Los 35 minutos son una estimación y suponen que el arroz ya está cocido.',
'Actualizada según tus capturas detalladas de ingredientes y macronutrientes. Salen 2 raciones. Valores aproximados por ración, sin arroz: 300 kcal, 23 g de proteínas, 23 g de hidratos y 14 g de grasas. La captura indica freidora de aire a 190°C durante 15–20 minutos; la preparación de la salsa y los 30 minutos totales son sugeridos. Estas cantidades sustituyen a la versión original con más aceite.',
'Actualizada según tus capturas detalladas de ingredientes y macronutrientes. Salen 2 raciones; valores aproximados por ración: 420 kcal, 27 g de proteínas, 57 g de hidratos y 9 g de grasas. Sustituyen a las estimaciones anteriores. La preparación y los 30 minutos son sugeridos. Para una versión vegetariana, elige un queso tipo parmesano vegetariano.',
'Actualizada según tus capturas detalladas de ingredientes y macronutrientes. Salen 3 raciones, con 400 g de alubias escurridas. Valores aproximados por ración: 435 kcal, 25 g de proteínas, 65 g de hidratos y 8 g de grasas. Sustituyen a las estimaciones anteriores. La preparación y los 35 minutos son sugeridos. La baguette de ajo de la versión original no se incluye en estos ingredientes ni valores nutricionales.',
'Actualizada según tus capturas detalladas de ingredientes y macronutrientes. Salen 12 barritas. Valores aproximados por barrita: 165 kcal, 4 g de proteínas, 18 g de hidratos y 9 g de grasas. Son más finas que las originales y tienen tres capas. La preparación es sugerida; las 2 horas incluyen una estimación del enfriado. Esta versión sustituye al aceite de coco y las cantidades en tazas de la original.',
'Actualizada según tus capturas detalladas de ingredientes y macronutrientes. Salen 12 barritas. Valores aproximados por barrita: 155 kcal, 5 g de proteínas, 19 g de hidratos y 7 g de grasas. La preparación es sugerida; las 2 horas incluyen una estimación del enfriado. La versión revisada usa leche, crema de cacahuete y cacahuete en polvo; no incluye el aceite de coco ni las pepitas de chocolate de la original.'
];
for(let i=0;i<6;i++)notes[recipes[i].note]=firstNotes[i];
Object.assign(window.ANNA_ES_UI,notes);
// Register notes through the public catalog API, without changing source recipes.
window.AnnaI18n.add(notes);
})();
