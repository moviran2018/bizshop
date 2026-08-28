// Store - Data layer: Supabase + LocalStorage fallback
const LS_KEY='luxe_products';
const CART_KEY='luxe_cart';

const demoProducts=[
  {id:'1',slug:'ambre-supreme',title:'AMBRE SUPRÊME',subtitle:'گرم و اغواگر — ماندگاری ۱۴ ساعته',category:'signature',gender:'man',price:4850000,original_price:5200000,images:['https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80','https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80'],video_url:'https://www.youtube.com/embed/ScMzIvxBSi4',video_type:'youtube',audio_url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',audio_title:'پادکست: داستان عنبر',model_3d_url:'https://modelviewer.dev/shared-assets/models/Astronaut.glb',description:'ترکیبی از عنبر ناب، وانیل ماداگاسکار و چوب صندل. هر اسپری امضای حضور تو خواهد بود.',long_description:'<p>لوکس پرفیوم اکستریت دِ پرفیوم برای کسانی است که قدردان وقار جاودانه‌اند. شیشه الهام‌گرفته از کریستال با تُن گرم عنبر و جزئیات طلایی.</p><p>نت‌های آغازین ترنج، نت میانی زعفران، نت پایه عود و مشک.</p>',features:['ماندگاری ۱۴ ساعته','پخش بوی قوی','شیشه کریستال دست‌ساز'],is_featured:true,is_bestseller:true,is_new:false,stock:100},
  {id:'2',slug:'bois-noble',title:'BOIS NOBLE',subtitle:'عمیق و اصیل — چوبی شرقی',category:'woody',gender:'unisex',price:4200000,original_price:null,images:['https://images.unsplash.com/photo-1595425959632-34f2822322ce?w=800&q=80'],video_url:'',audio_url:'',model_3d_url:'',description:'سدر اطلس، عود کامبوج و مشک سفید.',long_description:'<p>بویی عمیق بدون سنگینی.</p>',features:['چوبی شرقی','چهار فصل'],is_featured:true,is_bestseller:false,is_new:true,stock:50},
  {id:'3',slug:'agrumes-aurore',title:'AGRUMES AURORE',subtitle:'درخشان و مرکباتی',category:'fresh',gender:'unisex',price:3900000,original_price:null,images:['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80'],video_url:'',audio_url:'',model_3d_url:'',description:'پرتقال خونی، ترنج و شکوفه پرتقال.',long_description:'<p>شروعی مرکباتی و قلبی گلی.</p>',features:['مرکباتی','خنک'],is_featured:true,is_bestseller:false,is_new:false,stock:80},
  {id:'4',slug:'rose-supreme',title:'ROSE SUPRÊME',subtitle:'رمانتیک و مخملی',category:'floral',gender:'woman',price:5100000,original_price:5800000,images:['https://images.unsplash.com/photo-1590732596281-b8a5a22d8edb?w=800&q=80'],video_url:'',audio_url:'',model_3d_url:'',description:'رز بلغاری، عود و زعفران.',long_description:'<p>رز ارگانیک با ماندگاری بالا.</p>',features:['رز بلغاری'],is_featured:false,is_bestseller:true,is_new:false,stock:30},
  {id:'5',slug:'edition-or',title:'ÉDITION OR',subtitle:'کمیاب و مجلل — لیمیتد',category:'limited',gender:'man',price:8900000,original_price:null,images:['https://images.unsplash.com/photo-1502185425727-3750737f0043?w=800&q=80'],video_url:'',audio_url:'',model_3d_url:'',description:'نسخه محدود ۵۰۰ عددی با جعبه چوبی.',long_description:'<p>طلای ۲۴ عیار در ترکیب.</p>',features:['لیمیتد ۵۰۰ عددی'],is_featured:false,is_bestseller:false,is_new:true,stock:10},
  {id:'6',slug:'cedre-elegance',title:'CÈDRE ÉLÉGANCE',subtitle:'چوب سدر — شیک',category:'woody',gender:'unisex',price:4300000,original_price:null,images:['https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80'],video_url:'',audio_url:'',model_3d_url:'',description:'سدر و وتیور.',long_description:'<p>شیک و روزانه.</p>',features:[],is_featured:false,is_bestseller:false,is_new:true,stock:60},
  {id:'7',slug:'pivoine-lumiere',title:'PIVOINE LUMIÈRE',subtitle:'گل صدتومانی درخشان',category:'floral',gender:'woman',price:4600000,original_price:null,images:['https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80'],video_url:'',audio_url:'',model_3d_url:'',description:'پیوونی و یاس.',long_description:'<p>لطیف و زنانه.</p>',features:[],is_featured:false,is_bestseller:false,is_new:true,stock:40},
  {id:'8',slug:'citron-lumiere',title:'CITRON LUMIÈRE',subtitle:'لیمویی درخشان',category:'fresh',gender:'unisex',price:3700000,original_price:null,images:['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80'],video_url:'',audio_url:'',model_3d_url:'',description:'لیمو و نعناع.',long_description:'<p>خنک و انرژی‌بخش.</p>',features:[],is_featured:false,is_bestseller:false,is_new:false,stock:70},
];

const Store={
  async getProducts(){
    // try Supabase
    if(supabaseClient){
      const {data,error}=await supabaseClient.from('products').select('*').eq('is_active',true).order('created_at',{ascending:false});
      if(!error && data && data.length){ localStorage.setItem(LS_KEY, JSON.stringify(data)); return data; }
    }
    // fallback localStorage or demo
    const ls=localStorage.getItem(LS_KEY);
    if(ls){ try{ const p=JSON.parse(ls); if(p.length) return p; }catch(e){} }
    localStorage.setItem(LS_KEY, JSON.stringify(demoProducts));
    return demoProducts;
  },
  async getProductBySlug(slug){
    const all=await this.getProducts();
    return all.find(p=>p.slug===slug);
  },
  async saveProduct(product){
    let all=await this.getProducts();
    if(product.id){
      const idx=all.findIndex(p=>p.id===product.id);
      if(idx>-1) all[idx]={...all[idx],...product,updated_at:new Date().toISOString()};
      else all.unshift(product);
    } else {
      product.id=Date.now().toString();
      product.slug=product.slug||product.title.toLowerCase().replace(/\s+/g,'-');
      all.unshift(product);
    }
    // Supabase upsert
    if(supabaseClient){
      const {error}=await supabaseClient.from('products').upsert(product,{onConflict:'slug'});
      if(error) console.warn(error);
    }
    localStorage.setItem(LS_KEY, JSON.stringify(all));
    return product;
  },
  async deleteProduct(id){
    let all=await this.getProducts();
    all=all.filter(p=>p.id!==id);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
    if(supabaseClient) await supabaseClient.from('products').delete().eq('id',id);
  },
  // Cart
  getCart(){ try{return JSON.parse(localStorage.getItem(CART_KEY)||'[]')}catch{return []} },
  saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartBadge(); },
  addToCart(product, qty=1){
    let cart=this.getCart();
    const f=cart.find(i=>i.id===product.id);
    if(f) f.qty+=qty; else cart.push({id:product.id,slug:product.slug,title:product.title,price:product.price,image:product.images?.[0]||'',qty});
    this.saveCart(cart); toast('به سبد اضافه شد ✓');
  }
};

function updateCartBadge(){
  const c=Store.getCart(); const n=c.reduce((s,i)=>s+i.qty,0);
  const b=document.getElementById('cartBadge');
  if(b){ b.textContent=n; b.style.display=n?'flex':'none'; }
}
