import { runDiseaseAgent } from './src/lib/agents/disease-agent';

async function test() {
  console.log("Testing disease agent...");
  const res = await runDiseaseAgent({ farmerId: 'test' } as any, {
    symptoms: 'Yellow spots on leaves',
    cropType: 'Tomato'
  });
  console.log(JSON.stringify(res, null, 2));
}

test().catch(console.error);
