import 'fake-indexeddb/auto';
import { seedUnifiedDatabase } from './services/db.js';
import { runExternalInvoiceIntegrationTests } from './services/externalInvoiceIntegrationTestRunner.js';

async function run() {
  console.log('=================================================================');
  console.log('GASTROFLOW OS - PRUEBAS DE INTEGRACIÓN DE FACTURACIÓN EXTERNA API');
  console.log('=================================================================\n');

  await seedUnifiedDatabase();
  const results = await runExternalInvoiceIntegrationTests();

  console.log('\n=================================================================');
  console.log('REPORTE DE VERIFICACIÓN DE ARQUITECTURA E INTEGRACIÓN API:');
  console.log('=================================================================\n');

  results.forEach(r => {
    console.log(`[${r.success ? '✅ PASÓ' : '❌ FALLÓ'}] ${r.id}: ${r.name}`);
    console.log(`   Detalles:`, JSON.stringify(r.details));
  });

  const totalPassed = results.filter(r => r.success).length;
  console.log(`\nPRUEBAS TOTALES: ${results.length} | EXITOSAS: ${totalPassed} | FALLIDAS: ${results.length - totalPassed}`);
  
  if (totalPassed === results.length) {
    console.log('\n✨ ¡TODOS LOS 9 ESCENARIOS DE INTEGRACIÓN PASARON AL 100% EXITOSAMENTE!');
  } else {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Error fatal durante las pruebas de integración API:', err);
  process.exit(1);
});
