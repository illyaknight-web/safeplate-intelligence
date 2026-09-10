import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCDCNoticePage, parseCDCOutbreakIndex } from '../netlify/functions/lib/cdc-current-parser.mjs';

test('CDC pathogen index discovers product-level outbreak notices',()=>{
  const links=parseCDCOutbreakIndex(`
    <main>
      <a href="/salmonella/outbreaks/broccoli-sprouts-09-26/index.html">Broccoli sprouts</a>
      <a href="/salmonella/outbreaks/index.html">All Salmonella outbreaks</a>
      <a href="https://example.com/not-authoritative">Ignore</a>
    </main>`,
    'https://www.cdc.gov/salmonella/outbreaks/index.html'
  );
  assert.deepEqual(links,['https://www.cdc.gov/salmonella/outbreaks/broccoli-sprouts-09-26/index.html']);
});

test('CDC Evergreen notice becomes a source-backed SAFEPLATE incident',()=>{
  const incident=parseCDCNoticePage(`
    <main>
      <h1>Salmonella Outbreak Linked to Broccoli Sprouts</h1>
      <p>SEPT. 9, 2026</p>
      <p>Investigation status: Open</p>
      <p>Recall issued: Yes</p>
      <p>CDC and public health officials are investigating infections linked to broccoli sprouts produced by Evergreen Fresh Sprouts.</p>
      <p>Cases: 22</p><p>Hospitalizations: 2</p><p>Deaths: 0</p><p>States: 4</p>
      <p>Evergreen Fresh Sprouts, LLC recalled broccoli sprouts.</p>
    </main>`,
    'https://www.cdc.gov/salmonella/outbreaks/broccoli-sprouts-09-26/index.html',
    '2026-09-10T12:00:00.000Z'
  );
  assert.equal(incident.id,'CDC-OUTBREAK-broccoli-sprouts-09-26');
  assert.equal(incident.product,'Broccoli Sprouts');
  assert.equal(incident.company,'Evergreen Fresh Sprouts');
  assert.equal(incident.hazard,'Salmonella');
  assert.equal(incident.caseCount,22);
  assert.equal(incident.hospitalizations,2);
  assert.equal(incident.stateCount,4);
  assert.equal(incident.recallIssued,true);
  assert.equal(incident.rawSource,'cdc_content');
  assert.equal(incident.evidence[0].status,'VERIFIED');
  assert.match(incident.evidence[0].url,/cdc\.gov\/salmonella\/outbreaks\/broccoli-sprouts-09-26/);
});

test('closed CDC notices are not presented as active incidents',()=>{
  const incident=parseCDCNoticePage('<main><h1>Salmonella Outbreak Linked to Test Food</h1><p>Investigation status: Closed</p></main>','https://www.cdc.gov/salmonella/outbreaks/test-09-26/index.html');
  assert.equal(incident,null);
});
