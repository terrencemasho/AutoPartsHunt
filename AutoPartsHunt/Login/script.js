 function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active',(i===0&&tab==='login')||(i===1&&tab==='register')));
      document.getElementById('form-login').classList.toggle('active',tab==='login');
      document.getElementById('form-register').classList.toggle('active',tab==='register');
    }
    document.querySelectorAll('input[name="role"]').forEach(r => {
      r.addEventListener('change',()=>{ document.getElementById('shopNameGroup').style.display=r.value==='shopkeeper'?'block':'none'; });
    });
    function togglePw(id,btn) { const el=document.getElementById(id); if(el.type==='password'){el.type='text';btn.textContent='🙈';}else{el.type='password';btn.textContent='👁';} }

    async function doLogin() {
      const email=document.getElementById('l-email').value.trim();
      const pass=document.getElementById('l-pass').value;
      const msg=document.getElementById('login-msg');
      const btn=document.querySelector('#form-login .submit-btn');
      if(!email||!pass){showMsg(msg,'error','Please enter your email and password.');return;}
      btn.textContent='Logging in...'; btn.disabled=true;
      const result=await APP.login(email,pass);
      btn.textContent='LOGIN →'; btn.disabled=false;
      if(!result.ok){showMsg(msg,'error',result.msg);return;}
      const user=result.user;
      showMsg(msg,'success',`Welcome back, ${user.fname}! Redirecting...`);
      showToast(`✓ Logged in as ${user.fname}`);
      setTimeout(()=>{
        if(user.role==='admin') location.href='/admin/admin_dashboard.HTML';
        else if(user.role==='shopkeeper') location.href='/Shopkeeper/shopkeeper_dashboard.HTML';
        else location.href='/customer/customer_dashboard.HTML';
      },1200);
    }

    async function doRegister() {
      const fname=document.getElementById('r-fname').value.trim();
      const lname=document.getElementById('r-lname').value.trim();
      const email=document.getElementById('r-email').value.trim();
      const phone=document.getElementById('r-phone').value.trim();
      const city=document.getElementById('r-city').value;
      const pass=document.getElementById('r-pass').value;
      const pass2=document.getElementById('r-pass2').value;
      const terms=document.getElementById('r-terms').checked;
      const role=document.querySelector('input[name="role"]:checked').value;
      const shopName=document.getElementById('r-shopname').value.trim();
      const msg=document.getElementById('reg-msg');
      const btn=document.querySelector('#form-register .submit-btn');
      if(!fname||!lname){showMsg(msg,'error','Please enter your full name.');return;}
      if(!email){showMsg(msg,'error','Email address is required.');return;}
      if(!phone){showMsg(msg,'error','Phone number is required.');return;}
      if(role==='shopkeeper'&&!shopName){showMsg(msg,'error','Please enter your shop name.');return;}
      if(!city){showMsg(msg,'error','Please select your city.');return;}
      if(pass.length<8){showMsg(msg,'error','Password must be at least 8 characters.');return;}
      if(pass!==pass2){showMsg(msg,'error','Passwords do not match.');return;}
      if(!terms){showMsg(msg,'error','Please accept the Terms of Service.');return;}
      btn.textContent='⏳ Creating account...'; btn.disabled=true;
      const result=await APP.register({fname,lname,email,password:pass,phone,city,role,shopName});
      btn.textContent='CREATE ACCOUNT →'; btn.disabled=false;
      if(!result.ok){showMsg(msg,'error',result.msg);return;}
      showMsg(msg,'success','Account created! Please log in.');
      showToast('✓ Account created successfully!');

      // Send welcome email via NotificationService
      await window.Notify.sendWelcome({ toEmail: email, toName: fname + ' ' + lname });

      setTimeout(()=>{document.getElementById('l-email').value=email;switchTab('login');},1500);
    }

    function showMsg(el,type,text){el.className='msg '+type;el.textContent=text;el.style.display='block';}
    let tt;
    function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),3000);}
    document.addEventListener('keydown',e=>{if(e.key==='Enter'){if(document.getElementById('form-login').classList.contains('active'))doLogin();else doRegister();}});
