/**
 * Menú Oficial Completo La Vid Steak House & Pizza 2025
 * La Fortuna, Costa Rica
 * 100% de Productos Reales Especificados
 */

export const LAVID_CATEGORIES = [
  { id: 'cat-entradas-frias', name: 'Entradas Frías', description: 'Cold Appetizers - Ceviches, carpaccios y ensaladas frescas', order: 1 },
  { id: 'cat-entradas-calientes', name: 'Entradas Calientes', description: 'Hot Appetizers - Sopas, cremas y bocados calientes', order: 2 },
  { id: 'cat-carnes-res', name: 'Carnes Res', description: 'Beef - Cortes premium a la parrilla de leña', order: 3 },
  { id: 'cat-pollo', name: 'Pollo', description: 'Chicken - Pechugas preparadas al grill y rellenas', order: 4 },
  { id: 'cat-carnes-ahumadas', name: 'Carnes Ahumadas', description: 'Smoke Meats - Costillas ahumadas lentamente', order: 5 },
  { id: 'cat-del-mar', name: 'Del Mar', description: 'From the Sea - Pescados frescos y camarones jumbo', order: 6 },
  { id: 'cat-pastas', name: 'Pastas', description: 'Pastas salteadas y marinadas con salsas de la casa', order: 7 },
  { id: 'cat-pizzas', name: 'Pizzas', description: 'Pizzas 100% artesanales en un solo tamaño', order: 8 }
];

export const LAVID_PRODUCTS = [
  // 1. ENTRADAS FRÍAS / COLD APPETIZERS (7 productos)
  {
    id: 'prod-ceviche-tico',
    category_id: 'cat-entradas-frias',
    name: 'Ceviche Tico',
    name_en: 'Tico Ceviche',
    description: 'Receta única de pescado de mar mezclado con chile, cebolla, culantro y aguacate, servido con chips de plátano.',
    description_en: 'Fresh fish, sweet pepper, onion, cilantro and avocado, served with plantain chips.',
    base_price: 5100,
    cabys_code: '6331000000000',
    unit_measure: 'Unid',
    tax_code: '01',
    tax_rate: 13,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-ensalada-caprese',
    category_id: 'cat-entradas-frias',
    name: 'Ensalada Caprese',
    name_en: 'Capresse Salad',
    description: 'Rodajas de tomate fresco, queso mozzarella tierno, pesto y reducción de balsámico.',
    description_en: 'Fresh tomato, mozzarella, pesto and balsamic glaze.',
    base_price: 5950,
    cabys_code: '6331000000000',
    unit_measure: 'Unid',
    tax_code: '01',
    tax_rate: 13,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-carpaccio-res',
    category_id: 'cat-entradas-frias',
    name: 'Carpaccio de Res',
    name_en: 'Beef Carpaccio',
    description: 'Finos cortes de lomito de res con aceite de oliva, cebolla, limón, alcaparras y queso parmesano.',
    description_en: 'Fine cuts of beef tenderloin with olive oil, onion, lemon, capers and parmigiano cheese.',
    base_price: 8100,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-ensalada-thai',
    category_id: 'cat-entradas-frias',
    name: 'Ensalada Thai',
    name_en: 'Thai Salad',
    description: 'Lonjas de lomito sobre una cama de lechuga aderezado con salsa a base de soya y semillas.',
    description_en: 'Slices of tenderloin served on a bed of lettuce, dressed with a soy-based sauce and seeds.',
    base_price: 7900,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-tartar-atun',
    category_id: 'cat-entradas-frias',
    name: 'Tartar de Atún',
    name_en: 'Tuna Tartare',
    description: 'Trozos de atún fresco marinado en salsa Thai mezclado con cebollino, aguacate y mango acompañado con chips de plátano.',
    description_en: 'Fresh tuna chunks marinated in Thai sauce, mixed with chives, avocado and mango, served with plantain chips.',
    base_price: 8400,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-tabule',
    category_id: 'cat-entradas-frias',
    name: 'Tabule',
    name_en: 'Tabboule',
    description: 'Tomate, zanahoria, brócoli, cebolla morada, lechuga, aguacate y quinoa aderezado con cítricos de la casa.',
    description_en: 'Tomato, carrot, broccoli, red onion, lettuce, avocado and quinoa dressed with our house citrus vinaigrette.',
    base_price: 6500,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-ensalada-la-huerta',
    category_id: 'cat-entradas-frias',
    name: 'Ensalada de La Huerta',
    name_en: 'Garden Salad',
    description: 'Lechuga, tomate, aguacate, cebolla morada, aceitunas, queso fresco y aderezo de pesto. Permite proteína adicional (+₡4.200).',
    description_en: 'Lettuce, tomato, avocado, red onion, olives, fresh cheese and pesto dressing. Extra protein available (+₡4,200).',
    base_price: 6400,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible',
    allows_protein_extra: true
  },

  // 2. ENTRADAS CALIENTES / HOT APPETIZERS (4 productos)
  {
    id: 'prod-mejillones-ajillo',
    category_id: 'cat-entradas-calientes',
    name: 'Mejillones al Ajillo',
    name_en: 'Mussels in Garlic Sauce',
    description: 'Mejillones salteados en salsa de ajo y limón.',
    description_en: 'Mussels sauteed in garlic sauce.',
    base_price: 6450,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-aros-calamar',
    category_id: 'cat-entradas-calientes',
    name: 'Aros de Calamar',
    name_en: 'Calamari Rings',
    description: 'Acompañados con salsa de la casa ligeramente picante.',
    description_en: 'Calamari rings with a house chili sauce.',
    base_price: 5200,
    spicy_level: 1, // 🌶️ PICANTE
    is_gluten_free: false,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-crema-papa',
    category_id: 'cat-entradas-calientes',
    name: 'Crema de Papa',
    name_en: 'Potato Cream Soup',
    description: 'Sopa cremosa a base de papa y tocineta.',
    description_en: 'Creamy potato soup with bacon.',
    base_price: 5900,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-sopa-azteca',
    category_id: 'cat-entradas-calientes',
    name: 'Sopa al estilo Azteca',
    name_en: 'Aztec Style Soup',
    description: 'Sopa a base de caldo de pollo y tomate, con un ligero sabor a picante.',
    description_en: 'Chicken and tomato broth with a hint of spice.',
    base_price: 6200,
    spicy_level: 1, // 🌶️ PICANTE
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },

  // 3. CARNES RES / BEEF (10 productos)
  {
    id: 'prod-baby-beef',
    category_id: 'cat-carnes-res',
    name: 'Baby Beef 300g',
    description: 'Corte de lomito, considerado una de las partes más jugosas de la res. Preparado a la parrilla.',
    description_en: 'Tenderloin cut considered one of the juiciest parts of beef. Grilled.',
    base_price: 13200,
    grammage: '300g',
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-churrasco-argentino',
    category_id: 'cat-carnes-res',
    name: 'Churrasco Argentino 450g',
    description: 'Tradicional corte de carne argentino con grasa alrededor. Preparado a la parrilla.',
    description_en: 'Traditional Argentinean meat cut with fat around. Grilled.',
    base_price: 15600,
    grammage: '450g',
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-rib-eye',
    category_id: 'cat-carnes-res',
    name: 'Rib Eye 350g',
    description: 'Corte mundialmente reconocido por su suavidad y sabor. Preparado a la parrilla.',
    description_en: 'Cut world renowned for its smoothness and flavor. Grilled.',
    base_price: 15600,
    grammage: '350g',
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-new-york',
    category_id: 'cat-carnes-res',
    name: 'New York 350g',
    description: 'Lomo corto particularmente caracterizado por ser un corte tierno y jugoso. Preparado a la parrilla.',
    description_en: 'Short loin known for being a tender and juicy cut. Grilled.',
    base_price: 15600,
    grammage: '350g',
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-filet-mignon',
    category_id: 'cat-carnes-res',
    name: 'Filet Mignon 300g',
    description: 'Tradicional corte de lomito albardado con tocineta bañado en una salsa demi-glace con hongos. Preparado a la parrilla.',
    description_en: 'Traditional filet mignon with bacon and dipped in a demi-glace sauce with mushrooms. Grilled.',
    base_price: 15600,
    grammage: '300g',
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-entrana',
    category_id: 'cat-carnes-res',
    name: 'Entraña 400g',
    description: 'Corte largo que se aprecia más por su sabor que por textura. Preparado a la parrilla.',
    description_en: 'Long cut appreciated more for its flavor than for its texture. Grilled.',
    base_price: 14500,
    grammage: '400g',
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-lomito-2-salsas',
    category_id: 'cat-carnes-res',
    name: 'Lomito 2 Salsas',
    name_en: 'Tenderloin 2 Sauces',
    description: 'Jugoso corte a la parrilla bañado en salsa cremosa de trufa y salsa de vino tinto.',
    description_en: 'Grilled tenderloin topped with creamy truffle sauce and red wine sauce.',
    base_price: 14600,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-hamburguesa-angus',
    category_id: 'cat-carnes-res',
    name: 'Hamburguesa Angus',
    name_en: 'Angus Burger',
    description: 'Torta 100% Angus, tocineta, cebolla caramelizada, pepinillo, queso cheddar, aderezo de la casa, acompañada con papas campesinas.',
    description_en: '100% Angus beef patty, bacon, caramelized onions, pickles, cheddar cheese and house dressing, served with rustic fries.',
    base_price: 8950,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-lomito-estilo-la-vid',
    category_id: 'cat-carnes-res',
    name: 'Lomito al estilo La Vid',
    name_en: 'La Vid Style Tenderloin',
    description: 'Jugoso corte a la parrilla bañado en salsa de mariscos y ají.',
    description_en: 'Grilled tenderloin topped with seafood and chili sauce.',
    base_price: 15600,
    spicy_level: 1, // 🌶️ PICANTE
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-puntas-lomito-jalapeno',
    category_id: 'cat-carnes-res',
    name: 'Puntas de Lomito en Salsa Jalapeña',
    name_en: 'Tenderloin Tips in Jalapeño Sauce',
    description: 'Jugosas puntas de lomito salteadas con cebolla y chile dulce en una cremosa salsa jalapeña.',
    description_en: 'Juicy tenderloin tips sautéed with onions and sweet peppers in a creamy jalapeño sauce.',
    base_price: 14500,
    spicy_level: 2, // 🌶️🌶️ PICANTE
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },

  // 4. POLLO / CHICKEN (3 productos)
  {
    id: 'prod-el-pollo',
    category_id: 'cat-pollo',
    name: 'El Pollo',
    description: 'Pechuga rellena de jamón y queso mozzarella, empanizada bañada en salsa de hongos.',
    description_en: 'Stuffed breaded chicken with ham and cheese covered mushroom sauce.',
    base_price: 8300,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-pollo-menier',
    category_id: 'cat-pollo',
    name: 'Pollo en Salsa Menier y Alcaparras',
    name_en: 'Chicken in Meunière Sauce with Capers',
    description: 'Jugosa pechuga a la parrilla bañada en salsa a base de margarina, limón y alcaparras aromatizada con finas hierbas.',
    description_en: 'Grilled chicken breast topped with margarine, lemon and caper sauce, seasoned with fine herbs.',
    base_price: 9500,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-pechuga-chipotle',
    category_id: 'cat-pollo',
    name: 'Pechuga de Pollo al Chipotle',
    name_en: 'Chipotle Chicken Breast',
    description: 'Filet de pechuga de pollo marinada en chipotle, cocida a la brasa, servida con arroz cremoso de aguacate y vegetales de estación.',
    description_en: 'Chipotle marinated chicken breast cooked on the grill, served with rice, avocado and organic vegetables.',
    base_price: 9300,
    spicy_level: 2, // 🌶️🌶️ PICANTE
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },

  // 5. CARNES AHUMADAS / SMOKE MEATS (2 productos)
  {
    id: 'prod-costilla-cerdo',
    category_id: 'cat-carnes-ahumadas',
    name: 'Costilla de Cerdo',
    name_en: 'Pork Rib',
    description: 'Deliciosas costillas arregladas con hierbas naturales y cocinadas con un delicioso sabor ahumado acompañado con salsa de piña y jamaica.',
    description_en: 'Pork rib with natural herbs and cooked with a delicious smoked flavor and Jamaican pineapple smoked sauce.',
    base_price: 10300,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-costilla-res',
    category_id: 'cat-carnes-ahumadas',
    name: 'Costilla de Res',
    name_en: 'Beef Rib',
    description: 'Costilla tierna ahumada y sellada a la parrilla acompañada con salsa BBQ con guayaba.',
    description_en: 'Smoked beef rib and grilled covered with BBQ and guava sauce.',
    base_price: 10700,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },

  // 6. DEL MAR / FROM THE SEA (4 productos)
  {
    id: 'prod-salmon-rostizado',
    category_id: 'cat-del-mar',
    name: 'Salmón Rostizado',
    name_en: 'Roasted Salmon',
    description: 'Marinado en finas hierbas bañado en salsa de maracuyá.',
    description_en: 'Marinated with fine herbs and dipped with a tropical passion fruit sauce.',
    base_price: 13200,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-atun-encostrado',
    category_id: 'cat-del-mar',
    name: 'Atún Enconstrado',
    name_en: 'Crusted Tuna',
    description: 'Medallón de atún cubierto con semillas de marañón servido con aderezo Thai.',
    description_en: 'Tuna medallion covered with cashew seeds served with Thai dressing.',
    base_price: 12800,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible'
  },
  {
    id: 'prod-camarones-jumbo',
    category_id: 'cat-del-mar',
    name: 'Camarones Jumbo al gusto',
    name_en: 'Jumbo Shrimp to your liking',
    description: 'Camarones jumbo al gusto, pueden ser empanizados o al ajillo acompañados de la guarnición del día.',
    description_en: 'Jumbo shrimps with garlic sauce or fried with panko, served with the garnish of the day.',
    base_price: 17950,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    requires_shrimp_prep: true
  },
  {
    id: 'prod-pesca-del-dia',
    category_id: 'cat-del-mar',
    name: 'Pesca del Día',
    name_en: 'Catch of the Day',
    description: 'Bañada en salsa de hierbas y maracuyá. Opción fresca del día.',
    description_en: 'Served with passion fruit and herbs beurre blanc.',
    base_price: 12150,
    spicy_level: 0,
    is_gluten_free: true,
    available: true,
    status: 'disponible',
    is_daily_special: true
  },

  // 7. PASTAS (3 productos)
  {
    id: 'prod-fetuccini-salmon',
    category_id: 'cat-pastas',
    name: 'Fetuccini Salmón',
    name_en: 'Salmon Fettuccine',
    description: 'Salmón grillado, hongos silvestres, bechamel y flambeado con vodka.',
    description_en: 'Grilled salmon, mushrooms, bechamel sauce flambeed with vodka.',
    base_price: 11600,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pasta: true
  },
  {
    id: 'prod-spaguetti-mariscos',
    category_id: 'cat-pastas',
    name: 'Spaguetti Mariscos',
    name_en: 'Seafood Spaghetti',
    description: 'Selección de mariscos en una cremosa salsa de trufa y queso parmesano perfumada con vino blanco.',
    description_en: 'A selection of seafood in a creamy truffle and Parmesan sauce, infused with white wine.',
    base_price: 12700,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pasta: true
  },
  {
    id: 'prod-penne-aguacate-camaron',
    category_id: 'cat-pastas',
    name: 'Penne Aguacate y Camarón',
    name_en: 'Penne Avocado & Shrimp',
    description: 'Camarones al pesto, salteados con tomate, aguacate y vino blanco.',
    description_en: 'Shrimps with pesto, sauteed with tomato, avocado and white wine.',
    base_price: 10300,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pasta: true
  },

  // 8. PIZZAS (17 productos - 100% artesanales en un solo tamaño)
  {
    id: 'prod-pizza-its-britney',
    category_id: 'cat-pizzas',
    name: "It's Britney",
    description: 'Jamón, Pomodoro, Mozzarella.',
    description_en: 'Ham, pomodoro, mozzarella.',
    base_price: 8800,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-la-vaca',
    category_id: 'cat-pizzas',
    name: 'La Vaca',
    description: 'Gorgonzola, Queso cabra, Parmesano, Pomodoro, Mozzarella.',
    description_en: 'Pomodoro, gorgonzola cheese, goat cheese, parmesan cheese, mozzarella.',
    base_price: 11500,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-meat-lover',
    category_id: 'cat-pizzas',
    name: 'Meat Lover',
    description: 'Pepperoni, Salami, Carne molida, Pomodoro, Mozzarella.',
    description_en: 'Pepperoni, salami, ground meat, pomodoro, mozzarella.',
    base_price: 11500,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-hawaiana',
    category_id: 'cat-pizzas',
    name: 'Hawaiana',
    name_en: 'Hawaiian',
    description: 'Piña, Jamón, Pomodoro, Mozzarella.',
    description_en: 'Pineapple, ham, pomodoro, mozzarella.',
    base_price: 8800,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-pepperoni',
    category_id: 'cat-pizzas',
    name: 'Pepperoni',
    description: 'Pepperoni, Pomodoro, Mozzarella.',
    description_en: 'Pepperoni, pomodoro, mozzarella.',
    base_price: 8700,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-lupita',
    category_id: 'cat-pizzas',
    name: 'Lupita',
    description: 'Jamón, Hongos silvestres, Pomodoro, Mozzarella.',
    description_en: 'Ham, mushrooms, pomodoro, mozzarella.',
    base_price: 9350,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-margarita',
    category_id: 'cat-pizzas',
    name: 'Margarita',
    description: 'Tomate, Albahaca, Pomodoro, Mozzarella.',
    description_en: 'Tomato, basil, pomodoro, mozzarella.',
    base_price: 9100,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-buffalo',
    category_id: 'cat-pizzas',
    name: 'Búffalo',
    description: 'Pollo grillado, Salsa búfalo, Pesto, Pomodoro, Mozzarella.',
    description_en: 'Grilled chicken, buffalo sauce, pesto, pomodoro, mozzarella.',
    base_price: 8700,
    spicy_level: 1, // 🌶️ PICANTE
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-bbq',
    category_id: 'cat-pizzas',
    name: 'BBQ',
    description: 'BBQ, Queso mozzarella, Pollo, Cebolla morada.',
    description_en: 'BBQ, mozzarella cheese, chicken, red onion.',
    base_price: 9100,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-de-la-casa',
    category_id: 'cat-pizzas',
    name: 'De la Casa',
    name_en: 'House Pizza',
    description: 'Pomodoro, Queso mozzarella, Queso cheddar, Hongos, Jamón.',
    description_en: 'Pomodoro, mozzarella, cheddar, mushrooms, ham.',
    base_price: 8700,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-caprese',
    category_id: 'cat-pizzas',
    name: 'Caprese',
    description: 'Tomate, Albahaca, Pesto, Pomodoro, Mozzarella.',
    description_en: 'Tomato, basil, pomodoro, mozzarella.',
    base_price: 11000,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-monchona',
    category_id: 'cat-pizzas',
    name: 'Monchona',
    description: 'Carne molida, Salami, Jamón, Hongos silvestres, Cebollas rojas, Pimiento dulce, Pomodoro.',
    description_en: 'Ground beef, salami, ham, mushrooms, red onions, sweet pepper, pomodoro sauce.',
    base_price: 11600,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-altamar',
    category_id: 'cat-pizzas',
    name: 'Altamar',
    description: 'Mariscos salteados en salsa blanca aromatizada con eneldo.',
    description_en: 'A selection of seafood sauteed in a dill infused white sauce.',
    base_price: 11900,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-procciuto-arugula',
    category_id: 'cat-pizzas',
    name: 'Procciuto & Arúgula',
    description: 'Procciuto, Arúgula, Granapadano, Queso gorgonzola.',
    description_en: 'Prosciutto, arugula, Grana Padano and gorgonzola cheese.',
    base_price: 11900,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-la-ciao-bella',
    category_id: 'cat-pizzas',
    name: 'La Ciao Bella',
    description: 'Gorgonzola, Pepperoni, Tocino, Hongos silvestres, Pomodoro, Mozzarella.',
    description_en: 'Gorgonzola, pepperoni, bacon, mushrooms, pomodoro, mozzarella.',
    base_price: 12300,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-brazilenia',
    category_id: 'cat-pizzas',
    name: 'Brazileña',
    name_en: 'Brazilian',
    description: 'Pomodoro, Queso, Carne molida, Jamón, Tomate, Condimento mixto, Limón.',
    description_en: 'Pomodoro, cheese, ground beef, ham, tomato, mixed seasoning, lemon.',
    base_price: 10100,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  },
  {
    id: 'prod-pizza-vegetariana',
    category_id: 'cat-pizzas',
    name: 'Vegetariana',
    name_en: 'Vegetarian',
    description: 'Pomodoro, Queso, Hongos, Aceituna negra, Tomate, Albahaca, Zucchini.',
    description_en: 'Pomodoro, cheese, mushrooms, black olives, tomatoes, basil, zucchini.',
    base_price: 8700,
    spicy_level: 0,
    is_gluten_free: false,
    available: true,
    status: 'disponible',
    allows_gf_pizza: true
  }
];

export const LAVID_MODIFIERS = [
  // Modificadores de Proteína Adicional para Ensalada de La Huerta
  { id: 'mod-prot-salmon', name: 'Proteína: Salmón', extra_price: 4200, category: 'proteina_huerta' },
  { id: 'mod-prot-atun', name: 'Proteína: Atún', extra_price: 4200, category: 'proteina_huerta' },
  { id: 'mod-prot-camarones', name: 'Proteína: Camarones', extra_price: 4200, category: 'proteina_huerta' },
  { id: 'mod-prot-carne', name: 'Proteína: Carne a la parrilla', extra_price: 4200, category: 'proteina_huerta' },

  // Modificadores de Preparación de Camarones Jumbo
  { id: 'mod-prep-ajillo', name: 'Preparación: Al ajillo', extra_price: 0, category: 'prep_camarones' },
  { id: 'mod-prep-empanizados', name: 'Preparación: Empanizados / Panko', extra_price: 0, category: 'prep_camarones' },

  // Modificadores Gluten Free para Pastas y Pizzas (+₡3.500)
  { id: 'mod-gf-pastas', name: 'Opción Libre de Gluten (Pastas)', extra_price: 3500, category: 'gluten_free' },
  { id: 'mod-gf-pizzas', name: 'Opción Libre de Gluten (Pizzas)', extra_price: 3500, category: 'gluten_free' },

  // Salsas para Cortes de Carne
  { id: 'mod-salsa-jalapeno', name: 'Salsa Jalapeña', extra_price: 0, category: 'salsas_carne' },
  { id: 'mod-salsa-vino-tinto', name: 'Salsa al vino tinto', extra_price: 0, category: 'salsas_carne' },
  { id: 'mod-salsa-hongos', name: 'Salsa de hongos', extra_price: 0, category: 'salsas_carne' },
  { id: 'mod-salsa-tamarindo', name: 'Salsa Tamarindo', extra_price: 0, category: 'salsas_carne' },
  { id: 'mod-salsa-chimichurri', name: 'Chimichurri', extra_price: 0, category: 'salsas_carne' },
  { id: 'mod-salsa-dijon', name: 'Salsa Dijon', extra_price: 0, category: 'salsas_carne' },

  // Términos de Cocción para Carnes
  { id: 'mod-termino-medio', name: 'Término Medio (Center Pink)', extra_price: 0, category: 'coccion' },
  { id: 'mod-termino-34', name: 'Tres Cuartos (3/4)', extra_price: 0, category: 'coccion' },
  { id: 'mod-termino-bien-cocido', name: 'Bien Cocido', extra_price: 0, category: 'coccion' }
];
