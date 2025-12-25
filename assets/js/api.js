async function fetchProducts(){
  const res = await fetch('https://wykiesautomation.co.za/assets/data/products.json');
  return res.json();
}