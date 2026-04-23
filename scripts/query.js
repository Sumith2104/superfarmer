async function run() {
  const res = await fetch('https://fluxbase.vercel.app/api/execute-sql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer fl_45c25f77920950309cfabeacd92776a707dc9f87a351b8af',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectId: 'ef13717041e04ae8',
      query: 'UPDATE farmer_profile SET user_id = 14 WHERE farmer_id = 20'
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
