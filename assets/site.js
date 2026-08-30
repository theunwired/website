// The Unwired — shared site behavior: reveal-on-scroll + contact modal.
(function(){
  var reveals = document.querySelectorAll('.reveal');
  if(reveals.length){
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function(el){ observer.observe(el); });
  }
})();

(function(){
  var overlay = document.getElementById('contactOverlay');
  if(!overlay) return;

  var closeBtn = document.getElementById('contactClose');
  var form = document.getElementById('contactForm');
  var submitBtn = document.getElementById('contactSubmit');
  var status = document.getElementById('contactStatus');
  var lastFocused = null;

  function openModal(){
    lastFocused = document.activeElement;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var firstField = document.getElementById('cf-name');
    if(firstField) firstField.focus();
  }

  function closeModal(){
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if(lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.js-open-contact').forEach(function(el){
    el.addEventListener('click', openModal);
  });

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e){
    if(e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    status.className = 'modal-status';

    fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    }).then(function(res){
      if(!res.ok) throw new Error('bad status');
      return res.json();
    }).then(function(){
      status.textContent = "Sent. We'll get back to you shortly.";
      status.className = 'modal-status show ok';
      form.reset();
      submitBtn.textContent = 'Sent';
      setTimeout(closeModal, 1800);
    }).catch(function(){
      status.textContent = 'Something went wrong. Email us directly at theunwired.in@gmail.com.';
      status.className = 'modal-status show err';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send it over';
    });
  });
})();
