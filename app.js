// =============================================
// SANITY CONFIGURATION
// =============================================

const SANITY_PROJECT_ID = '5ik5680s';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2026-08-25';

const SANITY_BASE_URL =
  `https://<projectId>.apicdn.sanity.io/v<date>/data/query/<dataset>`;

  // =============================================
// LOAD AMULETS FROM SANITY
// =============================================

async function fetchAmulets() {

  const query = `
    *[
      _type == "amulet" &&
      showOnWebsite == true
    ]
    | order(_createdAt desc)
    {
      _id,
      inventoryId,
      name,
      "slug": slug.current,
      category,
      monkMaster,
      temple,
      year,
      material,
      widthMm,
      heightMm,
      story,
      description,
      priceThb,
      showOnWebsite,
      featured,
      newArrival,
      status,

      "images": images[]{
        "url": asset->url,
        imageType,
        caption
      }
    }
  `;

  const url =
    `${SANITY_BASE_URL}?query=${encodeURIComponent(query)}`;

  try {

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Sanity request failed: ${response.status}`
      );
    }

    const data = await response.json();

    console.log('Amulets loaded from Sanity:', data.result);

    return data.result;

  } catch (error) {

    console.error('Could not load Sanity inventory:', error);

    return [];
  }
}

const inventory = [
 {id:"AC168-0001",name:"Somdej — Collector Placeholder",temple:"Bangkok · Wat Example",category:"Buddha",era:"25XX BE",material:"Sacred powder",condition:"Excellent",price:"฿35,000",status:"Available",story:"Three Generations in Bangkok"},
 {id:"AC168-0002",name:"Meditation Buddha — Placeholder",temple:"Bangkok · Temple Example",category:"Buddha",era:"Vintage",material:"Bronze",condition:"Very good",price:"฿28,000",status:"Available",story:"A Quiet Journey"},
 {id:"AC168-0003",name:"Monk Portrait — Placeholder",temple:"Thailand",category:"Monk",era:"25XX BE",material:"Metal",condition:"Excellent",price:"฿18,000",status:"Reserved",story:"The Collector's Gift"},
 {id:"AC168-0004",name:"Vintage Talisman — Placeholder",temple:"Central Thailand",category:"Talisman",era:"Vintage",material:"Metal",condition:"Good",price:"฿12,800",status:"Sold",story:"A Piece That Traveled"},
 {id:"AC168-0005",name:"Buddha Tablet — Placeholder",temple:"Bangkok",category:"Vintage",era:"Vintage",material:"Powder",condition:"Excellent",price:"฿42,000",status:"Available",story:"Archive Piece"}
];

function card(p){
 return `<a class="product-card" href="product.html?id=${encodeURIComponent(p.id)}">
   <div class="product-image"></div>
   <div class="product-body">
    <span class="id">${p.id}</span><span class="status">${p.status}</span>
    <h3>${p.name}</h3><p>${p.temple}<br>${p.material} · ${p.condition}</p>
    <span class="price">${p.price}</span>
   </div>
 </a>`;
}
function renderInventory(){
 const grid=document.getElementById("inventory-grid"); if(!grid)return;
 const q=(document.getElementById("inventory-search")?.value||"").toLowerCase();
 const cat=document.getElementById("category-filter")?.value||"all";
 const status=document.getElementById("status-filter")?.value||"all";
 const filtered=inventory.filter(p=>(cat==="all"||p.category===cat)&&(status==="all"||p.status===status)&&[p.id,p.name,p.temple,p.category,p.material].join(" ").toLowerCase().includes(q));
 grid.innerHTML=filtered.length?filtered.map(card).join(""):`<p class="muted">No pieces matched your search.</p>`;
}
function renderFeatured(){
 const grid=document.getElementById("featured-grid"); if(grid)grid.innerHTML=inventory.filter(p=>p.status==="Available").slice(0,4).map(card).join("");
}
function renderProduct(){
 const el=document.getElementById("product-detail"); if(!el)return;
 const id=new URLSearchParams(location.search).get("id")||"AC168-0001";
 const p=inventory.find(x=>x.id===id)||inventory[0];
 el.innerHTML=`<div>
   <div class="product-gallery"><div class="gallery-shot">FRONT</div><div class="gallery-shot">BACK</div><div class="gallery-shot">DETAIL</div><div class="gallery-shot">SIDE</div></div>
  </div>
  <div class="product-info">
   <p class="eyebrow">${p.id} · ${p.status.toUpperCase()}</p><h1>${p.name}</h1><p class="lead">${p.temple}. This is a placeholder listing designed for the first website version. Replace the facts, photographs, provenance and pricing with verified information before publishing.</p>
   <div class="specs">
    <div class="spec"><span>Era</span><b>${p.era}</b></div><div class="spec"><span>Material</span><b>${p.material}</b></div><div class="spec"><span>Condition</span><b>${p.condition}</b></div><div class="spec"><span>Category</span><b>${p.category}</b></div><div class="spec"><span>Price</span><b>${p.price}</b></div>
   </div>
   <a class="btn gold" href="contact.html?amulet=${encodeURIComponent(p.id)}">Inquire About This Amulet →</a>
   <p class="muted" style="margin-top:16px">For international collectors, ask us about shipping, documentation and available payment methods before purchase.</p>
  </div>`;
}
function focusSearch(){location.href="inventory.html#inventory-search";setTimeout(()=>document.getElementById("inventory-search")?.focus(),300)}
function subscribe(e){e.preventDefault();alert("Thank you. Newsletter connection will be added before launch.");}
function sendInquiry(e){e.preventDefault();document.getElementById("form-message").textContent="Thank you. The form is currently in demo mode; connect it to your preferred email/form service before launch.";}
document.querySelector(".menu-toggle")?.addEventListener("click",()=>document.querySelector(".nav")?.classList.toggle("open"));
renderFeatured(); renderInventory(); renderProduct();

fetchAmulets().then((amulets) => {

  console.log('SANITY TEST RESULT:');

  console.log(amulets);

});