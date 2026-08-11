import 'fake-indexeddb/auto';
import { seedUnifiedDatabase } from './services/db.js';
import { runBillingFlowTests } from './services/billingFlowTestRunner.js';

async function run() {
  console.log('=================================================================');
  console.log('GASTROFLOW OS - PRUEBAS DE VERIFICACIÓN DE FACTURACIÓN Y COBROS');
  console.log('=================================================================\n');

  await seedUnifiedDatabase();
  const results = await runBillingFlowTests();

  console.log('\n=================================================================');
  console.log('REPORTE DE VERIFICACIÓN DE PRUEBAS DEL FLUJO COMPLETO:');
  console.log('=================================================================\n');

  results.forEach(r => {
    console.log(`[${r.success ? '✅ PASÓ' : '❌ FALLÓ'}] ${r.id}: ${r.name}`);
    console.log(`   Detalles:`, JSON.stringify(r.details));
  });

  const totalPassed = results.filter(r => r.success).length;
  console.log(`\nPRUEBAS TOTALES: ${results.length} | EXITOSAS: ${totalPassed} | FALLIDAS: ${results.length - totalPassed}`);
  
  if (totalPassed === results.length) {
    console.log('\n✨ ¡TODAS LAS 8 PRUEBAS EXIGIDAS PASARON AL 100% EXITOSAMENTE!');
  } else {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Error fatal durante las pruebas:', err);
  process.exit(1);
});
