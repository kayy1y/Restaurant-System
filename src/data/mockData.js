// Datos iniciales para GastroFlow POS - Costa Rica v4.3

export const RESTAURANT_INFO = {
  name: "Restaurante Sabor Tico & Grill",
  legalName: "Inversiones Gastronómicas del Este S.A.",
  idNumber: "3-101-987654",
  branch: "001",
  terminal: "00001",
  address: "Barrio Escalante, Avenida 33, San José, Costa Rica",
  phone: "+506 2253-8899",
  email: "facturacion@sabortico.cr",
  currency: "CRC",
  currencySymbol: "₡",
  currencyUSD: "USD",
  exchangeRate: 520.00,
  taxRateIVA: 0.13, // 13% IVA Costa Rica
  taxRateService: 0.10, // 10% Impuesto de Servicio Ley 5635 (Mesa)
  fiscalProvider: "Hacienda Costa Rica v4.3 Direct API",
  fiscalStatus: "Activo / Certificado Válido"
};

export const ROLES = [
  { id: "ADMINISTRADOR", name: "Administrador General", icon: "ShieldCheck", desc: "Acceso total y configuración fiscal" },
  { id: "gerente", name: "Gerente de Turno", icon: "Briefcase", desc: "Descuentos, anulación de pagos y reportes" },
  { id: "SALONERO", name: "Salonero / Mesero", icon: "User", desc: "Toma de pedidos, comandas y atención" },
  { id: "COCINA", name: "Jefe de Cocina", icon: "ChefHat", desc: "KDS Pantalla de cocina caliente y fría" },
  { id: "barra", name: "Bartender / Barra", icon: "GlassWater", desc: "KDS Comandas de bebidas y postres" },
  { id: "CAJERO", name: "Cajero", icon: "CreditCard", desc: "Facturación v4.3, cobro y arqueos de caja" },
  { id: "inventario", name: "Encargado Inventario", icon: "Package", desc: "Recetas, insumos y mermas" }
];

export const RAW_INGREDIENTS = [
  { id: "ing-1", name: "Carne Angus de Res (180g)", unit: "kg", stock: 18.5, minStock: 5.0, costPerUnit: 4500, branch: "001" },
  { id: "ing-2", name: "Pan Brioche de la Casa", unit: "unid", stock: 45, minStock: 20, costPerUnit: 350, branch: "001" },
  { id: "ing-3", name: "Queso Gouda Madurado", unit: "kg", stock: 2.1, minStock: 3.0, costPerUnit: 6200, branch: "001" }, // LOW STOCK!
  { id: "ing-4", name: "Cebolla Caramelizada", unit: "kg", stock: 4.0, minStock: 1.5, costPerUnit: 1200, branch: "001" },
  { id: "ing-5", name: "Ron Centenario 12 Años", unit: "litro", stock: 8.0, minStock: 2.0, costPerUnit: 14000, branch: "001" },
  { id: "ing-6", name: "Menta Fresca Organic", unit: "kg", stock: 1.2, minStock: 0.5, costPerUnit: 3500, branch: "001" },
  { id: "ing-7", name: "Filete de Corvina Reina", unit: "kg", stock: 0.8, minStock: 4.0, costPerUnit: 8500, branch: "001" }, // AGOTADO PRONTO!
  { id: "ing-8", name: "Limón Mandarina", unit: "kg", stock: 12.0, minStock: 3.0, costPerUnit: 800, branch: "001" },
  { id: "ing-9", name: "Café Grano Especialidad Tarrazú", unit: "kg", stock: 15.0, minStock: 4.0, costPerUnit: 7800, branch: "001" },
  { id: "ing-10", name: "Papas Criollas para Freír", unit: "kg", stock: 30.0, minStock: 10.0, costPerUnit: 900, branch: "001" }
];

export const PRODUCTS = [
  {
    id: "prod-1",
    name: "Hamburguesa Gourmet Escalante",
    category: "Platos Fuertes",
    station: "cocina_caliente",
    price: 7800,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    description: "Carne Angus 180g, queso Gouda, cebolla caramelizada y tocino en pan brioche artesanal.",
    recipe: [
      { ingredientId: "ing-1", quantity: 0.18, unit: "kg" },
      { ingredientId: "ing-2", quantity: 1, unit: "unid" },
      { ingredientId: "ing-3", quantity: 0.05, unit: "kg" },
      { ingredientId: "ing-4", quantity: 0.04, unit: "kg" },
      { ingredientId: "ing-10", quantity: 0.25, unit: "kg" }
    ],
    popular: true,
    available: true
  },
  {
    id: "prod-2",
    name: "Ceviche Tico de Corvina",
    category: "Entradas",
    station: "cocina_fria",
    price: 6500,
    image: "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?auto=format&fit=crop&w=600&q=80",
    description: "Corvina reina fresca marinada en limón mandarina con platanitos tostados.",
    recipe: [
      { ingredientId: "ing-7", quantity: 0.20, unit: "kg" },
      { ingredientId: "ing-8", quantity: 0.15, unit: "kg" }
    ],
    popular: true,
    available: true
  },
  {
    id: "prod-3",
    name: "Mojito Centenario de la Casa",
    category: "Bebidas & Cocteles",
    station: "barra",
    price: 4500,
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    description: "Ron Centenario 12 años, menta orgánica fresca, hierbabuena y soda infusionada.",
    recipe: [
      { ingredientId: "ing-5", quantity: 0.06, unit: "litro" },
      { ingredientId: "ing-6", quantity: 0.02, unit: "kg" },
      { ingredientId: "ing-8", quantity: 0.05, unit: "kg" }
    ],
    popular: true,
    available: true
  },
  {
    id: "prod-4",
    name: "Café Chorreado Especialidad Tarrazú",
    category: "Cafetería",
    station: "cafeteria",
    price: 2200,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    description: "Chorreado tradicional en mesa con notas de chocolate oscuro y miel de caña.",
    recipe: [
      { ingredientId: "ing-9", quantity: 0.025, unit: "kg" }
    ],
    popular: false,
    available: true
  },
  {
    id: "prod-5",
    name: "Steak New York 300g",
    category: "Platos Fuertes",
    station: "cocina_caliente",
    price: 13500,
    image: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=600&q=80",
    description: "Corte New York madurado a la parrilla de leña con papas criollas y mantequilla de hierbas.",
    recipe: [
      { ingredientId: "ing-1", quantity: 0.32, unit: "kg" },
      { ingredientId: "ing-10", quantity: 0.20, unit: "kg" }
    ],
    popular: true,
    available: true
  },
  {
    id: "prod-6",
    name: "Flan de Coco Tradicional",
    category: "Postres",
    station: "postres",
    price: 3200,
    image: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?auto=format&fit=crop&w=600&q=80",
    description: "Receta de la abuela horneada a fuego lento con caramelo de caña.",
    recipe: [],
    popular: false,
    available: true
  }
];

export const TABLES = [
  { id: "T-01", name: "Mesa 1", capacity: 4, zone: "Salón Principal", status: "ocupada", waiter: "Carlos M.", orderId: "ORD-101", minutesActive: 35 },
  { id: "T-02", name: "Mesa 2", capacity: 2, zone: "Salón Principal", status: "esperando_pago", waiter: "Ana R.", orderId: "ORD-102", minutesActive: 50 },
  { id: "T-03", name: "Mesa 3", capacity: 6, zone: "Terraza Bar", status: "en_preparacion", waiter: "Carlos M.", orderId: "ORD-103", minutesActive: 18 },
  { id: "T-04", name: "Mesa 4", capacity: 4, zone: "Terraza Bar", status: "disponible", waiter: null, orderId: null, minutesActive: 0 },
  { id: "T-05", name: "Mesa 5 VIP", capacity: 8, zone: "Cava Privada", status: "reservada", waiter: "Luis G.", orderId: null, minutesActive: 0 },
  { id: "T-06", name: "Mesa 6", capacity: 2, zone: "Salón Principal", status: "servido", waiter: "Ana R.", orderId: "ORD-104", minutesActive: 42 },
  { id: "T-07", name: "Mesa 7", capacity: 4, zone: "Salón Principal", status: "pendiente_limpieza", waiter: null, orderId: null, minutesActive: 5 },
  { id: "T-08", name: "Mesa 8", capacity: 4, zone: "Terraza Bar", status: "disponible", waiter: null, orderId: null, minutesActive: 0 }
];

export const INITIAL_ORDERS = [
  {
    id: "ORD-101",
    tableId: "T-01",
    tableName: "Mesa 1",
    type: "mesa", // mesa, llevar, delivery
    waiter: "Carlos M.",
    diners: 3,
    status: "servido",
    startTime: new Date(Date.now() - 35 * 60000).toISOString(),
    items: [
      { id: "item-1", productId: "prod-1", name: "Hamburguesa Gourmet Escalante", quantity: 2, price: 7800, notes: "Sin cebolla una de ellas", status: "servido", station: "cocina_caliente" },
      { id: "item-2", productId: "prod-3", name: "Mojito Centenario de la Casa", quantity: 3, price: 4500, notes: "Poco hielo", status: "servido", station: "barra" }
    ],
    subtotal: 29100,
    serviceTax: 2910,
    ivaTax: 3783,
    total: 35793
  },
  {
    id: "ORD-102",
    tableId: "T-02",
    tableName: "Mesa 2",
    type: "mesa",
    waiter: "Ana R.",
    diners: 2,
    status: "esperando_pago",
    startTime: new Date(Date.now() - 50 * 60000).toISOString(),
    items: [
      { id: "item-3", productId: "prod-5", name: "Steak New York 300g", quantity: 1, price: 13500, notes: "Término Medio", status: "servido", station: "cocina_caliente" },
      { id: "item-4", productId: "prod-2", name: "Ceviche Tico de Corvina", quantity: 1, price: 6500, notes: "", status: "servido", station: "cocina_fria" },
      { id: "item-5", productId: "prod-4", name: "Café Chorreado Especialidad Tarrazú", quantity: 2, price: 2200, notes: "", status: "servido", station: "cafeteria" }
    ],
    subtotal: 24400,
    serviceTax: 2440,
    ivaTax: 3172,
    total: 30012
  },
  {
    id: "ORD-103",
    tableId: "T-03",
    tableName: "Mesa 3",
    type: "mesa",
    waiter: "Carlos M.",
    diners: 4,
    status: "en_preparacion",
    startTime: new Date(Date.now() - 18 * 60000).toISOString(),
    items: [
      { id: "item-6", productId: "prod-1", name: "Hamburguesa Gourmet Escalante", quantity: 3, price: 7800, notes: "Alergia a mani en mesa!", status: "en_marcha", station: "cocina_caliente" },
      { id: "item-7", productId: "prod-3", name: "Mojito Centenario de la Casa", quantity: 4, price: 4500, notes: "", status: "listo", station: "barra" }
    ],
    subtotal: 41400,
    serviceTax: 4140,
    ivaTax: 5382,
    total: 50922
  }
];

export const INITIAL_INVOICES = [
  {
    id: "FE-00100001010000000845",
    clave: "50605082600031019876540010000101000000084519827364",
    consecutivo: "00100001010000000845",
    type: "Factura Electrónica",
    date: new Date(Date.now() - 120 * 60000).toISOString(),
    customerName: "Juan Pablo Quesada",
    customerId: "1-1422-0982",
    customerEmail: "jpquesada@gmail.com",
    orderId: "ORD-099",
    tableName: "Mesa 4",
    paymentMethod: "Tarjeta Crédito (BAC)",
    subtotal: 18500,
    serviceTax: 1850,
    ivaTax: 2405,
    total: 22755,
    status: "Aceptado Hacienda v4.3",
    xmlUrl: "#"
  }
];

export const AUDIT_LOGS = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    user: "Carlos M.",
    role: "mesero",
    branch: "001",
    device: "Tablet Salón 02",
    action: "APERTURA_MESA",
    details: "Mesa 1 abierta para 3 personas"
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    user: "Ana R.",
    role: "gerente",
    branch: "001",
    device: "POS Principal",
    action: "AUTORIZACION_DESCUENTO",
    details: "Descuento 10% aplicado en pedido ORD-100 por cortesía cliente recurrente"
  }
];
