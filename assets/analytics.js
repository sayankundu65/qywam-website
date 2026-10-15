(function(){
// Set this to your GA4 Measurement ID (format G-XXXXXXXXXX) to enable analytics.
// While empty, NO analytics script is loaded and NO consent banner is shown.
var GA_ID='';
var KEY='qywam-consent';

window.qywamTrack=function(name,params){
  if(window.gtag&&localStorage.getItem(KEY)==='granted'){window.gtag('event',name,params||{})}
};
if(!GA_ID)return;

window.dataLayer=window.dataLayer||[];
window.gtag=function(){window.dataLayer.push(arguments)};
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});

function load(){
  if(document.getElementById('ga4-src'))return;
  var s=document.createElement('script');s.id='ga4-src';s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA_ID);
  document.head.appendChild(s);
  gtag('js',new Date());
  gtag('config',GA_ID); // single page_view; no duplicate config calls
}
function grant(){gtag('consent','update',{analytics_storage:'granted'});load()}

var c=localStorage.getItem(KEY);
if(c==='granted'){grant();return}
if(c==='denied')return;

var st=document.createElement('style');
st.textContent='#cb{position:fixed;left:16px;right:16px;bottom:16px;max-width:520px;background:rgba(255,255,255,.96);border:1px solid rgba(23,17,13,.14);border-radius:18px;padding:18px 20px;z-index:200;font:15px/1.5 "Hanken Grotesk",system-ui,sans-serif;color:#17110d;box-shadow:0 20px 50px -20px rgba(23,17,13,.35)}#cb p{margin:0 0 12px}#cb a{color:#17110d}#cb button{font:inherit;font-size:14px;border-radius:99px;padding:10px 20px;cursor:pointer;border:1px solid #17110d;margin-right:8px}#cb .y{background:#17110d;color:#fff}#cb .n{background:#fff;color:#17110d}';
document.head.appendChild(st);
var b=document.createElement('div');b.id='cb';b.setAttribute('role','dialog');b.setAttribute('aria-label','Cookie consent');
b.innerHTML='<p>We use Google Analytics to understand how the site is used, only if you agree. See our <a href="/privacy">Privacy Policy</a>.</p><button class="y" type="button">Accept analytics</button><button class="n" type="button">Decline</button>';
document.body.appendChild(b);
b.querySelector('.y').onclick=function(){localStorage.setItem(KEY,'granted');b.remove();grant()};
b.querySelector('.n').onclick=function(){localStorage.setItem(KEY,'denied');b.remove()};
})();
