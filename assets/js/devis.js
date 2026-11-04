/* ============================================================
   THE LAGOON TRAVEL — devis.js
   Multi-step quote request form with EmailJS submission

   ⚠️ CONFIGURATION REQUISE :
   2. Configurer EmailJS sur emailjs.com :
      Remplacer SERVICE_ID / TEMPLATE_DEVIS / PUBLIC_KEY
   3. Créer un compte Calendly et remplacer l'URL placeholder
      → https://calendly.com
   ============================================================ */

let currentStep = 1;
const TOTAL_STEPS = 5;

document.addEventListener('DOMContentLoaded', () => {
  initStepper();
  initDateConstraints();
});

function initStepper() {
  updateStepUI();

  // Next buttons
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) goToStep(currentStep + 1);
    });
  });

  // Back buttons
  document.querySelectorAll('.btn-prev').forEach(btn => {
    btn.addEventListener('click', () => goToStep(currentStep - 1));
  });

  // Form submit
  const form = document.getElementById('devisForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (validateStep(currentStep)) submitForm();
    });
  }
}

function goToStep(step) {
  if (step < 1 || step > TOTAL_STEPS) return;
  currentStep = step;
  updateStepUI();
  window.scrollTo({ top: document.querySelector('.stepper-section')?.offsetTop - 100 || 0, behavior: 'smooth' });
}

function updateStepUI() {
  // Show/hide panels
  document.querySelectorAll('.step-panel').forEach((panel, i) => {
    panel.classList.toggle('active', i + 1 === currentStep);
  });

  // Update indicators
  document.querySelectorAll('.step-indicator-item').forEach((item, i) => {
    item.classList.remove('active', 'done');
    if (i + 1 === currentStep) item.classList.add('active');
    if (i + 1 < currentStep) item.classList.add('done');

    const dot = item.querySelector('.step-dot');
    if (dot) {
      if (i + 1 < currentStep) {
        dot.innerHTML = '<i class="ti ti-check" style="font-size:0.8rem"></i>';
      } else {
        dot.textContent = i + 1;
      }
    }
  });

  // Progress bar
  const bar = document.querySelector('.step-progress');
  if (bar) {
    const pct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    bar.style.width = pct + '%';
  }
}

/* ── Validation ──────────────────────────────────────── */

function validateStep(step) {
  clearErrors();
  let valid = true;

  if (step === 1) {
    valid = requireField('firstname') & requireField('lastname') &
            requireEmail('email') & requireField('phone');
  }
  if (step === 2) {
    valid = requireAtLeastOne('formule', 'devis.err_formule');
  }
  if (step === 3) {
    valid = requireAtLeastOne('tripType', 'devis.err_triptype') &
            requireField('arrival') & requireField('departure');
    if (valid) {
      const arr = new Date(document.getElementById('arrival').value);
      const dep = new Date(document.getElementById('departure').value);
      if (dep <= arr) {
        showError('departure', 'devis.err_dates');
        valid = false;
      }
    }
  }
  if (step === 4) {
    valid = requireAtLeastOne('activities', 'devis.err_activities');
  }

  return Boolean(valid);
}

function requireField(id) {
  const el = document.getElementById(id);
  if (!el) return true;
  if (!el.value.trim()) { showError(id, 'form.err_required'); return false; }
  el.classList.remove('error');
  return true;
}

function requireEmail(id) {
  const el = document.getElementById(id);
  if (!el) return true;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!el.value.trim() || !re.test(el.value)) {
    showError(id, 'form.err_email');
    return false;
  }
  el.classList.remove('error');
  return true;
}

function requireAtLeastOne(name, msg) {
  const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
  if (!checked.length) {
    const container = document.querySelector(`[data-group="${name}"]`);
    if (container) {
      let err = container.querySelector('.form-error');
      if (!err) {
        err = document.createElement('p');
        err.className = 'form-error';
        container.appendChild(err);
      }
      err.dataset.i18n = msg;
      err.textContent = t(msg);
      err.classList.add('show');
    }
    return false;
  }
  return true;
}

// msg est une clé i18n : le message suit le changement de langue
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('error');
  let errEl = document.getElementById(id + '-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.id = id + '-error';
    errEl.className = 'form-error';
    el.parentNode.insertBefore(errEl, el.nextSibling);
  }
  errEl.dataset.i18n = msg;
  errEl.textContent = t(msg);
  errEl.classList.add('show');
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
}

/* ── Date Constraints ────────────────────────────────── */

function initDateConstraints() {
  const arrInput = document.getElementById('arrival');
  const depInput = document.getElementById('departure');
  if (!arrInput || !depInput) return;

  const today = new Date().toISOString().split('T')[0];
  arrInput.min = today;
  depInput.min = today;

  arrInput.addEventListener('change', () => {
    depInput.min = arrInput.value;
    if (depInput.value && depInput.value <= arrInput.value) {
      depInput.value = '';
    }
  });
}

/* ── Collect Form Data ───────────────────────────────── */

function collectFormData() {
  const get     = id   => document.getElementById(id)?.value || '';
  const gets    = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)]
                            .map(el => el.value).join(', ');
  const getRadio = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';

  return {
    firstname:  get('firstname'),
    lastname:   get('lastname'),
    email:      get('email'),
    phone:      get('phone'),
    lang:       get('prefLang'),
    formule:    getRadio('formule'),
    trip_types: gets('tripType'),
    adults:     get('adults'),
    children:   get('children'),
    arrival:    get('arrival'),
    departure:  get('departure'),
    flexible:   get('flexible'),
    activities: gets('activities'),
    comfort:    getRadio('comfort'),
    budget:     get('budget'),
    notes:      get('notes'),
    contact_pref: getRadio('contactPref') || 'email',
    submitted_at: new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Mauritius' }),
    lang_label: currentLang || 'fr'
  };
}

/* ── Libellés lisibles pour l'email (toujours en français) ── */

const EMAIL_LABELS = {
  budget: {
    '':          'Non précisé',
    '1000-2000': '1 000 – 2 000 €',
    '2000-4000': '2 000 – 4 000 €',
    '4000-7000': '4 000 – 7 000 €',
    '7000+':     '7 000 € +',
    'discuss':   'Je préfère en discuter'
  },
  flexible: {
    'non':            'Non',
    'oui':            'Oui',
    'quelques-jours': '+/- quelques jours'
  },
  contact_pref: {
    'email':    'Email',
    'whatsapp': 'WhatsApp'
  }
};

function toEmailLabels(data) {
  const out = { ...data };
  Object.keys(EMAIL_LABELS).forEach(field => {
    out[field] = EMAIL_LABELS[field][data[field]] || data[field];
  });
  return out;
}

/* ── Submit via EmailJS ──────────────────────────────── */

async function submitForm() {
  // Champ piège anti-spam : rempli uniquement par les robots
  if (document.getElementById('devisWebsite')?.value) {
    showSuccess();
    return;
  }

  const submitBtn = document.querySelector('[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '...';
  }

  const data = toEmailLabels(collectFormData());

  try {
    if (typeof emailjs === 'undefined') throw new Error('EmailJS indisponible');

    await emailjs.send('SERVICE_ID', 'TEMPLATE_DEVIS', {
      ...data,
      reply_to: data.email,
      to_email: 'thelagoon.mu@gmail.com',
      subject: `📋 Nouveau devis - ${data.formule} - ${data.firstname} ${data.lastname}`
    }, 'PUBLIC_KEY');

    // ⚠️ WhatsApp Business webhook — décommenter pour activer
    // await fetch('VOTRE_WEBHOOK_URL', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });

    showSuccess();
  } catch (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = t('devis.btn_submit');
    }
    showToast(t('form.error_send'), 6000);
  }
}

function showSuccess() {
  document.getElementById('devisForm')?.classList.add('d-none');
  const stepIndicators = document.querySelector('.step-indicators');
  if (stepIndicators) stepIndicators.style.display = 'none';

  const success = document.getElementById('devisSuccess');
  if (success) {
    success.classList.add('show');
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
