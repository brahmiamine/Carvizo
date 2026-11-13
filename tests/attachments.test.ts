import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {detectedMime,pathFor} from '../src/lib/photos.ts';
test('PDF invoices detected, invalid content refused, unsafe paths blocked',()=>{
 assert.equal(detectedMime(new TextEncoder().encode('%PDF-1.7\n')),'application/pdf');
 assert.equal(detectedMime(new TextEncoder().encode('<script>bad</script>')),null);
 assert.throws(()=>pathFor('../private.pdf'));
 assert.ok(pathFor('00000000-0000-0000-0000-000000000000.pdf').endsWith('.pdf'));
});
