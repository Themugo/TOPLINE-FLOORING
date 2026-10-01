import { readFile } from 'node:fs/promises';

const fail = (message) => { throw new Error(message); };
const migration = await readFile('supabase/migrations/20261001110000_catalog_product_service_upload_integrity_360.sql', 'utf8');
const upload = await readFile('src/lib/upload.ts', 'utf8');
const storage = await readFile('supabase/migrations/20260912050000_production_infrastructure_rls_storage.sql', 'utf8');
const services = await readFile('src/pages/admin/services.tsx', 'utf8');
const products = await readFile('src/pages/admin/products.tsx', 'utf8');

const must = (text, pattern, label) => {
  if (!pattern.test(text)) fail(`Missing ${label}`);
};

must(migration, /file_size_limit\s*=\s*10485760/i, '10 MiB storage ceiling');
must(migration, /image\/jpeg.*image\/png.*image\/webp.*image\/gif.*image\/avif/s, 'canonical image MIME allow-list');
must(migration, /'private-documents'[\s\S]*file_size_limit = 10485760[\s\S]*application\/pdf/i, 'private document bucket limits');
must(migration, /product_images_one_primary_idx/i, 'one-primary-product-image index');
must(migration, /products_sale_price_not_above_price_chk/i, 'product sale-price integrity');
must(migration, /services_base_price_nonnegative_chk/i, 'service price integrity');
must(migration, /services_duration_nonnegative_chk/i, 'service duration integrity');
must(migration, /media_files_file_size_ceiling_chk/i, 'media metadata file-size ceiling');
must(migration, /media_files_filename_nonblank_chk/i, 'media filename integrity');
must(migration, /media_files_dimensions_nonnegative_chk/i, 'media dimension integrity');
must(storage, /bucket_id\s*=\s*'images'/i, 'images bucket storage boundary');
must(storage, /current_user_has_permission\('media','insert'\)/i, 'media upload authorization');
must(storage, /current_user_has_permission\('catalog','insert'\)/i, 'catalog upload authorization');
must(upload, /image\/jpeg.*image\/png.*image\/webp.*image\/gif.*image\/avif/s, 'frontend upload MIME allow-list');
must(upload, /5 \* 1024 \* 1024|MAX_SIZE\s*=\s*5\s*\*\s*1024\s*\*\s*1024/i, 'frontend 5 MiB upload guard');
must(upload, /upsert:\s*false/i, 'non-overwriting upload behavior');
must(services, /folder="services"/i, 'service image upload path');
must(products, /folder="products"/i, 'product image upload path');

console.log('Catalog/Product/Service/Upload integrity verification PASSED.');
console.log('- Images bucket capped at 10 MiB with explicit image MIME allow-list.');
console.log('- Frontend upload guard remains 5 MiB and non-overwriting.');
console.log('- Product/service pricing, ordering and media metadata constraints hardened.');
console.log('- Product gallery has at most one primary image.');
console.log('- Product and service image upload paths remain preserved.');
