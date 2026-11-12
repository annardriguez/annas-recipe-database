# Food imagery

All assets are local. The app makes no image API requests at runtime. Images are compressed JPEGs. AI images and category photographs are labelled as serving inspiration in the UI and are replaceable through the recipe editor.

## Built-in imagegen assets

Generated with the built-in `image_gen.imagegen` tool and copied into this project, then encoded as JPEG for the website. No fallback CLI or paid API integration was added to the application.

- `korean-beef-rice.jpg`: Korean Beef Fried Rice hero.
- `honey-chilli-tofu.jpg`: Honey Chilli Crispy Tofu.
- `tomato-orzo.jpg`: Creamy Tomato & Courgette Orzo.
- `pumpkin-soup.jpg`: Thai-ish Pumpkin Peanut Soup and illustrative soup imagery.
- `mushroom-risotto.jpg`: Creamy Mushroom Risotto.
- `caramel-bars.jpg`: Hazelnut Date Caramel Chocolate Bars and illustrative caramel-bar imagery.

Hero prompt:

> Use case: photorealistic-natural. Asset type: full-bleed editorial cookbook website hero photograph, landscape 3:2. Subject: Korean beef fried rice, glossy gochujang minced beef tossed with jasmine rice, tiny diced carrot, scrambled egg, spring onion, sesame seeds, small drizzle of spicy mayonnaise. In a shallow rustic ivory ceramic bowl on warm cream linen with dark brown wooden chopsticks at the right. Composition: overhead, close, bowl fills 85% of image, off-centre slightly right, candid artisanal food magazine photography, real natural textures, delicious and imperfect, warm afternoon window light, subtle shadows, rich terracotta and fresh green accent colours. No text, no graphics, no hands, no watermark. Must look like a photograph of a home-cooked meal.

The remaining five prompts use this exact template, replacing `{subject}` with the corresponding subject below:

> Use case: photorealistic-natural. Asset: editorial cookbook food photograph. {subject} Overhead close composition, landscape 3:2, food fills most frame, warm cream linen tabletop, soft natural afternoon light, appetising real natural texture, independent food magazine art direction, warm ivory, olive and terracotta palette. No text, no watermark, no hands.

| File | Subject text |
| --- | --- |
| honey-chilli-tofu.jpg | Honey chilli crispy tofu: crisp golden extra-firm tofu cubes glazed in glossy red honey-gochujang sauce with sliced spring onions and sesame seeds, shallow olive ceramic plate, no rice. |
| tomato-orzo.jpg | Creamy tomato and courgette orzo: small rice-shaped orzo pasta in creamy warm coral tomato sauce, diced courgettes, basil, grated parmesan, shallow pale ceramic bowl. |
| pumpkin-soup.jpg | Thai pumpkin peanut soup: silky vivid golden orange pumpkin soup in a rustic olive ceramic bowl, small coconut cream swirl, roasted peanuts, coriander leaves, a lime wedge beside it. |
| mushroom-risotto.jpg | Creamy mushroom risotto: arborio rice with golden sautéed brown mushrooms, edamame beans, shaved parmesan and thyme, shallow ivory bowl, flecks of pepper. |
| caramel-bars.jpg | Hazelnut date caramel chocolate bars: rectangular layered bars with an oat biscuit base, thick golden date caramel, thin dark chocolate top with chopped hazelnuts, one bar broken to show layers, butter yellow small plate. |

## Unsplash category photography

Downloaded with `auto=format&fit=crop&w=900&q=80`. These show general serving inspiration, not verified photographs of the exact recipe.

| Local file | Original image |
| --- | --- |
| pasta.jpg | https://images.unsplash.com/photo-1473093295043-cdd812d0e601 |
| salad.jpg | https://images.unsplash.com/photo-1512621776951-a57141f2eefd |
| pancakes.jpg | https://images.unsplash.com/photo-1528207776546-365bb710ee93 |
| bowl.jpg | https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38 |
| chocolate.jpg | https://images.unsplash.com/photo-1606313564200-e75d5e30476c |
| salmon.jpg | https://images.unsplash.com/photo-1467003909585-2f8a72700288 |
| burger.jpg | https://images.unsplash.com/photo-1568901346375-23c9450c58cd |
