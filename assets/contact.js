(function(){
var f=document.getElementById('contact-form');if(!f)return;
var btn=f.querySelector('button[type=submit]'),st=document.getElementById('form-status'),t0=Date.now();
var fields=['name','email','message'];
function setErr(id,msg){var i=document.getElementById(id),e=document.getElementById(id+'-err');e.textContent=msg||'';if(msg){i.setAttribute('aria-invalid','true')}else{i.removeAttribute('aria-invalid')}}
function validate(){var ok=true,v={name:f.name.value.trim(),email:f.email.value.trim(),message:f.message.value.trim()};
 setErr('name',v.name.length<2?'Please enter your name.':'');
 setErr('email',/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)?'':'Please enter a valid email address.');
 setErr('message',v.message.length<10?'Please write at least 10 characters.':'');
 fields.forEach(function(k){if(document.getElementById(k).getAttribute('aria-invalid'))ok=false});
 if(!ok){var first=fields.filter(function(k){return document.getElementById(k).getAttribute('aria-invalid')})[0];document.getElementById(first).focus()}
 return ok?v:null}
function show(kind,msg){st.hidden=false;st.className='status '+kind;st.textContent=msg}
f.addEventListener('submit',function(e){e.preventDefault();st.hidden=true;
 var v=validate();if(!v)return;
 btn.disabled=true;btn.textContent='Sending\u2026';f.setAttribute('aria-busy','true');
 v.website=f.website.value;v.elapsed=Date.now()-t0;
 fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)})
 .then(function(r){return r.json().catch(function(){return{}}).then(function(d){return{r:r,d:d}})})
 .then(function(x){
  if(x.r.ok&&x.d.ok){f.reset();show('ok','Thank you. Your message has been sent.');if(window.qywamTrack)window.qywamTrack('generate_lead',{form:'contact'})}
  else if(x.d.errors){Object.keys(x.d.errors).forEach(function(k){setErr(k,x.d.errors[k])});show('bad','Please check the highlighted fields.')}
  else show('bad',x.d.error||'Something went wrong. Please try again.')})
 .catch(function(){show('bad','Network error. Please check your connection and try again.')})
 .then(function(){btn.disabled=false;btn.textContent='Send message';f.removeAttribute('aria-busy')});
});
})();
