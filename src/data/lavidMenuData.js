/**
 * Menú Oficial La Vid Steakhouse 2025
 * Datos de semillas iniciales para la base de datos relacional.
 */

export const LAVID_CATEGORIES = [
  { id: 'cat-entradas-frias', name: 'Entradas Frías', description: 'Ceviches, carpaccios y ensaladas frescas', order: 1 },
  { id: 'cat-entradas-calientes', name: 'Entradas Calientes', description: 'Sopas, cremas y bocados calientes', order: 2 },
  { id: 'cat-carnes-res', name: 'Carnes de Res & Grill', description: 'Cortes premium a la parrilla de leña', order: 3 },
  { id: 'cat-pollo-cerdo', name: 'Pollo & Carnes Ahumadas', description: 'Ahumados lentamente y aves al grill', order: 4 },
  { id: 'cat-mariscos', name: 'Productos del Mar', description: 'Pescados frescos y mariscos jumbo', order: 5 },
  { id: 'cat-pastas', name: 'Pastas Artesanales', description: 'Pastas frescas con salsas de la casa', order: 6 },
  { id: 'cat-pizzas', name: 'Pizzas a la Leña', description: 'Masa madre horneada a piedra', order: 7 }
];

export const LAVID_PRODUCTS = [
  // Entradas Frías
  {
    id: 'prod-ceviche-tico',
    category_id: 'cat-entradas-frias',
    name: 'Ceviche Tico de Corvina',
    description: 'Corvina reina fresca marinada en limón mandarina, cebolla morada, culantro y platanitos tostados.',
    base_price: 6500,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-ensalada-caprese',
    category_id: 'cat-entradas-frias',
    name: 'Ensalada Caprese',
    description: 'Tomate fresco, mozzarella de búfala, pesto de albahaca orgánica y reducción de balsámico.',
    base_price: 5800,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-carpaccio-res',
    category_id: 'cat-entradas-frias',
    name: 'Carpaccio de Res',
    description: 'Láminas finas de lomo de res, alcaparras, láminas de parmesano, rúcula y vinagreta de dijon.',
    base_price: 7200,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-ensalada-thai',
    category_id: 'cat-entradas-frias',
    name: 'Ensalada Thai',
    description: 'Mix de lechugas, maní tostado, aderezo de ajonjolí y chile dulce.',
    base_price: 6900,
    is_spicy: true,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-tartar-atun',
    category_id: 'cat-entradas-frias',
    name: 'Tartar de Atún',
    description: 'Atún fresco de aleta amarilla picado a cuchillo con aguacate, soya y aceite de ajonjolí.',
    base_price: 8500,
    is_spicy: false,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  },

  // Entradas Calientes
  {
    id: 'prod-aros-calamar',
    category_id: 'cat-entradas-calientes',
    name: 'Aros de Calamar',
    description: 'Calamar crujiente apanado servido con salsa tártara de la casa y limón.',
    base_price: 5500,
    is_spicy: false,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-crema-papa',
    category_id: 'cat-entradas-calientes',
    name: 'Crema de Papa & Tocino',
    description: 'Crema suave de papa con crocante de tocino, queso cheddar y cebollín.',
    base_price: 4200,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },

  // Carnes de Res
  {
    id: 'prod-baby-beef',
    category_id: 'cat-carnes-res',
    name: 'Baby Beef 300g',
    description: 'Corte tierno de lomo ancho de res a la parrilla de leña con mantequilla de hierbas.',
    base_price: 14500,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-churrasco',
    category_id: 'cat-carnes-res',
    name: 'Churrasco Argentino 350g',
    description: 'Corte tradicional argentino con chimichurri casero y papas rústicas.',
    base_price: 16800,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-rib-eye',
    category_id: 'cat-carnes-res',
    name: 'Rib Eye 350g',
    description: 'Corte con marmoleo superior a las brasas.',
    base_price: 18500,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: false // Pendiente de configurar receta para probar flujo!
  },
  {
    id: 'prod-new-york',
    category_id: 'cat-carnes-res',
    name: 'New York Steak 300g',
    description: 'Corte magro madurado en seco.',
    base_price: 15900,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-filet-mignon',
    category_id: 'cat-carnes-res',
    name: 'Filet Mignon',
    description: 'Medallón de lomo envuelto en tocino ahumado con salsa de hongos porcini.',
    base_price: 17200,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-hamburguesa-angus',
    category_id: 'cat-carnes-res',
    name: 'Hamburguesa Angus La Vid',
    description: 'Carne Angus 180g, queso cheddar, tocino, cebolla caramelizada y pepinillos en pan brioche.',
    base_price: 7800,
    is_spicy: false,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  },

  // Pollo & Cerdo
  {
    id: 'prod-pechuga-chipotle',
    category_id: 'cat-pollo-cerdo',
    name: 'Pechuga al Chipotle',
    description: 'Pechuga de pollo a la parrilla bañada en salsa cremosa de chipotle ahumado.',
    base_price: 9200,
    is_spicy: true,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-costilla-cerdo',
    category_id: 'cat-pollo-cerdo',
    name: 'Costilla de Cerdo Ahumada',
    description: 'Rack entero ahumado por 8 horas bañado en salsa BBQ artesanal.',
    base_price: 12500,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },

  // Productos del Mar
  {
    id: 'prod-salmon-rostizado',
    category_id: 'cat-mariscos',
    name: 'Salmón Rostizado',
    description: 'Filete de salmón fresco en costra de hierbas con puré de camote.',
    base_price: 14200,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-atun-encostrado',
    category_id: 'cat-mariscos',
    name: 'Atún Encostrado en Ajonjolí',
    description: 'Medallón de atún sellado al término deseado con reducción de maracuyá.',
    base_price: 13500,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-camarones-jumbo',
    category_id: 'cat-mariscos',
    name: 'Camarones Jumbo al Ajillo',
    description: 'Camarones jumbo salteados en mantequilla de ajo, vino blanco y perejil.',
    base_price: 15800,
    is_spicy: false,
    is_gluten_free: true,
    available: true,
    has_recipe: true
  },

  // Pastas
  {
    id: 'prod-fetuccini-salmon',
    category_id: 'cat-pastas',
    name: 'Fetuccini con Salmón',
    description: 'Pasta artesanal con trozos de salmón en salsa Alfredo cremosa.',
    base_price: 11500,
    is_spicy: false,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-spaguetti-mariscos',
    category_id: 'cat-pastas',
    name: 'Spaguetti Frutti di Mare',
    description: 'Spaguetti con camarones, calamares y mejillones en pomodoro de la casa.',
    base_price: 12800,
    is_spicy: false,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  },

  // Pizzas
  {
    id: 'prod-pizza-margarita',
    category_id: 'cat-pizzas',
    name: 'Pizza Margarita',
    description: 'Salsa pomodoro, mozzarella fresca y hojas de albahaca.',
    base_price: 7900,
    is_spicy: false,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-pizza-pepperoni',
    category_id: 'cat-pizzas',
    name: 'Pizza Pepperoni',
    description: 'Salsa pomodoro, mozzarella y abundante pepperoni crujiente.',
    base_price: 8900,
    is_spicy: false,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-pizza-hawaiana',
    category_id: 'cat-pizzas',
    name: 'Pizza Hawaiana',
    description: 'Salsa pomodoro, mozzarella, jamón horneado y piña caramelizada.',
    base_price: 8500,
    is_spicy: false,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  },
  {
    id: 'prod-pizza-bbq',
    category_id: 'cat-pizzas',
    name: 'Pizza BBQ Chicken',
    description: 'Pollo desmenuzado en salsa BBQ, cebolla morada y queso gouda.',
    base_price: 9500,
    is_spicy: false,
    is_gluten_free: false,
    available: true,
    has_recipe: true
  }
];

export const LAVID_MODIFIERS = [
  { id: 'mod-gf', name: 'Opción Libre de Gluten', extra_price: 1500, type: 'opcional' },
  { id: 'mod-queso-extra', name: 'Extra Queso Mozzarella', extra_price: 1200, type: 'extra' },
  { id: 'mod-tocino-extra', name: 'Extra Tocino Ahumado', extra_price: 1500, type: 'extra' },
  { id: 'mod-termino-medio', name: 'Término Medio (1/2)', extra_price: 0, type: 'coccion' },
  { id: 'mod-termino-34', name: 'Término Tres Cuartos (3/4)', extra_price: 0, type: 'coccion' },
  { id: 'mod-termino-bien-cocido', name: 'Término Bien Cocido', extra_price: 0, type: 'coccion' }
];
