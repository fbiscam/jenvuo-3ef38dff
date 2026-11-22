import {test} from 'node:test';
import assert from 'node:assert/strict';
import {callChatCompletion, AiGatewayError} from './ai-gateway';
import {researchArticle, ArticleProviderError} from './article-research.server';

test('background article denial stops before retry or another model', async () => {
  const fetchBefore=globalThis.fetch;
  const keyBefore=process.env['CODECRAFT_API_KEY'];
  let calls=0;
  process.env['CODECRAFT_API_KEY']='test-only';
  globalThis.fetch=async () => { calls++; return new Response('{"error":"denied"}',{status:403}); };
  try {
    await assert.rejects(callChatCompletion({models:['codecraft/claude-opus-5','codecraft/gpt-5.5'],messages:[{role:'user',content:'test'}],exactModels:true,backgroundJob:true,retriesPerModel:3}), error => error instanceof AiGatewayError && error.status===403);
    assert.equal(calls,1);
  } finally {globalThis.fetch=fetchBefore; if(keyBefore===undefined) delete process.env['CODECRAFT_API_KEY']; else process.env['CODECRAFT_API_KEY']=keyBefore;}
});
test('a content refusal with HTTP 200 ends a background article', async () => {
  const fetchBefore=globalThis.fetch;
  const keyBefore=process.env['CODECRAFT_API_KEY'];
  let calls=0;
  process.env['CODECRAFT_API_KEY']='test-only';
  globalThis.fetch=async () => {calls++;return Response.json({choices:[{message:{refusal:'refused',content:''},finish_reason:'content_filter'}]});};
  try {
    await assert.rejects(callChatCompletion({models:['codecraft/claude-opus-5'],messages:[{role:'user',content:'test'}],exactModels:true,backgroundJob:true,retriesPerModel:3}),error => error instanceof AiGatewayError && error.terminal && error.status===422);
    assert.equal(calls,1);
  } finally {globalThis.fetch=fetchBefore;if(keyBefore===undefined) delete process.env['CODECRAFT_API_KEY']; else process.env['CODECRAFT_API_KEY']=keyBefore;}
});
test('Semrush quota error halts research without querying another seed',async () => {
  const fetchBefore=globalThis.fetch;
  const saved={semrush:process.env['SEMRUSH_API_KEY'],lovable:process.env['LOVABLE_API_KEY']};
  process.env['SEMRUSH_API_KEY']='test-only';process.env['LOVABLE_API_KEY']='test-only';
  let calls=0;
  globalThis.fetch=async () => {calls++;return Response.json({error:'ERROR 134 :: TOTAL LIMIT EXCEEDED',status:403});};
  try {
    await assert.rejects(researchArticle('2026-11-22',[]),error=>error instanceof ArticleProviderError && error.status===403);
    assert.equal(calls,1);
  } finally {
    globalThis.fetch=fetchBefore;
    if(saved.semrush===undefined) delete process.env['SEMRUSH_API_KEY']; else process.env['SEMRUSH_API_KEY']=saved.semrush;
    if(saved.lovable===undefined) delete process.env['LOVABLE_API_KEY']; else process.env['LOVABLE_API_KEY']=saved.lovable;
  }
});