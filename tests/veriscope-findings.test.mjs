import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReviewedFinding} from '../netlify/functions/lib/veriscope-findings.mjs';

const approved={contract_version:'veriscope.safeplate.finding.v1',finding_id:'finding-1',safeplate_record_id:'safeplate-1',title:'Product · Hazard',assessment:'Evidence requires review.',explanation:'Supported relationship.',confidence:.92,risk:{value:'HIGH'},review:{status:'APPROVED',human_approved:true,reviewer:'Authorized reviewer',notes:'Verified.',reviewed_at:'2026-09-09T00:00:00.000Z'},provenance:{category:'VERISCOPE_CORRELATION'},evidence:[{type:'AGENCY',status:'VERIFIED',source:'FDA',url:'https://www.fda.gov/example',text:'Official record'}]};

test('accepts a fully reviewed VERISCOPE finding',()=>{const value=normalizeReviewedFinding(approved);assert.equal(value.review.humanApproved,true);assert.equal(value.safeplateRecordId,'safeplate-1');assert.equal(value.sourceSystem,'VERISCOPE_CORE')});
test('rejects pending and unapproved findings',()=>{assert.throws(()=>normalizeReviewedFinding({...approved,review:{...approved.review,status:'PENDING_HUMAN_REVIEW',human_approved:false}}),/HUMAN_APPROVAL_REQUIRED/)});
test('requires evidence and provenance',()=>{assert.throws(()=>normalizeReviewedFinding({...approved,evidence:[]}),/EVIDENCE_AND_PROVENANCE_REQUIRED/)});
